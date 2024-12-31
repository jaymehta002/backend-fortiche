// order.controller.js
import { Product } from "../product/product.model.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Order from "./order.model.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createOrder = asyncHandler(async (req, res) => {
  const { items, influencerId, paymentMethodId, shippingInfo } = req.body;

  if (!items || !influencerId || !paymentMethodId || !shippingInfo) {
    throw new ApiError(400, "Missing required fields");
  }

  // Construct the return URL
  const returnUrl = `${req.protocol}://${req.get("host")}/api/orders/payment-result`;

  const { order, clientSecret } = await Order.createOrderWithStripe(
    { items, userId: req.user._id, influencerId, shippingInfo },
    paymentMethodId,
    returnUrl,
  );

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { order, clientSecret },
        "Order created successfully",
      ),
    );
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate("items.productId");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, order, "Order retrieved successfully"));
});

export const getUserOrders = asyncHandler(async (req, res) => {
  const products = await Product.find({ brandId: req.user._id });
  const orders = await Order.find({
    "orderItems.productId": { $in: products.map((product) => product._id) },
  })
    .populate("orderItems.productId")
    .populate("userId")
    .sort({ createdAt: -1 });
  res
    .status(200)
    .json(new ApiResponse(200, orders, "User orders retrieved successfully"));
});
export const updateUserOrders = asyncHandler(async (req, res) => {
  const { orderId, status } = req.body;

  if (!orderId || !status) {
    throw new ApiError(
      400,
      "Missing required fields: orderId or status"
    );
  }

  // Update both orderItems status and brandOrders status
  const order = await Order.findOneAndUpdate(
    { _id: orderId },
    { 
      $set: {
        "orderItems.$[].status": status,
        "brandOrders.$[].status": status
      }
    },
    { new: true }
  )
  .populate("orderItems.productId")
  .populate("userId");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, order, "Order status updated successfully")
    );
});

export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
    userModel: "User",
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.status !== "pending") {
    throw new ApiError(400, "Cannot delete non-pending order");
  }

  // Update affiliation metrics
  await mongoose.model("Affiliation").updateMany(
    {
      productId: { $in: order.orderItems.map((item) => item.productId) },
      influencerId: order.userId,
    },
    {
      $inc: {
        totalSaleQty: -order.orderItems.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        totalSaleRevenue: -order.totalAmount,
      },
    },
  );

  await Order.deleteOne({ _id: req.params.id });

  res
    .status(204)
    .json(new ApiResponse(204, null, "Order deleted successfully"));
});

export const handlePaymentResult = asyncHandler(async (req, res) => {
  const { payment_intent, payment_intent_client_secret } = req.query;

  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);

  if (paymentIntent.status === "succeeded") {
    // Update the order status
    await Order.findOneAndUpdate(
      { "paymentDetails.paymentIntentId": payment_intent },
      {
        paymentStatus: "paid",
        "paymentDetails.status": "succeeded",
      },
    );

    res.redirect("/payment-success"); // Redirect to a success page
  } else {
    res.redirect("/payment-failure"); // Redirect to a failure page
  }
});
