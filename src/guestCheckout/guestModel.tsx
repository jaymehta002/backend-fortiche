import { Schema } from "mongoose";

const guestUserSchema = new Schema(
  {
    email: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    products: { type: [String], required: true }, // Changed to an array of strings
  },
  {
    timestamps: true,
  },
);
