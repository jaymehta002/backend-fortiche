import { Router } from "express";
import {
  getUserDetails,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "./user_controller.js";

const userRouter = Router();

userRouter.route("/:username").get(getUserDetails).patch(updateUserDetails);
userRouter.route("/:username/update-avatar").patch(updateUserAvatar);
userRouter.route("/:username/update-cover-image").patch(updateUserCoverImage);

export default userRouter;
