import { updateAnalyticsByUserId } from "./analytics_service.js";

const increasePageViewCount = async (userId, increase) => {
  if (increase < 0) {
    throw new ApiError(
      500,
      `invalid increase value: ${increase} for page view count`,
    );
  }

  const updatedAnalytics = await updateAnalyticsByUserId(userId, {
    $inc: { pageViews: increase },
  });

  return updatedAnalytics;
};

export { increasePageViewCount };
