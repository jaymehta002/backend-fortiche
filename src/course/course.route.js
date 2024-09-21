import { Router } from "express";
import { createCourse, uploadThumbnailOrVideo } from "./course.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";
import { upload } from "../middlewares/multer.middleware.js";
const courseRouter = Router();

courseRouter.use(auth);

courseRouter
  .post("/create", createCourse)
  .post("/uploadFile", upload.single("file"), uploadThumbnailOrVideo);

export default courseRouter;
