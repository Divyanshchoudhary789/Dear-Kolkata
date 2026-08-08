const Notification = require('../models/Notification');

/**
 * Notification service — creates in-app notifications and optionally
 * dispatches push/SMS/email through external channels.
 * Maps to PRD Section 6 notification matrix.
 */

/**
 * Create and send an in-app notification
 * @param {ObjectId} recipientId
 * @param {string} type - notification type enum
 * @param {string} title
 * @param {string} message
 * @param {object} reference - { type, id } optional
 * @param {object} channels - { push, sms, email }
 */
const sendNotification = async (recipientId, type, title, message, reference = null, channels = {}) => {
  // Guard: silently skip if no recipient (e.g. admin not found)
  if (!recipientId) {
    console.warn(`[NOTIFY] Skipped notification type="${type}" — no recipientId`);
    return null;
  }
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      reference: reference ? { type: reference.type, id: reference.id } : undefined,
      channels: {
        inApp: true,
        push: channels.push || false,
        sms: channels.sms || false,
        email: channels.email || false
      }
    });

    // Fire-and-forget external channel dispatches
    if (channels.push) dispatchPush(notification).catch(console.error);
    if (channels.sms) dispatchSMS(notification, recipientId).catch(console.error);
    if (channels.email) dispatchEmail(notification, recipientId).catch(console.error);

    return notification;
  } catch (error) {
    // Notifications should never fail silently block operations
    console.error('Notification creation failed:', error.message);
    return null;
  }
};

/**
 * Batch notification helper
 */
const sendNotificationToMany = async (recipientIds, type, title, message, reference = null) => {
  const notifications = recipientIds.map(recipientId => ({
    recipient: recipientId,
    type,
    title,
    message,
    reference: reference ? { type: reference.type, id: reference.id } : undefined,
    channels: { inApp: true }
  }));

  try {
    await Notification.insertMany(notifications, { ordered: false });
  } catch (error) {
    console.error('Batch notification error:', error.message);
  }
};

// ─── PRD Section 6 — All 26 notification triggers ───────────────────────────

const notifyVendorAccountCreated = async (vendorUserId, vendorName) => {
  return sendNotification(
    vendorUserId,
    'vendor_account_created',
    'Welcome to Dear Kolkata!',
    `Your vendor account for "${vendorName}" has been created. Please login to complete your store profile.`,
    null,
    { email: true, sms: true }
  );
};

const notifyProductApproved = async (vendorUserId, productName, productId) => {
  return sendNotification(
    vendorUserId,
    'product_approved',
    'Product Approved',
    `Your product "${productName}" has been approved and is now live on the platform.`,
    { type: 'Product', id: productId },
    { push: true }
  );
};

const notifyProductRejected = async (vendorUserId, productName, reason, productId) => {
  return sendNotification(
    vendorUserId,
    'product_rejected',
    'Product Rejected',
    `Your product "${productName}" was rejected. Reason: ${reason}`,
    { type: 'Product', id: productId },
    { push: true }
  );
};

const notifyOrderPlacedClient = async (clientId, orderNumber, orderId) => {
  return sendNotification(
    clientId,
    'order_placed_client',
    'Order Confirmed!',
    `Your order #${orderNumber} has been placed successfully. We'll notify you when it's packed.`,
    { type: 'Order', id: orderId },
    { push: true, sms: true }
  );
};

const notifyOrderPlacedVendor = async (vendorUserId, orderNumber, totalAmount, orderId) => {
  return sendNotification(
    vendorUserId,
    'order_placed_vendor',
    'New Order Received',
    `You have a new order #${orderNumber} worth ₹${totalAmount}. Please start packing.`,
    { type: 'Order', id: orderId },
    { push: true }
  );
};

const notifyOrderPacked = async (clientId, orderNumber, orderId) => {
  return sendNotification(
    clientId,
    'order_packed',
    'Order Packed',
    `Your order #${orderNumber} has been packed by the vendor and is awaiting dispatch.`,
    { type: 'Order', id: orderId },
    { push: true }
  );
};

const notifyOrderShipped = async (clientId, orderNumber, orderId) => {
  return sendNotification(
    clientId,
    'order_shipped',
    'Order Shipped',
    `Your order #${orderNumber} is out for delivery in Kolkata. Get ready!`,
    { type: 'Order', id: orderId },
    { push: true, sms: true }
  );
};

