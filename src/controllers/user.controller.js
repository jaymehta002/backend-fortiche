import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APIError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;
  return res.status(200).json({
    success: true,
    data: user,
    message: "User fetched successfully",
  });
});

const updateAccountDetails = asyncHandler(async (req, res, next) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    return next(ApiError(400, "All fields are required"));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { fullName, email },
    { new: true },
  ).select("-password");

  return res.status(200).json({
    success: true,
    data: user,
    message: "Account details updated successfully",
  });
});

const updateUserAvatar = asyncHandler(async (req, res, next) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    return next(ApiError(400, "Avatar file is missing"));
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    return next(ApiError(400, "Error while uploading avatar"));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: avatar.url },
    { new: true },
  ).select("-password");

  return res.status(200).json({
    success: true,
    data: user,
    message: "Avatar image updated successfully",
  });
});

const updateUserCoverImage = asyncHandler(async (req, res, next) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    return next(ApiError(400, "Cover image file is missing"));
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    return next(ApiError(400, "Error while uploading cover image"));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { coverImage: coverImage.url },
    { new: true },
  ).select("-password");

  return res.status(200).json({
    success: true,
    data: user,
    message: "Cover image updated successfully",
  });
});




export {
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
