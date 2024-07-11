import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  fetchBrandDetailsAndProducts,
  updateUserByUserId,
  validateAdditionalLink,
  fetchUsers,
} from "../user/user_service.js";
import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";
import { accountType } from "../common/common_constants.js";

const getUserDetails = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    return res
      .status(200)
      .json(new ApiResponse(200, user, "user fetched successfully"));
  } catch (err) {
    return next(err);
  }
});

const updateUserDetails = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

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
          "account details updated successfully",
        ),
      );
  } catch (err) {
    return next(err);
  }
});

const updateUserAvatar = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
      throw ApiError(400, "avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
      throw ApiError(400, "error while uploading avatar");
    }

    const updates = { avatar: avatar.url };
    const updatedUser = await updateUserByUserId(user._id, updates);

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedUser, "avatar image updated successfully"),
      );
  } catch (err) {
    return next(err);
  }
});

const updateUserCoverImage = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
      throw ApiError(400, "cover image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
      throw ApiError(400, "error while uploading cover image");
    }

    const updates = { coverImage: coverImage.url };
    const updatedUser = await updateUserByUserId(user._id, updates);

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedUser, "cover image updated successfully"),
      );
  } catch (err) {
    return next(err);
  }
});

const updateAdditionalLinks = asyncHandler(async (req, res, next) => {
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

const getAllBrands = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    if (user.accountType !== accountType.INFLUENCER) {
      throw ApiError(403, "user should be an influencer");
    }

    const allBrands = await fetchUsers({ accountType: accountType.BRAND });

    return res
      .status(200)
      .json(new ApiResponse(200, allBrands, "all brands fetched successfully"));
  } catch (err) {
    return next(err);
  }
});

const getBrandDetailsAndProducts = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    const brandId = req.body.brandId;

    if (
      user.accountType !== accountType.INFLUENCER &&
      user.accountType !== accountType.BRAND
    ) {
      throw ApiError(403, "user should be an influencer or a brand");
    } else if (user.accountType === accountType.BRAND && user._id !== brandId) {
      throw ApiError(
        403,
        "brand is trying to access details of any other brand",
      );
    }

    const resp = await fetchBrandDetailsAndProducts(brandId);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          resp,
          "brand details and products fetched successfully",
        ),
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
  updateAdditionalLinks,
  getAllBrands,
  getBrandDetailsAndProducts,
};
