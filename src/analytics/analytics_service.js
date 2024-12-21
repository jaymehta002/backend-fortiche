import { Analytics } from "./analytics_model.js";
import { ApiError } from "../utils/APIError.js";

const updateAnalyticsByUserId = async (userId, updates) => {
 
  const updatedAnalytics = await Analytics.findOneAndUpdate(
    { userId: userId },
    updates,
    {
      new: true,
      upsert: true,
    },
  );

 

  if (!updatedAnalytics) {
    throw ApiError(404, `invalid userId:  ${userId}`);
  }

  return updatedAnalytics;
};

const increasePageViewCount = async (userId, increase) => {
  if (increase < 0) {
    throw ApiError(
      500,
      `invalid increase value: ${increase} for page view count`,
    );
  }
  const updatedAnalytics = await updateAnalyticsByUserId(userId, {
    $inc: { pageViews: increase },
  });

  return updatedAnalytics;
};

export { updateAnalyticsByUserId, increasePageViewCount };
