// order.model.js
import mongoose from "mongoose";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const itemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
});

const paymentDetailsSchema = new mongoose.Schema({
  paymentMethod: {
    type: String,
    enum: ["card", "paypal", "bank_transfer"],
    required: true,
  },
  paymentIntentId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "succeeded", "failed", "requires_action"],
    default: "pending",
  },
});

const shippingSchema = new mongoose.Schema({
  address: {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  trackingNumber: { type: String },
  carrier: { type: String },
  shippedAt: { type: Date },  
});

const orderSchema = new mongoose.Schema(
  {
    items: [itemSchema],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "canceled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paymentDetails: paymentDetailsSchema,
    shippingInfo: shippingSchema,
    totalAmount: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
);

orderSchema.statics.createOrderWithStripe = async function (
  orderData,
  paymentMethodId,
  returnUrl,
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, userId, influencerId, shippingInfo } = orderData;

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
      return_url: returnUrl,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "always",
      },
    });

    // Create the order
    const order = await this.create(
      [
        {
          items,
          userId,
          influencerId,
          status: "pending",
          paymentStatus:
            paymentIntent.status === "succeeded" ? "paid" : "pending",
          shippingInfo,
          totalAmount,
          paymentDetails: {
            paymentMethod: "card", // Assuming card payment for Stripe
            paymentIntentId: paymentIntent.id,
            amount: totalAmount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
          },
        },
      ],
      { session },
    );

    // Update affiliation metrics (assuming Affiliation model exists)
    await mongoose.model("Affiliation").updateMany(
      { productId: { $in: items.map((item) => item.productId) }, influencerId },
      {
        $inc: {
          totalSaleQty: items.reduce((sum, item) => sum + item.quantity, 0),
          totalSaleRevenue: totalAmount,
        },
      },
      { session },
    );

    await session.commitTransaction();
    return { order: order[0], clientSecret: paymentIntent.client_secret };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const Order = mongoose.model("Order", orderSchema);
export default Order;