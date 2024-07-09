import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  findUserByUserId,
  updateUserByUserId,
  validateAdditionalLink,
} from "../user/user_service.js";
import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";

const getUserDetails = asyncHandler(async (req, res) => {
  const user = req.user;
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const user = req.user;

  try {
    const { userName, categories, fullName, bio } = req.body;
    const updates = {};

    if (userName) updates.username = userName;
    if (categories) updates.categories = categories;
    if (fullName) updates.fullName = fullName;
    if (bio) updates.bio = bio;

    const updatedUser = await updateUserByUserId(user._id, updates);
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
  const user = req.user;

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

    const updatedUser = await updateUserByUserId(user._id, updates);
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
  const user = req.user;

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

    const updatedUser = await updateUserByUserId(user._id, updates);
    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedUser, "Cover image updated successfully"),
      );
  } catch (err) {
    return next(err);
  }
});

const updateAdditionalLinks = asyncHandler(async (req, res) => {
  const user = req.user;

  try {
    const { additionalLinks } = req.body;

    if (additionalLinks) {
      const updates = {};

      const validatedLinks = additionalLinks.map((link) => {
        validateAdditionalLink(link);
        return link;
      });

      const existingHosts = new Map();

      if (user.additionalLinks) {
        for (const existingLink of user.additionalLinks) {
          existingHosts.set(existingLink.host, existingLink.url); // Store existing host-url pairs
        }
      }

      // Update links using MongoDB update operators
      updates.additionalLinks = validatedLinks.map((link) => {
        const updateOperator = existingHosts.has(link.host)
          ? { $set: { "additionalLinks.$[elem].url": link.url } } // Update URL for existing host
          : { $addToSet: { additionalLinks: link } }; // Add new link if host doesn't exist

        existingHosts.set(link.host, link.url); // Update existingHosts Map if necessary

        return updateOperator;
      });

      const updatedUser = await updateUserByUserId(user._id, updates);
      return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "links updated successfully"));
    }
  } catch (err) {
    return next(err);
  }
});

export {
  getUserDetails,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
  updateAdditionalLinks,
};
