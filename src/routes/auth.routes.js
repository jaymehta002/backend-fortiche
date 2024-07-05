import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  verifyOTPAndRegister,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const authRouter = express.Router();

authRouter
  .post("/register", registerUser)
  .post("/verify-otp", verifyOTPAndRegister)
  .post("/login", loginUser)
  .post("/logout", verifyJWT, logoutUser)
  .post("/refresh-token", refreshAccessToken);

export default authRouter;
