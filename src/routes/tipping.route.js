import { Tipping } from "../models/tipping.model.js";
import { auth } from "../middlewares/auth.middleware.js";
import { Router } from "express";

const tippingRouter = Router();

const createTipping = async (req, res) => {
  try {
    const influencerId = req.user._id;
    const { amounts } = req.body;
    
    // Find existing tipping record or create new one
    let tipping = await Tipping.findOne({ influencerId });
    
    if (tipping) {
      // Filter out duplicates and merge with existing amounts
      const newAmounts = [...new Set([...tipping.amounts, ...amounts])];
      tipping.amounts = newAmounts;
      await tipping.save();
    } else {
      // Create new tipping record with unique amounts
      const uniqueAmounts = [...new Set(amounts)];
      tipping = await Tipping.create({ influencerId, amounts: uniqueAmounts });
    }
    
    res.status(201).json(tipping);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getTipping = async (req, res) => {
  const influencerId = req.query.influencerId;
  const tipping = await Tipping.find({ influencerId });
  res.status(200).json(tipping);
};

const updateTipping = async (req, res) => {
  try {
    const influencerId = req.params.id;
    const { amounts } = req.body;
    const tipping = await Tipping.findOne({ influencerId });
    if (!tipping) {
      return res.status(404).json({ message: "Tipping not found" });
    }
    tipping.amounts = amounts;
    await tipping.save();
    
    res.status(200).json(tipping);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const removeTipping = async (req, res) => {
  try {
    const influencerId = req.params.id;
    const tipping = await Tipping.findOneAndDelete({ influencerId });
    if (!tipping) {
      return res.status(404).json({ message: "Tipping not found" });
    }
    res.status(200).json({ message: "Tipping removed successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

tippingRouter.get("/", getTipping);
tippingRouter.use(auth);
tippingRouter.post("/", createTipping);
tippingRouter.put("/:id", updateTipping);
tippingRouter.delete("/:id", removeTipping);

export default tippingRouter;
