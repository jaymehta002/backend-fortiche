import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
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

const changeCurrentPassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!(await user.isPasswordCorrect(oldPassword))) {
    return next(ApiError(400, "Invalid old password"));
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    data: {},
    message: "Password changed successfully",
  });
});

const getUserChannelProfile = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  if (!username?.trim()) {
    return next(ApiError(400, "Username is missing"));
  }

  const channel = await User.aggregate([
    { $match: { username: username.toLowerCase() } },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: { $in: [req.user?._id, "$subscribers.subscriber"] },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel.length) {
    return next(ApiError(404, "Channel does not exist"));
  }

  return res.status(200).json({
    success: true,
    data: channel[0],
    message: "User channel fetched successfully",
  });
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(req.user._id) } },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
            },
          },
          { $addFields: { owner: { $first: "$owner" } } },
        ],
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    data: user[0].watchHistory,
    message: "Watch history fetched successfully",
  });
});

export {
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  changeCurrentPassword,
  getUserChannelProfile,
  getWatchHistory,
};
