import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";

export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { _id: userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
  const refreshToken = jwt.sign(
    { _id: userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );
  return { accessToken, refreshToken };
};

export const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    throw new ApiError(401, "Token verification failed");
  }
};
