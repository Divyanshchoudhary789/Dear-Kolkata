const nodemailer = require('nodemailer');

/**
 * Email Service using Brevo (Sendinblue) SMTP
 * All transactional emails go through here
 */

/**
 * Email Service using Brevo (Sendinblue) SMTP via Nodemailer
 * All transactional emails go through here
 *
 * SMTP Credentials:
 *  Host:  smtp-relay.brevo.com
 *  Port:  587  (STARTTLS)
 *  Login: your Brevo account email (BREVO_SENDER_EMAIL)
 *  Pass:  SMTP password from Brevo → Settings → SMTP & API → SMTP Keys
 *         (This is different from your login password!)
 */

// Create Brevo SMTP transporter (reused across calls)
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // STARTTLS on port 587
    auth: {
      user: process.env.BREVO_SENDER_EMAIL,
      pass: process.env.BREVO_API_KEY  // SMTP key from Brevo dashboard
    },
    pool: true,           // Reuse connections
    maxConnections: 5,
    rateDelta: 1000,      // Max 1 email per second (Brevo free limit)
    rateLimit: 1
  });

  // Verify connection config on first creation (non-blocking)
  _transporter.verify((error) => {
    if (error) {
      console.error('[EMAIL] Brevo SMTP connection failed:', error.message);
    } else {
      console.log('[EMAIL] Brevo SMTP connection verified ✓');
    }
  });

  return _transporter;
};

/**
 * Base email sender
 * @param {object} options - { to, subject, html, text }
 */
