import { Tipping } from "../models/tipping.model.js";
import { auth } from "../middlewares/auth.middleware.js";
import { Router } from "express";

const tippingRouter = Router();

const createTipping = async (req, res) => {
  const influencerId = req.user._id;
  const { amount } = req.body;
  const tipping = await Tipping.create({ influencerId, amounts: [amount] });
  res.status(201).json(tipping);
};

const getTipping = async (req, res) => {
  const influencerId = req.body.influencerId;
  const tipping = await Tipping.find({ influencerId });cc
  res.status(200).json(tipping);
};

tippingRouter.get("/", getTipping);
tippingRouter.use(auth);
tippingRouter.post("/", createTipping);

export default tippingRouter;
