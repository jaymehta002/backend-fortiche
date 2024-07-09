import express from "express";
import { googleCallback, googleLogin } from "../controllers/auth.controller.js";
import passport from "passport";

const router = express.Router();



export default router;