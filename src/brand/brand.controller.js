import { asyncHandler } from "../utils/asyncHandler.js";
import { Product } from "../product/product.model.js";
import { User } from "../user/user.model.js";
import { ApiError } from "../utils/APIError.js";

const getAllBrands = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    if (!user || user.accountType !== "influencer") {
      throw ApiError(
        403,
        "Forbidden: Only influencers can access this resource",
      );
    }

    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const skip = (page - 1) * limit;

    const brands = await User.find({ accountType: "brand" })
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalBrands = await User.countDocuments({ accountType: "brand" });

    return res.json({
      message: "All brands fetched successfully",
      brands,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalBrands / limit),
      totalBrands,
    });
  } catch (error) {
    next(error);
  }
});

const getAllProducts = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      name,
      category,
    } = req.query;

    const query = { brandId: user.id };

    if (name) {
      query.name = { $regex: name, $options: "i" };
    }

    if (category) {
      query.category = category;
    }
    const skip = (page - 1) * limit;

    const allProducts = await Product.find(query)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalProducts = await Product.countDocuments(query);

    return res.json({
      message: "All products fetched successfully",
      products: allProducts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
    });
  } catch (error) {
    next(error);
  }
});

const deleteProduct = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      throw ApiError(401, "Unauthorized");
    }

    const product = await Product.findById(id);

    if (!product) {
      throw ApiError(404, "Product not found");
    }
    if (!product.brandId.equals(user._id)) {
      throw ApiError(403, "Forbidden");
    }

    await Product.findByIdAndDelete(id);

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

    const user = req.user;

    if (!user) {
      throw ApiError(401, "Unauthorized");
    }

    const product = await Product.findById(id);

    if (!product) {
      throw ApiError(404, "Product not found");
    }

    if (!product.brandId.equals(user._id)) {
      throw ApiError(403, "Forbidden");
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    return res.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
});

export { getAllProducts, deleteProduct, updateProduct, getAllBrands };
