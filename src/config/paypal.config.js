import dotenv from "dotenv";

dotenv.config();

export const PAYPAL_CONFIG = {
  CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  REDIRECT_URI: process.env.PAYPAL_REDIRECT_URI,
  API_BASE: process.env.PAYPAL_API_BASE || "https://api.sandbox.paypal.com",
  OAUTH_API: `${process.env.PAYPAL_API_BASE || "https://api.sandbox.paypal.com"}/v1/oauth2/token`,
  IDENTITY_API: `${process.env.PAYPAL_API_BASE || "https://api.sandbox.paypal.com"}/v1/identity/openidconnect/tokenservice`,
};
