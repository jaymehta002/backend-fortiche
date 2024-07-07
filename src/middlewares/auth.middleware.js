import { User } from "../models/user.model.js";
import { verifyToken } from "../services/token.service.js";
import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const auth = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return next(ApiError(403, "Unauthorized request"));
  }

  try {
    const decodedToken = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      return next(ApiError(401, "Invalid Access Token"));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
});
