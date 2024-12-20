import countryVat from "country-vat";
import Stripe from "stripe";
import { Affiliation } from "../affiliation/affiliation_model.js";
import Commision from "../commision/commision.model.js";
import Coupon from "../coupon/coupon_model.js";
import Guest from "../guest/guest.model.js";
import { sendCustomEmail } from "../mail/mailgun.service.js";
import Order from "../orders/order.model.js"; // Assuming you have an Order model
import { sendProductPurchaseMail } from "../preference/preference.service.js";
import { Product } from "../product/product.model.js";
import Shipping from "../shipping/shipping.model.js";
import sponsorshipModel from "../sponsor/sponsorship.model.js";
import { User } from "../user/user.model.js";
import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const platformFee = {
  free: 10,
  starter: 5,
  believer: 3,
  professional: 2,
  enterprise: 1,
};

// Create a payment session for an influencer
export const checkoutInfluencer = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    const { productId, quantity = 1 } = req.body;
 
    if (!user?.stripeAccountId || user.accountType !== "influencer") {
      throw ApiError(403, "Must be an influencer with connected Stripe account");
    }

   
    const product = await Product.findById(productId);
    if (!product) throw ApiError(404, "Product not found");
 
    const brand = await User.findById(product.brandId);
    if (!brand?.stripeAccountId) {
      throw ApiError(404, "Brand not found or not properly setup");
    }
 
    const unitPrice = Number(product.wholesalePricing);
    const vatRate = Number(countryVat(user.address?.country)) || 0;
    const vatAmount = Number(quantity * unitPrice * vatRate) || 0;
    const shippingAmount = await calculateShipping(brand._id, user.address?.country) || 0;
    const commission = 0;
    const totalAmount = (unitPrice * quantity) + vatAmount + shippingAmount;

    // Calculate platform fee based on brand's plan
    const platformFeePercentage = platformFee[brand.plan] || 10;
    const platformFeeAmount = (totalAmount * platformFeePercentage) / 100;

    // Create line item
    const lineItem = {
      price_data: {
        currency: "eur",
        product_data: {
          name: product.title,
          description: product.description,
        },
        unit_amount: Math.round(totalAmount * 100),
      },
      quantity: 1,
    };

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [lineItem],
      customer_email: user.email,
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard`,
      metadata: {
        type: "influencer_purchase",
        productId,
        influencerId: user._id.toString(),
        brandId: brand._id.toString(),
        quantity,
        unitPrice: unitPrice.toString(),
        vatAmount: vatAmount.toString(),
        shippingAmount: shippingAmount.toString(),
        commission: commission.toString(),
        totalAmount: totalAmount.toString(),
        platformFee: platformFeeAmount.toString(),
        address: JSON.stringify(user.address),
      },
      payment_intent_data: {
        metadata: {
          type: "influencer_purchase",
          brandStripeAccount: brand.stripeAccountId,
          influencerStripeAccount: user.stripeAccountId,
        },
      },
   
    });

    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
      breakdown: {
        subtotal: unitPrice * quantity,
        vatAmount,
        shippingAmount,
        commission,
        platformFee: platformFeeAmount,
        total: totalAmount,
      },
    });

  } catch (error) {
    next(error);
  }
});

export const handleSuccessPage = asyncHandler(async (req, res) => {
  try {
    const { session_id } = req.body;
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      throw ApiError(400, "Payment not successful");
    }

    // Check for existing order
    const existingOrder = await Order.findOne({
      paymentId: session.payment_intent,
    });

    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: "Order already processed",
        orderId: existingOrder._id,
      });
    }

    const {
      productId,
      influencerId,
      brandId,
      quantity,
      unitPrice,
      vatAmount,
      shippingAmount,
      commission,
      totalAmount,
      address,
    } = session.metadata;

     const influencerData = await User.findById(influencerId);


    // Create order items
    const orderItem = {
      productId,
      brandId,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      commission: Number(commission),
      vatAmount: Number(vatAmount),
      shippingAmount: Number(shippingAmount),
      totalAmount: Number(totalAmount),
    };

    // Create brand order summary
    const brandOrderSummary = {
      brandId,
      items: [productId],
      subtotal: Number(unitPrice) * Number(quantity),
      vatAmount: Number(vatAmount),
      shippingAmount: Number(shippingAmount),
      commission: Number(commission),
      totalAmount: Number(totalAmount),
      status: "pending",
      paymentStatus: "paid",
      paymentId: session.payment_intent,
      
    };

    // Create the order
    const newOrder = new Order({
      orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      influencerId,
      userId: influencerId,
      userModel: "User",
      orderItems: [orderItem],
      brandOrders: [brandOrderSummary],
      totalAmount: Number(totalAmount),
      paymentStatus: "paid",
      paymentId: session.payment_intent,
      shippingAddress: JSON.parse(address),
      customerInfo: {
        email:influencerData.email,
        name: influencerData.fullName,
      },
    });

    await newOrder.save();

    // Handle transfers
    await handlePaymentTransfers(newOrder, session.payment_intent);

    res.status(200).json({
      success: true,
      message: "Payment successful and order created",
      orderId: newOrder._id,
    });

  } catch (error) {
    console.error("Error in handleSuccessPage:", error);
    throw ApiError(500, error?.message || "Error processing order");
  }
});

// Create a payment session for a guest
export const createGuestCheckout = asyncHandler(async (req, res, next) => {
  try {
    const {
      affiliationIds,
      name,
      email,
      phone,
      address,
      quantity = 1,
    } = req.body;

    // Destructure and provide defaults for optional fields
    const {
      line1 = "N/A",
      line2 = "N/A",
      state = "N/A",
      city,
      postalCode,
      country,
    } = address;

    // Validate required fields
    if (!postalCode || typeof postalCode !== "string") {
      throw ApiError(
        400,
        "Validation error: Please provide a valid postal code.",
      );
    }
    if (!country || typeof country !== "string") {
      throw ApiError(400, "Validation error: Please provide a valid country.");
    }
    if (!city || typeof city !== "string") {
      throw ApiError(400, "Validation error: Please provide a valid city.");
    }

    const affiliation = await Affiliation.find({
      _id: { $in: affiliationIds },
    }).populate("productId");

    let totalPrice = 0;
    if (!affiliation || affiliation.length === 0) {
      throw ApiError(404, "Affiliation not found.");
    }

    const products = affiliation.reduce((acc, aff) => {
      if (aff.productId) {
        acc.push({ _id: aff.productId._id });
      }
      return acc;
    }, []);

    const updatePromises = affiliation.map((aff) => {
      aff.totalSaleQty += 1;
      const diff =
        Number(aff.productId.pricing) - Number(aff.productId.wholesalePricing);
      aff.totalSaleRevenue += diff;
      totalPrice += Number(aff.productId.pricing);
      return aff.save();
    });
    await Promise.all(updatePromises);

    const productsString = JSON.stringify(
      products.map((p) => ({ _id: p._id })),
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Fortiche",
              description: `${products.length} items`,
            },
            unit_amount: totalPrice * 100 * quantity,
          },
          quantity: quantity,
        },
      ],
      customer_email: email,
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        products: productsString,
        influencerId: affiliation[0]?.influencerId?.toString() || "N/A",
        name,
        email,
        phone,
        address: JSON.stringify({
          line1,
          line2,
          city,
          state,
          postalCode,
          country,
        }),
        quantity,
      },
      billing_address_collection: "required",
    });

    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    next(error);
  }
});

export const handleGuestSuccess = asyncHandler(async (req, res, next) => {
  try {
    const { session_id } = req.body;

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not successful");
    }

    // Extract metadata (including guest details)
    let { products, name, email, phone, address, influencerId } =
      session.metadata;

    products = JSON.parse(products);
    // Check if the guest already exists (if your system allows multiple orders for a guest)
    let guest = await Guest.findOne({ email });
    if (!guest) {
      // If guest doesn't exist, create a new guest
      guest = new Guest({
        name,
        email,
        phone,
        address: JSON.parse(address),
      });
      await guest.save();
    }

    const productIds = products.map((p) => {
      return p._id;
    });
    // Find the product
    const product = await Product.find({
      _id: { $in: productIds },
    });
    if (!product) throw new Error("Product not found");
    const totalPrice = product.reduce((sum, product) => {
      const price = Number(product.pricing);
      if (isNaN(price)) throw new Error("Invalid pricing value");
      return sum + price;
    }, 0);

    const influencerAmount = totalPrice * 0.1;
    await stripe.transfers.create({
      amount: influencerAmount,
      currency: "eur",
      destination: influencerId,
    });

    const platformAmount = totalPrice - influencerAmount;

    const newOrders = await Promise.all(
      productIds.map(async (p) => {
        const product = await Product.findById(p._id);
        if (!product) throw new Error("Product not found");

        const newOrder = new Order({
          guestId: guest._id,
          productId: product._id,
          totalAmount: product.pricing,
          paymentId: session.payment_intent,
          status: "paid",
          shippingStatus: "pending",
          shippingAddress: guest.address,
        });
        await newOrder.save();
        return newOrder;
      }),
    );

    sendProductPurchaseMail(influencerId, productIds);
    await stripe.checkout.sessions.expire(session_id);
    res.status(200).json({
      success: true,
      message: "Payment successful and order created",
      order: newOrders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add this new endpoint
export const getRecentTransactions = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user?.stripeAccountId) {
      throw ApiError(400, "No Stripe account found for this user");
    }

    // Fetch balance transactions from Stripe
    const transactions = await stripe.balanceTransactions.list(
      {
        limit: 10, // Adjust limit as needed
        expand: ["data.source"],
      },
      {
        stripeAccount: user.stripeAccountId,
      },
    );

    // Format the transactions for response
    const formattedTransactions = transactions.data.map((transaction) => ({
      id: transaction.id,
      amount: transaction.amount / 100, // Convert from cents to actual currency
      currency: transaction.currency,
      status: transaction.status,
      type: transaction.type,
      created: new Date(transaction.created * 1000), // Convert Unix timestamp to Date
      available_on: new Date(transaction.available_on * 1000),
      description: transaction.description,
      fee: transaction.fee / 100,
      net: transaction.net / 100,
    }));

    res.status(200).json({
      success: true,
      transactions: formattedTransactions,
    });
  } catch (error) {
    throw ApiError(500, error?.message || "Error fetching transactions");
  }
});

export const getTaxes = asyncHandler(async (req, res, next) => {
  const { brandIds, country } = req.body;

  // Find shipping zones for the given brands and country
  const shipping = await Shipping.find({
    brandId: { $in: brandIds },
    countries: { $in: country },
  });

  // Find brands without shipping zones
  const brandsWithShipping = shipping.map((ship) => ship.brandId.toString());
  const notDeliverableBrands = brandIds.filter(
    (brandId) => !brandsWithShipping.includes(brandId.toString()),
  );

  const shippingDetails = shipping.map((ship) => ({
    brandId: ship.brandId,
    shippingCharges: ship.shippingCharges,
    minimumOrder: ship.minimumOrder,
    freeShippingThreshold: ship.freeShippingThreshold,
    shippingMethod: ship.shippingMethod,
    deliveryTime: ship.deliveryTime,
  }));

  const taxes = shipping.reduce((acc, shipping) => {
    return acc + shipping.shippingCharges;
  }, 0);

  res.status(200).json({
    success: true,
    taxes,
    shippingDetails,
    vat: countryVat(country),
    notDeliverable: notDeliverableBrands,
  });
});

// export const handleCheckout = asyncHandler(async (req, res, next) => {
//   const { influencerId, products, address, email, name, phone } = req.body;
//   const affiliation = await Affiliation.find({
//     influencerId,
//     productId: { $in: products.map((p) => p.productId) },
//     $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
//   });

//   const sponsor = await sponsorshipModel.find({
//     influencerId: influencerId,
//     productId: { $in: products.map((p) => p.productId) },
//     endDate: { $gte: new Date() },
//     startDate: { $lte: new Date() },
//   });
//   if (!affiliation) throw ApiError(404, "Affiliation not found");
//   const productData = await Product.find({
//     _id: { $in: products.map((p) => p.productId) },
//   })
//     .select("_id brandId commissionPercentage pricing wholesalePricing")
//     .lean();

//   const brandIds = productData.map((p) => p.brandId.toString());
//   const shipping = await Shipping.find({
//     brandId: { $in: brandIds },
//     countries: { $in: address.country },
//   });
//   const totalPrice = products.reduce((sum, p) => {
//     const product = productData.find(
//       (prod) => prod._id.toString() === p.productId.toString(),
//     );
//     const shippingCharges =
//       shipping.find(
//         (ship) => ship.brandId.toString() === product.brandId.toString(),
//       )?.shippingCharges || 0;
//     return (
//       sum +
//       p.quantity * product.pricing +
//       p.quantity * product.pricing * countryVat(address.country) +
//       shippingCharges
//     );
//   }, 0);

//   const productDataWithQuantity = productData.map((product) => {
//     const matchedProduct = products.find(
//       (p) => p.productId === product._id.toString(),
//     );
//     return {
//       ...product,
//       quantity: matchedProduct ? matchedProduct.quantity : 0,
//       shippingCharges: shipping.find(
//         (ship) => ship.brandId.toString() === product.brandId.toString(),
//       ).shippingCharges,
//     };
//   });
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     mode: "payment",
//     line_items: products.map((p) => {
//       const product = productData.find(
//         (prod) => prod._id.toString() === p.productId.toString(),
//       );
//       const shippingCharges =
//         shipping.find(
//           (ship) => ship.brandId.toString() === product.brandId.toString(),
//         )?.shippingCharges || 0;
//       const unitPrice =
//         p.quantity * product.pricing +
//         p.quantity * product.pricing * countryVat(address.country) +
//         shippingCharges;

//       return {
//         price_data: {
//           currency: "usd",
//           product_data: {
//             name: product.title || "Product",
//             description: `Quantity: ${p.quantity}`,
//           },
//           unit_amount: Math.round(unitPrice * 100),
//         },
//         quantity: 1,
//       };
//     }),
//     customer_email: email,
//     success_url: `${process.env.CLIENT_URL}/product-success?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: `${process.env.CLIENT_URL}/cancel`,
//     metadata: {
//       influencerId,
//       products: JSON.stringify({ productDataWithQuantity }),
//       address: JSON.stringify(address),
//       brandIds: JSON.stringify(brandIds),
//       affiliation: JSON.stringify(affiliation),
//       sponsor: JSON.stringify(sponsor),
//       email,
//       name,
//       phone,
//       invoice: true,
//     },
//     payment_intent_data: {
//       metadata: {
//         generate_invoice: true, // Add this to track which payments need invoices
//       },
//     },
//   });

