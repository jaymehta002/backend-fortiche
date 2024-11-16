import { User } from "../user/user.model.js";
import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAndSendOTP, verifyOTP } from "../services/otp.service.js";
import { generateTokens, verifyToken } from "../services/token.service.js";
import { compare } from "bcrypt";
import {
  cookieOptions,
  refreshCookieOptions,
  createTokenResponse,
} from "../utils/config.js";
import passport from "passport";
import { sendEmail, sendResetPasswordMail } from "../services/mail.service.js";

export const googleLogin = passport.authenticate("google", {
  scope: ["profile", "email"],
});

export const googleCallback = asyncHandler(async (req, res, next) => {
  passport.authenticate(
    "google",
    { session: false },
    async (err, user, info) => {
      if (err || !user) {
        return next(ApiError(401, "Google authentication failed"));
      }

      try {
        const tokens = generateTokens(user._id);
        await User.findByIdAndUpdate(user._id, {
          refreshToken: tokens.refreshToken,
        });

        res
          .cookie("accessToken", tokens.accessToken, cookieOptions)
          .cookie("refreshToken", tokens.refreshToken, refreshCookieOptions);

        // Determine redirect URL
        const redirectUrl = !user.accountType
          ? `${process.env.CLIENT_URL}/onboarding`
          : user.accountType === "influencer"
            ? `${process.env.CLIENT_URL}/dashboard`
            : `${process.env.CLIENT_URL}/brands/dashboard`;

        // Include tokens in redirect URL for client-side storage
        const tokenParams = new URLSearchParams({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }).toString();

        return res.redirect(`${redirectUrl}?${tokenParams}`);
      } catch (error) {
        return next(ApiError(500, "Error during authentication"));
      }
    },
  )(req, res, next);
});

const onboarding = asyncHandler(async (req, res, next) => {
  if (req.user.accountType) {
    return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }
  const { username, accountType, categories } = req.body;
  if (!username || !accountType || !categories) {
    return next(ApiError(400, "All fields are required"));
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    return next(ApiError(404, "User not found"));
  }
  user.username = username;
  user.accountType = accountType;
  user.categories = categories;
  await user.save();
  res.status(200).json({
    success: true,
    message: "Onboarding successful",
  });
  // .redirect(`${process.env.CLIENT_URL}/dashboard`);
});

const registerUser = asyncHandler(async (req, res, next) => {
  // console.log("reach");
  const { fullName, email, username, password } = req.body;

  if ([fullName, email, username, password].some((field) => !field?.trim())) {
    return next(ApiError(400, "All fields are required"));
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  console.log(existedUser);
  if (existedUser) {
    return next(ApiError(409, "User with email or username already exists"));
  }

  const { hashedOTP, otpExpiration } = await generateAndSendOTP(email);

  res.cookie(
    "registrationOTP",
    JSON.stringify({ email, hashedOTP, otpExpiration }),
    { httpOnly: true, secure: true, sameSite: "none" },
  );
  console.log(req.cookies.registrationOTP, "sending");
  res.status(200).json({
    success: true,
    message: "OTP sent to email. Please verify.",
  });
});

const verifyOTPAndRegister = asyncHandler(async (req, res, next) => {
  const { email, otp, fullName, username, password, accountType, categories } =
    req.body;

  // Retrieve OTP data from cookies instead of session
  const registrationOTP = req.cookies.registrationOTP
    ? JSON.parse(req.cookies.registrationOTP)
    : null;

  console.log(registrationOTP); // check 2
  if (!registrationOTP || registrationOTP.email !== email) {
    return next(ApiError(400, "Invalid cookie or email mismatch"));
  }

  const { hashedOTP, otpExpiration } = registrationOTP;
  await verifyOTP(hashedOTP, otp, otpExpiration);

  // Clear the OTP cookie
  res.clearCookie("registrationOTP");

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
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
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

  if (!user || !(await compare(password, user?.password || ""))) {
    return next(ApiError(403, "Invalid user credentials"));
  }

  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  await user.save({ validateModifiedOnly: true });

  const response = createTokenResponse(tokens, user);

  res
    .status(200)
    .cookie("accessToken", tokens.accessToken, cookieOptions)
    .cookie("refreshToken", tokens.refreshToken, refreshCookieOptions)
    .json(response);
});

const logoutUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true },
  );

  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", refreshCookieOptions)
    .json({
      success: true,
      message: "User logged out",
    });
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken ||
      req.body.refreshToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!incomingRefreshToken) {
      throw ApiError(401, "Refresh token is required");
    }

    const decodedToken = verifyToken(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken._id).select("+refreshToken");

    if (!user || incomingRefreshToken !== user.refreshToken) {
      throw ApiError(401, "Invalid refresh token");
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateModifiedOnly: true });

    const response = createTokenResponse(tokens, user);

    res
      .status(200)
      .cookie("accessToken", tokens.accessToken, cookieOptions)
      .cookie("refreshToken", tokens.refreshToken, refreshCookieOptions)
      .json(response);
  } catch (error) {
    res
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", refreshCookieOptions);
    next(error);
  }
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(ApiError(400, "Email is required"));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(ApiError(404, "User not found"));
  }

  const token = generateTokens(user._id).accessToken;

  const resetPasswordLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  // const resetPasswordLink = `http://localhost:5173/reset-password?token=${token}`;

  await sendResetPasswordMail(email, resetPasswordLink);

  res.status(200).json({
    success: true,
    message: "Password reset link sent to email",
  });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { token, newPassword } = req.body;
  console.log(token, newPassword);
  if (!token || !newPassword) {
    return next(ApiError(400, "Token and new password are required"));
  }

  const decodedToken = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);

  const user = await User.findById(decodedToken._id);

  if (!user) {
    return next(ApiError(404, "User not found"));
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

const validateToken = asyncHandler(async (req, res, next) => {
  const { token } = req.query;

  if (!token) {
    return next(ApiError(400, "Token is required"));
  }

  try {
    const decodedToken = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id);

    if (!user) {
      return res.status(200).json({ valid: false });
    }

    res.status(200).json({ valid: true });
  } catch (error) {
    return res.status(200).json({ valid: false });
  }
});

const changeAccountPassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    return next(ApiError(404, "User not found"));
  }
  const isPasswordCorrect = await compare(oldPassword, user.password);

  if (!isPasswordCorrect) {
    return next(ApiError(403, "Invalid old password"));
  }
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

export {
  registerUser,
  verifyOTPAndRegister,
  loginUser,
  logoutUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  validateToken,
  onboarding,
  changeAccountPassword,
};
