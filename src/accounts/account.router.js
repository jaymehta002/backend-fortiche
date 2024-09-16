import express from "express";
import { connectPaypal, paypalCallback } from "./account.controller.js"; // Adjust the path as needed
import { auth } from "../middlewares/auth.middleware.js";

const accountRouter = express.Router();

// Route to initiate PayPal connection
// User needs to be authenticated before connecting PayPal
accountRouter.get("/paypal", auth, connectPaypal);

// Route to handle PayPal callback after authorization
// This is where PayPal redirects after successful login
accountRouter.get("/paypal/callback", auth, paypalCallback);

export default accountRouter;
