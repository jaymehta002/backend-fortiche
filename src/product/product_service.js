import { Product } from "../product/product.model.js";

const fetchProductById = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "invalid productId: " + productId);
  }

  return product;
};

const fetchProducts = async (filter) => {
  const products = await Product.find(filter);
  return products;
};

export { fetchProductById, fetchProducts };