//   // // Create invoice
//   // const invoice = await stripe.invoices.create({
//   //   customer_email: email,
//   //   customer_name: name,
//   //   collection_method: "send_invoice",
//   //   metadata: {
//   //     address: JSON.stringify(address),
//   //   },
//   // });

//   res.status(200).json({
//     success: true,
//     checkoutUrl: session.url,
//     totalPrice: totalPrice.toFixed(2),
//   });
// });

export const handleCheckout = asyncHandler(async (req, res, next) => {
  const { influencerId, products, address, email, name, phone, couponCode } =
    req.body;

  // Validate influencer and products exist
  const influencer = await User.findById(influencerId);
  if (!influencer) {
    console.error("Influencer not found:", influencerId);
    throw ApiError(404, "Influencer not found");
  }

  // Get product details and validate affiliations
  const productData = await Product.find({
    _id: { $in: products.map((p) => p.productId) },
  })
    .select("_id brandId title pricing wholesalePricing commissionPercentage")
    .lean();

  const affiliations = await Affiliation.find({
    influencerId,
    productId: { $in: productData.map((p) => p._id) },
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
  });

  if (affiliations.length !== products.length) {
    console.error(
      "Invalid product affiliations:",
      affiliations.length,
      products.length,
    );
    throw ApiError(400, "Invalid product affiliations");
  }

  const sponser = await sponsorshipModel.find({
    influencerId,
    productId: { $in: productData.map((p) => p._id) },
    endDate: { $gte: new Date() },
    startDate: { $lte: new Date() },
  });

  if (sponser.length && sponser.length !== products.length) {
    console.error("Invalid sponsor ", sponser.length, products.length);
    throw ApiError(400, "Invalid product Sponser");
  }

  const brandSummaries = {};
  const orderItems = [];

  let coupon;
  if (couponCode) {
    coupon = await Coupon.findOne({
      name: couponCode,
      brandId: { $in: productData.map((p) => p.brandId) },
      isActive: true,
    });

    if (!coupon) {
      throw ApiError(404, "Coupon not found or inactive");
    }

    if (coupon.expiry && new Date() > coupon.expiry) {
      throw ApiError(400, "Coupon has expired");
    }

    if (coupon.usage > coupon.usageLimit) {
      throw ApiError(400, "Coupon usage limit reached");
    }
  }

  for (const product of products) {
    const productInfo = productData.find(
      (p) => p._id.toString() === product.productId,
    );
    if (!productInfo) {
      console.warn("Product info not found for productId:", product.productId);
      continue;
    }

    const brandId = productInfo.brandId.toString();
    if (!brandSummaries[brandId]) {
      brandSummaries[brandId] = {
        brandId: productInfo.brandId,
        items: [],
        subtotal: 0,
        vatAmount: 0,
        shippingAmount: 0,
        commission: 0,
        totalAmount: 0,
        status: "pending",
      };
    }

    // Calculate item-specific totals
    let unitPrice = Number(productInfo.pricing);
    const quantity = Number(product.quantity) || 1;

    if (coupon && coupon.brandId.toString() === brandId) {
      if (coupon.discount.type === "PERCENTAGE") {
        unitPrice *= 1 - Number(coupon.discount.amount) / 100;
      } else if (coupon.discount.type === "AMOUNT") {
        unitPrice = Math.max(0, unitPrice - Number(coupon.discount.amount));
      }
    }

    const vatRate = Number(countryVat(address.country)) || 0;
    const vatAmount = Number(unitPrice * quantity * vatRate) || 0;
    const shippingAmount =
      Number(await calculateShipping(brandId, address.country)) || 0;
    const commissionPercentage = Number(productInfo.commissionPercentage) || 0;
    const commission = Number((unitPrice * commissionPercentage) / 100) || 0;

    const subtotal = Number(unitPrice * quantity) || 0;
    const totalAmount = Number(subtotal + vatAmount + shippingAmount) || 0;

 

    // Add to orderItems
    orderItems.push({
      productId: productInfo._id,
      brandId: productInfo.brandId,
      quantity,
      unitPrice,
      commission,
      vatAmount,
      shippingAmount,
      totalAmount,
    });

    // Update brand summary
    brandSummaries[brandId].items.push(product.productId);
    brandSummaries[brandId].subtotal += isNaN(unitPrice * quantity)
      ? 0
      : Number(unitPrice * quantity) || 0;
    brandSummaries[brandId].vatAmount += isNaN(vatAmount)
      ? 0
      : Number(vatAmount) || 0;
    brandSummaries[brandId].shippingAmount += isNaN(shippingAmount)
      ? 0
      : Number(shippingAmount) || 0;
    brandSummaries[brandId].commission += isNaN(commission)
      ? 0
      : Number(commission * quantity) || 0;
    brandSummaries[brandId].totalAmount += isNaN(totalAmount)
      ? 0
      : Number(totalAmount) || 0;
  }
  if (coupon) {
    const brandTotal = brandSummaries[coupon.brandId.toString()].subtotal;
    if (
      coupon.activateCondition &&
      coupon.activateCondition.minOrderValue &&
      brandTotal < coupon.activateCondition.minOrderValue
    ) {
      throw ApiError(
        400,
        `Minimum order value of ${coupon.activateCondition.minOrderValue} is required to apply this coupon`,
      );
    }
  }
  // Generating stripe check out session
  const stripeLineItems = Object.values(brandSummaries).flatMap((brand) =>
    brand.items.map((productId) => {
      const item = orderItems.find(
        (oi) => oi.productId.toString() === productId,
      );
      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: productData.find((p) => p._id.toString() === productId).title,
          },
          unit_amount: Math.round(Number(item.totalAmount) * 100),
        },
        quantity: 1,
      };
    }),
  );

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: stripeLineItems,
    customer_email: email,
    success_url: `${process.env.CLIENT_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/cart`,
    metadata: {
      influencerId,
      brandSummary: JSON.stringify(Object.values(brandSummaries)),
      address: JSON.stringify(address),
      productData: JSON.stringify(productData),
      customerInfo: JSON.stringify({ email, name, phone }),
      couponCode: coupon ? coupon.name : "",
    },
  });

  if (coupon) {
    coupon.usage += 1;
    await coupon.save();
  }

  const totalAmount = Object.values(brandSummaries).reduce(
    (sum, brand) => sum + brand.totalAmount,
    0,
  );

  res.status(200).json({
    success: true,
    checkoutUrl: session.url,
    totalAmount: totalAmount.toFixed(2),
  });
});

