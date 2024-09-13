import { Schema } from "mongoose";
const CourseSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    customUrl: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    material: [
      {
        title: {
          type: String,
        },
        video: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Course = mongoose.model("Course", CourseSchema);
export default Course;