const sendEmail = async (options) => {
  try {
    const transporter = getTransporter();
    
    const mailOptions = {
      from: `"${process.env.BREVO_SENDER_NAME || 'Dear Kolkata'}" <${process.env.BREVO_SENDER_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Sent to ${options.to} | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error(`[EMAIL] Failed to send to ${options.to}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ─── Email Templates ─────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8f4f0; margin: 0; padding: 0; color: #333; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #c41230, #ff6b35); padding: 32px; text-align: center; }
    .header img { width: 120px; margin-bottom: 10px; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: 1px; }
    .header p { color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 14px; }
    .body { padding: 36px; }
    .footer { background: #f0e6e0; padding: 20px; text-align: center; font-size: 12px; color: #888; }
    .btn { display: inline-block; background: #c41230; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0; }
    .info-box { background: #fdf8f5; border-left: 4px solid #c41230; padding: 16px; border-radius: 4px; margin: 16px 0; }
    .amount { font-size: 24px; color: #c41230; font-weight: bold; }
    hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dear Kolkata</h1>
      <p>Your Kolkata Gifting Platform</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Dear Kolkata. All rights reserved.</p>
      <p>Kolkata, West Bengal, India</p>
    </div>
  </div>
</body>
</html>`;

/**
 * Send OTP email (backup when SMS fails)
 */
const sendOTPEmail = async (email, otp, name) => {
  const html = baseTemplate(`
    <h2 style="color:#c41230;">Your OTP</h2>
    <p>Hello ${name || 'there'},</p>
    <p>Use the OTP below to login to Dear Kolkata:</p>
    <div class="info-box" style="text-align:center;">
      <div class="amount">${otp}</div>
      <p style="margin:5px 0;color:#888;">Valid for 10 minutes</p>
    </div>
    <p>If you didn't request this, please ignore this email.</p>
    <p style="color:#888;font-size:13px;">Do not share this OTP with anyone.</p>
  `);

  return sendEmail({
    to: email,
    subject: 'Your Dear Kolkata OTP',
    html,
    text: `Your OTP is: ${otp}. Valid for 10 minutes.`
  });
};

/**
 * Send vendor onboarding welcome email
 */
const sendVendorWelcomeEmail = async (email, vendorName, phone, tempPassword) => {
  const html = baseTemplate(`
    <h2 style="color:#c41230;">Welcome to Dear Kolkata!</h2>
    <p>Dear ${vendorName},</p>
    <p>Your vendor account has been successfully created on Dear Kolkata. Here are your login credentials:</p>
    <div class="info-box">
      <p><strong>Portal:</strong> <a href="${process.env.BASE_URL}/vendor">Vendor Dashboard</a></p>
      <p><strong>Phone Number:</strong> ${phone}</p>
      <p><strong>Temporary Password:</strong> <code style="background:#eee;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
    </div>
    <p><strong>Important:</strong> Please change your password immediately after your first login.</p>
    <a href="${process.env.FRONTEND_URL}/vendor/login" class="btn">Login to Your Dashboard</a>
    <p>If you have any questions, please contact your account manager or email us at support@dearkolkata.com</p>
    <hr>
    <p style="font-size:12px;color:#888;">This is a system-generated email. Please do not reply.</p>
  `);

  return sendEmail({
    to: email,
    subject: 'Welcome to Dear Kolkata - Your Vendor Account is Ready',
    html,
    text: `Welcome ${vendorName}! Login: ${phone}, Password: ${tempPassword}. Change password on first login.`
  });
};

/**
 * Send order confirmation to client
 */
const sendOrderConfirmationEmail = async (email, orderDetails) => {
  const { orderNumber, items, totalAmount, deliveryAddress, deliverySlot } = orderDetails;
  
  const itemsList = items.map(item => 
    `<tr><td>${item.productSnapshot.name}</td><td>${item.quantity}</td><td>₹${item.unitPrice}</td><td>₹${item.subtotal}</td></tr>`
  ).join('');

  const html = baseTemplate(`
    <h2 style="color:#c41230;">Order Confirmed</h2>
    <p>Your order has been placed successfully.</p>
    <div class="info-box">
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Delivery Address:</strong> ${deliveryAddress}</p>
      <p><strong>Delivery Slot:</strong> ${deliverySlot}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f0e6e0;">
          <th style="padding:8px;text-align:left;">Item</th>
          <th style="padding:8px;text-align:left;">Qty</th>
          <th style="padding:8px;text-align:left;">Price</th>
          <th style="padding:8px;text-align:left;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsList}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:8px;font-weight:bold;text-align:right;">Grand Total:</td>
          <td style="padding:8px;" class="amount">₹${totalAmount}</td>
        </tr>
      </tfoot>
    </table>
    <p>We'll notify you as your order progresses.</p>
    <a href="${process.env.FRONTEND_URL}/orders/${orderNumber}" class="btn">Track Your Order</a>
  `);

  return sendEmail({
    to: email,
    subject: `Order Confirmed - ${orderNumber} | Dear Kolkata`,
    html,
    text: `Your order ${orderNumber} has been placed. Total: ₹${totalAmount}.`
  });
};

/**
 * Send payout notification to vendor
 */
const sendPayoutNotificationEmail = async (email, vendorName, amount, orderNumber) => {
  const html = baseTemplate(`
    <h2 style="color:#c41230;">Payout Released</h2>
    <p>Dear ${vendorName},</p>
    <p>Your payout has been processed and is on its way to your bank account.</p>
    <div class="info-box">
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Payout Amount:</strong> <span class="amount">₹${amount}</span></p>
      <p><strong>Transfer Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
    </div>
    <p>The amount will reflect in your bank account within 2-3 business days.</p>
    <a href="${process.env.FRONTEND_URL}/vendor/payouts" class="btn">View Payout Details</a>
  `);

  return sendEmail({
    to: email,
    subject: `Payout of ₹${amount} Released | Dear Kolkata`,
    html,
    text: `Dear ${vendorName}, your payout of ₹${amount} for order ${orderNumber} has been released.`
  });
};

/**
 * Send coupon purchase confirmation
 */
const sendCouponPurchaseEmail = async (email, name, couponName, validityEnd) => {
  const html = baseTemplate(`
    <h2 style="color:#c41230;">Coupon Added to Your Locker</h2>
    <p>Hello ${name || 'there'},</p>
    <p>Your coupon has been successfully added to your coupon locker.</p>
    <div class="info-box">
      <p><strong>Coupon:</strong> ${couponName}</p>
      <p><strong>Valid Until:</strong> ${new Date(validityEnd).toLocaleDateString('en-IN')}</p>
    </div>
    <p>To use it, go to <strong>My Coupons</strong>, select the coupon, and tap <strong>Generate Code</strong> when you're at the store.</p>
    <a href="${process.env.FRONTEND_URL}/coupons" class="btn">View My Coupons</a>
  `);

  return sendEmail({
    to: email,
    subject: `Coupon Added - ${couponName} | Dear Kolkata`,
    html,
    text: `Your coupon "${couponName}" has been added. Valid until ${validityEnd}.`
  });
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendVendorWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPayoutNotificationEmail,
  sendCouponPurchaseEmail
};
