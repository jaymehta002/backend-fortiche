import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Course from "./course.model.js";

const createCourse = asyncHandler(async (req, res, next) => {
  const { title, customUrl, description, thumbnail, material, pricing } =
    req.body;
  const user = req.user;
  if (!title || !customUrl || !description) {
    throw ApiError(400, "Title, custom URL, and description are required");
  }
  if (user.plan !== "believer") {
    throw ApiError(403, "You are not authorized to create a course");
  }
  const newCourse = new Course({
    userId: user._id,
    title,
    customUrl,
    description,
    thumbnail,
    material,
    pricing,
  });

  await newCourse.save();
  res
    .status(201)
    .json({ message: "Course created successfully", course: newCourse });
});

const uploadThumbnailOrVideo = asyncHandler(async (req, res, next) => {
  try {
    const user = req.user;
    if (user.plan !== "believer") {
      throw ApiError(403, "You are not authorized to upload a file");
    }
    const file = req.file?.path;
    console.log(file);
    if (!file) throw ApiError(400, "File is required");
    const result = uploadOnCloudinary(file);
    return res.json(
      new ApiResponse(200, result.url, "Link Uploaded successfully"), // Fixed typo in message
    );
  } catch (error) {
    next(error);
  }
});

export { createCourse, uploadThumbnailOrVideo };
