import express from "express";
import { connectPaypal, paypalCallback } from "./account.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/paypal", auth, connectPaypal);
router.get("/callback", auth, paypalCallback);

export default router;
