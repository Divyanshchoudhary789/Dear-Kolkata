/**
 * Comprehensive Database Seeder
 * Seeds realistic data for fresh deployment & testing
 * Run: node src/utils/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDatabase = require('../config/database');

const Category = require('../models/Category');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Package = require('../models/Package');
const Order = require('../models/Order');
const Payout = require('../models/Payout');
const WalletTransaction = require('../models/WalletTransaction');
const Notification = require('../models/Notification');
const UserCoupon = require('../models/UserCoupon');

const INITIAL_CATEGORIES = [
  { id: 'jewellery', name: 'Jewellery', commission: 15, displayOrder: 1, description: 'Fine jewellery and ornaments' },
  { id: 'footwear', name: 'Footwear / Shoes', commission: 2, displayOrder: 2, description: 'Shoes, sandals, and ethnic footwear' },
  { id: 'sarees', name: 'Sarees', commission: 10, displayOrder: 3, description: 'Traditional Bengali sarees and ethnic wear' },
  { id: 'apparel', name: 'Apparel', commission: 8, displayOrder: 4, description: 'Clothing and fashion' },
  { id: 'food', name: 'Food Items', commission: 12, displayOrder: 5, description: 'Traditional Bengali food and sweets' },
  { id: 'luxury', name: 'Luxury / General', commission: 18, displayOrder: 6, description: 'Luxury goods and premium gifts' }
];

const seed = async () => {
  await connectDatabase();

  console.log('Clearing existing database collections...');
  await Promise.all([
    Category.deleteMany({}),
    User.deleteMany({}),
    Vendor.deleteMany({}),
    Product.deleteMany({}),
    Coupon.deleteMany({}),
    Package.deleteMany({}),
    Order.deleteMany({}),
    Payout.deleteMany({}),
    WalletTransaction.deleteMany({}),
    Notification.deleteMany({}),
    UserCoupon.deleteMany({})
  ]);
  console.log('Cleared all collections.');

  console.log('Seeding categories...');
  const seededCategories = [];
  for (const cat of INITIAL_CATEGORIES) {
    const c = await Category.create(cat);
    seededCategories.push(c);
  }
  console.log(`Seeded ${seededCategories.length} categories.`);

  // ─── ADMIN USER ──────────────────────────────────────────────────────────
  console.log('Seeding admin user...');
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@dearkolkata.com';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@DearKolkata2026';
  const adminUser = await User.create({
    phone: '9999999999',
    name: 'Dear Kolkata Admin',
    email: adminEmail,
    role: 'admin',
    password: adminPassword,
    isActive: true,
    isKolkataVerified: true
  });
  console.log(`Seeded admin user: ${adminEmail}`);

  // ─── VENDORS ─────────────────────────────────────────────────────────────
  console.log('Seeding vendor users and profiles...');
  const vendorData = [
    {
      phone: '9876543210',
      name: 'Kolkata Handloom & Sarees',
      email: 'handloom@dearkolkata.com',
      category: 'sarees',
      location: 'College Street, Kolkata',
      pin: '700019',
      returnPolicy: true,
      bankName: 'State Bank of India',
      accountNumber: '30098765432',
      ifscCode: 'SBIN0001234',
      accountHolderName: 'Kolkata Handloom & Sarees',
      panNumber: 'AAAPK1234Z',
      revenue: 120000,
      commissionPaid: 12000,
      pendingPayout: 8500,
      totalOrders: 12
    },
    {
      phone: '9876543211',
      name: 'Sen Bros Jewellery',
      email: 'senbros@dearkolkata.com',
      category: 'jewellery',
      location: 'Bowbazar, Kolkata',
      pin: '700012',
      returnPolicy: true,
      bankName: 'HDFC Bank',
      accountNumber: '501004561234',
      ifscCode: 'HDFC0000123',
      accountHolderName: 'Sen Bros Jewellery',
      panNumber: 'AAAPS4567M',
      revenue: 450000,
      commissionPaid: 67500,
      pendingPayout: 25000,
      totalOrders: 8
    },
    {
      phone: '9876543212',
      name: 'Kolkata Sweet Cabin',
      email: 'sweetcabin@dearkolkata.com',
      category: 'food',
      location: 'Shambazar, Kolkata',
      pin: '700004',
      returnPolicy: false,
      bankName: 'ICICI Bank',
      accountNumber: '000405678912',
      ifscCode: 'ICIC0000004',
      accountHolderName: 'Kolkata Sweet Cabin',
      panNumber: 'AAAPC8901D',
      revenue: 75000,
      commissionPaid: 9000,
      pendingPayout: 0,
      totalOrders: 15
    },
    {
      phone: '9876543213',
      name: 'Calcutta Leather Co.',
      email: 'leatherco@dearkolkata.com',
      category: 'footwear',
      location: 'Esplanade, Kolkata',
      pin: '700013',
      returnPolicy: true,
      bankName: 'Axis Bank',
      accountNumber: '912010034567',
      ifscCode: 'UTIB0000123',
      accountHolderName: 'Calcutta Leather Co.',
      panNumber: 'AAAPL2345K',
      revenue: 95000,
      commissionPaid: 1900,
      pendingPayout: 3500,
      totalOrders: 5
    }
  ];

  const seededVendors = [];
  for (const vd of vendorData) {
    const user = await User.create({
      phone: vd.phone,
      name: vd.name,
      email: vd.email,
      role: 'vendor',
      password: 'Vendor@123',
      isActive: true,
      isKolkataVerified: true
    });

    const vendor = await Vendor.create({
      user: user._id,
      name: vd.name,
      category: vd.category,
      location: vd.location,
      pin: vd.pin,
      status: 'Active',
      returnPolicy: vd.returnPolicy,
      bankDetails: {
        bankName: vd.bankName,
        accountNumber: vd.accountNumber,
        ifscCode: vd.ifscCode,
        accountHolderName: vd.accountHolderName,
        panNumber: vd.panNumber
      },
      financials: {
        revenue: vd.revenue,
        commissionPaid: vd.commissionPaid,
        pendingPayout: vd.pendingPayout,
        totalOrders: vd.totalOrders,
        totalCouponsSold: 10,
        totalCouponsRedeemed: 6
      },
      isActive: true,
      rating: { average: 4.8, count: 5 }
    });

    seededVendors.push(vendor);
    console.log(`Seeded Vendor: ${vd.name} (Phone: ${vd.phone})`);
  }

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────
  console.log('Seeding products...');
  const productData = [
    // Vendor 1 - Sarees
    {
      vendorIndex: 0,
      category: 'sarees',
      name: 'Elegant Handloom Baluchari Saree',
      price: 6500,
      stock: 15,
      description: 'Traditional handwoven Baluchari silk saree from West Bengal with detailed mythological scenes on the pallu.',
      tags: ['For Your Wife', 'For Your Loved One'],
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600'
    },
    {
      vendorIndex: 0,
      category: 'sarees',
      name: 'Traditional Jamdani Saree',
      price: 4500,
      stock: 20,
      description: 'Exquisite handwoven Dhakai Jamdani cotton saree featuring floral motifs and fine threadwork.',
      tags: ['For Your Wife'],
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=600'
    },
    {
      vendorIndex: 0,
      category: 'sarees',
      name: 'Handwoven Tussar Silk Saree',
      price: 5200,
      stock: 8,
      description: 'Elegant beige Tussar silk saree with a contrasting red border, ideal for festive celebrations.',
      tags: ['For Your Loved One'],
      imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&q=80&w=600'
    },
    // Vendor 1 - Apparel
    {
      vendorIndex: 0,
      category: 'apparel',
      name: 'Hand-painted Bengali Kurta',
      price: 1500,
      stock: 25,
      description: 'Stunning premium cotton kurta with hand-painted Bengali lettering art (Alpona themes).',
      tags: ['For Your Loved One', 'For Your Colleagues'],
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=600'
    },

    // Vendor 2 - Jewellery
    {
      vendorIndex: 1,
      category: 'jewellery',
      name: 'Traditional Gold Plated Jhumka',
      price: 1800,
      stock: 25,
      description: 'Classic gold plated drop earrings with intricate filigree and tiny pearl droplets.',
      tags: ['For Your Wife', 'For Your Girlfriend'],
      imageUrl: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80&w=600'
    },
    {
      vendorIndex: 1,
      category: 'jewellery',
      name: 'Handcrafted Silver Filigree Necklace',
      price: 3200,
      stock: 10,
      description: 'Premium handcrafted 92.5 sterling silver filigree necklace from our heritage artisans.',
      tags: ['For Your Girlfriend', 'For Your Loved One'],
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600'
    },

    // Vendor 3 - Food Items
    {
      vendorIndex: 2,
      category: 'food',
      name: 'Premium Rossogolla Box (Pack of 12)',
      price: 350,
      stock: 100,
      description: 'Fresh, spongy, and deliciously sweet cottage cheese balls dipped in light sugar syrup.',
      tags: ['For Your Loved One', 'For Your Colleagues'],
      imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=600'
    },
    {
      vendorIndex: 2,
      category: 'food',
      name: 'Authentic Sandesh Assortment (12 Pcs)',
      price: 450,
      stock: 80,
      description: 'Traditional Bengali sandesh made from fresh chhena and flavored with nolen gur (date palm jaggery).',
      tags: ['For Your Colleagues'],
      imageUrl: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&q=80&w=600'
    },

    // Vendor 4 - Footwear
    {
      vendorIndex: 3,
      category: 'footwear',
      name: 'Leather Kolhapuri Chappal',
      price: 1200,
      stock: 30,
      description: 'Classic handcrafted tan leather Kolhapuri chappals, highly durable and comfortable.',
      tags: ['For Your Loved One'],
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=600'
    }
  ];

  const seededProducts = [];
  for (const pd of productData) {
    const vendor = seededVendors[pd.vendorIndex];
    const product = await Product.create({
      vendor: vendor._id,
      category: pd.category,
      name: pd.name,
      price: pd.price,
      stock: pd.stock,
      description: pd.description,
      tags: pd.tags,
      images: [{ url: pd.imageUrl, isMain: true, publicId: 'dummy_pub' }],
      status: 'Approved',
      isActive: true,
      slug: pd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    });

    // Update category product count
    await Category.findOneAndUpdate({ id: pd.category }, { $inc: { 'metadata.productCount': 1 } });

    seededProducts.push(product);
    console.log(`Seeded Product: ${pd.name} for ${vendor.name}`);
  }

  // ─── COUPONS ─────────────────────────────────────────────────────────────
  console.log('Seeding coupons...');
  const couponData = [
    {
      vendorIndex: 0,
      name: '10% OFF Jamdani Fest',
      type: 'percentage',
      value: 10,
      price: 50,
      tags: ['For Your Wife'],
      category: 'sarees'
    },
    {
      vendorIndex: 1,
      name: '₹500 OFF Bowbazar Gold',
      type: 'flat',
      value: 500,
      price: 150,
      tags: ['For Your Loved One'],
      category: 'jewellery'
    },
    {
      vendorIndex: 2,
      name: 'BOGO Rossogolla Sweet Deal',
      type: 'bogo',
      value: 'Buy 1 Box Get 1 Free',
      price: 30,
      tags: ['For Your Colleagues'],
      category: 'food'
    }
  ];

  const seededCoupons = [];
  for (const cd of couponData) {
    const vendor = seededVendors[cd.vendorIndex];
    const coupon = await Coupon.create({
      vendor: vendor._id,
      isAdminAuthored: false,
      name: cd.name,
      description: `Get a premium coupon valid at ${vendor.name}. Ideal for gift packaging.`,
      type: cd.type,
      value: cd.value,
      price: cd.price,
      tags: cd.tags,
      category: cd.category,
      validityStart: new Date(),
      validityEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days validity
      codeTimerHours: 2,
      status: 'Approved',
      isActive: true
    });
    seededCoupons.push(coupon);
    console.log(`Seeded Coupon: ${cd.name}`);
  }

  // Admin authored coupon
  const adminCoupon = await Coupon.create({
    vendor: null,
    isAdminAuthored: true,
    name: 'Flat 15% OFF Kolkata Special',
    description: 'Special admin-authored discount code valid across participating boutiques.',
    type: 'percentage',
    value: 15,
    price: 100,
    validityStart: new Date(),
    validityEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    codeTimerHours: 2,
    status: 'Approved',
    isActive: true
  });
  seededCoupons.push(adminCoupon);
  console.log(`Seeded Admin Coupon: ${adminCoupon.name}`);

  // ─── PACKAGES ────────────────────────────────────────────────────────────
  console.log('Seeding admin packages...');
  const packageDoc = await Package.create({
    name: 'Kolkata Festive Gift Hamper',
    description: 'An premium curated bundle of boutique coupons for the ultimate gifting experience.',
    price: 250,
    couponIds: [seededCoupons[0]._id, seededCoupons[1]._id],
    tags: ['For Your Loved One'],
    status: 'Active',
    createdBy: adminUser._id,
    validityStart: new Date(),
    validityEnd: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isActive: true
  });
  console.log(`Seeded Package: ${packageDoc.name}`);

  // ─── SHOPPER CLIENT ──────────────────────────────────────────────────────
  console.log('Seeding shopper client...');
  const clientUser = await User.create({
    phone: '9830098300',
    name: 'Amit Chatterjee',
    email: 'amit.chatterjee@example.com',
    role: 'client',
    walletBalance: 5000,
    isKolkataVerified: true,
    isActive: true,
    addresses: [
      {
        label: 'Home',
        text: '12/A, Ballygunge Place, Kolkata',
        pin: '700019',
        isDefault: true
      }
    ],
    lastLogin: new Date()
  });
  console.log(`Seeded client shopper: Amit Chatterjee (${clientUser.phone})`);

  // ─── ORDERS ──────────────────────────────────────────────────────────────
  console.log('Seeding orders...');

  // Order 1: Placed
  const o1 = await Order.create({
    orderNumber: 'DK-778899-0001',
    client: clientUser._id,
    vendor: seededVendors[0]._id, // Handloom
    items: [{
      product: seededProducts[1]._id, // Jamdani
      productSnapshot: {
        name: seededProducts[1].name,
        price: seededProducts[1].price,
        image: seededProducts[1].images[0].url,
        category: 'sarees'
      },
      quantity: 1,
      unitPrice: seededProducts[1].price,
      subtotal: seededProducts[1].price
    }],
    totalAmount: 4500,
    commissionRate: 10,
    commissionAmount: 450,
    vendorPayout: 4050,
    payment: {
      method: 'upi',
      status: 'completed',
      paidAt: new Date()
    },
    deliveryAddress: '12/A, Ballygunge Place, Kolkata',
    deliveryPin: '700019',
    deliverySlot: '04:00 PM - 08:00 PM',
    status: 'Placed',
    returnPolicy: true,
    payoutStatus: 'scheduled',
    payoutScheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  await Payout.create({
    vendor: seededVendors[0]._id,
    order: o1._id,
    amount: 4050,
    commissionDeducted: 450,
    commissionRate: 10,
    orderTotal: 4500,
    status: 'scheduled',
    scheduledFor: o1.payoutScheduledAt
  });

  // Order 2: Delivered (5 days ago, immediate payout released)
  const o2 = await Order.create({
    orderNumber: 'DK-778899-0002',
    client: clientUser._id,
    vendor: seededVendors[2]._id, // Sweet Cabin
    items: [{
      product: seededProducts[6]._id, // Rossogolla Box
      productSnapshot: {
        name: seededProducts[6].name,
        price: seededProducts[6].price,
        image: seededProducts[6].images[0].url,
        category: 'food'
      },
      quantity: 2,
      unitPrice: seededProducts[6].price,
      subtotal: seededProducts[6].price * 2
    }],
    totalAmount: 700,
    commissionRate: 12,
    commissionAmount: 84,
    vendorPayout: 616,
    payment: {
      method: 'wallet',
      status: 'completed',
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      walletAmountUsed: 700
    },
    deliveryAddress: '12/A, Ballygunge Place, Kolkata',
    deliveryPin: '700019',
    deliverySlot: '04:00 PM - 08:00 PM',
    status: 'Delivered',
    deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    returnPolicy: false,
    payoutStatus: 'released',
    payoutReleasedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  });

  await Payout.create({
    vendor: seededVendors[2]._id,
    order: o2._id,
    amount: 616,
    commissionDeducted: 84,
    commissionRate: 12,
    orderTotal: 700,
    status: 'released',
    scheduledFor: o2.deliveredAt,
    releasedAt: o2.deliveredAt
  });

  // Order 3: Disputed Return
  const o3 = await Order.create({
    orderNumber: 'DK-778899-0003',
    client: clientUser._id,
    vendor: seededVendors[1]._id, // Sen Bros
    items: [{
      product: seededProducts[5]._id, // Necklace
      productSnapshot: {
        name: seededProducts[5].name,
        price: seededProducts[5].price,
        image: seededProducts[5].images[0].url,
        category: 'jewellery'
      },
      quantity: 1,
      unitPrice: seededProducts[5].price,
      subtotal: seededProducts[5].price
    }],
    totalAmount: 3200,
    commissionRate: 15,
    commissionAmount: 480,
    vendorPayout: 2720,
    payment: {
      method: 'upi',
      status: 'completed',
      paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    deliveryAddress: '12/A, Ballygunge Place, Kolkata',
    deliveryPin: '700019',
    deliverySlot: '12:00 PM - 04:00 PM',
    status: 'Disputed',
    deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    returnPolicy: true,
    payoutStatus: 'held',
    payoutScheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    returnRequest: {
      reason: 'Looks different than image',
      description: 'The silver craftsmanship detailing is smaller than depicted in the product photo.',
      status: 'Disputed',
      requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      decidedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      rejectReason: 'Every silver filigree design is handmade, minor variations are normal and standard.'
    }
  });

  await Payout.create({
    vendor: seededVendors[1]._id,
    order: o3._id,
    amount: 2720,
    commissionDeducted: 480,
    commissionRate: 15,
    orderTotal: 3200,
    status: 'held',
    scheduledFor: o3.payoutScheduledAt,
    heldAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    heldReason: 'Dispute raised by client return rejection'
  });

  console.log('Seeded 3 orders (Placed, Delivered, Disputed).');

  // ─── WALLET TRANSACTIONS ─────────────────────────────────────────────────
  console.log('Seeding wallet transactions...');
  await WalletTransaction.create({
    user: clientUser._id,
    amount: 350,
    type: 'Credit',
    category: 'welcome_bonus',
    description: 'Welcome to Dear Kolkata! Sign-up bonus',
    balanceAfter: 350
  });

  await WalletTransaction.create({
    user: clientUser._id,
    amount: 4650,
    type: 'Credit',
    category: 'cashback',
    description: 'Promo wallet load by admin',
    balanceAfter: 5000
  });
  console.log('Seeded wallet transactions.');

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────
  console.log('Seeding notifications...');
  // Broadcast Admin notification
  await Notification.create({
    recipient: adminUser._id,
    type: 'dispute_raised',
    title: 'Dispute Resolution Required',
    message: 'A return dispute has been escalated for order #DK-778899-0003. Action required.',
    read: false
  });

  // Vendor notifications
  await Notification.create({
    recipient: seededVendors[0].user,
    type: 'order_placed_vendor',
    title: 'New Order Recieved',
    message: 'You have a new order #DK-778899-0001. Amount ₹4,500. Start packing!',
    read: false
  });

  // Client notifications
  await Notification.create({
    recipient: clientUser._id,
    type: 'order_placed_client',
    title: 'Order Booked!',
    message: 'Your order #DK-778899-0001 was successfully booked.',
    read: false
  });
  console.log('Seeded notifications.');

  console.log('\nDatabase seeded successfully with operational data!');
  console.log('\nRole-Based Credentials:');
  console.log('1. Admin:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('2. Client / Shopper:');
  console.log(`   Phone: ${clientUser.phone} (Use devOtp to login)`);
  console.log('3. Vendor (Sarees):');
  console.log(`   Phone: ${vendorData[0].phone}`);
  console.log('   Password: Vendor@123');
  console.log('4. Vendor (Jewellery):');
  console.log(`   Phone: ${vendorData[1].phone}`);
  console.log('   Password: Vendor@123');
  console.log('\nWARNING: Change passwords after logging in!\n');

  process.exit(0);
};

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
