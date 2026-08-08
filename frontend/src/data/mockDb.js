export const INITIAL_CATEGORIES = [
  { id: 'jewellery', name: 'Jewellery', commission: 15 },
  { id: 'footwear', name: 'Footwear', commission: 2 },
  { id: 'sarees', name: 'Sarees', commission: 10 },
  { id: 'apparel', name: 'Apparel', commission: 8 },
  { id: 'food', name: 'Food items', commission: 12 },
  { id: 'luxury', name: 'Luxury / General', commission: 18 }
];

export const INITIAL_VENDORS = [
  {
    id: 'v1',
    name: 'Sen & Sons Jewelers',
    category: 'jewellery',
    commissionOverride: null,
    skuCap: 20,
    status: 'Active',
    location: 'Bowbazar, Kolkata',
    pin: '700012',
    returnPolicy: true, // 7-day return enabled
    bankName: 'State Bank of India',
    bankAcc: 'XXXX-XXXX-8921',
    revenue: 125000,
    commissionPaid: 18750
  },
  {
    id: 'v2',
    name: 'Bhojohori Manna',
    category: 'food',
    commissionOverride: null,
    skuCap: 20,
    status: 'Active',
    location: 'Gariahat, Kolkata',
    pin: '700029',
    returnPolicy: false,
    bankName: 'HDFC Bank',
    bankAcc: 'XXXX-XXXX-4532',
    revenue: 45000,
    commissionPaid: 5400
  },
  {
    id: 'v3',
    name: 'Manyavar Kolkata',
    category: 'apparel',
    commissionOverride: null,
    skuCap: 20,
    status: 'Active',
    location: 'Park Street, Kolkata',
    pin: '700016',
    returnPolicy: true,
    bankName: 'ICICI Bank',
    bankAcc: 'XXXX-XXXX-0912',
    revenue: 85000,
    commissionPaid: 6800
  },
  {
    id: 'v4',
    name: 'Shree Leathers',
    category: 'footwear',
    commissionOverride: null,
    skuCap: 20,
    status: 'Active',
    location: 'Lindsay Street, Kolkata',
    pin: '700087',
    returnPolicy: false,
    bankName: 'Axis Bank',
    bankAcc: 'XXXX-XXXX-5521',
    revenue: 38000,
    commissionPaid: 760
  },
  {
    id: 'v5',
    name: 'Heritage Jamdani Hub',
    category: 'sarees',
    commissionOverride: null,
    skuCap: 20,
    status: 'Active',
    location: 'South Kolkata, Kolkata',
    pin: '700045',
    returnPolicy: true,
    bankName: 'Bandhan Bank',
    bankAcc: 'XXXX-XXXX-3344',
    revenue: 90000,
    commissionPaid: 9000
  }
];

export const INITIAL_PRODUCTS = [
  {
    id: 'p1',
    name: 'Elegant Handloom Baluchari Saree',
    category: 'sarees',
    vendorId: 'v5',
    price: 6500,
    stock: 12,
    images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600'],
    description: 'Beautifully handcrafted Baluchari saree with intricate mythological motifs on the pallu. Made from pure Bishnupur silk.',
    returnPolicy: true,
    status: 'Approved',
    tags: ['For Your Wife', 'For Your Loved One']
  },
  {
    id: 'p2',
    name: 'Durga Ashtami Special Red Jamdani Saree',
    category: 'sarees',
    vendorId: 'v5',
    price: 4200,
    stock: 18,
    images: ['https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=600'],
    description: 'Traditional red and white Dhakai Jamdani. Perfectly themed for the majestic Ashtami Anjali.',
    returnPolicy: true,
    status: 'Approved',
    tags: ['For Your Girlfriend', 'For Your Loved One']
  },
  {
    id: 'p3',
    name: 'Handcrafted Temple Gold Necklace Set',
    category: 'jewellery',
    vendorId: 'v1',
    price: 18500,
    stock: 5,
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600'],
    description: 'Gold-plated temple necklace matching traditional Bengali wedding and festival vibes.',
    returnPolicy: true,
    status: 'Approved',
    tags: ['For Your Wife', 'For Your Loved One']
  },
  {
    id: 'p4',
    name: 'Premium Leather Pujo Juttis',
    category: 'footwear',
    vendorId: 'v4',
    price: 1450,
    stock: 25,
    images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=600'],
    description: 'Handcrafted premium leather juttis designed to walk comfortably during the pandal hopping nights.',
    returnPolicy: false,
    status: 'Approved',
    tags: ['For Your Colleagues']
  },
  {
    id: 'p5',
    name: 'Grand Bhojohori Durga Puja Special Thali',
    category: 'food',
    vendorId: 'v2',
    price: 950,
    stock: 50,
    images: ['https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=600'],
    description: 'Premium Bengali feast including Luchi, Chholar Dal, Chingri Malaikari, Kosha Mangsho, and sweet Misti Doi.',
    returnPolicy: false,
    status: 'Approved',
    tags: ['For Your Loved One', 'For Your Colleagues']
  },
  {
    id: 'p6',
    name: 'Royal Silk Embroidered Kurta Set',
    category: 'apparel',
    vendorId: 'v3',
    price: 4999,
    stock: 14,
    images: ['https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?auto=format&fit=crop&q=80&w=600'],
    description: 'Royal maroon silk kurta with fine embroidery around the collar. Includes premium pajama pants.',
    returnPolicy: true,
    status: 'Approved',
    tags: ['For Your Loved One', 'For Your Girlfriend']
  }
];

