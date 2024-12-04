import mg from "./mail.client.js";

const GREEN_COLOR = "#4CAF50";

const createEmailTemplate = (title, content) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 600px;
        margin: 20px auto;
        background: white;
        border-radius: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      .header {
        background: ${GREEN_COLOR};
        color: white;
        padding: 20px;
        text-align: center;
        border-radius: 10px 10px 0 0;
      }
      .header h1 {
        font-size: 24px;
        margin: 0;
      }
      .content {
        padding: 30px;
        color: #333;
      }
      .footer {
        text-align: center;
        padding: 20px;
        color: #666;
        font-size: 12px;
        border-top: 1px solid #eee;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        background: ${GREEN_COLOR};
        color: white;
        text-decoration: none;
        border-radius: 5px;
        margin: 20px 0;
      }
      .highlight-box {
        background: #f8f9fa;
        border-left: 4px solid ${GREEN_COLOR};
        padding: 15px;
        margin: 20px 0;
      }
      .code {
        font-size: 24px;
        letter-spacing: 5px;
        color: ${GREEN_COLOR};
        font-weight: bold;
        text-align: center;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 5px;
        margin: 20px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      ${content}
      <div class="footer">
        © ${new Date().getFullYear()} Your Company Name. All rights reserved.
      </div>
    </div>
  </body>
</html>
`;

const sendOTPEmail = async (to, otp) => {
  const content = `
    <div class="header">
      <h1>Verify Your Email</h1>
    </div>
    <div class="content">
      <h2>Hello!</h2>
      <p>Thank you for registering. Please use the following verification code:</p>
      <div class="code">${otp}</div>
      <p>This code will expire in ${process.env.OTP_EXPIRY_MINUTES} minutes.</p>
      <div class="highlight-box">
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    </div>
  `;
  console.log("here");
  const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: `Support <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to,
    subject: "Verify Your Email",
    html: createEmailTemplate("Email Verification", content),
  });
  return response;
};

const sendResetPasswordEmail = async (to, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const content = `
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <h2>Hello!</h2>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </div>
      <div class="highlight-box">
        <p>If you didn't request this change, please ignore this email or contact support if you have concerns.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
      </div>
    </div>
  `;

  const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: `Support <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to,
    subject: "Reset Your Password",
    html: createEmailTemplate("Password Reset", content),
  });
  return response;
};

const sendProductPurchaseEmail = async (to, productDetails) => {
  const content = `
    <div class="header">
      <h1>Order Confirmation</h1>
    </div>
    <div class="content">
      <h2>Thank you for your purchase!</h2>
      <div class="highlight-box">
        <h3 style="color: ${GREEN_COLOR}; margin-bottom: 10px;">Order Details</h3>
        <p><strong>Product:</strong> ${productDetails.name}</p>
        <p><strong>Price:</strong> $${productDetails.price}</p>
        <p><strong>Order ID:</strong> ${productDetails.orderId}</p>
      </div>
      <p>We're preparing your order and will notify you once it's shipped.</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/orders" class="button">View Order</a>
      </div>
    </div>
  `;

  const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: `Support <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to,
    subject: "Order Confirmation",
    html: createEmailTemplate("Order Confirmation", content),
  });
  return response;
};

const sendPaymentConfirmationEmail = async (to, paymentId, amount) => {
  const content = `
    <div class="header">
      <h1>Payment Confirmation</h1>
    </div>
    <div class="content">
      <h2>Payment Successful!</h2>
      <div class="highlight-box">
        <h3 style="color: ${GREEN_COLOR}; margin-bottom: 10px;">Payment Details</h3>
        <p><strong>Payment ID:</strong> ${paymentId}</p>
        <p><strong>Amount:</strong> $${amount}</p>
        <p><strong>Status:</strong> <span style="color: ${GREEN_COLOR};">✓ Completed</span></p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      <p>Thank you for your payment. This email serves as your receipt.</p>
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/payments" class="button">View Payment History</a>
      </div>
    </div>
  `;

  const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: `Support <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to,
    subject: "Payment Confirmation",
    html: createEmailTemplate("Payment Confirmation", content),
  });
  return response;
};

// Utility function for sending custom emails
const sendCustomEmail = async (to, subject, customContent) => {
  const content = `
    <div class="header">
      <h1>${subject}</h1>
    </div>
    <div class="content">
      ${customContent}
    </div>
  `;

  const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: `Support <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to,
    subject,
    html: createEmailTemplate(subject, content),
  });
  return response;
};

const sendPageViewedEmail=async (user)=>{
const content=`<div class="header">
      <h1>Page Viewed</h1>
    </div>
    <div class="content">
      <p>Hi ${user.name || "User"},</p>
      <p>Your page has been viewed!</p>
      <p>Thanks for using our platform!</p>
    </div>`

  
  const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: `Support <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to,
    subject:"Your Page Viewed by someone",
    html: createEmailTemplate("Your Page Viewed by someone", content),
  });
  return response;

}

export {
  sendOTPEmail,
  sendResetPasswordEmail,
  sendProductPurchaseEmail,
  sendPaymentConfirmationEmail,
  sendCustomEmail,
  sendPageViewedEmail,
};
