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
  getAdditionalLinksController,
  handleLinkOrder,
  deleteLink,
} from "./user_controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
const userRouter = Router();
const publicUserRouter = Router();
userRouter.use(auth);

userRouter
  .get("/my-profile", getUserDetailsController)
  .patch("/update-account", updateUserDetailsController)
  .patch("/update-avatar", upload.single("avatar"), updateUserAvatarController)
  .patch(
    "/update-cover-image",
    upload.single("coverImage"),
    updateUserCoverImageController,
  )
  .patch(
    "/update-additional-links",
    upload.single("thumbnail"),
    updateAdditionalLinksController,
  )
  .patch("/handle-link-order", handleLinkOrder)
  .delete("/delete-link", deleteLink)
  .get("/get-additional-links", getAdditionalLinksController)
  .get("/get-all-brands", getAllBrandsController)
  .get("/get-brand-details-and-products", getBrandDetailsAndProductsController);

publicUserRouter.get("/get-influencer-page", getInfluencerPageController);

export { userRouter, publicUserRouter };
