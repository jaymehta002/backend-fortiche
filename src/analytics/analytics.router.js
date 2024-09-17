import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
  getEarnings,
  getPurchases,
  getRecommendationAnalytics,
  getPageViews,
  getAllMetrics,
} from "./analytics.controller.js";

const analyticsRouter = Router();
analyticsRouter.use(auth);

analyticsRouter.post("/recommendation", getRecommendationAnalytics);
analyticsRouter.get("/earnings", getEarnings);
analyticsRouter.get("/purchases", getPurchases);
analyticsRouter.get("/page-views", getPageViews);
analyticsRouter.get("/influencer", getAllMetrics);
export default analyticsRouter;