export const INITIAL_COUPONS = [
  {
    id: 'c1',
    name: '20% OFF Special Flat Discount',
    type: 'percentage',
    value: 20,
    vendorId: 'v1',
    validityEnd: '2026-11-15',
    codeTimerHours: 2,
    price: 150,
    redemptionCap: 100,
    soldCount: 12,
    redeemedCount: 8,
    status: 'Approved',
    tags: ['For Your Wife', 'For Your Loved One']
  },
  {
    id: 'c2',
    name: 'Free Misti Doi with Puja Thali',
    type: 'bogo',
    value: 'Free Misti Doi',
    vendorId: 'v2',
    validityEnd: '2026-11-20',
    codeTimerHours: 1,
    price: 0,
    redemptionCap: 300,
    soldCount: 85,
    redeemedCount: 64,
    status: 'Approved',
    tags: ['For Your Loved One', 'For Your Colleagues']
  },
  {
    id: 'c3',
    name: '₹500 Cashback on Manyavar Kurta',
    type: 'flat',
    value: 500,
    vendorId: 'v3',
    validityEnd: '2026-11-10',
    codeTimerHours: 7,
    price: 0,
    redemptionCap: 200,
    soldCount: 40,
    redeemedCount: 15,
    status: 'Approved',
    tags: ['For Your Loved One', 'For Your Girlfriend']
  },
  {
    id: 'c4',
    name: 'Flat 10% OFF All Footwear',
    type: 'percentage',
    value: 10,
    vendorId: 'v4',
    validityEnd: '2026-11-30',
    codeTimerHours: 24,
    price: 49,
    redemptionCap: 150,
    soldCount: 10,
    redeemedCount: 4,
    status: 'Approved',
    tags: ['For Your Colleagues']
  }
];

export const INITIAL_PACKAGES = [
  {
    id: 'pkg1',
    name: 'Elite Durga Pujo Gifting Pass',
    price: 299,
    couponIds: ['c1', 'c2', 'c3'],
    tags: ['For Your Wife', 'For Your Loved One'],
    description: 'Get premium discounts bundled in one single pass: 20% off Bowbazar jewelry, Free Misti Doi in Gariahat dining, and ₹500 off designer apparel. Perfect festive gift!',
    status: 'Approved'
  }
];

export const INITIAL_ORDERS = [
  {
    id: 'ord-101',
    clientId: 'user-01',
    vendorId: 'v1',
    items: [
      {
        id: 'p3',
        name: 'Handcrafted Temple Gold Necklace Set',
        price: 18500,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600'
      }
    ],
    totalAmount: 18500,
    commissionRate: 15,
    commissionAmount: 2775,
    vendorPayout: 15725,
    status: 'Delivered',
    returnPolicy: true,
    deliveryAddress: 'Block A, Salt Lake, Sector V, Kolkata',
    deliveryPin: '700091',
    deliverySlot: '04:00 PM - 08:00 PM',
    createdAt: '2026-08-01T10:00:00Z',
    deliveredAt: '2026-08-02T16:00:00Z',
    payoutReleasedAt: null,
    returnRequest: null
  },
  {
    id: 'ord-102',
    clientId: 'user-01',
    vendorId: 'v2',
    items: [
      {
        id: 'p5',
        name: 'Grand Bhojohori Durga Puja Special Thali',
        price: 950,
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=600'
      }
    ],
    totalAmount: 1900,
    commissionRate: 12,
    commissionAmount: 228,
    vendorPayout: 1672,
    status: 'Delivered',
    returnPolicy: false,
    deliveryAddress: 'Lane 4, Gariahat Road, Kolkata',
    deliveryPin: '700029',
    deliverySlot: '12:00 PM - 04:00 PM',
    createdAt: '2026-08-03T11:30:00Z',
    deliveredAt: '2026-08-03T13:45:00Z',
    payoutReleasedAt: '2026-08-03T14:00:00Z',
    returnRequest: null
  }
];

export const INITIAL_USER_COUPONS = [
  {
    id: 'uc-201',
    clientId: 'user-01',
    couponId: 'c2',
    status: 'Redeemed',
    code: 'DK-BHOJ-9923',
    codeGeneratedAt: '2026-08-03T12:00:00Z',
    expiresAt: '2026-08-03T13:00:00Z',
    redeemedAt: '2026-08-03T12:45:00Z',
    billAmount: 1500,
    cashbackCredited: 75
  },
  {
    id: 'uc-202',
    clientId: 'user-01',
    couponId: 'c1',
    status: 'Available',
    code: null,
    codeGeneratedAt: null,
    expiresAt: null,
    redeemedAt: null,
    billAmount: 0,
    cashbackCredited: 0
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    userId: 'user-01',
    message: 'Welcome to Dear Kolkata! Your OTP verified successfully.',
    timestamp: '2026-08-05T14:30:00Z',
    read: false
  },
  {
    id: 'notif-2',
    userId: 'v1',
    message: 'New order #ord-101 received for Handcrafted Temple Gold Necklace Set.',
    timestamp: '2026-08-01T10:01:00Z',
    read: true
  }
];
