import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {
  createPost,
  fetchAllPosts,
  fetchUserPosts,
  fetchSinglePost,
  editPost,
  deletePost,
} from "./post.controller.js";
const router = Router();

router.use(auth);

router
  .post("/create", createPost)
  .get("/all", fetchAllPosts)
  .get("/user", fetchUserPosts)
  .get("/:id", fetchSinglePost)
  .patch("/update/:id", editPost)
  .delete("/delete/:id", deletePost);

export default router;
