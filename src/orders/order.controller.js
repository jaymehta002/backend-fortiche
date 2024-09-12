import { Affiliation } from "../affiliation/affiliation_model.js";
import { User } from "../user/user.model.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Order from "./order.model.js";
import Stripe from "stripe";
import { Payment } from "../payments/payment_model.js";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createOrder = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    const { items, influencerId, paymentMethodId } = req.body;

    if (!items || !paymentMethodId) {
      throw ApiError(400, "Invalid data being passed");
    }

    const check = await Affiliation.find({
      productId: items.map((item) => item.productId),
      influencerId: influencerId,
    });

    if (!check || check.length !== items.length) {
      throw ApiError(
        401,
        "No affiliation found between influencer and product",
      );
    }

    // Calculate total amount
    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Amount in cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
    });

    // Create the order
    const order = await Order.create({
      items,
      userId: user._id,
      influencerId,
      status: "pending",
      paymentStatus: paymentIntent.status === "succeeded" ? "paid" : "pending",
    });

    if (!order) {
      throw ApiError(500, "Order creation failed");
    }

    // Save payment information
    const payment = await Payment.create({
      user: user._id,
      order: order._id,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      paymentMethod: paymentIntent.payment_method,
      receiptUrl: paymentIntent.charges.data[0]?.receipt_url,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { order, payment },
          "Order created and payment processed successfully",
        ),
      );
  } catch (error) {
    if (error.type === "StripeCardError") {
      throw ApiError(400, error.message);
    }
    next(error);
  }
});

const getOrder = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const orderId = req.params.id;

  const order = await Order.findOne({
    _id: orderId,
    userId: user._id,
  }).populate("items.productId");

  if (!order) {
    throw ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order retrieved successfully"));
});

const getUserOrders = asyncHandler(async (req, res, next) => {
  const user = req.user;

  const orders = await Order.find({ userId: user._id })
    .populate("items.productId")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "User orders retrieved successfully"));
});

export { createOrder, getOrder, getUserOrders };
