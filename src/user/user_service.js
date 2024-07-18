import { User } from "./user.model.js";
import { ApiError } from "../utils/APIError.js";
import { fetchProducts } from "../product/product_service.js";
import { accountType } from "../common/common_constants.js";

const fetchUserByUserId = async (userId, projection) => {
  const user = await User.findById(userId, projection);
  if (!user) {
    throw ApiError(
      404,
      "invalid userId, user not found with userId: " + userId,
    );
  }

  return user;
};

const fetchUsers = async (filter, projection) => {
  const users = await User.find(filter, projection);
  return users;
};

const updateUserByUserId = async (userId, updates) => {
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true },
  );

  if (!updatedUser) {
    throw ApiError(404, `invalid userId: ${userId}`);
  }

  return updatedUser;
};

function validateAdditionalLink(link) {
  if (!link.host || !link.url) {
    throw ApiError(422, "link host or link url is missing");
  }
  if (!Object.values(additionalLinkHost).includes(link.host)) {
    throw ApiError(422, "invalid host");
  }
}


const fetchBrandDetailsAndProducts = async (brandId) => {
  const brandDetails = await fetchUserByUserId(brandId);

  const brandProducts = await fetchProducts({ brandId });

  const resp = {
    brandDetails,
    brandProducts,
  };

  return resp;
};

// influencer specific
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

export {
  fetchUserByUserId,
  fetchUsers,
  updateUserByUserId,
  validateAdditionalLink,
  fetchBrandDetailsAndProducts,
  getInfluencerProfile,
};
