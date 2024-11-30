import { Affiliation } from "../affiliation/affiliation_model.js";
import Order from "../orders/order.model.js";
import { Product } from "../product/product.model.js";
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

export const getMostViewedProducts = asyncHandler(async (req, res, next) => {
  try {
    console.log("test");
    const user = req.user;
    if (!user) throw ApiError(404, "Unauthorized request");
    const affiliations = await Affiliation.find({ influencerId: user._id })
      .select("productId pageView")
      .populate("productId", "_id title imageUrls");
    const mostViewedProducts = affiliations
      .sort((a, b) => b.pageView - a.pageView)
      .slice(0, 3);
    return res.json({ mostViewedProducts });
  } catch (error) {
    next(error);
  }
});

export const getDemographics = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw ApiError(404, "Unauthorized request");
    const orders = await Order.find({
      influencerId: user._id,
    });
    const demographics = orders
      .map((order) => order.shippingAddress.country)
      .reduce((acc, country) => {
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});

    const totalOrders = orders.length;
    const topDemographics = Object.entries(demographics)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 3)
      .map(([country, count]) => ({
        country,
        percentage: ((count / totalOrders) * 100).toFixed(2),
      }));
    return res.json({ topDemographics });
  } catch (error) {
    next(error);
  }
});

export const getBrandAnalytics = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user._id) throw ApiError(401, "Unauthorized request");

    const orders = await Order.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $match: {
          "product.brandId": user._id,
        },
      },
    ]);

    const affiliations = await Affiliation.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $match: {
          "product.brandId": user._id,
        },
      },
    ]);

  
    const totalSaleQty = affiliations.reduce((total, aff) => {
      return total + (Number(aff.totalSaleQty) || 0);
    }, 0);

    const totalClicks = affiliations.reduce((total, aff) => {
      return total + (Number(aff.clicks) || 0);
    }, 0);

    const totalPageViews = affiliations.reduce((total, aff) => {
      return total + (Number(aff.pageView) || 0);
    }, 0);

    const uniqueInfluencers = new Set(
      affiliations.map((aff) => aff.influencerId.toString()),
    );

    const mostViewedProducts = await Affiliation.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $match: {
          "product.brandId": user._id,
        },
      },
      {
        $sort: { pageView: -1 },
      },
      {
        $limit: 3,
      },
      {
        $project: {
          productId: "$product._id",
          title: "$product.title",
          imageUrls: "$product.imageUrls",
          pageView: 1,
        },
      },
    ]);

    return res.json({
      totalOrders: orders.length,
      totalSaleQty,
      totalPageViews,
      totalClicks,
      totalInfluencers: uniqueInfluencers.size,
      mostViewedProducts,
    });
  } catch (error) {
    console.error("Error in getBrandAnalytics:", error);
    next(error);
  }
});

export const getBrandDemographics = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw ApiError(404, "Unauthorized request");

   
    const products = await Product.find({ brandId: req.user._id });
 
    const orders = await Order.find({
      "orderItems.productId": { $in: products.map((product) => product._id) },
    })
    .populate("orderItems.productId")
    .populate("userId")
    .sort({ createdAt: -1 });

  
    const demographics = orders
      .map((order) => order.shippingAddress.country)
      .reduce((acc, country) => {
        acc[country] = (acc[country] || 0) + 1;  
        return acc;
      }, {});

    
    const totalOrders = orders.length;

 
    const topDemographics = Object.entries(demographics)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 3)
      .map(([country, count]) => ({
      country,
      percentage: totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(2) : 0,
      }));

    return res.json(topDemographics);
  } catch (error) {
    console.error("Error in getBrandDemographics:", error);
    next(error);
  }
});
