import { Product } from "../product/product.model.js";
import { transporter } from "../services/mail.service.js";
import Preference from "./preference.model.js";

export const sendProductPurchaseMail = async (userId, productId) => {
  try {
    const preference = await Preference.findOne({ userId: userId });
    if (preference.notification.productPurchase) {
      const product = await Product.findById(productId);
      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: user.email,
        subject: "Thank You for Your Purchase!",
        text: `Dear ${user.fullName},\n\nSomeone has purchased a ${product.title} from your page\n\nBest regards,\Fortiche`,
      };
      await transporter.sendMail(mailOptions);
    }
  } catch (error) {
    next(error);
  }
};
