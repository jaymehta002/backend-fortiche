import countryVat from "country-vat";
import Stripe from "stripe";
import { Affiliation } from "../affiliation/affiliation_model.js";
import Commision from "../commision/commision.model.js";
import Coupon from "../coupon/coupon_model.js";
import Guest from "../guest/guest.model.js";
import {
  sendBrandNewOrderEmail,
  sendCustomEmail,
  sendOrderConfirmationEmail,
} from "../mail/mailgun.service.js";
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

export const brandCheckout = asyncHandler(async (req, res) => {
  try {
    const { products, email, name, phone, address, couponCode } = req.body;

    // Validate required fields
    if (!email || !name || !address || !products?.length) {
      throw ApiError(400, "Missing required fields");
    }

    // Get product details and validate brand
    const productData = await Product.find({
      _id: { $in: products.map((p) => p.productId) },
    }).select(
      "_id brandId title pricing description productType downloadableDetails",
    );

    if (!productData.length) {
      throw ApiError(404, "Products not found");
    }

    // Ensure all products are from same brand
    const brandId = productData[0].brandId;
    if (
      !productData.every((p) => p.brandId.toString() === brandId.toString())
    ) {
      throw ApiError(400, "All products must be from the same brand");
    }

    const brand = await User.findById(brandId);
    if (!brand?.stripeAccountId) {
      throw ApiError(404, "Brand not found or not properly setup");
    }

    let orderItems = [];
    let subtotal = 0;
    let vatAmount = 0;
    const vatRate = Number(countryVat(address.country)) || 0;

    // Calculate items and totals
    for (const item of products) {
      const product = productData.find(
        (p) => p._id.toString() === item.productId,
      );
      if (!product) continue;

      const quantity = Number(item.quantity) || 1;
      let unitPrice = Number(product.pricing);
      const itemVat =
        product.productType === "downloadable"
          ? 0
          : Number(unitPrice * quantity * vatRate) || 0;
      const shippingAmount =
        product.productType === "downloadable"
          ? 0
          : (await calculateShipping(brandId, address.country)) || 0;

      const itemTotal = unitPrice * quantity;
      subtotal += itemTotal;
      vatAmount += itemVat;

      orderItems.push({
        productId: product._id,
        brandId: product.brandId,
        quantity,
        commission: 0,
        unitPrice,
        vatAmount: itemVat,
        shippingAmount,
        totalAmount: itemTotal + itemVat + shippingAmount,
      });
    }

    // Handle coupon if provided
    let couponDiscount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        name: couponCode,
        brandId,
        isActive: true,
      });

      if (
        !coupon ||
        (coupon.expiry && new Date() > coupon.expiry) ||
        coupon.usage >= coupon.usageLimit
      ) {
        throw ApiError(400, "Invalid or expired coupon");
      }

      if (coupon.minimumOrderValue > 0 && subtotal < coupon.minimumOrderValue) {
        throw ApiError(
          400,
          `Minimum order value of €${coupon.minimumOrderValue} required for this coupon`,
        );
      }

      if (coupon.discount.type === "PERCENTAGE") {
        couponDiscount = (subtotal * coupon.discount.amount) / 100;
      } else {
        couponDiscount = Math.min(coupon.discount.amount, subtotal);
      }

      // Apply discount to order items proportionally
      const discountRatio = 1 - couponDiscount / subtotal;
      orderItems = orderItems.map((item) => ({
        ...item,
        unitPrice: item.unitPrice * discountRatio,
        totalAmount:
          (item.totalAmount - item.vatAmount - item.shippingAmount) *
            discountRatio +
          item.vatAmount +
          item.shippingAmount,
      }));

   
    }

    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.totalAmount,
      0,
    );

    const platformFeePercentage = platformFee[brand.plan] || 10;
    const platformFeeAmount = (totalAmount * platformFeePercentage) / 100;

    // Create line items for Stripe with individual products
    const lineItems = orderItems.map((item) => {
      const product = productData.find(
        (p) => p._id.toString() === item.productId.toString(),
      );
      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: product.title,
          },
          unit_amount: Math.round((item.totalAmount / item.quantity) * 100),
        },
        quantity: item.quantity,
      };
    });

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      customer_email: email,
      success_url: `${process.env.CLIENT_URL}/brand-guest-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/`,
      metadata: {
        type: "brand_guest_purchase",
        brandId: brand._id.toString(),
        orderItems: JSON.stringify(orderItems),
        customerInfo: JSON.stringify({ name, email, phone }),
        address: JSON.stringify(address),
        couponCode,
        platformFee: platformFeeAmount.toString(),
      },
    });

    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
      breakdown: {
        subtotal,
        vatAmount,
        couponDiscount,
        platformFee: platformFeeAmount,
        total: totalAmount,
      },
    });
  } catch (error) {
    throw ApiError(500, error.message);
  }
});

