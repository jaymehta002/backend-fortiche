import { ApiError } from "../utils/APIError.js";
import { Affiliation } from "./affiliation_model.js";

const fetchAffiliationById = async (affiliationId) => {
  const affiliation = await Affiliation.findById(affiliationId);

  if (!affiliation) {
    throw new ApiError(404, "invalid affiliationId: " + affiliationId);
  }

  return affiliation;
};

const updateAffiliationById = async (affiliationId, updates) => {
  const updatedAffiliation = await Affiliation.findByIdAndUpdate(
    affiliationId,
    updates,
    { new: true },
  );

  if (!updatedAffiliation) {
    throw new ApiError(404, "invalid affiliationId: " + affiliationId);
  }

  return updatedAffiliation;
};

const increaseAffiliationClickCount = async (affiliationId, increase) => {
  if (increase <= 0) {
    throw new ApiError(
      500,
      `invalid increase value: ${increase} for affiliation click count`,
    );
  }

  const updatedAffiliation = await updateAffiliationById(affiliationId, {
    $inc: { clicks: increase },
  });

  return updatedAffiliation;
};

const affiliationUpdatesForSuccessfulOrder = async (
  affiliationId,
  qty,
  amount,
) => {
  if (qty <= 0 || amount <= 0) {
    throw new ApiError(404, `invalid qty ${qty} or amount ${amount}`);
  }

  const updatedAffiliation = await updateAffiliationById(affiliationId, {
    $inc: { totalSaleQty: qty, totalSaleRevenue: amount },
  });

  return updatedAffiliation;
};

const increasePageViewCount = async (affiliationId, increase) => {
  if (increase < 0) {
    throw new ApiError(
      500,
      `invalid increase value: ${increase} for page view count`,
    );
  }

  const updatedAffiliation = await updateAffiliationById(affiliationId, {
    $inc: { pageView: increase },
  });
  return updatedAffiliation;
};

export {
  fetchAffiliationById,
  updateAffiliationById,
  increaseAffiliationClickCount,
  affiliationUpdatesForSuccessfulOrder,
  increasePageViewCount, // Added new export
};
