import express from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter
  .post("/change-password", changeCurrentPassword)
  .get("/me", getCurrentUser)
  .put("/update-account", updateAccountDetails)
  .put("/update-avatar", updateUserAvatar)
  .put("/update-cover-image", updateUserCoverImage)
  .get("/channel/:username", getUserChannelProfile)
  .get("/watch-history", getWatchHistory);

export default userRouter;
