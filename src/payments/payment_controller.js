import { Payment } from "./payment_model.js";
import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a new payment
export const createPayment = async (req, res) => {
  try {
    const { user, subscription, amount, currency, paymentMethodId } = req.body;

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Amount in cents
      currency: currency || "usd",
      payment_method: paymentMethodId,
      confirm: true, // Confirm the payment immediately
    });

    // Save payment information to the database
    const newPayment = new Payment({
      user,
      subscription,
      paymentIntentId: paymentIntent.id,
      amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      paymentMethod: paymentIntent.payment_method_types[0],
      receiptUrl: paymentIntent.charges.data[0].receipt_url,
    });

    const savedPayment = await newPayment.save();
    res.status(201).json(savedPayment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating payment", error });
  }
};

// Get a payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate(
      "user subscription",
    );
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving payment", error });
  }
};

// Get all payments
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate("user subscription");
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving payments", error });
  }
};
