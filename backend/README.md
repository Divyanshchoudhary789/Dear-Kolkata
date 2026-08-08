# Dear Kolkata Backend

Production-ready REST API backend for Dear Kolkata, a Kolkata-only e-commerce and coupon platform.

## Tech Stack
- **Runtime:** Node.js 16+
- **Framework:** Express.js
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Storage:** Cloudinary (product images, KYC documents)
- **Email:** Brevo (Sendinblue) SMTP
- **Security:** JWT, Helmet.js, bcrypt, rate limiting (express-rate-limit)
- **Validation:** Joi
- **Scheduled Jobs:** node-cron (payout scheduler, coupon expiry)

---

## Project Structure

```
backend/
├── server.js                  # Entry point
├── package.json
├── .env.example
├── .gitignore
├── API_INTEGRATION_GUIDE.md   # 📘 Complete API documentation for frontend
├── README.md
└── src/
    ├── config/
    │   ├── database.js        # MongoDB connection
    │   └── cloudinary.js      # Cloudinary + Multer setup
    ├── models/
    │   ├── User.js
    │   ├── Vendor.js
    │   ├── Category.js
    │   ├── Product.js
    │   ├── Order.js
    │   ├── Coupon.js
    │   ├── UserCoupon.js
    │   ├── Package.js
    │   ├── WalletTransaction.js
    │   ├── Notification.js
    │   └── Payout.js
    ├── controllers/
    │   └── authController.js  # ✅ Complete (all auth endpoints)
    │   └── [TODO: other controllers - see below]
    ├── routes/
    │   ├── auth.routes.js     # ✅ Complete
    │   ├── client.routes.js   # Placeholder
    │   ├── vendor.routes.js   # Placeholder
    │   ├── admin.routes.js    # Placeholder
    │   ├── product.routes.js  # Placeholder
    │   ├── order.routes.js    # Placeholder
    │   ├── coupon.routes.js   # Placeholder
    │   ├── package.routes.js  # Placeholder
    │   ├── wallet.routes.js   # Placeholder
    │   └── notification.routes.js  # Placeholder
    ├── middleware/
    │   ├── auth.js            # JWT verification, role check
    │   ├── errorHandler.js    # Global error handling
    │   └── validation.js      # Joi validation wrapper
    ├── services/
    │   ├── walletService.js   # ✅ Wallet credit/debit operations
    │   ├── notificationService.js  # ✅ All 26 notification triggers
    │   └── emailService.js    # ✅ Brevo email templates
    ├── jobs/
    │   └── payoutScheduler.js # ✅ Automated payouts + coupon expiry
    └── utils/
        ├── apiError.js        # Custom error class
        ├── apiResponse.js     # Standardized responses
        ├── catchAsync.js      # Async error wrapper
        └── seed.js            # ✅ Database seeder
```

---

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in all values:
```bash
cp .env.example .env
```

**Critical environment variables:**
- `MONGO_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Strong random string (min 32 chars)
- `CLOUDINARY_*` - Get from Cloudinary dashboard
- `BREVO_API_KEY` - Get from Brevo (Sendinblue)

### 3. Seed Initial Data
Seed categories and admin user:
```bash
npm run seed
```

**Default Admin Credentials** (change after first login):
- Email: `admin@dearkolkata.com`
- Password: `DearKolkata@2026`

### 4. Start Development Server
```bash
npm run dev
```

Server runs on `http://localhost:5000`

### 5. Verify Health
```bash
curl http://localhost:5000/health
```

---

## Completed Features

### ✅ Fully Implemented
- **Authentication System** (Phone OTP, Vendor/Admin password login, JWT)
- **User Model** (Client, Vendor, Admin roles)
- **Vendor Model** (KYC, bank details, SKU cap enforcement)
- **Product Model** (20 SKU cap, gifting tags, moderation)
- **Order Model** (Commission calculation, return window logic)
- **Coupon & UserCoupon** (Purchase → Generate Code → Redeem flow)
- **Package Model** (Admin-curated multi-vendor bundles)
- **Wallet System** (Atomic credit/debit, transaction history)
- **Notification System** (All 26 PRD triggers mapped)
- **Email Service** (Brevo templates for all transactional emails)
- **Payout Scheduler** (T+7 automated payout release)
- **Coupon Code Expiry Cron** (Auto-reset to Available)
- **Middleware** (Auth, validation, error handling)
- **Database Seeder** (Categories + admin user)

---

## TODO: Complete Remaining Controllers

The following controllers need to be implemented based on the routes and services already created. Each controller method is documented inline in the route files.

