import { Router } from "express";
import {
  getUserDetailsController,
  updateUserDetailsController,
  updateUserAvatarController,
  updateUserCoverImageController,
  updateAdditionalLinksController,
  getAllBrandsController,
  getBrandDetailsAndProductsController,
  getInfluencerPageController,
} from "./user_controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
const userRouter = Router();
const publicUserRouter = Router();
userRouter.use(auth);

userRouter
  .get("/my-profile", getUserDetailsController)
  .patch("/update-account", updateUserDetailsController)
  .patch("/update-avatar", updateUserAvatarController)
  .patch("/update-cover-image", updateUserCoverImageController)
  .patch("/update-additional-links", updateAdditionalLinksController)
  .get("/get-all-brands", getAllBrandsController)
  .get("/get-brand-details-and-products", getBrandDetailsAndProductsController);

publicUserRouter.get("/get-influencer-page", getInfluencerPageController);

export { userRouter, publicUserRouter };
