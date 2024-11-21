import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { User } from "../user/user.model.js";
import { Product } from "../product/product.model.js";
import { Affiliation } from "../affiliation/affiliation_model.js";
import Recommendation from "../recommendation/recommendation.model.js";
import { Collection } from "../models/collection.model.js";

const validatePagination = (limit, page) => ({
  validatedLimit: Math.max(parseInt(limit), 1),
  validatedPage: Math.max(parseInt(page), 1),
});

const findUserByUsername = async (username) => {
  const user = await User.findOne({ username });
  if (!user) {
    throw ApiError(404, "User not found");
  }
  return user;
};

const fetchUserProducts = async (userId, limit, page) => {
  return Product.find({ brandId: userId })
    .limit(limit)
    .skip((page - 1) * limit);
};

const fetchAffiliatedProductIds = async (userId) => {
  return Affiliation.find({ influencerId: userId }).distinct("productId");
};

const fetchUserPosts = async (userId, limit, page) => {
  return Recommendation.find({ author: userId })
    .limit(limit)
    .skip((page - 1) * limit)
    .populate("products");
};

const fetchAffiliatedProducts = async (productIds, limit, page) => {
  return Product.find({ _id: { $in: productIds } })
    .limit(limit)
    .skip((page - 1) * limit);
};

const calculatePaginationTotals = async (userId, productIds) => {
  const [totalProducts, totalAffiliatedProducts, totalPosts] =
    await Promise.all([
      Product.countDocuments({ brandId: userId }),
      Product.countDocuments({ _id: { $in: productIds } }),
      Recommendation.countDocuments({ author: userId }),
    ]);

  return {
    totalProducts,
    totalAffiliatedProducts,
    totalPosts,
  };
};

const fetchCollectionsAndProducts = async (userId) => {
  const fetchCollection = await Collection.find({ userId });
  const productIds = fetchCollection
    .map((collection) => collection.productIds)
    .flat();
  const fetchCollectionProducts = await Product.find({
    _id: { $in: productIds },
  });

  return fetchCollection.map((collection) => ({
    title: collection.title,
    products: fetchCollectionProducts.filter((product) =>
      collection.productIds.includes(product._id),
    ),
    userId,
  }));
};

const getFeedByUsername = asyncHandler(async (req, res, next) => {
  try {
    const { username } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const { validatedLimit, validatedPage } = validatePagination(limit, page);

    const user = await findUserByUsername(username);

    const [products, affiliatedProductIds, userPosts] = await Promise.all([
      fetchUserProducts(user._id, validatedLimit, validatedPage),
      fetchAffiliatedProductIds(user._id),
      fetchUserPosts(user._id, validatedLimit, validatedPage),
    ]);

    // const affiliatedProducts = await fetchAffiliatedProducts(
    //   affiliatedProductIds.map((id) => id.toString()),
    //   validatedLimit,
    //   validatedPage,
    // );

    const affiliations = await Affiliation.find({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      influencerId: user._id,
    }).populate("productId");
    console.log(affiliations, "dfeed");
    const { totalProducts, totalAffiliatedProducts, totalPosts } =
      await calculatePaginationTotals(user._id, affiliatedProductIds);

    const totalItems = totalProducts + totalAffiliatedProducts + totalPosts;
    const totalPages = Math.ceil(totalItems / validatedLimit);

    const collections = await fetchCollectionsAndProducts(user._id);

    const payload = {
      coverImage: user.coverImage,
      avatar: user.avatar,
      fullName: user.fullName,
      theme: user.theme,
      bio: user.bio,
      links: user.additionalLinks || [],
      socials: user.socials || {},
      userProducts: products,
      feed: user.feed,
      totalUserProducts: products.length,
      brandProducts: affiliations,
      // totalBrandProducts: affiliatedProducts.length,
      posts: userPosts,
      totalPosts: userPosts.length,
      currentPage: validatedPage,
      totalPages,
      totalItems,
      limit: validatedLimit,
      collections,
      influencerId: user._id,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, payload, "Feed fetched successfully"));
  } catch (error) {
    next(error);
  }
});

const canUpdateInteraction = (lastInteraction, intervalInHours) => {
  if (!lastInteraction) return true;
  const intervalMs = intervalInHours * 60 * 60 * 1000; // Convert hours to milliseconds
  const now = Date.now();
  return now - new Date(lastInteraction).getTime() > intervalMs;
};

const getProductByUsername = asyncHandler(async (req, res, next) => {
  try {
    const { username, productId } = req.params;
    const product = await Product.findById(productId);
    const user = await User.findOne({ username });

    if (!product || !user) {
      throw ApiError(404, "Product or User not found");
    }

    let affiliation = await Affiliation.findOne({
      productId: product._id,
      influencerId: user._id,
    });

    const ONE_HOUR = 1;

    if (affiliation) {
      if (canUpdateInteraction(affiliation.updatedAt, ONE_HOUR)) {
        await Affiliation.findOneAndUpdate(
          { productId: product._id, influencerId: user._id },
          {
            $inc: { clicks: 1, pageView: 1 },
          },
          { new: true },
        );
      }
    } else {
      await Affiliation.create({
        productId: product._id,
        influencerId: user._id,
        clicks: 1,
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, product, "Product fetched successfully"));
  } catch (error) {
    next(error);
  }
});

export { getFeedByUsername, getProductByUsername };
