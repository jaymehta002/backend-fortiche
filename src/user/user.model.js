import mongoose, { Schema } from "mongoose";
import {
  additionalLinkHost,
  accountType,
  category,
  theme,
  subscriptions,
} from "../common/common_constants.js";
import bcrypt from "bcrypt";

// Additional link schema remains unchanged
const additionalLinkSchema = new Schema({
  thumbnail: {
    type: String,
    required: true,
  },
  host: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Subscription model remains unchanged
const subscriptionModel = new Schema({
  plan: {
    type: String,
    required: true,
    enum: Object.values(subscriptions),
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "cancelled", "expired"],
    default: "inactive",
  },
  payments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  ],
  autoRenew: {
    type: Boolean,
    default: false,
  },
});

// Define the feed structure
const feedSchema = new Schema({
  youtubeLinks: [
    {
      title: {
        type: String,
        required: true,
      },
      link: {
        type: String,
        required: true,
      },
    },
  ],
  affiliateLinks: [
    {
      title: {
        type: String,
        required: true,
      },
      link: {
        type: String,
        required: true,
      },
    },
  ],
  musicLinks: [
    {
      title: {
        type: String,
        required: true,
      },
      link: {
        type: String,
        required: true,
      },
    },
  ],
});

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: Object.values(accountType),
      required: true,
    },
    categories: {
      type: [String],
      enum: Object.values(category),
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    bio: {
      type: String,
    },
    avatar: {
      type: String, // cloudinary url
    },
    coverImage: {
      type: String, // cloudinary url
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    socials: {
      twitter: {
        type: String,
      },
      facebook: {
        type: String,
      },
      instagram: {
        type: String,
      },
      linkedin: {
        type: String,
      },
      youtube: {
        type: String,
      },
      tiktok: {
        type: String,
      },
    },
    additionalLinks: {
      type: [additionalLinkSchema],
    },
    theme: {
      type: String,
      default: "musk",
      enum: Object.values(theme),
    },
    plan: {
      type: String,
      default: "basic",
      enum: ["basic", "stater", "pro"],
    },
    subscription: {
      type: subscriptionModel,
    },
    feed: {
      type: feedSchema,
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save hook for password hashing remains unchanged
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model("User", userSchema);

export { User };
