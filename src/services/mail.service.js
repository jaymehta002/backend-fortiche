import nodemailer from "nodemailer";
import { ApiError } from "../utils/APIError.js";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// export const sendEmail = async (email, otp) => {
//   try {
//     const mailOptions = {
//       from: process.env.EMAIL_USERNAME,
//       to: email,
//       subject: "OTP for Verification",
//       text: `Your OTP for verification is ${otp}. It will expire in ${process.env.OTP_EXPIRY_MINUTES} minutes.`,
//     };

//     await transporter.sendMail(mailOptions);
//   } catch (err) {
//     console.error(err);
//     throw ApiError(500, "Error sending OTP email");
//   }
// };

// export const sendResetPasswordMail = async (email, resetToken) => {
//   try {
//     const mailOptions = {
//       from: process.env.EMAIL_USERNAME,
//       to: email,
//       subject: "Reset Password",
//       text: `Click on the link to reset your password: ${resetToken}`,
//     };

//     await transporter.sendMail(mailOptions);
//   } catch (err) {
//     console.error(err);
//     throw ApiError(500, "Error sending reset password email");
//   }
// };

// New email option for product purchase
export const sendProductPurchaseMail = async (email, productDetails) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: "Product Purchase Confirmation",
      text: `Thank you for your purchase! Here are the details:\n\nProduct: ${productDetails.name}\nPrice: ${productDetails.price}\nOrder ID: ${productDetails.orderId}`,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(err);
    throw ApiError(500, "Error sending product purchase email");
  }
};

// New email option for payment confirmation
// export const sendPaymentConfirmationMail = async (email, paymentId, amount) => {
//   try {
//     const mailOptions = {
//       from: process.env.EMAIL_USERNAME,
//       to: email,
//       subject: "Payment Confirmation",
//       text: `Your payment has been confirmed!\n\nPayment ID: ${paymentId}\nAmount: $${amount}`,
//     };

//     await transporter.sendMail(mailOptions);
//   } catch (err) {
//     console.error(err);
//     throw ApiError(500, "Error sending payment confirmation email");
//   }
// };
