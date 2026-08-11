import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { Award, Percent, Gift, Tag, Check, ArrowRight, Loader } from 'lucide-react';
import CouponCard from '../Common/CouponCard';

const getCouponTheme = (c) => {
  const cat = c.category || c.vendor?.category || '';
  if (cat === 'food') return 'theme-crimson';
  if (cat === 'jewellery') return 'theme-gold';
  if (cat === 'sarees' || cat === 'apparel') return 'theme-maroon';
  return 'theme-ivory';
};

const getCouponImage = (c) => {
  const cat = c.category || c.vendor?.category || '';
  if (cat === 'food') return '/cat_food.png';
  if (cat === 'jewellery') return '/cat_jewellery.png';
  if (cat === 'sarees' || cat === 'apparel') return '/cat_sarees.png';
  return '/durga_puja_hero_banner.png';
};

const getCouponPoints = (c, index) => {
  const points = [100, 50, 150, 50];
  return points[index % points.length];
};

const CouponMarket = ({ setActiveTab, onRequireLogin }) => {
  const { coupons, exclusiveCoupons, userCoupons, packages, buyCoupon, buyAdminPackage, isLoggedIn } = useContext(AppContext);
  const [filterTag, setFilterTag]           = useState('all');
  const [filterCat, setFilterCat]           = useState('all');
  const [loadingId, setLoadingId]           = useState(null);
  const [timeRemaining, setTimeRemaining]   = useState({});

  useEffect(() => {
    const pad = (n) => String(n).padStart(2, '0');

    const tick = () => {
      const now = Date.now();
      const updated = {};

      userCoupons.forEach(uc => {
        const expiresAt = uc.code?.expiresAt;
        if (uc.status === 'CodeGenerated' && expiresAt) {
          const remaining = new Date(expiresAt).getTime() - now;
          updated[uc._id || uc.id] = remaining <= 0
            ? '00:00:00'
            : `${pad(Math.floor(remaining / 3600000))}:${pad(Math.floor((remaining % 3600000) / 60000))}:${pad(Math.floor((remaining % 60000) / 1000))}`;
        }
      });

      setTimeRemaining(updated);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [userCoupons]);

  const getVendor = (c) => c.vendor || {};
  const getId     = (c) => c._id  || c.id;
  const getUserCoupon = (couponId) => userCoupons.find(uc => (uc.coupon?._id || uc.coupon) === couponId && ['Available', 'CodeGenerated'].includes(uc.status));

  // Check if user already owns an active copy of this coupon
  const isOwned = (couponId) => !!getUserCoupon(couponId);

  const handleClaim = async (couponId) => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    if (isOwned(couponId)) {
      setActiveTab('coupons');
      return;
    }
    setLoadingId(couponId);
    const res = await buyCoupon(couponId);
    setLoadingId(null);
    if (res?.success) setActiveTab('coupons');
  };

  const handleClaimPkg = async (pkgId) => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    setLoadingId(pkgId);
    const res = await buyAdminPackage(pkgId);
    setLoadingId(null);
    if (res?.success) setActiveTab('coupons');
  };

  const approvedCoupons = coupons.filter(c => {
    if (c.status !== 'Approved') return false;
    if (filterTag !== 'all' && !(c.tags || []).includes(filterTag)) return false;
    if (filterCat !== 'all' && (c.category || getVendor(c).category) !== filterCat) return false;
    return true;
  });

  const approvedPkgs = packages.filter(p => p.status === 'Active' || p.status === 'Approved');

  // Exclusive coupons (filtered separately, shown at top)
  const filteredExclusive = exclusiveCoupons.filter(c => {
    if (filterTag !== 'all' && !(c.tags || []).includes(filterTag)) return false;
    if (filterCat !== 'all' && (c.category || getVendor(c).category) !== filterCat) return false;
    return true;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-title-banner">
        <div>
          <h2 className="section-title" style={{ display: 'inline-block' }}>Exclusive Coupons &amp; Passes</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Purchase high-value discounts for in-store redemption</p>
        </div>
        <div className="filters-bar" style={{ flexWrap: 'wrap' }}>
          <select className="filter-select" value={filterTag} onChange={e => setFilterTag(e.target.value)}>
            <option value="all">All Occasions</option>
            <option value="For Your Wife">For Your Wife</option>
            <option value="For Your Girlfriend">For Your Girlfriend</option>
            <option value="For Your Loved One">For Your Loved One</option>
            <option value="For Your Colleagues">For Your Colleagues</option>
          </select>
          <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="jewellery">Jewellery</option>
            <option value="apparel">Apparel</option>
            <option value="footwear">Footwear</option>
            <option value="food">Dining &amp; Food</option>
            <option value="sarees">Sarees</option>
          </select>
        </div>
      </div>

      {/* Admin Packages */}
      {approvedPkgs.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} style={{ color: 'var(--gold)' }} /> Curated Gifting Packages
          </h3>
          {approvedPkgs.map(pkg => {
            const pkgId = pkg._id || pkg.id;
            const pkgCoupons = Array.isArray(pkg.couponIds) ? pkg.couponIds : [];
            return (
              <div key={pkgId} className="pass-banner">
                <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                  <span style={{ backgroundColor: 'var(--gold-metallic)', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '8px' }}>Multi-Store Bundle</span>
                  <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(16px, 3vw, 20px)', margin: '0 0 6px 0', color: '#fff' }}>{pkg.name}</h4>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', opacity: 0.9, maxWidth: '600px' }}>{pkg.description}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {pkgCoupons.map((c, i) => {
                      const cn = typeof c === 'object' ? c.name : 'Coupon Offer';
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>
                          <Check size={12} style={{ color: 'var(--gold-metallic)' }} />{cn}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--gold-metallic)' }}>₹{pkg.price}</span>
                  <button className="btn-pass-action" onClick={() => handleClaimPkg(pkgId)} disabled={loadingId === pkgId}>
                    {loadingId === pkgId ? <Loader size={14} className="spin" /> : <>Buy Bundle <ArrowRight size={14} /></>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Exclusive Feature Coupons (Dating + Food Trail) */}
      {filteredExclusive.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gift size={20} style={{ color: 'var(--crimson)' }} /> Exclusive Pujo Experiences
          </h3>
          <div className="exclusive-market-grid">
            {filteredExclusive.map(c => {
              const cid     = getId(c);
              const owned   = isOwned(cid);
              const isPaid  = c.price > 0;
              const img     = c.images?.[0]?.url || (c.category === 'food' ? '/exclusive_offer_food.png' : '/exclusive_offer_dating.png');
              const isFood  = c.category === 'food';
              const priceLabel = isPaid ? `₹${c.price}` : 'FREE';
              const ctaLabel   = owned ? 'View in Locker' : isPaid ? `Buy for ₹${c.price}` : 'Claim Free';

              return (
                <div key={cid} className="exclusive-market-card" onClick={() => handleClaim(cid)}>
                  <div className="exclusive-market-img-wrap">
                    <img src={img} alt={c.name} loading="lazy" />
                  </div>
                  <div className="exclusive-market-overlay">
                    <div className="exclusive-market-top">
                      <span className={`exclusive-market-badge ${isFood ? 'food' : ''}`}>
                        {isFood ? <Gift size={10} /> : <Award size={10} />}
                        {isFood ? 'FOOD SPECIAL' : 'PUJO SPECIAL'}
                      </span>
                      <span className="exclusive-market-price">
                        {owned ? '✓ OWNED' : priceLabel}
                      </span>
                    </div>
                    <div className="exclusive-market-body">
                      <h4 className="exclusive-market-title">{c.name}</h4>
                      <p className="exclusive-market-desc">{c.description?.split('.')[0]}</p>
                      <button
                        className={`exclusive-market-cta ${isFood ? 'food' : ''} ${owned ? 'owned' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleClaim(cid); }}
                        disabled={loadingId === cid}
                      >
                        {loadingId === cid
                          ? <Loader size={13} className="spin" />
                          : <>{ctaLabel} <ArrowRight size={12} /></>
                        }
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Coupons */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={20} style={{ color: 'var(--crimson)' }} /> Store Promotional Coupons
        </h3>

        {approvedCoupons.length === 0 ? (
          <div style={{ textAlign: 'center', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '48px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No coupons match your filters.</p>
          </div>
        ) : (
          <div className="ticket-grid">
            {approvedCoupons.map((c) => {
              const cid = getId(c);
              const userCoupon = getUserCoupon(cid);
              const userCouponId = userCoupon?._id || userCoupon?.id;

              return (
                <CouponCard
                  key={cid}
                  coupon={c}
                  userCoupon={userCoupon}
                  context="market"
                  onAction={handleClaim}
                  timerText={userCouponId ? timeRemaining[userCouponId] : undefined}
                  loading={loadingId === cid}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponMarket;
