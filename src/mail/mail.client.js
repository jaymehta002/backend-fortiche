import Mailgun from "mailgun.js";
import formData from "form-data";
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

export default mg;
