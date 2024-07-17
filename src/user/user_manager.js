import { fetchUserByUserId } from "./user_service.js";
import { ApiError } from "../utils/APIError.js";

const getInfluencerProfile = async (influencerId) => {
  const user = await fetchUserByUserId(influencerId);

  if (user.accountType !== accountType.INFLUENCER) {
    throw ApiError(
      404,
      "account type is not influencer, it is: " + user.accountType,
    );
  }

  return user;
};

export { getInfluencerProfile };
