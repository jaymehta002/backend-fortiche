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
        © ${new Date().getFullYear()} Fortiche. All rights reserved.
      </div>
    </div>
  </body>
</html>
`;

const sendOTPEmail = async (to, otp) => {
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          background-color: #f8f9fa;
          border-radius: 8px 8px 0 0;
        }
        .header h1 {
          color: #2c3e50;
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px 20px;
          background: #ffffff;
          border-radius: 0 0 8px 8px;
        }
        .code {
          text-align: center;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #2c3e50;
          padding: 20px;
          margin: 20px 0;
          background-color: #f8f9fa;
          border-radius: 4px;
        }
        .highlight-box {
          background-color: #fff8dc;
          border-left: 4px solid #ffd700;
          padding: 15px;
          margin-top: 20px;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          margin-top: 20px;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 15px;
        }
        @media only screen and (max-width: 480px) {
          .container {
            padding: 10px;
          }
          .code {
            font-size: 24px;
            letter-spacing: 6px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you for creating an account with us. To ensure the security of your account, please verify your email address using the following code:</p>
          
          <div class="code">${otp}</div>
          
          <p>This verification code will expire in <strong>${process.env.OTP_EXPIRY_MINUTES} minutes</strong>.</p>
          
          <p>Enter this code on the verification page to complete your registration.</p>
          
          <div class="highlight-box">
            <p>🔒 <strong>Security Notice:</strong> If you didn't request this verification code, please disregard this email and contact our support team immediately.</p>
          </div>

          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>Need help? Contact our support team at ${process.env.SUPPORT_EMAIL}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
 
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
const sendOrderConfirmationEmail = async (to, order, productDetails, isDownloadable) => {
  const content = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333; text-align: center;">Order Confirmation</h1>
      <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h2 style="color: #444; margin-top: 0;">Order Details</h2>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Total Amount:</strong> €${order.totalAmount.toFixed(2)}</p>
      </div>

      ${!isDownloadable ? `
        <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #444; margin-top: 0;">Shipping Information</h2>
          <p><strong>Address:</strong><br>
            ${order.shippingAddress.line1 || ''}${order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br>
            ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.postalCode || ''}<br>
            ${order.shippingAddress.country || ''}
          </p>
        </div>
      ` : ''}

      <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h2 style="color: #444; margin-top: 0;">Order Summary</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 8px;">Product</th>
            <th style="text-align: center; padding: 8px;">Quantity</th>
            <th style="text-align: right; padding: 8px;">Price</th>
          </tr>
          ${productDetails.map(item => `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">${item.title}</td>
              <td style="text-align: center; padding: 8px;">${item.quantity}</td>
              <td style="text-align: right; padding: 8px;">€${item.totalPrice.toFixed(2)}</td>
              ${item.isDownloadable ? `<td style="text-align: right; padding: 8px;"><a href="${item.downloadableDetails.fileUpload}">Download</a></td>` : ''}
            </tr>
          `).join('')}

          <tr>
            <td colspan="2" style="text-align: right; padding: 8px;"><strong>Total:</strong></td>
            <td style="text-align: right; padding: 8px;"><strong>€${order.totalAmount.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #666;">Thank you for your purchase! ${!isDownloadable ? "We'll notify you when your order ships." : ""}</p>
        <p style="color: #666;">If you have any questions about your order, please contact our support team at <a href="mailto:support@fortiche.com" style="color: #007bff;">support@fortiche.com</a></p>
      </div>

      <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center; color: #666;">
        <p>Best regards,<br>The Team at Fortiche</p>
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
const sendBrandNewOrderEmail = async (to, order, productDetails, isDownloadable) => {
  const content = `
  <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
      <h1 style="color: #2c3e50; margin: 0;">New Order Received!</h1>
      <p style="color: #7f8c8d; font-size: 16px;">Order #${order.orderNumber}</p>
    </div>

    <div style="padding: 20px;">
      <div style="background-color: #ffffff; border: 1px solid #e1e1e1; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Order Details</h2>
        <p><strong>Total Amount:</strong> €${order.totalAmount.toFixed(2)}</p>
        <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e1e1e1; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Customer Information</h2>
        <p><strong>Name:</strong> ${order.customerInfo.name}</p>
        <p><strong>Email:</strong> ${order.customerInfo.email}</p>
        ${order.customerInfo.phone ? `<p><strong>Phone:</strong> ${order.customerInfo.phone}</p>` : ''}
      </div>

      ${!isDownloadable ? `
      <div style="background-color: #ffffff; border: 1px solid #e1e1e1; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Shipping Address</h2>
        <p>${order.shippingAddress.line1 || ''}${order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br>
        ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.postalCode || ''}<br>
        ${order.shippingAddress.country || ''}</p>
      </div>
      ` : ''}

      <div style="background-color: #ffffff; border: 1px solid #e1e1e1; border-radius: 5px; padding: 15px;">
        <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Order Items</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left;">Product</th>
            <th style="padding: 10px; text-align: center;">Quantity</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
          ${productDetails.map(item => `
            <tr style="border-bottom: 1px solid #e1e1e1;">
              <td style="padding: 10px;">${item.title}</td>
              <td style="padding: 10px; text-align: center;">${item.quantity}</td>
              <td style="padding: 10px; text-align: right;">€${item.totalPrice.toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px; text-align: right;"><strong>€${order.totalAmount.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>
    </div>

    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; margin-top: 20px;">
      <p style="margin-bottom: 10px;">Thank you for your business!</p>
      <p style="margin-bottom: 10px;">If you have any questions, please contact our support team at <a href="mailto:support@fortiche.com" style="color: #3498db;">support@fortiche.com</a></p>
      <p style="color: #7f8c8d;">Best regards,<br>The Team at Fortiche</p>
    </div>
  </div>
  `;

  const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: `Support <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to,
    subject: "New Order Received",
    html: createEmailTemplate("New Order Received", content),
  });
  return response;
};


export {
  sendOTPEmail,
  sendResetPasswordEmail,
  sendProductPurchaseEmail,
  sendPaymentConfirmationEmail,
  sendCustomEmail,
  sendPageViewedEmail,
  sendOrderConfirmationEmail,
  sendBrandNewOrderEmail,
};