export const handleStripeCheckout = asyncHandler(async (req, res, next) => {
  const { session_id } = req.body;
  try {
    // Add session status check and retrieve session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Check if payment is not successful
    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
      });
    }

    // Check for existing order with either payment intent or session ID
    const existingOrder = await Order.findOne({
      $or: [
        { paymentId: session.payment_intent },
        { "metadata.sessionId": session_id },
      ],
    });

    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: "Order already processed",
        order: existingOrder,
      });
    }

    const {
      influencerId,
      productData,
      address,
      customerInfo: rawCustomerInfo,
      brandIds,
      affiliation,
      sponsor,
      couponCode,
    } = session.metadata;

    const customerData = JSON.parse(rawCustomerInfo);

    const influencer = await User.findById(influencerId);
    if (!influencer) throw ApiError(404, "Influencer not found");

    const addressData = JSON.parse(address);
    const productsData = JSON.parse(productData);

    let buyer =
      (await User.findOne({ email: customerData.email })) ||
      (await Guest.findOne({ email: customerData.email }));

    if (!buyer) {
      buyer = new Guest({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: addressData,
      });
      await buyer.save();
    }

    // Calculate order items and commissions
    const orderItems = await Promise.all(
      productsData.map(async (p) => {
        const product = await Product.findById(p._id);
        if (!product) throw ApiError(404, `Product with ID ${p._id} not found`);

        const commissionId = await Commision.findOne({
          productId: p._id,
          "recipients.userId": influencerId,
        });

        const commissionPercentage =
          commissionId?.recipients.find(
            (recipient) => recipient.userId.toString() === influencerId,
          )?.percentage || product.commissionPercentage;

        const quantity = Number(p.quantity) || 1;

        const unitPrice = product.pricing;
        const shippingAmount =
          (await calculateShipping(product.brandId, addressData.country)) || 0;
        const vatAmount =
          Number(quantity * unitPrice * countryVat(addressData.country)) || 0;
        let commission = Number((unitPrice * commissionPercentage) / 100) || 0;

        return {
          productId: p._id,
          brandId: product.brandId, // Add brandId
          name: product.title,
          quantity,
          unitPrice, // Use unitPrice instead of price
          totalAmount: quantity * unitPrice + shippingAmount + vatAmount, // Calculate total amount
          shippingAmount, // Ensure shipping amount
          vatAmount, // Calculate VAT
          commission,
        };
      }),
    );

    let coupon;
    if (couponCode) {
      coupon = await Coupon.findOne({
        name: couponCode,
        brandId: { $in: productsData.map((p) => p.brandId) },
        isActive: true,
      });
      if (!coupon) {
        throw ApiError(404, "Coupon not found or inactive");
      }

      if (coupon.expiry && new Date() > coupon.expiry) {
        throw ApiError(400, "Coupon has expired");
      }

      if (coupon.usage > coupon.usageLimit) {
        throw ApiError(400, "Coupon usage limit reached");
      }

      orderItems.forEach((item) => {
        if (item.brandId.toString() === coupon.brandId.toString()) {
          if (coupon.discount.type === "PERCENTAGE") {
            item.unitPrice *= 1 - coupon.discount.amount / 100;
          } else if (coupon.discount.type === "AMOUNT") {
            item.unitPrice = Math.max(
              0,
              item.unitPrice - coupon.discount.amount,
            );
          }
          item.totalAmount =
            item.unitPrice * item.quantity +
            item.shippingAmount +
            item.vatAmount;
        }
      });
      coupon.usage += 1;
      await coupon.save();
    }


    // Create the order with more comprehensive details
    const order = new Order({
      orderNumber: generateOrderNumber(),
      influencerId,
      orderItems,
      customerInfo: {
        name: customerData.name,
        email: customerData.email,
      },
      userId: buyer._id,
      userModel: buyer instanceof Guest ? "Guest" : "User",
      totalAmount: session.amount_total / 100,
      paymentId: session.payment_intent,
      status: "paid",
      shippingStatus: "pending",
      shippingAddress: addressData,
      vatAmount:
        Number(
          productsData.reduce(
            (sum, p) =>
              sum + p.quantity * p.pricing * countryVat(addressData.country),
            0,
          ),
        ) || 0,
      shippingAmount:
        Number(orderItems.reduce((sum, p) => sum + p.shippingAmount, 0)) || 0,
      metadata: {
        sessionId: session_id,
      },
    });

    await order.save();

    // payment transfers and affiliation updates
    await handlePaymentTransfers(order, session.payment_intent);
    const affiliationUpdate = await updateAffiliation(
      influencerId,
      productsData.map((p) => p._id),
    );


    const emailContent = `
      <div>
        <h1>Order Confirmation</h1>
        <p>Dear ${customerData.name},</p>
        <p>Thank you for your order! Here are your order details:</p>
        <ul>
          ${orderItems
            .map(
              (item) => `
            <li>
              <strong>Product:</strong> ${item.name}<br>
              <strong>Quantity:</strong> ${item.quantity}<br>
              <strong>VAT:</strong> $${item.vatAmount}<br>
              <strong>Shipping:</strong> $${item.shippingAmount}<br>
              <strong>Price:</strong> $${item.totalAmount}<br>
            </li>
          `,
            )
            .join("")}
        </ul>
        <p><strong>Shipping Address:</strong></p>
        <p>${addressData.line1 || ""}, ${addressData.line2 || ""}, ${addressData.city || ""}, ${addressData.state || ""}, ${addressData.postalCode || ""}</p>
        <p>We appreciate your business!</p>
      </div>
    `;

    await sendCustomEmail(
      customerData.email,
      "Order Confirmation",
      emailContent,
    );

    res.status(200).json({
      success: true,
      order,
      affiliationUpdate,
    });
  } catch (error) {
    console.error("Error handling Stripe checkout:", error);
    next(error);
  }
});

