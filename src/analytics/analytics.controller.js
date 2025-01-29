import { Affiliation } from "../affiliation/affiliation_model.js";
import Order from "../orders/order.model.js";
import { Product } from "../product/product.model.js";
import Recommendation from "../recommendation/recommendation.model.js";
import { fetchUserByUserId } from "../user/user_service.js";
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

    const products = await Product.find({ brandId: user._id });
    const orders = await Order.find({
      "orderItems.productId": { $in: products.map((product) => product._id) },
    })
      .populate("orderItems.productId")
      .populate("userId")
      .sort({ createdAt: -1 });
 

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

// export const getInfluencerOrderAnalytics = asyncHandler(async (req, res, next) => {
//   try {
//     const user = req.user;
//     if (!user || user.accountType !== "influencer") {
//       throw ApiError(403, "Unauthorized: Only influencers can access this endpoint");
//     }

//     // Get orders with product details
//     const orders = await Order.aggregate([
//       {
//         $match: { influencerId: user._id }
//       },
//       {
//         $lookup: {
//           from: "products",
//           localField: "orderItems.productId",
//           foreignField: "_id",
//           as: "productDetails"
//         }
//       },
//       {
//         $project: {
//           orderNumber: 1,
//           createdAt: 1,
//           customerInfo: 1,
//           orderItems: {
//             $map: {
//               input: "$orderItems",
//               as: "item",
//               in: {
//                 productId: "$$item.productId",
//                 brandId: "$$item.brandId",
//                 quantity: "$$item.quantity",
//                 commission: "$$item.commission",
//                 unitPrice: "$$item.unitPrice",
//                 productName: {
//                   $let: {
//                     vars: {
//                       product: {
//                         $arrayElemAt: [
//                           {
//                             $filter: {
//                               input: "$productDetails",
//                               cond: { $eq: ["$$this._id", "$$item.productId"] }
//                             }
//                           },
//                           0
//                         ]
//                       }
//                     },
//                     in: "$$product.title"
//                   }
//                 }
//               }
//             }
//           },
//           totalAmount: 1,
//           status: 1
//         }
//       },
//       { $sort: { createdAt: -1 } }
//     ]);

//     console.log(JSON.stringify(orders[0], null, 2));

//     // Calculate analytics
//     const analytics = {
//       totalOrders: orders.length,
//       totalProductsSold: 0,
//       totalCommission: 0,
//       productAnalytics: {}
//     };

//     // Process orders for analytics
//     for (const order of orders) {
//       for (const item of order.orderItems) {
//         analytics.totalProductsSold += item.quantity;
//         analytics.totalCommission += item.commission * item.quantity;

//         // Track per-product analytics
//         const productId = item.productId.toString();
//         if (!analytics.productAnalytics[productId]) {
//           const brandName = await fetchUserByUserId(item.brandId);
//           console.log("brandName", brandName.username);
//           analytics.productAnalytics[productId] = {
//             productName: item.productName,
//             brandId: brandName.username,
//             quantitySold: 0,
//             totalCommission: 0,
//             orders: 0
//           };
//         }
        
//         const productStats = analytics.productAnalytics[productId];
//         productStats.quantitySold += item.quantity;
//         productStats.totalCommission += item.commission * item.quantity;
//         productStats.orders += 1;
//       };
//     };

//     // Convert productAnalytics to array and sort by commission
//     analytics.productAnalytics = Object.values(analytics.productAnalytics)
//       .sort((a, b) => b.totalCommission - a.totalCommission);

//     return res.json({
//       success: true,
//       data: {
//         summary: {
//           totalOrders: analytics.totalOrders,
//           totalProductsSold: analytics.totalProductsSold,
//           totalCommission: Number(analytics.totalCommission.toFixed(2))
//         },
//         productPerformance: analytics.productAnalytics,
//         recentOrders: orders.slice(0, 50)
//       }
//     });

//   } catch (error) {
//     next(error);
//   }
// });


export const getInfluencerOrderAnalytics = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || user.accountType !== "influencer") {
      throw ApiError(403, "Unauthorized: Only influencers can access this endpoint");
    }

    const orders = await Order.aggregate([
      {
        $match: { influencerId: user._id }
      },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        // Unwind orderItems to process each item separately
        $unwind: "$orderItems"
      },
      {
        // Lookup brand information
        $lookup: {
          from: "users", // Assuming your users collection name
          localField: "orderItems.brandId",
          foreignField: "_id",
          as: "brandDetails"
        }
      },
      {
        // Group back to reconstruct the order structure
        $group: {
          _id: "$_id",
          orderNumber: { $first: "$orderNumber" },
          createdAt: { $first: "$createdAt" },
          customerInfo: { $first: "$customerInfo" },
          totalAmount: { $first: "$totalAmount" },
          status: { $first: "$status" },
          productDetails: { $first: "$productDetails" },
          orderItems: {
            $push: {
              productId: "$orderItems.productId",
              brandId: "$orderItems.brandId",
              quantity: "$orderItems.quantity",
              commission: "$orderItems.commission",
              unitPrice: "$orderItems.unitPrice",
              brandUsername: { $arrayElemAt: ["$brandDetails.username", 0] },
              productName: {
                $let: {
                  vars: {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$productDetails",
                            cond: { $eq: ["$$this._id", "$orderItems.productId"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: "$$product.title"
                }
              }
            }
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    // Calculate analytics
    const analytics = {
      totalOrders: orders.length,
      totalProductsSold: 0,
      totalCommission: 0,
      productAnalytics: {}
    };

    // Process orders for analytics
    for (const order of orders) {
      for (const item of order.orderItems) {
        analytics.totalProductsSold += item.quantity;
        analytics.totalCommission += item.commission * item.quantity;

        // Track per-product analytics
        const productId = item.productId.toString();
        if (!analytics.productAnalytics[productId]) {
          analytics.productAnalytics[productId] = {
            productName: item.productName,
            brandUsername: item.brandUsername, // Now using the populated brand username
            quantitySold: 0,
            totalCommission: 0,
            orders: 0
          };
        }
        
        const productStats = analytics.productAnalytics[productId];
        productStats.quantitySold += item.quantity;
        productStats.totalCommission += item.commission * item.quantity;
        productStats.orders += 1;
      }
    }

    // Convert productAnalytics to array and sort by commission
    analytics.productAnalytics = Object.values(analytics.productAnalytics)
      .sort((a, b) => b.totalCommission - a.totalCommission);

    return res.json({
      success: true,
      data: {
        summary: {
          totalOrders: analytics.totalOrders,
          totalProductsSold: analytics.totalProductsSold,
          totalCommission: Number(analytics.totalCommission.toFixed(2))
        },
        productPerformance: analytics.productAnalytics,
        recentOrders: orders
      }
    });

  } catch (error) {
    next(error);
  }
});