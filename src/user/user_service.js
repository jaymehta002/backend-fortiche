import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APIError.js";

const findUserByUsername = async (username) => {
  try {
    const user = await User.findOne({ username }).select("-password");
    if (!user) {
      return ApiError(404, "user not found with the username: " + username);
    }

    return user;
  } catch (err) {
    console.log(err);
    return ApiError();
  }
};

const updateUserByUsername = async (username, updates) => {
  try {
    const user = await findUserByUsername(username);
    if (!user) {
      return ApiError(404, "user not found with the username: " + username);
    }

    // TODO - handle for unique username
    const updatedUser = await User.findOneAndUpdate({ username }, updates, {
      new: true,
    }).select("-password");
    if (!updatedUser) {
      return ApiError(
        404,
        "issue with updateUserByUsername for username: " + username,
      );
    }

    return updatedUser;
  } catch (err) {
    console.log(err);
    return ApiError();
  }
};

export { findUserByUsername, updateUserByUsername };
