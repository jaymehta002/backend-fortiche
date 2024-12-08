import Stripe from "stripe";
import { Affiliation } from "../affiliation/affiliation_model.js";
import Guest from "../guest/guest.model.js";
import Order from "../orders/order.model.js"; // Assuming you have an Order model
import { Product } from "../product/product.model.js";
import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendProductPurchaseMail } from "../preference/preference.service.js";
import { stripeClient } from "../lib/stripe.js";
import { User } from "../user/user.model.js";
import Shipping from "../shipping/shipping.model.js";
import countryVat from "country-vat";
import Commision from "../commision/commision.model.js";
import sponsorshipModel from "../sponsor/sponsorship.model.js";
import {
  sendCustomEmail,
  sendProductPurchaseEmail,
} from "../mail/mailgun.service.js";
import { applyCoupon } from "../coupon/coupon.controller.js";
import Coupon from "../coupon/coupon_model.js";
// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a payment session for an influencer
export const checkoutInfluencer = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    // Ensure the user is an influencer and has a Stripe account
    if (!user || user.accountType !== "influencer") {
      throw ApiError(403, "Action restricted");
    }
    if (!user.stripeAccountId) {
      throw ApiError(
        400,
        "No Stripe account found. Please connect your Stripe account first.",
      );
    }

    const { productId } = req.body;

    // Find the product and brand
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError(404, "Product not found");
    }

    const brand = await User.findById(product.brandId);
    if (!brand || !brand.stripeAccountId) {
      throw ApiError(
        404,
        "Brand not found or brand's Stripe account not connected",
      );
    }

    // Verify brand's Stripe account capabilities
    const brandAccount = await stripe.accounts.retrieve(brand.stripeAccountId);
    if (!brandAccount.capabilities?.transfers === 'active') {
      throw ApiError(400, "Brand's Stripe account is not properly set up for transfers. Please contact support.");
    }

    // Create line item with conditional description
    const lineItem = {
      price_data: {
        currency: "eur",
        product_data: {
          name: product.title,
        },
        unit_amount: product.wholesalePricing * 100,
      },
      quantity: 1,
    };

    // Only add description if it exists
    if (product.description) {
      lineItem.price_data.product_data.description = product.description;
    }
 
    const account = await stripe.accounts.retrieve(brand.stripeAccountId);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [lineItem],
      customer_email: user.email,
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard`,
      metadata: {
        productId: productId,
        userId: user._id.toString(),
        address: JSON.stringify(user.address),
        stripeAccountId: user.stripeAccountId,
        brandStripeAccountId: brand.stripeAccountId,
      },
      payment_intent_data: {
        transfer_data: {
          destination: brand.stripeAccountId,
        },
        application_fee_amount: Math.floor(product.pricing * 10), // 10% platform fee
      },
    });

    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    next(error);
  }
});

export const handleSuccessPage = async (req, res) => {
  try {
    const { session_id } = req.body;

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Check for existing order first
    const existingOrder = await Order.findOne({
      paymentId: session.payment_intent,
    });

    if (existingOrder) {
      // Instead of error, return success with existing order
      return res.status(200).json({
        success: true,
        message: "Order already processed",
        orderId: existingOrder._id,
      });
    }
    console.log(session.payment_status , "session.payment_status"); 
    if (session.payment_status === "paid") {
      const { metadata } = session;
      const { productId, userId, address } = metadata;

      // Find the product and user
      const [product, user] = await Promise.all([
        Product.findById(productId),
        User.findById(userId),
      ]);

      if (!product) {
        throw new Error("Product not found");
      }

      if (!user) {
        throw new Error("User not found");
      }

      // Parse address if it's a string
      const shippingAddress =
        typeof address === "string" ? JSON.parse(address) : address;

         console.log(shippingAddress)
      // Create an order with all required fieds
      const newOrder = new Order({
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        influencerId: userId,
        productId: productId,
        totalAmount: product.pricing,
        paymentId: session.payment_intent,
        status: "paid",
        shippingStatus: "pending",
        shippingAddress: {
          country: shippingAddress.country || "N/A",
          postalCode: shippingAddress.postalCode || "N/A",
          city: shippingAddress.city || "N/A",
          line1: shippingAddress.line1 || "N/A",
          line2: shippingAddress.line2 || "N/A",
          state: shippingAddress.state || "N/A",
        },
        stripeAccountId: metadata.stripeAccountId,
        brandStripeAccountId: metadata.brandStripeAccountId,
        customerInfo: {
          name: user.name || "N/A",
          email: user.email || "N/A",
        },
        userId: userId,
        userModel: "User", // Since this is for influencers, we know it's a User
      });

      await newOrder.save();

      res.status(200).json({
        success: true,
        message: "Payment successful and order created",
        orderId: newOrder._id,
      });
    } else {
      throw ApiError(400,"Payment not successful");
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    // transfer 10% to influencer and 90% to platform

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
    console.log(newOrders);

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

  console.log("influencer not found");
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

    if (coupon.usage >= coupon.usageLimit) {
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

    console.log("Calculation details:", {
      unitPrice,
      quantity,
      vatRate,
      vatAmount,
      shippingAmount,
      commissionPercentage,
      commission,
      subtotal,
      totalAmount,
    });

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
      console.log("Item found:", item);
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
      orderItems: JSON.stringify(orderItems),
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

  // console.log("Product:", productData);
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
    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    // Check for existing order with either payment intent or session ID
    const existingOrder = await Order.findOne({
      $or: [
        { paymentId: session.payment_intent },
        { 'metadata.sessionId': session_id }
      ]
    });

    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: 'Order already processed',
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
    console.log("Customer data:", customerData.email);

    const influencer = await User.findById(influencerId);
    if (!influencer) throw ApiError(404, "Influencer not found");
    console.log("Influencer found:", influencer);

    const addressData = JSON.parse(address);
    const productsData = JSON.parse(productData);
    console.log("Products data:", productsData);

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
    console.log(buyer);

    // Calculate order items and commissions
    const orderItems = await Promise.all(
      productsData.map(async (p) => {
        const product = await Product.findById(p._id);
        if (!product) throw ApiError(404, `Product with ID ${p._id} not found`);

        const commission = await Commision.findOne({
          productId: p._id,
          "recipients.userId": influencerId,
        });

        const commissionPercentage =
          commission?.recipients.find(
            (recipient) => recipient.userId.toString() === influencerId,
          )?.percentage || product.commissionPercentage;

        const quantity = Number(p.quantity) || 1;

        return {
          productId: p._id,
          brandId: product.brandId, // Add brandId
          name: product.title,
          quantity,
          unitPrice: product.pricing, // Use unitPrice instead of price
          totalAmount: quantity * product.pricing, // Calculate total amount
          shippingAmount: p.shippingCharges || 0, // Ensure shipping amount
          vatAmount:
            Number(
              quantity * product.pricing * countryVat(addressData.country),
            ) || 0, // Calculate VAT
          commission:
            Number((product.pricing * commissionPercentage) / 100) || 0,
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

      if (coupon.usage >= coupon.usageLimit) {
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

    console.log("Order items:", orderItems);

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
        Number(productsData.reduce((sum, p) => sum + p.shippingCharges, 0)) ||
        0,
      metadata: {
        sessionId: session_id
      }
    });

    await order.save();
    console.log("Order created:", order);

    // payment transfers and affiliation updates
    await handlePaymentTransfers(order, session.payment_intent);
    const affiliationUpdate = await updateAffiliation(
      influencerId,
      productsData.map((p) => p._id),
    );

    console.log("Payment transfers and affiliation updates completed");

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
              <strong>Price:</strong> $${item.totalAmount}<br>
              <strong>VAT:</strong> $${item.vatAmount}<br>
              <strong>Shipping:</strong> $${item.shippingAmount}<br>
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

    await sendCustomEmail(customerData.email, "Order Confirmation", emailContent);
    console.log("Order confirmation email sent to:", customerData.email);

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
  console.log("Handling payment transfers for order:", order._id);

  const brandTransfers = {};
  let influencerAmount = 0;

  // Calculate amounts for each party and retrieve brand Stripe IDs
  await Promise.all(
    order.orderItems.map(async (item) => {
      try {
        const brand = await User.findById(item.brandId).select(
          "stripeAccountId",
        );

        // Validate Stripe account ID
        if (!brand) {
          throw new Error(`Brand with ID ${item.brandId} not found.`);
        }

        if (!brand.stripeAccountId) {
          console.error(`Brand ${item.brandId} has no Stripe account ID`);
          return; // Skip this brand instead of throwing an error
        }

        // Validate Stripe account ID format
        if (
          typeof brand.stripeAccountId !== "string" ||
          !brand.stripeAccountId.startsWith("acct_")
        ) {
          console.error(
            `Invalid Stripe account ID for brand ${item.brandId}:`,
            brand.stripeAccountId,
          );
          return; // Skip this brand
        }

        console.log("Brand found:", brand);

        const brandAmount = item.unitPrice * item.quantity - item.commission;

        brandTransfers[brand.stripeAccountId] =
          (brandTransfers[brand.stripeAccountId] || 0) + brandAmount;

        influencerAmount += item.commission;
      } catch (error) {
        console.error(`Error processing brand ${item.brandId}:`, error);
      }
    }),
  );

  console.log("Brand transfers:", brandTransfers);
  console.log("Influencer amount:", influencerAmount);

  const influencer = await User.findById(order.influencerId).select(
    "stripeAccountId",
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

  // Process transfers
  const transferPromises = [
    // Transfer to brands
    ...Object.entries(brandTransfers).map(([stripeAccountId, amount]) => {
      const amountInCents = Math.max(0, Math.round(amount * 100));

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

    // Transfer to influencer
    stripe.transfers
      .create({
        amount: Math.max(0, Math.round(influencerAmount * 100)),
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

  console.log("Transfers completed", transferResults);
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

const createOrder = async ({
  guestId = null,
  productId,
  totalAmount,
  paymentId,
  shippingAddress,
  stripeAccountId,
  brandStripeAccountId,
}) => {
  const newOrder = new Order({
    guestId,
    productId,
    totalAmount,
    paymentId,
    status: "paid",
    shippingStatus: "pending",
    shippingAddress,
    stripeAccountId,
    brandStripeAccountId,
  });

  return await newOrder.save();
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

  // Calculate total amount including Stripe fee that sender will pay
  // Stripe fee is 2.9% + $0.30
  const stripeFeePercentage = 0.029;
  const stripeFeeFixed = 0.3;

  // Calculate the total amount sender needs to pay to ensure influencer gets the desired amount
  const desiredAmountInCents = Math.round(amount * 100); // The amount influencer should receive
  const totalAmountInCents = Math.round(
    (desiredAmountInCents + stripeFeeFixed * 100) / (1 - stripeFeePercentage),
  );

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
            description:
              message || `Tip amount: $${amount} (including processing fees)`,
          },
          unit_amount: totalAmountInCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/checkout`,
    metadata: {
      influencerId,
      title,
      message,
      type: "tip",
      originalAmount: desiredAmountInCents,
      totalAmount: totalAmountInCents,
    },
    payment_intent_data: {
      transfer_data: {
        destination: influencer.stripeAccountId,
        amount: desiredAmountInCents,
      },
    },
  });

  res.status(200).json({
    success: true,
    checkoutUrl: session.url,
    breakdown: {
      tipAmount: amount,
      processingFee: (totalAmountInCents - desiredAmountInCents) / 100,
      totalCharge: totalAmountInCents / 100,
    },
  });
});

export const handleTippingSuccess = async (req, res) => {
  const { session_id } = req.query;
  const session = await stripe.checkout.sessions.retrieve(session_id);
  const { influencerId, title, message } = session.metadata;
  const influencer = await User.findById(influencerId);
  if (!influencer) {
    throw ApiError(404, "Influencer not found");
  }
  await stripe.transfers.create({
    amount: session.amount_total,
    currency: "eur",
    destination: influencer.stripeAccountId,
  });
  await sendCustomEmail(influencer.email, title, message);
  // res.redirect(process.env.FRONTEND_URL);
  return res.status(200).json({ success: true });
};
