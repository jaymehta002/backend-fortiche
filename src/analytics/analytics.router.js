import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { getRecommendationAnalytics } from "./analytics.controller.js";

const analyticsRouter = Router();
analyticsRouter.use(auth);

analyticsRouter.post("/recommendation", getRecommendationAnalytics);

export default analyticsRouter;
