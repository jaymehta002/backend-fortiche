import Stripe from "stripe"; // Import the Stripe library

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);

export { stripeClient };
