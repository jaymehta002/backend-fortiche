import { Router } from "express";
import {
  getUserDetails,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
  updateAdditionalLinks,
  getAllBrands,
  getBrandDetailsAndProducts,
} from "./user_controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const userRouter = Router();
userRouter.use(auth);

userRouter
  .get("/my-profile", getUserDetails)
  .patch("/update-account", updateUserDetails)
  .patch("/update-avatar", updateUserAvatar)
  .patch("/update-cover-image", updateUserCoverImage)
  .patch("/update-additional-links", updateAdditionalLinks)
  .get("/get-all-brands", getAllBrands)
  .get("/get-brand-details-and-products", getBrandDetailsAndProducts);

export default userRouter;
