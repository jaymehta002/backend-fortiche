import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  findUserByUsername,
  updateUserByUsername,
} from "../user/user_service.js";

const getUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  console.log(username);
  if (!username || username.trim() === "") {
    return next(ApiError(404, "user not found, as the username was empty"));
  }

  try {
    const user = await findUserByUsername(username);
    return res.status(200).json(new ApiResponse(200, user));
  } catch (err) {
    return next(err);
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username || username.trim() === "") {
    return next(ApiError(404, "user not found, as the username was empty"));
  }

  try {
    const updatedUser = await updateUserByUsername(username);
    return res.status(200).json(new ApiResponse(200, updatedUser));
  } catch (err) {
    return next(err);
  }
});

export { getUser, updateUser };
