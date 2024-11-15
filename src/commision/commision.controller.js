import Commision from "./commision.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Product } from "../product/product.model.js";
import { ApiError } from "../utils/APIError.js";

export const createCommision = asyncHandler(async (req, res) => {
  const user = req.user;
  const { productId, userId, amount } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw ApiError(404, "Product not found");
  if (product.brandId.toString() !== user._id.toString())
    throw ApiError(
      403,
      "You are not authorized to create commision for this product",
    );
  const commision = await Commision.create({
    productId,
    recipients: [{ userId, amount }],
  });

  res.status(201).json(commision);
});

export const getCommisionsByProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const commisions = await Commision.find({
    productId,
    isDeleted: false,
  }).populate("recipients.userId", "name email");

  res.status(200).json(commisions);
});

export const getCommisionsByUser = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;

  const commisions = await Commision.find({
    "recipients.userId": userId,
    isDeleted: false,
  }).populate("productId", "name price");

  res.status(200).json(commisions);
});

export const updateCommision = asyncHandler(async (req, res) => {
  const { commisionId } = req.params;
  const { recipients } = req.body;

  const commision = await Commision.findById(commisionId);
  if (!commision) throw ApiError(404, "Commission not found");

  // Verify ownership through product
  const product = await Product.findById(commision.productId);
  if (product.brandId.toString() !== req.user._id.toString()) {
    throw ApiError(403, "You are not authorized to update this commission");
  }

  const updatedCommision = await Commision.findByIdAndUpdate(
    commisionId,
    { recipients },
    { new: true },
  );

  res.status(200).json(updatedCommision);
});

export const deleteCommision = asyncHandler(async (req, res) => {
  const { commisionId } = req.params;

  const commision = await Commision.findById(commisionId);
  if (!commision) throw ApiError(404, "Commission not found");

  // Verify ownership through product
  const product = await Product.findById(commision.productId);
  if (product.brandId.toString() !== req.user._id.toString()) {
    throw ApiError(403, "You are not authorized to delete this commission");
  }

  await Commision.findByIdAndUpdate(commisionId, { isDeleted: true });

  res.status(200).json({ message: "Commission deleted successfully" });
});