### Priority 1 (Core Flows)
- [ ] **productController.js**
  - `getAllProducts` (public, with filters)
  - `getProductById` (public)
  - `createProduct` (vendor, enforce SKU cap)
  - `updateProduct` (vendor/admin)
  - `deleteProduct` (vendor/admin)
  - `uploadImages` (vendor, Cloudinary)

- [ ] **orderController.js**
  - `createOrder` (client, split by vendor, calculate commission)
  - `getMyOrders` (client)
  - `getOrderById` (client/vendor/admin)
  - `updateOrderStatus` (vendor: Packed → Shipped → Delivered)
  - `requestReturn` (client, within 7 days if returnPolicy=true)
  - `handleReturnDecision` (vendor: approve/reject)
  - `resolveDispute` (admin)
  - `getVendorOrders` (vendor)
  - `getAllOrders` (admin)

- [ ] **couponController.js**
  - `getAllCoupons` (public marketplace, filters)
  - `getCouponById` (public)
  - `createCoupon` (vendor)
  - `updateCoupon` (vendor/admin)
  - `purchaseCoupon` (client, handle Model A/B pricing)
  - `generateCode` (client, start timer)
  - `redeemCoupon` (vendor terminal, verify code, calculate discount, credit cashback)
  - `getMyCoupons` (client, group by status)
  - `getVendorCoupons` (vendor)
  - `getPendingCoupons` (admin)
  - `approveCoupon` (admin)
  - `rejectCoupon` (admin)

### Priority 2 (Supporting Features)
- [ ] **packageController.js**
  - `getAllPackages` (public)
  - `getPackageById` (public)
  - `purchasePackage` (client, distribute constituent coupons)
  - `createPackage` (admin, pull from coupon catalogue)
  - `updatePackage` (admin)
  - `getAllPackagesAdmin` (admin, including drafts)

- [ ] **walletController.js**
  - `getBalance` (client)
  - `getTransactions` (client, paginated)
  - `adminCredit` (admin, manual credit)
  - `adminDebit` (admin, manual debit)

- [ ] **notificationController.js**
  - `getNotifications` (user, paginated)
  - `getUnreadCount` (user)
  - `markAsRead` (user)
  - `markAllAsRead` (user)
  - `deleteNotification` (user)

