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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: product.title,
              description: product.description,
            },
            unit_amount: product.pricing * 100,
          },
          quantity: 1,
        },
      ],
      customer_email: user.email,
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard`,
      metadata: {
        productId: productId,
        userId: user._id.toString(),
        address: user.address,
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

    const existingOrder = await Order.findOne({
      paymentId: session.payment_intent,
    });

    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: "This session has already been used for an order.",
      });
    }

    if (session.payment_status === "paid") {
      const { metadata } = session;
      const { productId, userId, address } = metadata;

      // Find the product
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Create an order
      const newOrder = new Order({
        influencerId: userId,
        productId: productId,
        totalAmount: product.pricing,
        paymentId: session.payment_intent,
        status: "paid",
        shippingStatus: "pending",
        shippingAddress: address || defaultAddress,
        stripeAccountId: metadata.stripeAccountId,
        brandStripeAccountId: metadata.brandStripeAccountId,
      });

      await newOrder.save();

      res.status(200).json({
        success: true,
        message: "Payment successful and order created",
        orderId: newOrder._id,
      });
    } else {
      throw new Error("Payment not successful");
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
    const affiliation = await Affiliation.find({
      _id: { $in: affiliationIds },
    }).populate("productId");
    let totalPrice = 0;
    if (!affiliation) throw ApiError(404, "Affiliation not found");
    const products = affiliation.reduce((acc, aff) => {
      if (aff.productId) {
        acc.push({
          _id: aff.productId._id,
        });
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
      products.map((p) => ({
        _id: p._id,
      })),
    );
    console.log(totalPrice);
    // const product = await Product.findById(affiliation.productId);
    console.log(affiliation[0].influencerId);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Fortiche",
              description: products.length + "items",
            },
            unit_amount: totalPrice * 100 * quantity,
          },
          quantity: quantity,
        },
      ],
      customer_email: email, // Use guest's email
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        products: productsString,
        influencerId: affiliation[0].influencerId.toString(),
        name,
        email,
        phone,
        address: JSON.stringify(address),
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
  const { influencerId, products, address, email, name, phone } = req.body;

  // Validate influencer and products exist
  const influencer = await User.findById(influencerId);
  if (!influencer) throw ApiError(404, "Influencer not found");

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
  console.log(affiliations);
  if (affiliations.length !== products.length) {
    throw ApiError(400, "Invalid product affiliations");
  }
 

  // Calculate order items with proper grouping by brand
  const brandSummaries = {};
  const orderItems = [];


  for (const product of products) {
    const productInfo = productData.find(
      (p) => p._id.toString() === product.productId
    );
    if (!productInfo) continue;

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
    const unitPrice = productInfo.pricing;
    const quantity = product.quantity;
    const vatAmount = unitPrice * quantity * vatRate;
    const shippingAmount = calculateShipping(brandId, address.country); 
    const commission = (unitPrice * productInfo.commissionPercentage) / 100;
    const totalAmount = unitPrice * quantity + vatAmount + shippingAmount;

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
    brandSummaries[brandId].subtotal += unitPrice * quantity;
    brandSummaries[brandId].vatAmount += vatAmount;
    brandSummaries[brandId].shippingAmount += shippingAmount;
    brandSummaries[brandId].commission += commission * quantity;
    brandSummaries[brandId].totalAmount += totalAmount;
  }

  //generating stripe check out session
  const stripeLineItems = Object.values(brandSummaries).flatMap((brand) =>
    brand.items.map((productId) => {
      const item = orderItems.find((oi) => oi.productId.toString() === productId);
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: productData.find((p) => p._id.toString() === productId).title,
          },
          unit_amount: Math.round(item.totalAmount * 100),
        },
        quantity: 1,
      };
    })
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
      customerInfo: JSON.stringify({ email, name, phone }),
    },
  });

  const totalAmount = Object.values(brandSummaries).reduce(
    (sum, brand) => sum + brand.totalAmount,
    0
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
    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const {
      influencerId,
      products,
      address,
      email,
      brandIds,
      affiliation,
      sponsor,
      name,
      phone,
    } = session.metadata;

    const influencer = await User.findById(influencerId);
    if (!influencer) throw ApiError(404, "Influencer not found");

      // Check if order already exists
  // const existingOrder = await Order.findOne({
  //   paymentId: session.payment_intent,
  // });
  // if (existingOrder) {
  //   throw ApiError(400, "Order already exists");
  // }

 
    const addressData = JSON.parse(address);
    const productsData = JSON.parse(products).productDataWithQuantity;
 
    let buyer =
      (await User.findOne({ email })) || (await Guest.findOne({ email }));
    if (!buyer) {
      buyer = new Guest({
        name,
        email,
        phone,
        address: addressData,
      });
      await buyer.save();
    }

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

        return {
          productId: p._id,
          name: product.title,
          quantity: p.quantity,
          price: product.pricing,
          commission: (product.pricing * commissionPercentage) / 100,
        };
      })
    );

    // Calculate VAT and shipping
    const vatAmount = productsData.reduce(
      (sum, p) =>
        sum + p.quantity * p.pricing * countryVat(addressData.country),
      0
    );

    const shippingAmount = productsData.reduce(
      (sum, p) => sum + (p.shippingCharges || 0),
      0
    );

    // Create the order
    const order = new Order({
      influencerId,
      orderItems,
      userId: buyer._id,
      userModel: buyer instanceof Guest ? "Guest" : "User",
      totalAmount: session.amount_total / 100,
      paymentId: session.payment_intent,
      status: "paid",
      shippingStatus: "pending",
      shippingAddress: addressData,
      vatAmount,
      shippingAmount,
    });

    await order.save();

    // payment transfers and affiliation updates
    await handlePaymentTransfers(order, session.payment_intent);
    const affiliationUpdate = await updateAffiliation(
      influencerId,
      productsData.map((p) => p._id)
    );

 
    await stripe.checkout.sessions.expire(session_id);
 
    const emailContent = `
      <div>
        <h1>Order Confirmation</h1>
        <p>Dear ${name},</p>
        <p>Thank you for your order! Here are your order details:</p>
        <ul>
          ${orderItems
            .map(
              (item) => `
            <li>
              <strong>Product:</strong> ${item.name}<br>
              <strong>Quantity:</strong> ${item.quantity}<br>
              <strong>Price:</strong> $${item.price}<br>
            </li>
          `
            )
            .join("")}
        </ul>
        <p><strong>Shipping Address:</strong></p>
        <p>${addressData.street}, ${addressData.city}, ${addressData.state}, ${addressData.zip}</p>
        <p>We appreciate your business!</p>
      </div>
    `;

    await sendCustomEmail(
      influencer.email,
      "Order Confirmation",
      emailContent
    );

    res.status(200).json({
      success: true,
      order,
      affiliationUpdate,
    });
  } catch (error) {
    next(error);
  }
});


// Helper function to handle payment transfers
const handlePaymentTransfers = async (order, paymentIntentId) => {
  const brandTransfers = {};
  let influencerAmount = 0;

  // Calculate amounts for each party
  order.orderItems.forEach((item) => {
    const brandAmount = item.price * item.quantity - item.commission;
    if (brandTransfers[item.brandId]) {
      brandTransfers[item.brandId] += brandAmount;
    } else {
      brandTransfers[item.brandId] = brandAmount;
    }
    influencerAmount += item.commission;
  });

  // Process transfers
  await Promise.all([
    // Transfer to brands
    ...Object.entries(brandTransfers).map(([brandId, amount]) =>
      stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        destination: brandId,
        // source_transaction: paymentIntentId,
      }),
    ),
    // Transfer to influencer
    stripe.transfers.create({
      amount: Math.round(influencerAmount * 100),
      currency: "usd",
      destination: order.userId,
      // source_transaction: paymentIntentId,
    }),
  ]);
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
