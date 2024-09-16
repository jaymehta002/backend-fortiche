import Account from "./accounts.model.js";
import { User } from "../user/user.model.js";
import axios from "axios";
import querystring from "querystring";

// Move these to environment variables
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_REDIRECT_URI = process.env.PAYPAL_REDIRECT_URI;
const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || "https://api.sandbox.paypal.com";

const PAYPAL_OAUTH_API = `${PAYPAL_API_BASE}/v1/oauth2/token`;
const PAYPAL_IDENTITY_API = `${PAYPAL_API_BASE}/v1/identity/openidconnect/tokenservice`;

export const connectPaypal = async (req, res) => {
  try {
    const userId = req.user.id;
    const state = Math.random().toString(36).substring(7);
    req.session.paypalState = state;

    // Construct the PayPal login URL
    const loginUrl = `${PAYPAL_API_BASE}/signin/authorize?client_id=${PAYPAL_CLIENT_ID}&response_type=code&scope=openid%20email&redirect_uri=${encodeURIComponent(PAYPAL_REDIRECT_URI)}&state=${state}`;

    res.json({ loginUrl });
  } catch (error) {
    console.error("Error initiating PayPal connection:", error);
    res.status(500).json({ error: "Failed to initiate PayPal connection" });
  }
};

export const paypalCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = req.user.id;

    if (state !== req.session.paypalState) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    // Exchange the authorization code for tokens
    const tokenResponse = await axios.post(
      PAYPAL_OAUTH_API,
      querystring.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: PAYPAL_REDIRECT_URI,
      }),
      {
        auth: {
          username: PAYPAL_CLIENT_ID,
          password: PAYPAL_CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user info from PayPal
    const userInfoResponse = await axios.get(
      `${PAYPAL_API_BASE}/v1/identity/oauth2/userinfo?schema=openid`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    );

    const { email } = userInfoResponse.data;

    // Save or update the account information
    await Account.findOneAndUpdate(
      { userId },
      {
        paypalAccessToken: access_token,
        paypalRefreshToken: refresh_token,
        paypalEmail: email,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({ message: "PayPal account linked successfully" });
  } catch (error) {
    console.error("Error in PayPal callback:", error);
    res.status(500).json({
      error: "Failed to link PayPal account",
      details: error.response?.data || error.message,
    });
  }
};
