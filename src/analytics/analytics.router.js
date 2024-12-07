import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
  getEarnings,
  getPurchases,
  getRecommendationAnalytics,
  getPageViews,
  getAllMetrics,
  getMostViewedProducts,
  getDemographics,
  getBrandAnalytics,
  getBrandDemographics,
  getInfluencerOrderAnalytics
} from "./analytics.controller.js";

const analyticsRouter = Router();
analyticsRouter.use(auth);

analyticsRouter.post("/recommendation", getRecommendationAnalytics);
analyticsRouter.get("/brand",getBrandAnalytics)
analyticsRouter.get("/brand-demographics",getBrandDemographics)
analyticsRouter.get("/earnings", getEarnings);
analyticsRouter.get("/purchases", getPurchases);
analyticsRouter.get("/page-views", getPageViews);
analyticsRouter.get("/influencer", getAllMetrics);
analyticsRouter.get("/most-viewed", getMostViewedProducts);
analyticsRouter.get('/demographics', getDemographics);
analyticsRouter.get('/influencer-affiliated-orders',getInfluencerOrderAnalytics) 
export default analyticsRouter;