function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to handle payment transfers
const handlePaymentTransfers = async (order, paymentIntentId) => {

  const brandTransfers = {};
  let influencerAmount = 0;

  // Calculate amounts for each party and retrieve brand Stripe IDs
  await Promise.all(
    order.orderItems.map(async (item) => {
      try {
        const brand = await User.findById(item.brandId).select(
          "stripeAccountId plan",
        );
        if (!brand) {
          throw new Error(`Brand with ID ${item.brandId} not found.`);
        }

        if (!brand.stripeAccountId) {
          console.error(`Brand ${item.brandId} has no Stripe account ID`);
          return;
        }

        if (
          typeof brand.stripeAccountId !== "string" ||
          !brand.stripeAccountId.startsWith("acct_")
        ) {
          console.error(
            `Invalid Stripe account ID for brand ${item.brandId}:`,
            brand.stripeAccountId,
          );
          return;
        }
        const platformAmt = platformFee[brand.plan] || 0;
        const brandAmount =
          item.unitPrice * item.quantity -
          item.commission +
          item.shippingAmount +
          item.vatAmount -
          ((item.unitPrice * item.quantity -
            item.commission +
            item.shippingAmount +
            item.vatAmount) *
            platformAmt) /
            100;

        brandTransfers[brand.stripeAccountId] =
          (brandTransfers[brand.stripeAccountId] || 0) +
          Math.round(brandAmount);

        influencerAmount += item.commission;
      } catch (error) {
        console.error(`Error processing brand ${item.brandId}:`, error);
      }
    }),
  );


  const influencer = await User.findById(order.influencerId).select(
    "stripeAccountId plan",
  );
  if (
    !influencer ||
    !influencer.stripeAccountId ||
    !influencer.stripeAccountId.startsWith("acct_")
  ) {
    console.error(
      `Invalid influencer Stripe account for ID ${order.influencerId}`,
    );
    return;
  }

  const influencerFee =
    Number(influencerAmount - (influencerAmount * platformFee[influencer.plan]) / 100);
  // Process transfers

 
  const transferPromises = [
    // Transfer to brands
    ...Object.entries(brandTransfers).map(([stripeAccountId, amount]) => {
      const amountInCents = Math.max(0, Math.round(amount * 100));
      const influencerFeeInCents = Math.max(0, Math.round(influencerFee * 100));

      if (amountInCents === 0) {
        console.warn(
          `Skipping transfer to ${stripeAccountId} - amount too small`,
        );
        return Promise.resolve(null);
      } 

      return stripe.transfers
        .create({
          amount: amountInCents,
          currency: "eur",
          destination: stripeAccountId,
          // source_transaction: paymentIntentId,
        })
        .catch((error) => {
          console.error(`Transfer to brand ${stripeAccountId} failed:`, error);
          return null;
        });
    }),

    stripe.transfers
      .create({
        amount: Math.max(0, Math.round(influencerFee * 100)),
        currency: "eur",
        destination: influencer.stripeAccountId,
        // source_transaction: paymentIntentId,
      })
      .catch((error) => {
        console.error(`Transfer to influencer failed:`, error);
        return null;
      }),
  ];

  // Wait for all transfers
  const transferResults = await Promise.all(transferPromises);

};

