import Stripe from "stripe";
import { Affiliation } from "../affiliation/affiliation_model.js";
import Guest from "../guest/guest.model.js";
import Order from "../orders/order.model.js"; // Assuming you have an Order model
import { Product } from "../product/product.model.js";
import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a payment session for an influencer
export const checkoutInfluencer = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    // Ensure the user is an influencer
    if (!user || user.accountType !== "influencer") {
      throw ApiError(403, "Action restricted");
    }

    const { productId } = req.body;

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError(404, "Product not found");
    }

    // Create a payment session with Stripe Checkout
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
            unit_amount: product.pricing * 100, // Amount in cents
          },
          quantity: 1,
        },
      ],
      customer_email: user.email,
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        productId: productId,
        userId: user._id.toString(),
        address: user.address,
      },
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["IN"],
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

    if (session.payment_status === "paid") {
      const { metadata } = session;
      const { productId, userId, address } = metadata;
      const defaultAddress = {
        line1: "test",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "US",
      };

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
        shippingAddress: address ? address : defaultAddress,
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
      console.log(diff, typeof diff);
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
    // const product = await Product.findById(affiliation.productId);
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
            unit_amount: totalPrice * 100 * quantity, // Amount in cents
          },
          quantity: quantity,
        },
      ],
      customer_email: email, // Use guest's email
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        products: productsString,
        name, // Pass guest details in metadata
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
    let { products, name, email, phone, address } = session.metadata;
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
    const newOrder = await Order.create({
      guestId: guest._id,
      productId: productIds,
      totalAmount: totalPrice,
      paymentId: session.payment_intent,
      status: "paid",
      shippingStatus: "pending",
      shippingAddress: guest.address,
    });

    // Respond with success message and order details
    res.status(200).json({
      success: true,
      message: "Payment successful and order created",
      orderId: newOrder._id,
      order: newOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