export const handleBrandGuestSuccess = asyncHandler(async (req, res) => {
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
      type,
      brandId,
      orderItems: orderItemsJson,
      customerInfo: customerInfoJson,
      address: addressJson,
      couponCode
    } = session.metadata;

    if (type !== "brand_guest_purchase") {
      throw ApiError(400, "Invalid session type");
    }

    const orderItems = JSON.parse(orderItemsJson);
    const customerInfo = JSON.parse(customerInfoJson);
    const address = JSON.parse(addressJson);

    // Create or find guest
    let guest = await Guest.findOne({ email: customerInfo.email });
    if (!guest) {
      guest = new Guest({
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address,
      });
      await guest.save();
    }

    // Create single brand order
    const brandOrder = {
      brandId,
      items: orderItems.map((item) => item.productId),
      subtotal: orderItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
      vatAmount: orderItems.reduce((sum, item) => sum + item.vatAmount, 0),
      shippingAmount: orderItems.reduce(
        (sum, item) => sum + item.shippingAmount,
        0,
      ),
      totalAmount: orderItems.reduce((sum, item) => sum + item.totalAmount, 0),
      status: "pending",
      paymentStatus: "paid",
      paymentId: session.payment_intent,
    };
    
    let coupon = "";
    if(couponCode){
      coupon = await Coupon.findOne({name: couponCode, brandId, isActive: true});
    }

    if(coupon){
      coupon.usage += 1;
      await coupon.save();
    }


    // Create order
    const newOrder = new Order({
      orderNumber: generateOrderNumber(),
      userId: guest._id,
      userModel: "Guest",
      orderItems,
      brandOrders: [brandOrder],
      totalAmount: session.amount_total / 100,
      paymentStatus: "paid",
      paymentId: session.payment_intent,
      shippingAddress: address,
      customerInfo,
    });

    await newOrder.save();
    await handlePaymentTransfers(newOrder, session.payment_intent);

    // Send confirmation emails
    const brand = await User.findById(brandId);
    await sendOrderEmails(newOrder, guest, brand);

    res.status(200).json({
      success: true,
      message: "Order created successfully",
      orderId: newOrder._id,
    });
  } catch (error) {
    throw ApiError(500, error.message);
  }
});