### Priority 3 (Dashboards & Admin)
- [ ] **vendorController.js**
  - `getDashboard` (vendor summary stats)
  - `getOrders` (vendor's orders)
  - `getPayouts` (vendor payout history)
  - `getCouponPerformance` (vendor coupon stats)
  - `updateProfile` (vendor store details)
  - `uploadKyc` (vendor KYC docs)
  - `addStaff` (vendor sub-accounts)
  - `removeStaff` (vendor sub-accounts)
  - `getStoreProfile` (public vendor info)

- [ ] **adminController.js**
  - `onboardVendor` (create vendor + user account)
  - `getAllVendors` (list)
  - `getVendorById` (single vendor)
  - `updateVendor` (edit vendor)
  - `updateVendorStatus` (Active/Suspended/Rejected)
  - `getCategories` (list categories)
  - `updateCategory` (change commission %)
  - `getPendingProducts` (moderation queue)
  - `approveProduct` (product moderation)
  - `rejectProduct` (product moderation)
  - `getPendingPayouts` (payout queue)
  - `releasePayout` (manual payout release)
  - `holdPayout` (hold payout)
  - `getAllPayouts` (payout history)
  - `getAnalytics` (GMV, commission, etc.)
  - `getAnalyticsOverview` (dashboard summary)
  - `getAllClients` (client directory)
  - `getClientById` (client details)
  - `getWalletLedger` (platform wallet liability)
  - `updateCashbackConfig` (change cashback %)

- [ ] **clientController.js**
  - `getProfile` (client profile)
  - `updateProfile` (client profile)
  - `uploadAvatar` (client avatar image)

---

## Controller Implementation Pattern

All controllers follow this pattern:

```javascript
const Model = require('../models/Model');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

exports.methodName = catchAsync(async (req, res, next) => {
  // 1. Extract & validate input
  const { field1, field2 } = req.body;
  
  // 2. Business logic
  const result = await Model.findOrCreate(...);
  
  // 3. Update related models/services if needed
  // e.g., walletService.creditWallet(...), notificationService.send(...)
  
  // 4. Send standardized response
  return sendSuccess(res, 200, 'Success message', { result });
});
```

**Helper Functions Available:**
- `catchAsync(fn)` — wraps async controller to catch errors automatically
- `sendSuccess(res, status, message, data)` — standardized success response
- `throw new ApiError(statusCode, message, errors)` — standardized error handling
- `req.user` — authenticated user (injected by `protect` middleware)
- `req.vendor` — vendor profile (injected by `attachVendor` middleware)

---

## Running in Production

### 1. Set Environment
```bash
export NODE_ENV=production
```

### 2. Start with PM2 (Recommended)
```bash
npm install -g pm2
pm2 start server.js --name dear-kolkata-api
pm2 save
pm2 startup
```

### 3. Enable Logging
```bash
pm2 logs dear-kolkata-api
```

---

## API Documentation

📘 **Complete API documentation for frontend integration:**  
See `API_INTEGRATION_GUIDE.md` in this directory.

It contains:
- All endpoint specifications
- Request/response formats
- Authentication flow
- Data models
- Error handling
- Notification matrix
- Payment integration points
- Testing examples

---

## Database Models

### Key Entities
- **User** — Client/Vendor/Admin accounts (phone OTP or password auth)
- **Vendor** — Vendor profile, bank details, financials, SKU cap
- **Category** — Product categories with commission %
- **Product** — SKU with images, tags, return policy
- **Order** — Order with commission calculation, payout logic
- **Coupon** — Vendor or admin-created offers
- **UserCoupon** — Client's purchased coupons (lifecycle: Available → CodeGenerated → Redeemed)
- **Package** — Admin-curated multi-coupon bundles
- **WalletTransaction** — Atomic wallet operations
- **Notification** — In-app notifications (26 types per PRD Section 6)
- **Payout** — Vendor payout records

---

## Security Best Practices

- ✅ **JWT authentication** on all protected routes
- ✅ **Bcrypt** password hashing (12 rounds)
- ✅ **Helmet.js** for security headers
- ✅ **Rate limiting** (100 requests / 15 min by default)
- ✅ **Input validation** (Joi schemas)
- ✅ **Mongoose sanitization** (prevents NoSQL injection)
- ✅ **CORS** configured for frontend origin only
- ✅ **HTTP-only cookies** for token storage
- ⚠️  **TODO:** Add HTTPS in production (use reverse proxy like Nginx)
- ⚠️  **TODO:** Set up MongoDB IP whitelist on Atlas

---

## Testing

### Manual Testing
Use the test flow in `API_INTEGRATION_GUIDE.md` Section 9.

### Automated Tests (TODO)
- Set up Jest + Supertest
- Write integration tests for each endpoint
- Add unit tests for services (wallet, notification)

---

## Deployment Checklist

- [ ] Set all production environment variables
- [ ] Enable MongoDB Atlas IP whitelist (production server IP)
- [ ] Configure Cloudinary folders and permissions
- [ ] Set up Brevo (Sendinblue) verified sender domain
- [ ] Test SMS provider integration (Twilio/MSG91)
- [ ] Set up payment gateway (Razorpay) webhooks
- [ ] Configure CORS for production frontend URL
- [ ] Enable HTTPS (reverse proxy)
- [ ] Set up PM2 for process management
- [ ] Configure logging (Winston or similar)
- [ ] Set up error monitoring (Sentry or similar)
- [ ] Run database seeder on production DB
- [ ] Test all critical flows end-to-end
- [ ] Document admin panel access for ops team

---

## Troubleshooting

### MongoDB Connection Failed
- Check `MONGO_URI` in `.env`
- Verify IP whitelist in MongoDB Atlas
- Test connection string in MongoDB Compass

### JWT Token Expired
- Check `JWT_EXPIRE` setting
- Frontend should handle 401 errors and redirect to login

### Cloudinary Upload Failed
- Verify API keys in `.env`
- Check Cloudinary upload preset permissions

### Email Not Sending
- Verify Brevo API key
- Check sender email is verified in Brevo dashboard
- Review Brevo logs for delivery status

### Cron Jobs Not Running
- Check server logs for job initialization
- Verify `node-cron` patterns are correct (use https://crontab.guru/)
- Ensure server is not restarting frequently

---

## Contributing

This backend is part of the Dear Kolkata platform. For any changes:
1. Follow existing code patterns
2. Add inline JSDoc comments for all functions
3. Test endpoints manually before committing
4. Update API_INTEGRATION_GUIDE.md if adding/changing endpoints

---

## Contact

**Developer:** Divyansh Choudhary  
**Project:** Dear Kolkata Backend  
**Documentation:** See `API_INTEGRATION_GUIDE.md`

---

**Last Updated:** 2026-08-07