const updateAffiliation = async (influencerId, productIds) => {
  const affiliationUpdateData = await Affiliation.find({
    influencerId,
    productId: { $in: productIds },
  }).populate("productId");
  const affiliationUpdates = affiliationUpdateData.map(async (aff) => {
    aff.totalSaleQty += 1;
    const diff =
      Number(aff.productId.pricing) - Number(aff.productId.wholesalePricing);
    aff.totalSaleRevenue += diff;
    return aff.save();
  });
  await Promise.all(affiliationUpdates);
  return affiliationUpdateData;
};

const calculateShipping = async (brandId, country) => {
  const shipping = await Shipping.findOne({ brandId, countries: country });
  return Number(shipping?.shippingCharges) || 0;
};

export const handleTipping = asyncHandler(async (req, res) => {
  const { influencerId, amount, title, message } = req.body;

  // Validate inputs
  if (!amount || amount <= 0) {
    throw ApiError(400, "Invalid amount");
  }

  const influencer = await User.findById(influencerId);
  if (!influencer) {
    throw ApiError(404, "Influencer not found");
  }

  if (!influencer.stripeAccountId) {
    throw ApiError(400, "Influencer has no connected Stripe account");
  }

  // Get commission rate based on influencer's plan
  let commissionRate;
  switch (influencer.plan) {
    case "pro":
      commissionRate = 0.05;
      break;
    case "premium":
      commissionRate = 0.03;
      break;
    default:
      commissionRate = 0.1;
  }

  const amountInCents = Math.round(amount * 100);
  const platformFeeInCents = Math.round(amountInCents * commissionRate);
  const stripeFeeInCents = Math.round(amountInCents * 0.029 + 30);
  const influencerAmountInCents =
    amountInCents - platformFeeInCents - stripeFeeInCents;

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: title || "Tip for Creator",
            description: message || `Tip amount: €${amount}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.CLIENT_URL}/tipping-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/tipping`,
    metadata: {
      influencerId,
      title,
      message,
      type: "tip",
      influencerAmount: influencerAmountInCents,
      platformFee: platformFeeInCents,
      plan: influencer.plan,
    },
  });

  res.status(200).json({
    success: true,
    checkoutUrl: session.url,
    breakdown: {
      tipAmount: amount,
      platformFee: platformFeeInCents / 100,
      stripeFee: stripeFeeInCents / 100,
      influencerReceives: influencerAmountInCents / 100,
    },
  });
});

