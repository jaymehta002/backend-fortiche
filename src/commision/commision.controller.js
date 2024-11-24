import Commision from "./commision.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Product } from "../product/product.model.js";
import { ApiError } from "../utils/APIError.js";

export const createCommision = asyncHandler(async (req, res) => {
  console.log("createCommision");
  const user = req.user;
  const { productId, recipients } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw ApiError(404, "Product not found");
  if (product.brandId.toString() !== user._id.toString())
    throw ApiError(
      403,
      "You are not authorized to create commision for this product",
    );

  // Check if commission already exists for this product
  const existingCommision = await Commision.findOne({
    productId,
    isDeleted: false,
  });

  let commision;
  if (existingCommision) {
    // Update existing commission
    commision = await Commision.findByIdAndUpdate(
      existingCommision._id,
      {
        $addToSet: {
          recipients: {
            $each: recipients.map((recipient) => ({
              userId: recipient.userId,
              percentage: recipient.amount,
            })),
          },
        },
      },
      { new: true },
    );
  } else {
    commision = await Commision.create({
      brandId: user._id,
      productId,
      recipients: recipients.map((recipient) => ({
        userId: recipient.userId,
        percentage: recipient.amount,
      })),
    });
  }

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

export const getCommisions = asyncHandler(async (req, res) => {
  const user = req.user;
  const commisions = await Commision.find({
    brandId: user._id,
    isDeleted: false,
  })
    .populate("productId", "title pricing")
    .populate("recipients.userId", "fullName");
  console.log(commisions);
  res.status(200).json(commisions);
});

export const removeCommision = asyncHandler(async (req, res) => {
  try {
    const { commissionId, userId } = req.body;

    await Commision.findByIdAndUpdate(commissionId, {
      $pull: { recipients: { userId } },
    });
    res.status(200).json({ message: "Commission removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
