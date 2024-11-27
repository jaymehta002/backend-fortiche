import mongoose from "mongoose";
import { accountType } from "../common/common_constants.js";
import { Product } from "../product/product.model.js";
import { User } from "../user/user.model.js";
import { ApiResponse } from "../utils/APIResponse.js";

const addToWishListController = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    if (user.accountType !== accountType.INFLUENCER) {
      throw new ApiError(403, "Unauthorized: Only influencers can add to wishlist");
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, "Invalid product ID");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    if (!Array.isArray(user.wishlist)) {
      user.wishlist = [];
    }
    const isProductInWishlist = user.wishlist.some(
      item => item.toString() === productId
    );

    if (!isProductInWishlist) {
      user.wishlist.push(productId);
      await user.save();
    }
 
    await user.populate('wishlist');

    
    return res.status(200).json(
      new ApiResponse(
        200,
       { wishlist: user.wishlist, 
        wishlistCount: user.wishlist.length} ,
        "Product added to wishlist successfully"
      )
    );    
  } catch (error) {
    next(error);
  }
};

const getWishListController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate('wishlist');
    if (!user) {
      return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }
 
    console.log(user);
    const wishlist = user.wishlist || [];
    return res.status(200).json(new ApiResponse(200, wishlist, "Wishlist fetched successfully"));
  } catch (error) {
    next(error);
  }
};



const removeFromWishListController = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    if (user.accountType !== accountType.INFLUENCER) {
      throw new ApiError(403, "Unauthorized: Only influencers can modify wishlist");
    }
 
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, "Invalid product ID");
    }
 
    const isProductInWishlist = user.wishlist.some(
      item => item.toString() === productId
    );

    if (!isProductInWishlist) {
      throw new ApiError(404, "Product not found in wishlist");
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $pull: { wishlist: productId } },
      { new: true }
    ).populate('wishlist');

    return res
      .status(200)
      .json(
        new ApiResponse(
          200, 
          { 
            wishlist: updatedUser.wishlist,
            wishlistCount: updatedUser.wishlist.length 
          }, 
          "Product removed from wishlist successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};


export { addToWishListController,getWishListController,removeFromWishListController };
