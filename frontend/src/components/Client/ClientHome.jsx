import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { 
  Sparkles, MapPin, Wallet, Truck, Gift, ShoppingBag, ArrowRight, 
  Shield, Loader, Tag, Gem, Footprints, Shirt, Utensils, Crown,
  Heart, Users, UsersRound, User, Briefcase, ShoppingCart
} from 'lucide-react';
import { showSuccess } from '../../utils/toast';
import CouponCard from '../Common/CouponCard';

const RELATIONSHIPS = [
  { 
    id: 'wife', 
    name: 'For Your Wife', 
    sub: 'Sarees, Jewellery & More', 
    tag: 'For Your Wife', 
    image: '/wife_gift_category.png', 
    icon: <Heart size={18} />, 
    bg: 'linear-gradient(135deg, #800c0c 0%, #bd1b1b 100%)' 
  },
  { 
    id: 'gf', 
    name: 'For Your Girlfriend', 
    sub: 'Trendy Fashion & Accessories', 
    tag: 'For Your Girlfriend', 
    image: '/girlfriend_gift_category.png', 
    icon: <Users size={18} />, 
    bg: 'linear-gradient(135deg, #cf6315 0%, #f39233 100%)' 
  },
  { 
    id: 'parents', 
    name: 'For Your Parents', 
    sub: 'Sarees, Pujo Thalis & Gifts', 
    tag: 'For Your Loved One', 
    image: '/parents_gift_category.png', 
    icon: <UsersRound size={18} />, 
    bg: 'linear-gradient(135deg, #866608 0%, #b8931c 100%)' 
  },
  { 
    id: 'brother', 
    name: 'For Your Brother', 
    sub: 'Fashion, Watches & Accessories', 
    tag: 'For Your Brother', 
    image: '/brother_gift_category.png', 
    icon: <User size={18} />, 
    bg: 'linear-gradient(135deg, #0c4e52 0%, #18838a 100%)' 
  },
  { 
    id: 'sister', 
    name: 'For Your Sister', 
    sub: 'Jewellery, Bags & More', 
    tag: 'For Your Sister', 
    image: '/sister_gift_category.png', 
    icon: <User size={18} />, 
    bg: 'linear-gradient(135deg, #491754 0%, #7f2b91 100%)' 
  },
  { 
    id: 'corporate', 
    name: 'For Corporate Gifting', 
    sub: 'Premium Hampers & Bulk Orders', 
    tag: 'For Your Colleagues', 
    image: '/corporate_gift_category.png', 
    icon: <Briefcase size={18} />, 
    bg: 'linear-gradient(135deg, #8f121b 0%, #c42732 100%)' 
  },
];

const CAT_IMAGES = {
  jewellery: '/cat_jewellery.png',
  footwear: '/cat_footwear.png',
  sarees: '/cat_sarees.png',
  apparel: '/cat_apparel.png',
  food: '/cat_food.png',
  luxury: '/cat_luxury.png',
};

const CAT_ICONS = {
  jewellery: <Gem size={14} />,
  footwear: <Footprints size={14} />,
  sarees: <Shirt size={14} />,
  apparel: <Shirt size={14} />,
  food: <Utensils size={14} />,
  luxury: <Crown size={14} />,
};

const overrideCouponData = (c, index) => {
  const i = index % 4;
  if (i === 0) {
    return {
      ...c,
      discountText: "15% OFF",
      discountSubText: "STOREWIDE",
      vendorName: "Dear Kolkata",
      desc: "Flat 15% OFF Kolkata Special",
      points: 100,
      image: "/durga_puja_hero_banner.png",
      theme: "theme-ivory",
      hasClaimButton: true,
      buttonText: "Claim Now",
      validity: "Valid till 15 Nov"
    };
  } else if (i === 1) {
    return {
      ...c,
      discountText: "FREE",
      discountSubText: "BUY 1 GET 1",
      vendorName: "Kolkata Sweet Cabin",
      desc: "BOGO Rosogolla Sweet Deal",
      points: 50,
      image: "/cat_food.png",
      theme: "theme-crimson",
      hasClaimButton: false,
      validity: "Valid till 15 Nov"
    };
  } else if (i === 2) {
    return {
      ...c,
      discountText: "₹500 OFF",
      discountSubText: "Sen Bros Jewellery",
      vendorName: "Sen Bros Jewellery",
      desc: "₹500 OFF Bowbazar Gold",
      points: 150,
      image: "/cat_jewellery.png",
      theme: "theme-gold",
      hasClaimButton: false,
      validity: "Valid till 15 Nov"
    };
  } else {
    return {
      ...c,
      discountText: "10% OFF",
      discountSubText: "Kolkata Handloom & Sarees",
      vendorName: "Kolkata Handloom & Sarees",
      desc: "10% OFF Jamdani Fest",
      points: 50,
      image: "/cat_sarees.png",
      theme: "theme-maroon",
      hasClaimButton: true,
      buttonText: "Claim Now",
      validity: "Valid till 15 Nov"
    };
  }
};

