import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  fetchBrandDetailsAndProducts,
  updateUserByUserId,
  fetchUsers,
} from "../user/user_service.js";
import { getInfluencerProfile } from "../user/user_service.js";
import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";
import { accountType } from "../common/common_constants.js";
import { increasePageViewCount } from "../analytics/analytics_service.js";
import { Affiliation } from "../affiliation/affiliation_model.js";

const getUserDetailsController = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    return res
      .status(200)
      .json(new ApiResponse(200, user, "user fetched successfully"));
  } catch (err) {
    return next(err);
  }
});

const updateUserDetailsController = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;

    const { userName, categories, fullName, bio } = req.body;

    const existingUser = await fetchUsers({ username: userName });
    if (existingUser) {
      throw ApiError(409, "username already exists");
    }

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

const updateUserAvatarController = asyncHandler(async (req, res, next) => {
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

const updateUserCoverImageController = asyncHandler(async (req, res, next) => {
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

const updateAdditionalLinksController = asyncHandler(async (req, res, next) => {
  const user = req.user;

  try {
    const { additionalLinks } = req.body;
    console.log(additionalLinks);
    if (additionalLinks) {
      additionalLinks.forEach((newLink) => {
        const existingLinkIndex = user.additionalLinks.findIndex(
          (link) => link.host === newLink.host,
        );
        if (existingLinkIndex !== -1) {
          // Update existing link
          user.additionalLinks[existingLinkIndex].url = newLink.url;
        } else {
          // Add new link
          user.additionalLinks.push(newLink);
        }
      });

      // Save the updated user
      const updatedUser = await user.save();

      return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "links updated successfully"));
    }
  } catch (err) {
    return next(err);
  }
});

const getAllBrandsController = asyncHandler(async (req, res, next) => {
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

const getBrandDetailsAndProductsController = asyncHandler(
  async (req, res, next) => {
    try {
      const user = req.user;
      const brandId = req.body.brandId;

      if (
        user.accountType !== accountType.INFLUENCER &&
        user.accountType !== accountType.BRAND
      ) {
        throw ApiError(403, "user should be an influencer or a brand");
      } else if (
        user.accountType === accountType.BRAND &&
        user._id !== brandId
      ) {
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
  },
);

const getInfluencerPageController = asyncHandler(async (req, res, next) => {
  try {
    const influencerId = req.body.influencerId;

    const influencer = await getInfluencerProfile(influencerId, {
      _id: 1,
      fullName: 1,
      username: 1,
      bio: 1,
      avatar: 1,
      coverImage: 1,
      additionalLinks: 1,
      accountType: 1,
    });

    const affiliations = await Affiliation.aggregate([
      {
        $match: { influencerId: influencer._id },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $project: {
          _id: 1,
          productDetails: 1,
        },
      },
    ]);

    const influencerPageInfo = {
      influencerInfo: influencer,
      affiliations,
    };

    const lastVisitTimeCookieKey = `lastVisitTime::${influencerId}`;
    const lastVisitTime = req.cookies[lastVisitTimeCookieKey];
    if (!lastVisitTime) {
      await increasePageViewCount(influencerId, 1);
      res.cookie(lastVisitTimeCookieKey, Date.now(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60, // can make configurable in case of multiple usecases
      });
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          influencerPageInfo,
          "influencer page fetched successfully",
        ),
      );
  } catch (err) {
    return next(err);
  }
});

export {
  getUserDetailsController,
  updateUserDetailsController,
  updateUserAvatarController,
  updateUserCoverImageController,
  updateAdditionalLinksController,
  getAllBrandsController,
  getBrandDetailsAndProductsController,
  getInfluencerPageController,
};
