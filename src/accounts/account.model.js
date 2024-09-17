import mongoose from "mongoose";

const AccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Assuming you have a User model
    required: true,
    unique: true, // Each user should have only one linked PayPal account
  },
  paypalAccessToken: {
    type: String,
    required: true,
  },
  paypalRefreshToken: {
    type: String,
    required: true,
  },
  paypalEmail: {
    type: String,
    required: true, // Optionally store the PayPal account email
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
AccountSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Account = mongoose.model("Account", AccountSchema);

export default Account;
