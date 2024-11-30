import mongoose, { Schema } from "mongoose";

const GuestSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      required: true,
      match: [
        /^\+?\d{1,4}?\s?-?\(?\d{1,4}?\)?\s?-?\d{1,4}\s?-?\d{1,4}\s?-?\d{1,9}$/,
        "Please provide a valid phone number",
      ],
    },
    address: {
      line1: {
        type: String,
        required: true,
      },
      line2: {
        type: String,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
      },
      postalCode: {
        type: String,
        required: true,
        match: [
          /^[0-9]{6}$/,
          "Please provide a valid postal code",
        ],
      },
      country: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

const Guest = mongoose.model("Guest", GuestSchema);
export default Guest;