// Helper function for sending order emails
const sendOrderEmails = async (order, guest, brand) => {
  const productDetails = await Promise.all(
    order.orderItems.map(async (item) => {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found for id: ${item.productId}`);
      }
      return {
        ...product.toObject(),
        title: product.title,
        quantity: item.quantity,
        totalPrice: item.totalAmount,
        downloadableDetails: product.downloadableDetails,
        isDownloadable: product.productType === "downloadable",
      };
    }),
  );

  await sendOrderConfirmationEmail(
    guest.email,
    order,
    productDetails,
    productDetails.isDownloadable,
  );
  await sendBrandNewOrderEmail(
    brand.email,
    order,
    productDetails,
    productDetails.isDownloadable,
  );
};

// Create a payment session for an influencer
export const checkoutInfluencer = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    const { productId, quantity = 1 } = req.body;

    if (!user?.stripeAccountId || user.accountType !== "influencer") {
      throw ApiError(
        403,
        "Must be an influencer with connected Stripe account",
      );
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
    const shippingAmount =
      product.productType === "downloadable"
        ? 0
        : (await calculateShipping(brand._id, user.address?.country)) || 0;
    const commission = 0;
    const totalAmount = unitPrice * quantity + vatAmount + shippingAmount;

    // Calculate platform fee based on brand's plan
    const platformFeePercentage = platformFee[brand.plan] || 10;
    const platformFeeAmount = (totalAmount * platformFeePercentage) / 100;

    // Create line item
    const lineItem = {
      price_data: {
        currency: "eur",
        product_data: {
          name: product.title,
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
        productType: product.productType,
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
      isDownloadable: product.productType === "downloadable",
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

    // Check for existing order with this payment intent
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
      productType,
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
    const brandData = await User.findById(brandId);
    const product = await Product.findById(productId);

    if (!influencerData || !brandData || !product) {
      throw ApiError(404, "Required data not found");
    }

    console.log(influencerData, "influencerData");
    console.log(brandData, "brandData");

    // Generate a single order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36)}`;

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
      orderNumber,
      influencerId,
      userId: influencerId,
      userModel: "User",
      orderItems: [orderItem],
      brandOrders: [brandOrderSummary],
      totalAmount: Number(totalAmount),
      paymentStatus: "paid",
      paymentId: session.payment_intent,
      shippingAddress: address,
      customerInfo: {
        email: influencerData.email,
        name: influencerData.fullName,
      },
    });

    await newOrder.save();

    const getEmailContent = (isDownloadable, recipientType) => {
      let baseContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">${isDownloadable ? "Digital Product Purchase" : "Order Confirmation"}</h1>
          <p>Order Number: ${orderNumber}</p>
          <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
            <h3>Product Details:</h3>
            <p><strong>Product:</strong> ${product.title}</p>
            <p><strong>Quantity:</strong> ${quantity}</p>
            <p><strong>Unit Price:</strong> €${unitPrice}</p>
            ${vatAmount > 0 ? `<p><strong>VAT:</strong> €${vatAmount}</p>` : ""}
            ${!isDownloadable ? `<p><strong>Shipping:</strong> €${shippingAmount}</p>` : ""}
            <p><strong>Total Amount:</strong> €${totalAmount}</p>
          </div>
      `;

      if (isDownloadable && recipientType === "influencer") {
        baseContent += `
          <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
            <h3>Download Your Product</h3>
            <p>Your download link: <a href="${product.downloadableDetails.fileUpload}">Click here to download</a></p>
            <p style="color: #ff0000;"><strong>Important:</strong> This download link will expire in 24 hours.</p>
          </div>
        `;
      }

      if (!isDownloadable && recipientType === "influencer") {
        baseContent += `
          <div style="margin: 20px 0;">
            <h3>Shipping Details:</h3>
            <p>${JSON.parse(address).line1}</p>
            <p>${JSON.parse(address).city}, ${JSON.parse(address).state}</p>
            <p>${JSON.parse(address).postalCode}, ${JSON.parse(address).country}</p>
          </div>
        `;
      }

      if (recipientType === "brand") {
        baseContent += `
          <div style="margin: 20px 0;">
            <h3>Buyer Information:</h3>
            <p><strong>Influencer Name:</strong> ${influencerData.fullName}</p>
            <p><strong>Email:</strong> ${influencerData.email}</p>
            ${
              !isDownloadable
                ? `
              <h3>Shipping Address:</h3>
              <p>${JSON.parse(address).line1}</p>
              <p>${JSON.parse(address).city}, ${JSON.parse(address).state}</p>
              <p>${JSON.parse(address).postalCode}, ${JSON.parse(address).country}</p>
            `
                : ""
            }
          </div>
        `;
      }

      baseContent += `
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p>Thank you for your business!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      `;

      return baseContent;
    };

    const isDownloadable = productType === "downloadable";

    await sendCustomEmail(
      influencerData.email,
      isDownloadable
        ? "Your Digital Product Purchase"
        : "Your Order Confirmation",
      getEmailContent(isDownloadable, "influencer"),
    );

    if (brandData?.email) {
      await sendCustomEmail(
        brandData.email`New ${isDownloadable ? "Digital" : ""} Order Received`,
        getEmailContent(isDownloadable, "brand"),
      );
    }

    await handlePaymentTransfers(newOrder, session.payment_intent);

    res.status(200).json({
      success: true,
      message: "Payment successful and order created",
      orderId: newOrder._id,
      downloadLink: isDownloadable
        ? product.downloadableDetails.fileUpload
        : null,
      isDownloadable,
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
      delay_days: 30,
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

  // Process products first to calculate brand-specific totals
  for (const product of products) {
    const productInfo = productData.find(
      (p) => p._id.toString() === product.productId,
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

    // Calculate base amounts before coupon
    let unitPrice = Number(productInfo.pricing);
    const quantity = Number(product.quantity) || 1;
    const vatRate = Number(countryVat(address.country)) || 0;
    const vatAmount = Number(unitPrice * quantity * vatRate) || 0;
    const shippingAmount =
      Number(await calculateShipping(brandId, address.country)) || 0;
    const commissionPercentage = Number(productInfo.commissionPercentage) || 0;
    const commission = Number((unitPrice * commissionPercentage) / 100) || 0;

    const subtotal = Number(unitPrice * quantity) || 0;
    const totalAmount = Number(subtotal + vatAmount + shippingAmount) || 0;

    // Add to brand summary for coupon validation
    brandSummaries[brandId].subtotal += subtotal;
    brandSummaries[brandId].items.push(product.productId);
  }

  // Handle coupon if provided
  let coupon;
  if (couponCode) {
    coupon = await Coupon.findOne({
      name: couponCode,
      brandId: { $in: Object.keys(brandSummaries) },
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

    const brandSubtotal = brandSummaries[coupon.brandId.toString()].subtotal;
    if (
      coupon.minimumOrderValue > 0 &&
      brandSubtotal < coupon.minimumOrderValue
    ) {
      throw ApiError(
        400,
        `Minimum order value of €${coupon.minimumOrderValue} required for this coupon`,
      );
    }
  }

  // Now process products again to apply discounts and create final order items
  for (const product of products) {
    const productInfo = productData.find(
      (p) => p._id.toString() === product.productId,
    );
    if (!productInfo) continue;

    let unitPrice = Number(productInfo.pricing);
    const quantity = Number(product.quantity) || 1;
    const brandId = productInfo.brandId.toString();

    // Apply coupon discount if applicable
    if (coupon && coupon.brandId.toString() === brandId) {
      if (coupon.discount.type === "PERCENTAGE") {
        unitPrice *= 1 - coupon.discount.amount / 100;
      } else if (coupon.discount.type === "AMOUNT") {
        unitPrice = Math.max(0, unitPrice - coupon.discount.amount);
      }
    }

    const vatRate = Number(countryVat(address.country)) || 0;
    const vatAmount = Number(unitPrice * quantity * vatRate) || 0;
    const shippingAmount =
      Number(await calculateShipping(brandId, address.country)) || 0;
    const commissionPercentage = Number(productInfo.commissionPercentage) || 0;
    const commission = Number((unitPrice * commissionPercentage) / 100) || 0;

    const totalAmount = unitPrice * quantity + vatAmount + shippingAmount;

    // Create order item
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

    // Update brand summary with final amounts
    brandSummaries[brandId].vatAmount += vatAmount;
    brandSummaries[brandId].shippingAmount += shippingAmount;
    brandSummaries[brandId].commission += commission;
    brandSummaries[brandId].totalAmount += totalAmount;
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: orderItems.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: productData.find(
            (p) => p._id.toString() === item.productId.toString(),
          ).title,
        },
        unit_amount: Math.round(item.totalAmount * 100),
      },
      quantity: 1,
    })),
    customer_email: email,
    success_url: `${process.env.CLIENT_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/${influencer.username}/cart`,
    metadata: {
      influencerId,
      brandSummary: JSON.stringify(Object.values(brandSummaries)),
      address: JSON.stringify(address),
      productData: JSON.stringify(productData),
      customerInfo: JSON.stringify({ email, name, phone }),
      couponCode: coupon ? coupon.name : "",
    },
  });

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

        const brand = await User.findById(product.brandId);
        if (!brand) throw ApiError(404, "Brand not found");

        const commissionPercentage =
          commissionId?.recipients.find(
            (recipient) => recipient.userId.toString() === influencerId,
          )?.percentage || product.commissionPercentage;

        const quantity = Number(p.quantity) || 1;
        const unitPrice = Number(product.pricing);
        const shippingAmount =
          product.productType === "downloadable"
            ? 0
            : (await calculateShipping(product.brandId, addressData.country)) ||
              0;
        const vatAmount =
          product.productType === "downloadable"
            ? 0
            : Number(quantity * unitPrice * countryVat(addressData.country)) ||
              0;
        const commission =
          Number((unitPrice * commissionPercentage) / 100) || 0;
        const totalAmount = quantity * unitPrice + shippingAmount + vatAmount;

        return {
          productId: p._id,
          brandId: product.brandId,
          title: product.title,
          quantity,
          unitPrice,
          commission,
          vatAmount,
          shippingAmount,
          totalAmount,
          status: "pending",
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
      paymentId: session.payment_intent,
      paymentStatus: "paid",
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
      totalAmount: session.amount_total / 100,
      metadata: {
        sessionId: session_id,
      },
    });
    
    if(coupon){
      coupon.usage += 1;
      await coupon.save();
    }
    await order.save();

    // payment transfers and affiliation updates
    await handlePaymentTransfers(order, session.payment_intent);
    const affiliationUpdate = await updateAffiliation(
      influencerId,
      productsData.map((p) => p._id),
    );

    // Group order items by brand
    const orderItemsByBrand = orderItems.reduce((acc, item) => {
      if (!acc[item.brandId]) {
        acc[item.brandId] = [];
      }
      acc[item.brandId].push(item);
      return acc;
    }, {});

    const guestEmailContent = async (orderItems, customerData, addressData) => {
      let physicalProducts = [];
      let downloadableProducts = [];

      // Separate physical and downloadable products
      for (const item of orderItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        if (product.productType === "downloadable") {
          downloadableProducts.push({
            ...item,
            title: product.title,
            downloadLink: product.downloadableDetails.fileUpload,
          });
        } else {
          physicalProducts.push(item);
        }
      }

      // Create email content
      let emailContent = "";

      // Handle physical products
      if (physicalProducts.length > 0) {
        emailContent += `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Order Confirmation</h1>
            <p>Order Number: ${order.orderNumber}</p>
            <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
              <h3>Physical Products:</h3>
              ${physicalProducts
                .map(
                  (item) => `
                <div style="margin-bottom: 15px;">
                  <p><strong>Product:</strong> ${item.title}</p>
                  <p><strong>Quantity:</strong> ${item.quantity}</p>
                  <p><strong>Unit Price:</strong> €${item.unitPrice}</p>
                  ${item.vatAmount > 0 ? `<p><strong>VAT:</strong> €${item.vatAmount}</p>` : ""}
                  <p><strong>Shipping:</strong> €${item.shippingAmount}</p>
                  <p><strong>Total Amount:</strong> €${item.totalAmount}</p>
                </div>
              `,
                )
                .join("")}
            </div>
            <div style="margin: 20px 0;">
              <h3>Shipping Details:</h3>
              <p>${addressData.line1}</p>
              <p>${addressData.city}, ${addressData.state}</p>
              <p>${addressData.postalCode}, ${addressData.country}</p>
            </div>
          </div>
        `;
      }

      // Handle downloadable products
      if (downloadableProducts.length > 0) {
        emailContent += `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Digital Product Purchase</h1>
            <p>Order Number: ${order.orderNumber}</p>
            <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
              <h3>Digital Products:</h3>
              ${downloadableProducts
                .map(
                  (item) => `
                <div style="margin-bottom: 15px;">
                  <p><strong>Product:</strong> ${item.title}</p>
                  <p><strong>Quantity:</strong> ${item.quantity}</p>
                  <p><strong>Unit Price:</strong> €${item.unitPrice}</p>
                  ${item.vatAmount > 0 ? `<p><strong>VAT:</strong> €${item.vatAmount}</p>` : ""}
                  <p><strong>Total Amount:</strong> €${item.totalAmount}</p>
                  <div style="margin: 10px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
                    <h4>Download Your Product</h4>
                    <p>Your download link: <a href="${item.downloadLink}">Click here to download</a></p>
                    <p style="color: #ff0000;"><strong>Important:</strong> This download link will expire in 24 hours.</p>
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `;
      }

      emailContent += `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>Thank you for your business!</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      `;

      return emailContent;
    };

    const emailContent = await guestEmailContent(
      orderItems,
      customerData,
      addressData,
    );

    const influencerEmailContent = `
      <div>
        <h1>Commission Received</h1>
        <p>A new order has been placed by ${customerData.name} with the following details:</p>
        <ul>
          ${orderItems
            .map(
              (item) => `
            <li>
              <strong>Product:</strong> ${item.title}<br>
              <strong>Quantity:</strong> ${item.quantity}<br>
              <strong>Price:</strong> $${item.totalAmount}<br>
              <strong>Commission:</strong> $${item.commission}<br>
            </li>
          `,
            )
            .join("")}
        </ul>
      </div>
    `;

    // Send emails to each brand with their specific order items
    for (const [brandId, items] of Object.entries(orderItemsByBrand)) {
      const brand = await User.findById(brandId);
      if (!brand || !brand.email) continue;

      const brandEmailContent = `
        <div>
          <h1>New Orders Received</h1>
          <p>You have received ${items.length} new order(s) from ${customerData.name}:</p>
          
          ${items
            .map(
              (item, index) => `
            <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
              <h3 style="margin-top: 0;">Order #${index + 1}</h3>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div>
                  <strong>Product:</strong> ${item.title}<br>
                  <strong>Quantity:</strong> ${item.quantity}<br>
                  <strong>VAT:</strong> $${item.vatAmount}
                </div>
                <div>
                  <strong>Shipping:</strong> $${item.shippingAmount}<br>
                  <strong>Commission:</strong> $${item.commission}<br>
                  <strong>Total Price:</strong> $${item.totalAmount}
                </div>
              </div>
            </div>
          `,
            )
            .join("")}
          
          <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd;">
            <p><strong>Total Orders:</strong> ${items.length}</p>
            <p><strong>Total Amount:</strong> $${items.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2)}</p>
          </div>
        </div>
      `;

      await sendCustomEmail(brand.email, "New Order", brandEmailContent);
    }

    // Send customer and influencer emails
    await Promise.all([
      sendCustomEmail(customerData.email, "Order Confirmation", emailContent),
      sendCustomEmail(influencer.email, "New Order", influencerEmailContent),
    ]);

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
  return `ORD-${Date.now()}-${Math.random().toString(36)}`;
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

  const influencerFee = Number(
    influencerAmount - (influencerAmount * platformFee[influencer.plan]) / 100,
  );
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
          delay_days: 14,
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
        delay_days: 30,
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
      delay_days: 14,
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
