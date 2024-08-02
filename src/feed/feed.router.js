import express from "express";
import { getFeedByUsername } from "./feed.controler";

const router = express.Router();
router.get("/:username", getFeedByUsername);

export default router;
