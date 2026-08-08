const cron = require('node-cron');
const Order = require('../models/Order');
const Payout = require('../models/Payout');
const Vendor = require('../models/Vendor');
const UserCoupon = require('../models/UserCoupon');
const { notifyPayoutReleased, notifyCodeExpired } = require('../services/notificationService');
const { sendPayoutNotificationEmail } = require('../services/emailService');
const User = require('../models/User');

/**
 * Automated Payout Scheduler
 * Runs daily to check for orders where T+7 payout window has passed
 * PRD Section 4.5
 */
const schedulePayouts = async () => {
  try {
    const now = new Date();
    
    // Find all delivered orders with returnPolicy=true where T+7 days have passed
    // and payout is still in 'scheduled' status with no open return request
    const duePayouts = await Payout.find({
      status: 'scheduled',
      scheduledFor: { $lte: now }
    }).populate({
      path: 'order',
      populate: { path: 'client' }
    }).populate({
      path: 'vendor',
      populate: { path: 'user' }
    });

    let releasedCount = 0;

    for (const payout of duePayouts) {
      const order = payout.order;

      // Skip if order is in a return/dispute state
      if (['ReturnRequested', 'Disputed', 'Refunded', 'Cancelled'].includes(order.status)) {
        await Payout.findByIdAndUpdate(payout._id, {
          status: 'held',
          heldAt: now,
          heldReason: `Order status: ${order.status}`
        });
        continue;
      }

      // Release payout
      await Payout.findByIdAndUpdate(payout._id, {
        status: 'released',
        releasedAt: now
      });

      // Update order payout status
      await Order.findByIdAndUpdate(order._id, {
        payoutStatus: 'released',
        payoutReleasedAt: now
      });

      // Update vendor financials — revenue, commission and clear pending payout
      await Vendor.findByIdAndUpdate(payout.vendor._id, {
        $inc: {
          'financials.revenue':        payout.orderTotal,
          'financials.commissionPaid': payout.commissionDeducted,
          'financials.pendingPayout':  -payout.amount
        }
      });

      // Notify vendor
      notifyPayoutReleased(
        payout.vendor.user._id,
        payout.amount,
        order.orderNumber,
        payout._id
      ).catch(console.error);

      // Send email
      if (payout.vendor.user?.email) {
        sendPayoutNotificationEmail(
          payout.vendor.user.email,
          payout.vendor.name,
          payout.amount,
          order.orderNumber
        ).catch(console.error);
      }

      releasedCount++;
    }

    if (releasedCount > 0) {
      console.log(`Payout Scheduler: Released ${releasedCount} payouts`);
    }

  } catch (error) {
    console.error('Payout Scheduler Error:', error.message);
  }
};

/**
 * Expired Coupon Code Cleaner
 * Runs every 5 minutes to find CodeGenerated coupons where the timer has expired
 * PRD Section 5.4 — based on PRD decision #79, return to 'Available' on code expiry
 */
const cleanExpiredCouponCodes = async () => {
  try {
    const now = new Date();

    const expiredCodes = await UserCoupon.find({
      status: 'CodeGenerated',
      'code.expiresAt': { $lt: now }
    }).populate({
      path: 'coupon',
      select: 'name'
    }).populate({
      path: 'client',
      select: '_id'
    });

    for (const uc of expiredCodes) {
      // Separate $set and $inc to avoid Mongoose update conflict
      await UserCoupon.findByIdAndUpdate(uc._id, {
        $set: {
          status: 'Available',
          'code.value': null,
          'code.generatedAt': null,
          'code.expiresAt': null
        }
      });

      // Notify client
      notifyCodeExpired(
        uc.client._id,
        uc.coupon?.name || 'coupon',
        uc._id
      ).catch(console.error);
    }

    if (expiredCodes.length > 0) {
      console.log(`Coupon Expiry: Reset ${expiredCodes.length} expired codes to Available`);
    }

  } catch (error) {
    console.error('Coupon Code Expiry Cleaner Error:', error.message);
  }
};

/**
 * Near-expiry coupon code warning
 * Runs every minute, sends push when code has <= 10 minutes left
 */
const sendCodeExpiryWarnings = async () => {
  try {
    const now = new Date();
    const tenMinutes = new Date(now.getTime() + 10 * 60 * 1000);
    const elevenMinutes = new Date(now.getTime() + 11 * 60 * 1000);

    const nearExpiry = await UserCoupon.find({
      status: 'CodeGenerated',
      'code.expiresAt': { $gte: tenMinutes, $lt: elevenMinutes }
    }).populate({ path: 'coupon', select: 'name' }).populate({ path: 'client', select: '_id' });

    for (const uc of nearExpiry) {
      const { notifyCodeExpiringSoon } = require('../services/notificationService');
      notifyCodeExpiringSoon(
        uc.client._id || uc.client,
        uc.coupon?.name || 'coupon',
        10,
        uc._id
      ).catch(console.error);
    }

  } catch (error) {
    console.error('Code Expiry Warning Error:', error.message);
  }
};

/**
 * Initialize all scheduled jobs
 */
const initScheduledJobs = () => {
  // Run payout scheduler every day at 10:00 AM IST
  cron.schedule('0 10 * * *', () => {
    console.log('Running Payout Scheduler...');
    schedulePayouts();
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Check expired coupon codes every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    cleanExpiredCouponCodes();
  });

  // Near-expiry warnings every minute
  cron.schedule('* * * * *', () => {
    sendCodeExpiryWarnings();
  });

  console.log('Scheduled jobs initialized');
};

module.exports = {
  initScheduledJobs,
  schedulePayouts,       // Export for manual trigger from admin panel
  cleanExpiredCouponCodes
};
