// stripe.service.js
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (
  orderTotal,
  items,
  successUrl,
  cancelUrl,
) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items.map((item) => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: item.name,
          },
          unit_amount: item.price * 100, // Convert to paise
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return { checkoutUrl: session.url };
  } catch (error) {
    console.error("Error creating Stripe Checkout Session:", error);
    throw error;
  }
};
