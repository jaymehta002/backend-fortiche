import axios from "axios";
import querystring from "querystring";
import Account from "./account.model.js";
import { PAYPAL_CONFIG } from "../config/paypal.config.js";

export const initiatePaypalConnection = async (userId) => {
  const state = Math.random().toString(36).substring(7);
  global.paypalState = state; // Use proper session management in production.

  return `${PAYPAL_CONFIG.API_BASE}/signin/authorize?client_id=${PAYPAL_CONFIG.CLIENT_ID}&response_type=code&scope=openid%20email&redirect_uri=${encodeURIComponent(PAYPAL_CONFIG.REDIRECT_URI)}&state=${state}`;
};

export const handlePaypalCallback = async (userId, code) => {
  const tokenResponse = await axios.post(
    PAYPAL_CONFIG.OAUTH_API,
    querystring.stringify({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: PAYPAL_CONFIG.REDIRECT_URI,
    }),
    {
      auth: {
        username: PAYPAL_CONFIG.CLIENT_ID,
        password: PAYPAL_CONFIG.CLIENT_SECRET,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  const { access_token, refresh_token } = tokenResponse.data;

  const userInfoResponse = await axios.get(
    `${PAYPAL_CONFIG.API_BASE}/v1/identity/oauth2/userinfo?schema=openid`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  );

  const { email } = userInfoResponse.data;

  await Account.findOneAndUpdate(
    { userId },
    {
      paypalAccessToken: access_token,
      paypalRefreshToken: refresh_token,
      paypalEmail: email,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};
