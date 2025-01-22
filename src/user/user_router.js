import { Router } from "express";
import {
  getUserDetailsController,
  updateUserDetailsController,
  updateUserAvatarController,
  removeUserAvatarController,
  updateUserCoverImageController,
  updateAdditionalLinksController,
  getAllBrandsController,
  getBrandDetailsAndProductsController,
  getInfluencerPageController,
  getAdditionalLinksController,
  handleLinkOrder,
  deleteLink,
  updateSocialsController,
  updateFeedLinkController,
  getAllInfluencerController,
  connectStripeController,
 
  deleteAccountController,
  updateSeo,
  updateInfluencerAddress,
  updateBrandAddress,
  getInfluencerOrdersController,
  updatePrivacyPolicyController,
  updateTermsAndConditionsController,
  updateRefundPolicyController,
  disconnectStripeController,
  
} from "./user_controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  cancelSubscription,
  createSubscription,
  toggleAutoRenewal,
  upgradeSubscription,
} from "./subscription.controller.js";

const userRouter = Router();
const publicUserRouter = Router();

userRouter.use(auth);

userRouter
  .get("/my-profile", getUserDetailsController)
  .patch("/update-account", updateUserDetailsController)
  .patch("/update-avatar", upload.single("avatar"), updateUserAvatarController)
  .delete("/remove-avatar", removeUserAvatarController)
  .patch(
    "/update-cover-image",
    upload.single("coverImage"),
    updateUserCoverImageController,
  )
  .patch(
    "/update-additional-links",
    (req, res, next) => {
      if (req.headers['content-type'].includes('multipart/form-data')) {
        upload.single('thumbnail')(req, res, (err) => {
          if (err) {
            return res.status(400).json({ error: 'File upload error' });
          }
          next();
        });
      } else {
        next();
      }
    },
    updateAdditionalLinksController,
  )
  .patch("/update-privacy-policy", updatePrivacyPolicyController)
  .patch("/update-terms-and-conditions", updateTermsAndConditionsController)
  .patch("/update-refund-policy", updateRefundPolicyController)
  .patch("/handle-link-order", handleLinkOrder)
  .delete("/delete-additional-link/:id", deleteLink)
  .get("/get-additional-links", getAdditionalLinksController)
  .get("/get-all-brands", getAllBrandsController)
  .get("/get-all-influencers", getAllInfluencerController)
  .get("/get-brand-details-and-products", getBrandDetailsAndProductsController)
  .patch("/update-social", updateSocialsController)
  .post("/update-feed-link", updateFeedLinkController)
  .post("/create-subscription", createSubscription)
  .post("/cancel-subscription", cancelSubscription)
  .post("/upgrade-subscription", upgradeSubscription)
  .post("/toggle-auto-renewal", toggleAutoRenewal)
  .post("/connect-stripe", connectStripeController)
  .post("/disconnect-stripe",disconnectStripeController)
  .delete("/delete-account", deleteAccountController)
  .patch("/update-seo", updateSeo)
  .patch("/update-influencer-address",updateInfluencerAddress)
  .patch("/update-brand-address",updateBrandAddress)
  .get("/get-influencer-orders",getInfluencerOrdersController)
publicUserRouter.get("/get-influencer-page", getInfluencerPageController);

export { userRouter, publicUserRouter };
