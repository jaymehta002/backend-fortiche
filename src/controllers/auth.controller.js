import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAndSendOTP, verifyOTP } from "../services/otp.service.js";
import { generateTokens, verifyToken } from "../services/token.service.js";

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
  console.log(hashedOTP, otpExpiration);
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

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );
  if (!createdUser) {
    return next(
      ApiError(500, "Something went wrong while registering the user"),
    );
  }

  const { accessToken, refreshToken } = generateTokens(user._id);
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
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
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
  });

  if (!user || !(await user.isPasswordCorrect(password))) {
    return next(ApiError(401, "Invalid user credentials"));
  }

  const { accessToken, refreshToken } = generateTokens(user._id);
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      success: true,
      data: loggedInUser,
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
    return next(ApiError(401, "Unauthorized request"));
  }

  const decodedToken = verifyToken(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET,
  );
  const user = await User.findById(decodedToken._id);

  if (!user) {
    return next(ApiError(401, "Invalid refresh token"));
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    user._id,
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
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
