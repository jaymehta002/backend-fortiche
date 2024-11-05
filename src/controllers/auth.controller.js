import { User } from "../user/user.model.js";
import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAndSendOTP, verifyOTP } from "../services/otp.service.js";
import { generateTokens, verifyToken } from "../services/token.service.js";
import { compare } from "bcrypt";
import { cookieOptions, refreshCookieOptions } from "../utils/config.js";
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
      if (err) {
        console.error("Google authentication error:", err);
        return next(ApiError(500, "Error during Google authentication"));
      }
      if (!user) {
        return next(ApiError(401, "Google authentication failed"));
      }
      try {
        const { accessToken, refreshToken } = generateTokens(user._id);
        await User.findByIdAndUpdate(user._id, { refreshToken });

        res
          .cookie("accessToken", accessToken, cookieOptions)
          .cookie("refreshToken", refreshToken, refreshCookieOptions);

        // Check if the user needs to complete onboarding
        if (!user.accountType) {
          return res.redirect(`${process.env.CLIENT_URL}/onboarding`);
        } else if (user.accountType === "influencer") {
          return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
        } else {
          return res.redirect(`${process.env.CLIENT_URL}/brands/dashboard`);
        }
      } catch (error) {
        console.error("Token generation error:", error);
        return next(ApiError(500, "Error generating authentication tokens"));
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
  const { fullName, email, username, password } = req.body;

  if ([fullName, email, username, password].some((field) => !field?.trim())) {
    return next(ApiError(400, "All fields are required"));
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    return next(ApiError(409, "User with email or username already exists"));
  }

  const { hashedOTP, otpExpiration } = await generateAndSendOTP(email);

  const otpCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
    path: "/",
    domain: process.env.CLIENT_URL,
  };

  res.clearCookie("registrationOTP", otpCookieOptions);

  res.cookie(
    "registrationOTP",
    JSON.stringify({
      email,
      hashedOTP,
      otpExpiration: Date.now() + 15 * 60 * 1000,
    }),
    otpCookieOptions,
  );

  console.log("Cookie being set:", {
    email,
    otpExpiration,
    cookies: req.cookies,
    cookieOptions: otpCookieOptions,
  });

  res.status(200).json({
    success: true,
    message: "OTP sent to email. Please verify.",
  });
});

const verifyOTPAndRegister = asyncHandler(async (req, res, next) => {
  const { email, otp, fullName, username, password, accountType, categories } =
    req.body;

  console.log("Incoming verification request:", {
    email,
    allCookies: req.cookies,
    otpCookie: req.cookies.registrationOTP,
  });

  const registrationOTP = req.cookies.registrationOTP;

  if (!registrationOTP) {
    console.error("Missing OTP cookie during verification");
    return next(
      ApiError(400, "OTP session expired or invalid. Please request a new OTP"),
    );
  }

  let otpData;
  try {
    otpData = JSON.parse(registrationOTP);
  } catch (error) {
    console.error("Failed to parse OTP cookie:", error);
    return next(ApiError(400, "Invalid OTP data format"));
  }

  if (otpData.email !== email) {
    console.error("Email mismatch:", {
      storedEmail: otpData.email,
      receivedEmail: email,
    });
    return next(
      ApiError(
        400,
        "Email mismatch. Please use the same email used for requesting OTP",
      ),
    );
  }

  try {
    await verifyOTP(otpData.hashedOTP, otp, otpData.otpExpiration);
  } catch (error) {
    console.error("OTP verification failed:", error);
    return next(ApiError(400, error.message || "Invalid OTP"));
  }

  res.clearCookie("registrationOTP", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: process.env.CLIENT_URL,
  });

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
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
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
    secure: true,
    sameSite: "lax",
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
    .cookie("refreshToken", newRefreshToken, refreshCookieOptions)
    .json({
      success: true,
      message: "Access token refreshed",
    });
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
};
