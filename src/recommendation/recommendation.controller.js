import { asyncHandler } from "../utils/asyncHandler.js";
import Recommendation from "./recommendation.model.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { ApiError } from "../utils/APIError.js";
import mongoose from "mongoose";
import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";

// Create a recommendation
const createRecommendation = asyncHandler(async (req, res, next) => {
  console.log("tested");
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
    console.log(productIds);

    const recommendation = await Recommendation.create({
      title,
      content,
      author: user._id,
      tags,
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

// Fetch recommendations by user
const fetchUserRecommendations = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const recommendations = await Recommendation.find({ author: userId });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          recommendations,
          "User recommendations fetched successfully",
        ),
      );
  } catch (error) {
    next(error); // Handle error
  }
});

// Fetch a single recommendation by ID
const fetchSingleRecommendation = asyncHandler(async (req, res, next) => {
  try {
    const recommendationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(recommendationId)) {
      return next(new ApiError("Invalid recommendation ID", 400));
    }
    const recommendation = await Recommendation.findById(recommendationId);
    if (!recommendation) {
      return next(new ApiError("Recommendation not found", 404));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          recommendation,
          "Recommendation fetched successfully",
        ),
      );
  } catch (error) {
    next(error); // Handle error
  }
});

// Update a recommendation by ID
const updateRecommendation = asyncHandler(async (req, res, next) => {
  try {
    const recommendationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(recommendationId)) {
      return next(new ApiError("Invalid recommendation ID", 400));
    }

    const { title, content, tags, products } = req.body;
    let updateData = { title, content, tags, products };

    if (req.file) {
      // Handle file uploads
      const uploadedThumbnail = await uploadOnCloudinary(req.file.path);
      updateData.thumbnail = uploadedThumbnail;
    } else if (req.body.thumbnail) {
      updateData.thumbnail = req.body.thumbnail; // Handle URL as a string
    }

    const recommendation = await Recommendation.findByIdAndUpdate(
      recommendationId,
      updateData,
      { new: true },
    );

    if (!recommendation) {
      return next(new ApiError("Recommendation not found", 404));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          recommendation,
          "Recommendation updated successfully",
        ),
      );
  } catch (error) {
    next(error); // Handle error
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
