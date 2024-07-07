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
import { auth } from "../middlewares/auth.middleware.js";

const userRouter = express.Router();
userRouter.use(auth);

userRouter
  .post("/change-password", changeCurrentPassword)
  .get("/my-profile", getCurrentUser)
  .put("/update-account", updateAccountDetails)
  .put("/update-avatar", updateUserAvatar)
  .put("/update-cover-image", updateUserCoverImage)
  .get("/channel/:username", getUserChannelProfile)
  .get("/watch-history", getWatchHistory);

export default userRouter;
