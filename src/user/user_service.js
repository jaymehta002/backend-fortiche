import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APIError.js";

const findUserByUserId = async (userId) => {
  try {
    const user = await User.findById({ userId }).select("-password");
    if (!user) {
      return ApiError(404, "user not found with the userId: " + userId);
    }

    return user;
  } catch (err) {
    console.log(err);
    return ApiError();
  }
};

const updateUserByUserId = async (userId, updates) => {
  try {
    // TODO - handle for unique username
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      return ApiError(
        404,
        "issue with updateUserByUserId for userId: " + userId,
      );
    }

    return updatedUser;
  } catch (err) {
    console.log(err);
    return ApiError();
  }
};

export { findUserByUserId, updateUserByUserId };
