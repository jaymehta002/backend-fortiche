import { asyncHandler } from "../utils/asyncHandler.js";
import { Product } from "../product/product.model.js";
import { User } from "../user/user.model.js";
// import { ApiError } from "../utils/ApiError.js";

const getAllProducts = asyncHandler(async (req, res, next) => {
  try {
    const user = await req.user;
    const allProducts = await Product.find({
      brandId: user.id,
    });

    return res.json({
      message: "All products fetched successfully",
      products: allProducts,
    });
  } catch (error) {
    next(error);
  }
});

const deleteProduct = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    return res.json({
      message: "Product deleted successfully",
      product,
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

const updateProduct = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(id);
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    console.log(updatedProduct);
    if (!updatedProduct) {
      throw new ApiError(404, "Product not found");
    }

    return res.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
});

export { getAllProducts, deleteProduct, updateProduct };
