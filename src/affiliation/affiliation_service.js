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

export { fetchAffiliationById, updateAffiliationById };
