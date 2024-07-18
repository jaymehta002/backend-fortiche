import { Analytics } from "./analytics_model.js";
import { ApiError } from "../utils/APIError.js";

const updateAnalyticsByUserId = async (userId, updates) => {
  const updatedAnalytics = await Analytics.findByIdAndUpdate(userId, updates, {
    new: true,
  });

  if (!updatedAnalytics) {
    throw new ApiError(404, "invalid userId: " + userId);
  }

  return updatedAnalytics;
};

export { updateAnalyticsByUserId };
