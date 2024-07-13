import { ApiError } from "../utils/APIError.js";
import { updateAffiliationById } from "./affiliation_service.js";

const increaseAffiliationClickCount = async (affiliationId, increase) => {
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
  if (qty < 1 || amount <= 0) {
    throw new ApiError(404, `invalid qty ${qty} or amount ${amount}`);
  }

  const updatedAffiliation = await updateAffiliationById(affiliationId, {
    $inc: { totalSaleQty: qty, totalSaleRevenue: amount },
  });

  return updatedAffiliation;
};

export { increaseAffiliationClickCount, affiliationUpdatesForSuccessfulOrder };
