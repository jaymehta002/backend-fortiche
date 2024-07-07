import { product } from "../models/product.model.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//create a post request to create a product

const createProduct = asyncHandler(async (req, res) => {
  const {
    title,
    brand,
    description,
    category,
    categoryName,
    stock,
    stockStatus,
    price,
    discountPercent,
    productType,
    imageUrls,
    rating,
    isRecommended,
    brandId,
  } = req.body;
  // const user = await User.findById(userId);
  //todo: add brand id here

  const products = await product.create({
    title,
    brand,
    description,
    category,
    categoryName,
    stock,
    stockStatus,
    price,
    discountPercent,
    productType,
    imageUrls,
    rating,
    isRecommended,
    brandId,
  });

  return res.status(201).json(new ApiResponse(201, products));
});

//create a get request to get all products

const getProducts = asyncHandler(async (req, res) => {
  const products = await product.find();
  return res.status(200).json(new ApiResponse(200, products));
});

//create a get request to get a single product

const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productById = await product.findById(id);
  if (!product) {
    return next(ApiError(404, "Product not found"));
  }
  return res.status(200).json(new ApiResponse(200, productById));
});

//create a patch request to update a product

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, quantity, image } = req.body;
  const product = await product.findByIdAndUpdate(
    id,
    {
      name,
      description,
      price,
      category,
      quantity,
      image,
    },
    { new: true },
  );
  if (!product) {
    return next(ApiError(404, "Product not found"));
  }
  return ApiResponse(res, 200, product);
});

export { createProduct, getProduct, getProducts, updateProduct };