const notifyOrderDeliveredClient = async (clientId, orderNumber, hasReturn, orderId) => {
  const message = hasReturn
    ? `Your order #${orderNumber} has been delivered. You have 7 days to raise a return request if needed.`
    : `Your order #${orderNumber} has been delivered. Enjoy your purchase!`;

  return sendNotification(
    clientId,
    'order_delivered_client',
    'Order Delivered',
    message,
    { type: 'Order', id: orderId },
    { push: true }
  );
};

const notifyOrderDeliveredVendor = async (vendorUserId, orderNumber, vendorPayout, returnPolicy, orderId) => {
  const message = returnPolicy
    ? `Order #${orderNumber} delivered. Your payout of ₹${vendorPayout} is scheduled for T+7 days, pending return window.`
    : `Order #${orderNumber} delivered. Your payout of ₹${vendorPayout} is being processed now.`;

  return sendNotification(
    vendorUserId,
    returnPolicy ? 'order_delivered_vendor_return_on' : 'order_delivered_vendor_return_off',
    'Order Delivered',
    message,
    { type: 'Order', id: orderId },
    { push: true, sms: true }
  );
};

const notifyReturnRequested = async (vendorUserId, orderNumber, reason, orderId) => {
  return sendNotification(
    vendorUserId,
    'return_requested',
    'Return Request Received',
    `A client has raised a return request on order #${orderNumber}. Reason: ${reason}. Please review and decide.`,
    { type: 'Order', id: orderId },
    { push: true }
  );
};

const notifyReturnDecision = async (clientId, orderNumber, approved, orderId) => {
  return sendNotification(
    clientId,
    'return_decision',
    approved ? 'Return Approved' : 'Return Declined',
    approved
      ? `Your return request for order #${orderNumber} has been approved. Refund will be processed shortly.`
      : `Your return request for order #${orderNumber} was declined by the vendor. Your case has been escalated to support.`,
    { type: 'Order', id: orderId },
    { push: true }
  );
};

const notifyRefundProcessed = async (clientId, amount, orderId) => {
  return sendNotification(
    clientId,
    'refund_processed',
    'Refund Processed',
    `Your refund of ₹${amount} has been credited to your Dear Kolkata wallet.`,
    { type: 'Order', id: orderId },
    { push: true, sms: true }
  );
};

const notifyPayoutReleased = async (vendorUserId, amount, orderNumber, payoutId) => {
  return sendNotification(
    vendorUserId,
    'payout_released',
    'Payout Released',
    `Your payout of ₹${amount} for order #${orderNumber} has been released and is being transferred to your bank account.`,
    { type: 'Order', id: payoutId },
    { push: true, sms: true }
  );
};

const notifyCouponSubmitted = async (adminId, couponName, vendorName, couponId) => {
  return sendNotification(
    adminId,
    'coupon_submitted',
    'New Coupon Pending Approval',
    `"${couponName}" by ${vendorName} is awaiting approval. Please review.`,
    { type: 'Coupon', id: couponId }
  );
};

const notifyCouponApproved = async (vendorUserId, couponName, couponId) => {
  return sendNotification(
    vendorUserId,
    'coupon_approved',
    'Coupon Approved',
    `Your coupon "${couponName}" has been approved and is now live on the marketplace.`,
    { type: 'Coupon', id: couponId },
    { push: true }
  );
};

const notifyCouponRejected = async (vendorUserId, couponName, reason, couponId) => {
  return sendNotification(
    vendorUserId,
    'coupon_rejected',
    'Coupon Rejected',
    `Your coupon "${couponName}" was rejected. Reason: ${reason}`,
    { type: 'Coupon', id: couponId },
    { push: true }
  );
};

const notifyCouponPurchased = async (clientId, couponName, userCouponId) => {
  return sendNotification(
    clientId,
    'coupon_purchased',
    'Coupon Added to My Coupons',
    `"${couponName}" has been added to your coupon locker. Tap to view.`,
    { type: 'UserCoupon', id: userCouponId },
    { push: true }
  );
};

const notifyCodeGenerated = async (clientId, couponName, timerHours, userCouponId) => {
  return sendNotification(
    clientId,
    'code_generated',
    'Redemption Code Generated',
    `Your code for "${couponName}" is live! Valid for ${timerHours} hour(s). Show it at the store now.`,
    { type: 'UserCoupon', id: userCouponId },
    { push: true }
  );
};

