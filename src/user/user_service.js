import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APIError.js";

const findUserByUserId = async (userId) => {
  try {
    const user = await User.findById({ userId });
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
    );

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

function validateAdditionalLink(link) {
  if (!link.host || !link.url) {
    return ApiError(422, "link host or link url is missing");
  }

  if (!Object.values(additionalLinkHost).includes(link.host)) {
    return ApiError(422, "invalid host");
  }
}

export { findUserByUserId, updateUserByUserId, validateAdditionalLink };
