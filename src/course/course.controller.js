import { uploadOnCloudinary } from "../pkg/cloudinary/cloudinary_service";
import { ApiError } from "../utils/APIError";
import { ApiResponse } from "../utils/APIResponse";
import { asyncHandler } from "../utils/asyncHandler";
import Course from "./course.model";

const createCourse = asyncHandler(async (req, res, next) => {
  const { title, customUrl, description, thumbnail, material } = req.body;

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
    const { file } = req.body;
    if (!file) throw ApiError(400, "File is required");
    const result = uploadOnCloudinary(file);
    return res.json(
      new ApiResponse(200, result.url, "Link Uploaded successfulle"),
    );
  } catch (error) {
    next(error);
  }
});

export { createCourse, uploadThumbnailOrVideo };
