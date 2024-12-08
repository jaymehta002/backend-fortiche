import { Schema, model } from "mongoose";

const recommendationSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [{
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Recommendation = model("Recommendation", recommendationSchema);

export default Recommendation;
