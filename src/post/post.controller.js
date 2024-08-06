import { asyncHandler } from "../utils/asyncHandler.js";
import Post from "./post.model.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { ApiError } from "../utils/APIError.js";
import mongoose from "mongoose"; // Import mongoose for ObjectId validation

const createPost = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    const { title, content } = req.body;
    const post = await Post.create({ title, content, author: user._id });
    return res
      .status(200)
      .json(new ApiResponse(200, post, "post created successfully"));
  } catch (error) {
    next(error); // Handle error
  }
});

const fetchAllPosts = asyncHandler(async (req, res, next) => {
  try {
    const { search } = req.query; // Get search query
    const query = search ? { title: { $regex: search, $options: "i" } } : {}; // Search by title
    const posts = await Post.find(query);
    return res
      .status(200)
      .json(new ApiResponse(200, posts, "Posts fetched successfully"));
  } catch (error) {
    next(error); // Handle error
  }
});

const fetchUserPosts = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const posts = await Post.find({ author: userId });
    return res
      .status(200)
      .json(new ApiResponse(200, posts, "User posts fetched successfully"));
  } catch (error) {
    next(error); // Handle error
  }
});

const fetchSinglePost = asyncHandler(async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return next(new ApiError("Invalid post ID", 400));
    }
    const post = await Post.findById(postId);
    if (!post) {
      return next(new ApiError("Post not found", 404));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, post, "Post fetched successfully"));
  } catch (error) {
    next(error); // Handle error
  }
});

const editPost = asyncHandler(async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return next(new ApiError("Invalid post ID", 400));
    }
    const { title, content } = req.body;
    const post = await Post.findByIdAndUpdate(
      postId,
      { title, content },
      { new: true },
    );
    if (!post) {
      return next(new ApiError("Post not found", 404));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, post, "Post updated successfully"));
  } catch (error) {
    next(error); // Handle error
  }
});

const deletePost = asyncHandler(async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return next(new ApiError("Invalid post ID", 400));
    }
    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      return next(new ApiError("Post not found", 404));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, post, "Post deleted successfully"));
  } catch (error) {
    next(error); // Handle error
  }
});

export {
  createPost,
  fetchAllPosts,
  fetchUserPosts,
  fetchSinglePost,
  editPost,
  deletePost,
};