const notifyCodeExpiringSoon = async (clientId, couponName, minutesLeft, userCouponId) => {
  return sendNotification(
    clientId,
    'code_expiring_soon',
    'Code Expiring Soon!',
    `Your redemption code for "${couponName}" expires in ${minutesLeft} minutes. Head to the store now!`,
    { type: 'UserCoupon', id: userCouponId },
    { push: true }
  );
};

const notifyCodeExpired = async (clientId, couponName, userCouponId) => {
  return sendNotification(
    clientId,
    'code_expired',
    'Code Expired',
    `Your redemption code for "${couponName}" has expired. You can generate a new code from your coupon locker.`,
    { type: 'UserCoupon', id: userCouponId }
  );
};

const notifyCouponRedeemedClient = async (clientId, couponName, cashback, userCouponId) => {
  return sendNotification(
    clientId,
    'coupon_redeemed_client',
    'Coupon Redeemed!',
    `"${couponName}" was redeemed successfully. ₹${cashback} cashback has been credited to your wallet.`,
    { type: 'UserCoupon', id: userCouponId },
    { push: true }
  );
};

const notifyCouponRedeemedVendor = async (vendorUserId, code, billAmount, userCouponId) => {
  return sendNotification(
    vendorUserId,
    'coupon_redeemed_vendor',
    'Coupon Redeemed',
    `Code ${code} successfully redeemed. Bill value recorded: ₹${billAmount}.`,
    { type: 'UserCoupon', id: userCouponId }
  );
};

const notifyCashbackCredited = async (clientId, amount, source) => {
  return sendNotification(
    clientId,
    'cashback_credited',
    'Cashback Credited!',
    `₹${amount} cashback has been credited to your Dear Kolkata wallet from ${source}.`,
    null,
    { push: true }
  );
};

const notifyDisputeRaised = async (adminId, orderNumber, orderId) => {
  return sendNotification(
    adminId,
    'dispute_raised',
    'Dispute Requires Resolution',
    `A return dispute has been escalated for order #${orderNumber}. Please review and resolve.`,
    { type: 'Order', id: orderId }
  );
};

const notifySkuCapReached = async (vendorUserId, cap) => {
  return sendNotification(
    vendorUserId,
    'sku_cap_reached',
    'SKU Cap Reached',
    `You have reached your product listing limit (${cap}/${cap} SKUs). Deactivate an existing product to add a new one.`
  );
};

const notifyPackageIncludesVendorCoupon = async (vendorUserId, packageName, couponName, packageId) => {
  return sendNotification(
    vendorUserId,
    'package_includes_vendor_coupon',
    'Your Coupon is in an Admin Package',
    `Your coupon "${couponName}" has been included in the admin-curated package "${packageName}" and is now live to shoppers.`,
    { type: 'Package', id: packageId },
    { push: true }
  );
};

// ─── External channel dispatchers (implement with real providers) ─────────────

async function dispatchPush(notification) {
  // TODO: Integrate Firebase Cloud Messaging / Expo Push Notifications
  // This is a placeholder that logs the intent
  console.log(`[PUSH] To: ${notification.recipient} | ${notification.title}`);
}

async function dispatchSMS(notification, recipientId) {
  // TODO: Integrate Twilio or MSG91 for OTP and transactional SMS
  console.log(`[SMS] To: ${recipientId} | ${notification.message}`);
}

async function dispatchEmail(notification, recipientId) {
  // Email dispatch is handled by emailService.js — delegated there
  console.log(`[EMAIL] To: ${recipientId} | ${notification.title}`);
}

module.exports = {
  sendNotification,
  sendNotificationToMany,
  notifyVendorAccountCreated,
  notifyProductApproved,
  notifyProductRejected,
  notifyOrderPlacedClient,
  notifyOrderPlacedVendor,
  notifyOrderPacked,
  notifyOrderShipped,
  notifyOrderDeliveredClient,
  notifyOrderDeliveredVendor,
  notifyReturnRequested,
  notifyReturnDecision,
  notifyRefundProcessed,
  notifyPayoutReleased,
  notifyCouponSubmitted,
  notifyCouponApproved,
  notifyCouponRejected,
  notifyCouponPurchased,
  notifyCodeGenerated,
  notifyCodeExpiringSoon,
  notifyCodeExpired,
  notifyCouponRedeemedClient,
  notifyCouponRedeemedVendor,
  notifyCashbackCredited,
  notifyDisputeRaised,
  notifySkuCapReached,
  notifyPackageIncludesVendorCoupon
};
