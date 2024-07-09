import { Router } from "express";
import {
  getUserDetails,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "./user_controller.js";

const userRouter = Router();

userRouter.route("/:userId").get(getUserDetails).patch(updateUserDetails);
userRouter.route("/:userId/update-avatar").patch(updateUserAvatar);
userRouter.route("/:userId/update-cover-image").patch(updateUserCoverImage);

export default userRouter;