export const handleTippingSuccess = asyncHandler(async (req, res) => {
  try {
    // Check both query params and request body for session_id
    const session_id = req.query.session_id || req.body.session_id;

    // Validate session_id exists
    if (!session_id) {
      throw ApiError(400, "Session ID is required");
    }

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Verify payment status
    if (session.payment_status !== "paid") {
      throw ApiError(400, "Payment not completed");
    }

    // Check if this session was already processed
    // You might want to store processed sessions in your database
    const { influencerId, title, message, influencerAmount, type } =
      session.metadata;

    // Verify this is a tip payment
    if (type !== "tip") {
      throw ApiError(400, "Invalid session type");
    }

    const influencer = await User.findById(influencerId);
    if (!influencer) {
      throw ApiError(404, "Influencer not found");
    }

    if (!influencer.stripeAccountId) {
      throw ApiError(400, "Influencer has no connected Stripe account");
    }

    // Transfer the calculated amount to influencer
    const transfer = await stripe.transfers.create({
      amount: parseInt(influencerAmount),
      currency: "eur",
      destination: influencer.stripeAccountId,
      transfer_group: `tip_${session_id}`, // Help track related transfers
    });

    // Send email notification
    await sendCustomEmail(
      influencer.email,
      title || "You received a tip!",
      `${message || "Someone tipped you!"}\n\nAmount: €${parseInt(influencerAmount) / 100}`,
    );

    return res.status(200).json({
      success: true,
      transfer: transfer.id,
      breakdown: {
        totalAmount: session.amount_total / 100,
        influencerReceived: parseInt(influencerAmount) / 100,
        platformFee: (session.amount_total - parseInt(influencerAmount)) / 100,
      },
    });
  } catch (error) {
    console.error("Error processing tip success:", error);
    throw ApiError(500, error?.message || "Error processing tip payment");
  }
});
