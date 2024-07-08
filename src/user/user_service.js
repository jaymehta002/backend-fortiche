import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APIError.js";

const findUserByUsername = async (username) => {
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return ApiError(404, "user not found with the username: " + username);
    }

    return user;
  } catch (err) {
    console.log(err);
    return ApiError();
  }
};

const updateUserByUsername = async (username) => {
  try {
    const user = await findUserByUsername(username);
    if (!user) {
      return ApiError(404, "user not found with the username: " + username);
    }

    const { userName, categories, fullName, bio } = req.body;
    const updates = {};

    if (userName) updates.username = userName;
    if (categories) updates.categories = categories;
    if (fullName) updates.fullName = fullName;
    if (bio) updates.bio = bio;

    const updatedUser = await User.findOneAndUpdate({ username }, updates, {
      new: true,
    });
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
