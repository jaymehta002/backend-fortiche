import { Affiliation } from "../affiliation/affiliation_model.js";
import Order from "../orders/order.model.js";
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

export const getEarnings = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw ApiError(404, "Unauthorized request");
    const affiliations = await Affiliation.find({ userId: user._id });
    const totalSale = affiliations.reduce((total, aff) => {
      return total + (Number(aff.totalSaleRevenue) || 0);
    }, 0);
    const totalSaleQty = affiliations.reduce((total, aff) => {
      return total + (Number(aff.totalSaleQty) || 0);
    }, 0);
    const totalClicks = affiliations.reduce((total, aff) => {
      return total + (Number(aff.clicks) || 0);
    }, 0);
    console.log(totalSale, totalSaleQty, totalClicks);
    return res.json({ totalSale, totalSaleQty, totalClicks });
  } catch (error) {
    next(error);
  }
});

export const getPurchases = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw ApiError(404, "Unauthorized request");

    const orders = await Order.find({
      userId: user._id,
      userModel: "User",
    });

    const totalPurchases = orders.reduce((total, order) => {
      return total + order.totalAmount;
    }, 0);

    return res.json({ totalPurchases });
  } catch (error) {
    next(error);
  }
});

export const getPageViews = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw ApiError(404, "Unauthorized request");
    const affiliations = await Affiliation.find({ influencerId: user._id });
    console.log(affiliations);
    const totalPageViews = affiliations.reduce((total, aff) => {
      return total + (Number(aff.pageView) || 0);
    }, 0);

    return res.json({ totalPageViews });
  } catch (error) {
    next(error);
  }
});

export const getAllMetrics = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw ApiError(404, "Unauthorized request");

    // Fetch affiliations and orders
    const affiliations = await Affiliation.find({ influencerId: user._id });
    const orders = await Order.find({
      userId: user._id,
      userModel: "User",
    });

    // Calculate metrics
    const totalSale = affiliations.reduce(
      (total, aff) => total + (Number(aff.totalSaleRevenue) || 0),
      0,
    );
    const totalSaleQty = affiliations.reduce(
      (total, aff) => total + (Number(aff.totalSaleQty) || 0),
      0,
    );
    const totalClicks = affiliations.reduce(
      (total, aff) => total + (Number(aff.clicks) || 0),
      0,
    );
    const totalPurchases = orders.reduce(
      (total, order) => total + order.totalAmount,
      0,
    );
    const totalPageViews = affiliations.reduce(
      (total, aff) => total + (Number(aff.pageView) || 0),
      0,
    );
    console.log(
      totalSale,
      totalSaleQty,
      totalClicks,
      totalPurchases,
      totalPageViews,
    );
    return res.json({
      totalSale,
      totalSaleQty,
      totalClicks,
      totalPurchases,
      totalPageViews,
    });
  } catch (error) {
    next(error);
  }
});
