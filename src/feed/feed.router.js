import express from "express";
import { getFeedByUsername, getProductByUsername } from "./feed.controler.js";

const router = express.Router();
router
  .get("/:username", getFeedByUsername)
  .get("/:username/:productId", getProductByUsername);

export default router;
