import { Router } from "express";
import {
  getUserDetails,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "./user_controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const userRouter = Router();
userRouter.use(auth);

userRouter
  .get("/my-profile", getUserDetails)
  .put("/update-account", updateUserDetails)
  .put("/update-avatar", updateUserAvatar)
  .put("/update-cover-image", updateUserCoverImage);

export default userRouter;
