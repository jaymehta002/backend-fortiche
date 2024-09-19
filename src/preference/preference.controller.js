import Preference from "./preference.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const updatePreference = asyncHandler(async (req, res, next) => {
  try {
    const { productPurchase, pageView, paymentConfirmation, specialOffers } =
      req.body;
    const user = req.user;
    const preference = await Preference.findOne({ userId: user._id });

    if (preference) {
      if (productPurchase !== undefined)
        preference.notification.productPurchase = productPurchase;
      if (pageView !== undefined) preference.notification.pageView = pageView;
      if (paymentConfirmation !== undefined)
        preference.notification.paymentConfirmation = paymentConfirmation;
      if (specialOffers !== undefined)
        preference.notification.specialOffers = specialOffers;

      const newPreference = await preference.save();
    } else {
      const newPreference = new Preference({
        userId: user._id,
        notification: {
          productPurchase,
          pageView,
          paymentConfirmation,
          specialOffers,
        },
      });
      await newPreference.save();
      return res.status(200).json(newPreference);
    }

    res.status(200).json(preference);
  } catch (error) {
    next(error);
  }
});

export const getPreference = asyncHandler(async (req, res, next) => {
  try {
    const preference = await Preference.findOne({ userId: req.user.id });
    res.status(200).json(preference);
  } catch (error) {
    next(error);
  }
});
