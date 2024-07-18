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
import {upload} from "../middlewares/multer.middleware.js";
const userRouter = Router();
userRouter.use(auth);

userRouter
  .get("/my-profile", getUserDetails)
  .patch("/update-account", updateUserDetails)
  .patch("/update-avatar", upload.single('avatar'), updateUserAvatar)
  .patch("/update-cover-image", upload.single('coverImage'), updateUserCoverImage)
  .patch("/update-additional-links", updateAdditionalLinks)
  .get("/get-all-brands", getAllBrands)
  .get("/get-brand-details-and-products", getBrandDetailsAndProducts);

export default userRouter;
