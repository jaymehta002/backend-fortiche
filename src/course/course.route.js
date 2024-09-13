import { Router } from "express";
import { createCourse, uploadThumbnailOrVideo } from "./course.controller";

const courseRouter = Router();

courseRouter.use(auth);

courseRouter
  .post("/create", createCourse)
  .post("/uploadFile", uploadThumbnailOrVideo);

export default courseRouter;
