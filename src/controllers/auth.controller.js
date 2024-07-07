import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAndSendOTP, verifyOTP } from "../services/otp.service.js";
import { generateTokens, verifyToken } from "../services/token.service.js";
import { compare } from "bcrypt";
import { cookieOptions } from "../utils/config.js";

const registerUser = asyncHandler(async (req, res, next) => {
  const { fullName, email, username, password } = req.body;

  if ([fullName, email, username, password].some((field) => !field?.trim())) {
    return next(ApiError(400, "All fields are required"));
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    return next(ApiError(409, "User with email or username already exists"));
  }

  const { hashedOTP, otpExpiration } = await generateAndSendOTP(email);

  req.session.registrationOTP = { email, hashedOTP, otpExpiration };

  res.status(200).json({
    success: true,
    message: "OTP sent to email. Please verify.",
  });
});

const verifyOTPAndRegister = asyncHandler(async (req, res, next) => {
  const { email, otp, fullName, username, password, accountType, categories } =
    req.body;

  if (
    !req.session.registrationOTP ||
    req.session.registrationOTP.email !== email
  ) {
    return next(ApiError(400, "Invalid session or email mismatch"));
  }

  const { hashedOTP, otpExpiration } = req.session.registrationOTP;
  await verifyOTP(hashedOTP, otp, otpExpiration);

  delete req.session.registrationOTP;

  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
    accountType,
    categories,
  });

  const createdUser = await User.findById(user._id);
  if (!createdUser) {
    return next(
      ApiError(500, "Something went wrong while registering the user"),
    );
  }

  const { accessToken, refreshToken } = generateTokens(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateModifiedOnly: true });

  res
    .status(201)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 10 * 24 * 60 * 60 * 1000, //10 days
    })
    .json({
      success: true,
      data: createdUser,
      message: "User registered successfully",
    });
});

const loginUser = asyncHandler(async (req, res, next) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return next(ApiError(400, "All credentials are required"));
  }

  const user = await User.findOne({
    $or: [
      { username: usernameOrEmail.toLowerCase() },
      { email: usernameOrEmail },
    ],
  }).select("+password +refreshToken");

  const isPasswordCorrect = await compare(password, user.password);

  if (!user || !isPasswordCorrect) {
    return next(ApiError(403, "Invalid user credentials"));
  }

  const { accessToken, refreshToken } = generateTokens(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateModifiedOnly: true });

  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.refreshToken;

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 10 * 24 * 60 * 60 * 1000, //10 days
    })
    .json({
      success: true,
      data: userResponse,
      message: "User logged in successfully",
    });
});

const logoutUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({
      success: true,
      message: "User logged out",
    });
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return next(ApiError(401, "Refresh token is required"));
  }

  const decodedToken = verifyToken(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET,
  );

  const user = await User.findById(decodedToken._id).select("+refreshToken");

  if (!user) {
    return next(ApiError(401, "Invalid refresh token"));
  }

  if (incomingRefreshToken !== user.refreshToken) {
    return next(ApiError(401, "Refresh token is expired or used"));
  }
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    user._id,
  );

  user.refreshToken = newRefreshToken;
  await user.save({ validateModifiedOnly: true });

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 10 * 24 * 60 * 60 * 1000, //10 days
    })
    .json({
      success: true,
      message: "Access token refreshed",
    });
});

export {
  registerUser,
  verifyOTPAndRegister,
  loginUser,
  logoutUser,
  refreshAccessToken,
};
