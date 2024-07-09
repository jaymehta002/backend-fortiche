import express from "express";
import {
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const userRouter = express.Router();
// userRouter.use(auth);

userRouter
  .get("/my-profile", getCurrentUser)
  .put("/update-account", updateAccountDetails)
  .put("/update-avatar", updateUserAvatar)
  .put("/update-cover-image", updateUserCoverImage);

export default userRouter;
