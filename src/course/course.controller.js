import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Course from "./course.model.js";

const createCourse = asyncHandler(async (req, res, next) => {
  const { title, customUrl, description, thumbnail, material } = req.body;
  const user = req.user;

  if (!title || !customUrl || !description) {
    throw ApiError(400, "Title, custom URL, and description are required");
  }

  const newCourse = new Course({
    userId: user._id,
    title,
    customUrl,
    description,
    thumbnail,
    material,
  });

  await newCourse.save();
  res
    .status(201)
    .json({ message: "Course created successfully", course: newCourse });
});

const uploadThumbnailOrVideo = asyncHandler(async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw ApiError(400, "File is required");
    const result = await uploadOnCloudinary(file); // Added await here
    return res.json(
      new ApiResponse(200, result.url, "Link Uploaded successfully"), // Fixed typo in message
    );
  } catch (error) {
    next(error);
  }
});

export { createCourse, uploadThumbnailOrVideo };
