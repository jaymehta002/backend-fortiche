import { asyncHandler } from "../utils/asyncHandler.js";
import Recommendation from "./recommendation.model.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { ApiError } from "../utils/APIError.js";
import mongoose from "mongoose";
import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";
import { Product } from "../product/product.model.js";
// Create a recommendation
const createRecommendation = asyncHandler(async (req, res, next) => {
 
  try {
    const user = req.user;
    const { title, content, tags, products } = req.body;
 
    let thumbnailUrl = "";

    if (req.file) {
      const uploadedThumbnail = await uploadOnCloudinary(req.file.path);
      thumbnailUrl = uploadedThumbnail.url;
    } else if (req.body.thumbnail) {
      thumbnailUrl = req.body.thumbnail; // Handle URL as a string
    }
    let productIds = [];
    if (products) {
      productIds = JSON.parse(products).map((productId) => productId);
    }
 
    const recommendation = await Recommendation.create({
      title,
      content,
      author: user._id,
      tags: tags,
      products: productIds,
      thumbnail: thumbnailUrl,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          recommendation,
          "Recommendation created successfully",
        ),
      );
  } catch (error) {
    next(error); // Handle error
  }
});

// Fetch all recommendations with search and tags filters
const fetchAllRecommendations = asyncHandler(async (req, res, next) => {
  try {
    const { search, tags } = req.query;

    const query = {};
    if (search) {
      query.title = { $regex: search, $options: "i" }; // Search by title
    }
    if (tags) {
      query.tags = { $in: tags.split(",") }; // Filter by tags
    }

    const recommendations = await Recommendation.find(query);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          recommendations,
          "Recommendations fetched successfully",
        ),
      );
  } catch (error) {
    next(error); // Handle error
  }
});

const fetchUserRecommendations = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch recommendations by author
    const recommendations = await Recommendation.find({ author: userId })
      .populate("author", "name avatar") // Populate author details
      .exec();

    // Collect all product IDs from the recommendations
    const productIds = recommendations.flatMap((rec) => rec.products);

    // Fetch products based on the collected IDs
    const products = await Product.find({ _id: { $in: productIds } });

    // Create a map for quick lookup of product details
    const productsMap = products.reduce((map, product) => {
      map[product._id] = product;
      return map;
    }, {});

    // Attach product details to recommendations
    const recommendationsWithProducts = recommendations.map((rec) => ({
      ...rec.toObject(),
      products: rec.products.map((productId) => productsMap[productId]),
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          recommendationsWithProducts,
          "User recommendations with products fetched successfully",
        ),
      );
  } catch (error) {
    next(error); // Handle error
  }
});

const fetchSingleRecommendation = asyncHandler(async (req, res, next) => {
  try {
    const recommendationId = req.params.id;

    // Validate the recommendation ID
    if (!mongoose.Types.ObjectId.isValid(recommendationId)) {
      throw ApiError("Invalid recommendation ID", 400);
    }

    // Find the recommendation and populate the products
    const recommendation = await Recommendation.findById(recommendationId);
    const products = await Product.find({
      _id: { $in: recommendation.products },
    });
    if (!recommendation) {
      return next(new ApiError("Recommendation not found", 404));
    }

    // Prepare response data
    const data = {
      recommendation,
      products,
    };

    // Send the response
    return res
      .status(200)
      .json(new ApiResponse(200, data, "Recommendation fetched successfully"));
  } catch (error) {
    next(error); // Handle error
  }
});

// Update a recommendation by ID
const updateRecommendation = asyncHandler(async (req, res, next) => {
  try {
    const recommendationId = req.params.id;
    const userId = req.user._id; 

    if (!mongoose.Types.ObjectId.isValid(recommendationId)) {
      return next(new ApiError("Invalid recommendation ID", 400));
    }
 
    const existingRecommendation =
      await Recommendation.findById(recommendationId);

    if (!existingRecommendation) {
      return next(new ApiError("Recommendation not found", 404));
    }

    
    if (existingRecommendation.author.toString() !== userId.toString()) {
      return next(
        new ApiError("Unauthorized to edit this recommendation", 403),
      );
    }

    const { title, content, tags, products } = req.body;

    // Parse products if it's a string
    let productIds = products;
    if (typeof products === "string") {
      productIds = JSON.parse(products);
    }

    // Validate that all product IDs exist
    if (productIds?.length > 0) {
      const validProducts = await Product.find({ _id: { $in: productIds } });
      if (validProducts.length !== productIds.length) {
        return next(new ApiError("One or more product IDs are invalid", 400));
      }
    }

    let updateData = {
      title,
      content,
      tags: typeof tags === "string" ? JSON.parse(tags) : tags,
      products: productIds,
    };

    if (req.file) {
      const uploadedThumbnail = await uploadOnCloudinary(req.file.path);
      updateData.thumbnail = uploadedThumbnail.url;
    } else if (req.body.thumbnail) {
      updateData.thumbnail = req.body.thumbnail;
    }

    const updatedRecommendation = await Recommendation.findByIdAndUpdate(
      recommendationId,
      updateData,
      { new: true },
    ).populate("products");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedRecommendation,
          "Recommendation updated successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
});

// Delete a recommendation by ID
const deleteRecommendation = asyncHandler(async (req, res, next) => {
  try {
    const recommendationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(recommendationId)) {
      return next(new ApiError("Invalid recommendation ID", 400));
    }
    const recommendation =
      await Recommendation.findByIdAndDelete(recommendationId);
    if (!recommendation) {
      return next(new ApiError("Recommendation not found", 404));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          recommendation,
          "Recommendation deleted successfully",
        ),
      );
  } catch (error) {
    next(error); // Handle error
  }
});

export {
  createRecommendation,
  fetchAllRecommendations,
  fetchUserRecommendations,
  fetchSingleRecommendation,
  updateRecommendation,
  deleteRecommendation,
};
