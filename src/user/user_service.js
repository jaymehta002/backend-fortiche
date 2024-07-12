import { User } from "./user.model.js";
import { ApiError } from "../utils/APIError.js";
import { fetchProducts } from "../product/product_service.js";

const fetchUserByUserId = async (userId) => {
  const user = await User.findById(userId);
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

// brand specific
const fetchBrandDetailsAndProducts = async (brandId) => {
  const brandDetails = await fetchUserByUserId(brandId);

  const brandProducts = await fetchProducts({ brandId });

  const resp = {
    brandDetails,
    brandProducts,
  };

  return resp;
};

export {
  fetchUserByUserId,
  fetchUsers,
  updateUserByUserId,
  validateAdditionalLink,
  fetchBrandDetailsAndProducts,
};
