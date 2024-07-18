import mongoose from "mongoose";
import { category } from "../common/common_constants.js";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true, // Removes leading/trailing whitespace
    },
    brand: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: category,
      trim: true,
    },
    categoryName: {
      type: String,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    stockStatus: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    productType: {
      type: String,
      trim: true,
    },
    imageUrls: {
      type: [String],
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    isRecommended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const Product = mongoose.model("product", productSchema);
