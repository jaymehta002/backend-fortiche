import { Affiliation } from "../affiliation/affiliation_model.js";
import Recommendation from "../recommendation/recommendation.model.js";
import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getRecommendationAnalytics = asyncHandler(
  async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) throw ApiError(404, "Unauthorized request");
      const { id } = req.body;
      const recommendation = await Recommendation.findOne({ _id: id });
      const productIds = recommendation.products;
      const affiliations = await Affiliation.find({
        influencerId: user._id,
        productId: {
          $in: productIds,
        },
      });
      const totalSale = affiliations.reduce((total, aff) => {
        // Ensure totalSaleRevenue is a number and handle cases where it's not set or is null
        return total + (Number(aff.totalSaleRevenue) || 0);
      }, 0);
      const totalSaleQty = affiliations.reduce((total, aff) => {
        // Ensure totalSaleRevenue is a number and handle cases where it's not set or is null
        return total + (Number(aff.totalSaleQty) || 0);
      }, 0);
      const totalClicks = affiliations.reduce((total, aff) => {
        // Ensure totalSaleRevenue is a number and handle cases where it's not set or is null
        return total + (Number(aff.clicks) || 0);
      }, 0);
      return res.json({ totalSale, totalSaleQty, totalClicks });
    } catch (error) {
      next(error);
    }
  },
);
