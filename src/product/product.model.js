import mongoose from "mongoose";
import { category } from "../common/common_constants.js";

// Sub-schema for Physical Products
const physicalProductSchema = new mongoose.Schema(
  {
    weight: { type: Number,},
    height: { type: Number, },
    width: { type: Number,  },
    length: { type: Number, },
    packageFormat: { type: String, },
    ean: { type: String,   unique: true },  
    sku: { type: String,  unique: true },
  },
  { _id: false },
);

// Sub-schema for Downloadable Products
const downloadableProductSchema = new mongoose.Schema(
  {
    fileUpload: { type: String },
  },
  { _id: false },
);

// Sub-schema for Virtual Products
const virtualProductSchema = new mongoose.Schema(
  {
    link: { type: String, required: true },
  },
  { _id: false },
);

// Main Product Schema
const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true, // Optimizing for search
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
      index: true, // Optimizing for search
    },
    productType: {
      type: String,
      enum: {
        values: ["physical", "virtual", "downloadable"],
        message: "{VALUE} is not a valid product type",
      },
      required: true,
    },
    pricing: {
      type: String,
      required: true,
    },
    wholesalePricing: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionPercentage: {
      type: Number,
      required: true,
    },
    imageUrls: {
      type: [String],
    },
    specificationPdf: {
      type: String, 
      trim: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      validate: {
        validator: async function (value) {
          const user = await mongoose.model("User").findById(value);
          return !!user;
        },
        message: "BrandId must refer to a valid User.",
      },
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
    tags: {
      type: [String],
    },
    // Conditional Sub-schemas based on productType
    physicalDetails: {
      type: physicalProductSchema,
      required: function () {
        return this.productType === "physical";
      },
    },
    downloadableDetails: {
      type: downloadableProductSchema,
      required: function () {
        return this.productType === "downloadable";
      },
    },
    virtualDetails: {
      type: virtualProductSchema,
      required: function () {
        return this.productType === "virtual";
      },
    },

    // Soft deletion support
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Adding indexes for better performance
productSchema.index({ title: 1, category: 1, brandId: 1 });

// Model export
export const Product = mongoose.model("Product", productSchema);
