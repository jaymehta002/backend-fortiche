import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  findUserByUsername,
  updateUserByUsername,
} from "../user/user_service.js";
import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";

const getUserDetails = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username || username.trim() === "") {
    return next(ApiError(404, "user not found, as the username was empty"));
  }

  try {
    const user = await findUserByUsername(username);
    return res
      .status(200)
      .json(new ApiResponse(200, user, "User fetched successfully"));
  } catch (err) {
    return next(err);
  }
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username || username.trim() === "") {
    return next(ApiError(404, "user not found, as the username was empty"));
  }

  try {
    const { userName, categories, fullName, bio } = req.body;
    const updates = {};

    if (userName) updates.username = userName;
    if (categories) updates.categories = categories;
    if (fullName) updates.fullName = fullName;
    if (bio) updates.bio = bio;

    const updatedUser = await updateUserByUsername(username, updates);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedUser,
          "Account details updated successfully",
        ),
      );
  } catch (err) {
    return next(err);
  }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username || username.trim() === "") {
    return next(ApiError(404, "user not found, as the username was empty"));
  }

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    return next(ApiError(400, "Avatar file is missing"));
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    return next(ApiError(400, "Error while uploading avatar"));
  }

  try {
    const updates = { avatar: avatar.url };

    const updatedUser = await updateUserByUsername(username, updates);
    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedUser, "Avatar image updated successfully"),
      );
  } catch (err) {
    return next(err);
  }
});

const updateUserCoverImage = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  if (!username || username.trim() === "") {
    return next(ApiError(404, "user not found, as the username was empty"));
  }

  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    return next(ApiError(400, "Cover image file is missing"));
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    return next(ApiError(400, "Error while uploading cover image"));
  }

  try {
    const updates = { coverImage: coverImage.url };

    const updatedUser = await updateUserByUsername(username, updates);
    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedUser, "Cover image updated successfully"),
      );
  } catch (err) {
    return next(err);
  }
});

export {
  getUserDetails,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
};