const getProductTag = (prod, index) => {
  const tags = ['BESTSELLER', 'TRENDING', 'NEW ARRIVAL', 'HANDCRAFTED', 'EXCLUSIVE', 'HANDLOOM', 'PREMIUM', 'CLASSIC'];
  return tags[index % tags.length];
};

const ClientHome = ({ setActiveTab, setSelectedProduct, setProductFilter }) => {
  const { products, categories, loadingProducts, coupons, exclusiveCoupons, userCoupons, addToCart } = useContext(AppContext);
  const [couponTimer, setCouponTimer] = useState('02:15:20');

  useEffect(() => {
    const start = Date.now();
    const duration = (2 * 3600 + 15 * 60 + 20) * 1000;
    const target = start + duration;

    const timer = setInterval(() => {
      const remaining = target - Date.now();
      if (remaining <= 0) {
        setCouponTimer('00:00:00');
        clearInterval(timer);
      } else {
        const h = String(Math.floor(remaining / 3600000)).padStart(2, '0');
        const m = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
        const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
        setCouponTimer(`${h}:${m}:${s}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getImg = (p) => p.images?.[0]?.url || p.images?.[0] || '';
  const getPid = (p) => p._id || p.id;
  const featured = products.filter(p => p.status === 'Approved' && p.isActive !== false).slice(0, 8);
  const topCoupons = coupons.filter(c => c.status === 'Approved').slice(0, 4);

  // Map dynamic database coupons to visual screenshot data
  const displayCoupons = [];
  for (let i = 0; i < 4; i++) {
    const raw = topCoupons[i] || { id: `mock-coupon-${i}`, price: 50, name: 'Coupon Offer' };
    displayCoupons.push(overrideCouponData(raw, i));
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
          <div className="hero-tag">
            <Sparkles size={13} style={{ color: 'var(--gold-metallic)' }} />
            <span>Durga Puja Special</span>
          </div>
          <h1 className="hero-title">
            Celebrate Durga Puja with Meaningful Gifts
          </h1>
          <p className="hero-desc">
            Handloom sarees, gold jewellery from Bowbazar, and authentic Pujo thalis.
            Shop directly from verified Kolkata vendors or grab exclusive discount coupons.
          </p>
          <div className="hero-actions">
            <button className="btn-gold" onClick={() => { setProductFilter({ category: '', tag: '' }); setActiveTab('shop'); }}>
              <ShoppingBag size={16} /> Explore Catalog
            </button>
            <button className="btn-outline-white" onClick={() => setActiveTab('coupon-market')}>
              <Tag size={16} /> View Coupons
            </button>
          </div>
        </div>
      </div>

      {/* ── Trust Rail ────────────────────────────────────────────── */}
      <div className="trust-rail">
        {[
          { icon: <Sparkles size={17} />, text: '100% Handcrafted', sub: 'Pure silk & certified fabrics' },
          { icon: <MapPin size={17} />, text: 'Verified Boutiques', sub: 'Bowbazar & Gariahat sellers' },
          { icon: <Wallet size={17} />, text: 'Wallet Cashback', sub: 'Earn on every redemption' },
          { icon: <Truck size={17} />, text: 'Kolkata-Only Delivery', sub: 'Within 24–48 hours' },
        ].map((item, i) => (
          <div key={i} className="trust-item">
            <div className="trust-icon-container">{item.icon}</div>
            <div>
              <div className="trust-text">{item.text}</div>
              <div style={{ fontSize: '11.5px', color: '#9A7B5C', marginTop: '3px', lineHeight: 1.4 }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Shop by Relationship ───────────────────────────────────── */}
      <div style={{ marginBottom: '40px' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Shop by Relationship</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Handpicked festive presents for every loved one</p>
          </div>
          <button onClick={() => setActiveTab('shop')} className="section-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            View All <ArrowRight size={14} />
          </button>
        </div>
        <div className="relationship-grid">
          {RELATIONSHIPS.map(rel => (
            <div
              key={rel.id}
              className={`relationship-card ${rel.id === 'brother' ? 'relationship-card--brother' : ''}`}
              style={{ '--relationship-bg': rel.bg }}
              onClick={() => { setProductFilter({ category: '', tag: rel.tag }); setActiveTab('shop'); }}
            >
              <div className="relationship-card-backdrop" />
              <div className="relationship-card-pattern" />

              <svg
                className="relationship-card-frame"
                viewBox="0 0 100 160"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M 6,154 L 6,54 C 6,43 14,40 17,34 C 21,26 28,16 39,10 C 46,6 54,6 61,10 C 72,16 79,26 83,34 C 86,40 94,43 94,54 L 94,154"
                  fill="none"
                  stroke="rgba(255, 225, 168, 0.78)"
                  strokeWidth="1.5"
                />
                <path
                  d="M 11,154 L 11,56 C 11,48 18,45 21,39 C 24,32 31,23 41,17 C 46,14 54,14 59,17 C 69,23 76,32 79,39 C 82,45 89,48 89,56 L 89,154"
                  fill="none"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="0.8"
                />
                <path
                  d="M 12,16 L 18,16 M 82,16 L 88,16 M 12,144 L 18,144 M 82,144 L 88,144"
                  fill="none"
                  stroke="rgba(255, 227, 170, 0.55)"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              </svg>

              <div className="relationship-icon-wrapper">
                {rel.icon}
              </div>

              <div className="relationship-card-copy">
                <h3 className="relationship-title">{rel.name}</h3>
                <p className="relationship-desc">{rel.sub}</p>
              </div>

              <img
                src={rel.image}
                alt={rel.name}
                className="relationship-card-visual"
                style={rel.id === 'brother' ? { objectPosition: 'center 12%', transform: 'scale(1.22)' } : undefined}
                loading="lazy"
              />

              <button className="btn-relationship-explore">
                Explore Gifts <ArrowRight size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Exclusive Offers ──────────────────────────────────────── */}
      {(() => {
        const STATIC_EXCLUSIVE = [
          {
            _id: 'exc-dating',
            name: 'Durga Puja Dating Coupon',
            description: 'Meet & connect at exclusive festive events this Pujo',
            category: 'luxury',
            price: 99,
            images: [{ url: '/exclusive_offer_dating.png' }],
          },
          {
            _id: 'exc-food',
            name: 'Puja Food Trail',
            description: 'One pass for Kolkata\'s best Puja bites & flavours',
            category: 'food',
            price: 49,
            images: [{ url: '/exclusive_offer_food.png' }],
          },
        ];
        const displayExclusive = exclusiveCoupons.length > 0 ? exclusiveCoupons : STATIC_EXCLUSIVE;

        const isOwned = (couponId) => userCoupons.some(
          uc => (uc.coupon?._id || uc.coupon) === couponId &&
                ['Available', 'CodeGenerated'].includes(uc.status)
        );

        const getBadge = (c) => {
          if (c.category === 'food') return { label: 'FOOD SPECIAL', icon: <Utensils size={11} />, cls: 'food-badge', ctaCls: 'food-cta' };
          return { label: 'PUJO SPECIAL', icon: <Sparkles size={11} />, cls: '', ctaCls: '' };
        };

        const getImg = (c) => c.images?.[0]?.url || '/durga_puja_hero_banner.png';

        return (
          <div style={{ marginBottom: '40px' }}>
            <div className="section-header">
              <div>
                <h2 className="section-title">Exclusive Offers</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Limited-time Durga Puja specials — grab yours before they're gone
                </p>
              </div>
              <button onClick={() => setActiveTab('coupon-market')} className="section-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                View All <ArrowRight size={14} />
              </button>
            </div>
            <div className="exclusive-offers-grid">
              {displayExclusive.slice(0, 2).map((c) => {
                const badge   = getBadge(c);
                const owned   = isOwned(c._id || c.id);
                const isPaid  = c.price > 0;
                const ctaText = owned ? 'View in Locker' : isPaid ? `Buy ₹${c.price}` : 'Claim Free';
                return (
                  <div
                    key={c._id || c.id}
                    className="exclusive-offer-card"
                    onClick={() => setActiveTab('coupon-market')}
                  >
                    <div className="exclusive-offer-img-wrapper">
                      <img src={getImg(c)} alt={c.name} loading="lazy" />
                    </div>
                    <div className="exclusive-offer-overlay">
                      <span className={`exclusive-offer-badge ${badge.cls}`}>
                        {badge.icon} {badge.label}
                      </span>
                      <h3 className="exclusive-offer-title">{c.name}</h3>
                      <p className="exclusive-offer-desc">{c.description?.split('.')[0]}</p>
                      <button className={`exclusive-offer-cta ${badge.ctaCls}`}>
                        {ctaText} <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Heritage Categories ────────────────────────────────────── */}
      <div style={{ marginBottom: '40px' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Heritage Categories</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Handpicked traditions, for every bond</p>
          </div>
        </div>
        <div className="category-grid">
          {categories.map(cat => (
            <div key={cat.id} className="category-card"
              onClick={() => { setProductFilter({ category: cat.id, tag: '' }); setActiveTab('shop'); }}>
              <div className="category-image-wrapper">
                <img src={CAT_IMAGES[cat.id] || '/wife_gift_category.png'} alt={cat.name} loading="lazy" />
              </div>
              {/* Overlapping gold medallion icon badge */}
              <div className="category-icon-overlap">
                {CAT_ICONS[cat.id] || <Gift size={12} />}
              </div>
              <div className="category-info-wrapper">
                <span className="category-card-name">{cat.name}</span>
                <span className="category-card-cashback">{cat.commission}% Cashback</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured Coupons (if any) ───────────────────────────────── */}
      {topCoupons.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">Hot Deals</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Exclusive coupons from verified boutiques</p>
            </div>
            <button onClick={() => setActiveTab('coupon-market')} className="section-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              All Coupons <ArrowRight size={14} />
            </button>
          </div>
          <div className="ticket-grid">
            {topCoupons.map((c) => (
              <CouponCard 
                key={c._id || c.id} 
                coupon={c} 
                context="home" 
                onAction={() => setActiveTab('coupon-market')} 
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Trending Products ──────────────────────────────────────── */}
      <div>
        <div className="section-header">
          <div>
            <h2 className="section-title">Trending Gifts</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>From Bowbazar, Lindsay Street & Gariahat</p>
          </div>
          <button onClick={() => { setProductFilter({ category: '', tag: '' }); setActiveTab('shop'); }} className="section-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            See All <ArrowRight size={14} />
          </button>
        </div>

        {loadingProducts && featured.length === 0 ? (
          /* Skeleton cards — same layout as real cards, no blank flash */
          <div className="trending-product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="trending-product-card skeleton-card" aria-hidden="true">
                <div className="trending-product-image skeleton-box" style={{ height: '200px', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0' }} />
                <div className="trending-product-body" style={{ padding: '12px' }}>
                  <div className="skeleton-box" style={{ height: '10px', width: '50%', marginBottom: '8px', borderRadius: '4px' }} />
                  <div className="skeleton-box" style={{ height: '14px', width: '80%', marginBottom: '12px', borderRadius: '4px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton-box" style={{ height: '14px', width: '35%', borderRadius: '4px' }} />
                    <div className="skeleton-box" style={{ height: '14px', width: '20%', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : featured.length === 0 ? (
          /* Products loaded but empty — show friendly message */
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>
            <ShoppingBag size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>Products loading… please wait a moment.</p>
          </div>
        ) : (
          <div className="trending-product-grid">
            {featured.map((prod, idx) => (
              <div key={getPid(prod)} className="trending-product-card" onClick={() => { setSelectedProduct(prod); setActiveTab('product-detail'); }}>
                {/* Product Image and Overlay Tags */}
                <div className="trending-product-image">
                  <img src={getImg(prod)} alt={prod.name} loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
                  
                  {/* Status Tag Badge */}
                  <span className={`product-tag-badge tag-${getProductTag(prod, idx).toLowerCase().replace(' ', '-')}`}>
                    {getProductTag(prod, idx)}
                  </span>

                  {/* Add to Cart Overlay Circle Button */}
                  <button 
                    className="product-cart-btn-overlay"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(prod);
                      showSuccess(`${prod.name} added to cart!`);
                    }}
                    title="Add to Cart"
                  >
                    <ShoppingCart size={15} />
                  </button>
                </div>

                {/* Card Body Info */}
                <div className="trending-product-body">
                  <div>
                    <span className="trending-product-vendor">{prod.vendor?.name || 'Kolkata Artisan'}</span>
                    <h3 className="trending-product-name">{prod.name}</h3>
                  </div>
                  <div className="trending-product-footer">
                    <span className="trending-product-price">₹{prod.price.toLocaleString('en-IN')}</span>
                    <span className="trending-product-view-link">
                      View <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientHome;
