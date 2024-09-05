import { Product } from "../product/product.model.js";
import { ApiError } from "../utils/APIError.js";

const fetchProductById = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw ApiError(404, "invalid productId: " + productId);
  }

  return product;
};

const fetchProducts = async (filter) => {
  const products = await Product.find(filter);
  return products;
};


const fetchProductByFilter = async (skip, limit) => {
  return await Product.find({}).skip(skip).limit(limit);
};

export { fetchProductById, fetchProducts, fetchProductByFilter };
