import React from 'react';
import { ArrowRight, Loader, Gift, ShoppingBag, ShieldCheck, Percent, Star, Calendar, Store } from 'lucide-react';

/* ── Common Programmatic SVG Ornaments ── */

// 1. Durga Ma Eyes & Bindi (Used on ticket stubs)
const DurgaEyesSVG = ({ color = '#fff' }) => (
  <svg viewBox="0 0 100 50" width="100%" height="34" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.9 }}>
    {/* Eyebrows */}
    <path d="M 15,22 C 28,10 38,15 45,22" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M 85,22 C 72,10 62,15 55,22" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Eyes */}
    <path d="M 15,26 C 25,18 38,18 45,26 C 35,33 25,33 15,26 Z" fill={color} />
    <path d="M 85,26 C 75,18 62,18 55,26 C 65,33 75,33 85,26 Z" fill={color} />
    {/* Pupils */}
    <circle cx="30" cy="25.5" r="3.5" fill="#000" />
    <circle cx="31.2" cy="24.2" r="1" fill="#fff" />
    <circle cx="70" cy="25.5" r="3.5" fill="#000" />
    <circle cx="71.2" cy="24.2" r="1" fill="#fff" />
    {/* Third Eye Bindi */}
    <path d="M 50,11 C 48,16 48,19 50,23 C 52,19 52,16 50,11 Z" fill="#9A1A18" />
    <circle cx="50" cy="19.5" r="1" fill="#D4AF37" />
    {/* Nose Ring */}
    <circle cx="43" cy="35" r="6" stroke="#D4AF37" strokeWidth="1.2" fill="none" />
    <circle cx="39.5" cy="39" r="1" fill="#9A1A18" />
  </svg>
);

// 2. Hanging Clay Diya (Lamp)
const HangingDiyaSVG = () => (
  <svg viewBox="0 0 30 70" width="22" height="50" xmlns="http://www.w3.org/2000/svg">
    <line x1="15" y1="0" x2="15" y2="42" stroke="#D4AF37" strokeWidth="1.2" />
    <path d="M 5,42 C 5,55 25,55 25,42 Z" fill="#C99E49" />
    <path d="M 5,42 Q 15,38 25,42" stroke="#A37B30" strokeWidth="1" fill="none" />
    <path d="M 15,26 C 13,32 17,32 15,26 Z" fill="#D97706" />
    <path d="M 15,25 Q 16.5,29 13.5,29 Z" fill="#EF4444" />
  </svg>
);

// 3. Howrah Bridge Silhouette (Used on backgrounds)
const HowrahBridgeSVG = ({ color = 'rgba(0, 0, 0, 0.08)' }) => (
  <svg viewBox="0 0 200 40" width="100%" height="32" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
    {/* Main span line */}
    <line x1="0" y1="36" x2="200" y2="36" stroke={color} strokeWidth="1.5" />
    {/* Left tower */}
    <path d="M 35,36 L 44,12 L 48,12 L 57,36 Z" fill={color} />
    <path d="M 44,12 Q 46,6 48,12" stroke={color} strokeWidth="1" fill="none" />
    {/* Right tower */}
    <path d="M 143,36 L 152,12 L 156,12 L 165,36 Z" fill={color} />
    <path d="M 152,12 Q 154,6 156,12" stroke={color} strokeWidth="1" fill="none" />
    {/* Main arches */}
    <path d="M 0,36 Q 48.5,8 97,30 Q 148.5,8 200,36" stroke={color} strokeWidth="1.2" fill="none" />
    <path d="M 46,12 Q 97,4 154,12" stroke={color} strokeWidth="1" fill="none" />
    {/* Suspender lines */}
    <line x1="46" y1="12" x2="46" y2="36" stroke={color} strokeWidth="0.8" />
    <line x1="57" y1="20" x2="57" y2="36" stroke={color} strokeWidth="0.8" />
    <line x1="72" y1="24" x2="72" y2="36" stroke={color} strokeWidth="0.8" />
    <line x1="87" y1="26" x2="87" y2="36" stroke={color} strokeWidth="0.8" />
    <line x1="102" y1="27" x2="102" y2="36" stroke={color} strokeWidth="0.8" />
    <line x1="117" y1="26" x2="117" y2="36" stroke={color} strokeWidth="0.8" />
    <line x1="132" y1="23" x2="132" y2="36" stroke={color} strokeWidth="0.8" />
    <line x1="143" y1="12" x2="143" y2="36" stroke={color} strokeWidth="0.8" />
  </svg>
);


// Format a date to a short human-readable string
const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
};

// Build offer label based on type + value
const buildOfferLabel = (type, value) => {
  if (!type || value === undefined || value === null) return '';
  if (type === 'percentage') return `${value}% OFF`;
  if (type === 'flat') return `FLAT ₹${value} OFF`;
  if (type === 'bogo') return typeof value === 'string' ? value.toUpperCase() : 'BUY 1 GET 1 FREE';
  return `${value} OFF`;
};

const formatRemaining = (expiresAt) => {
  if (!expiresAt) return '00:00:00';
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return '00:00:00';
  const hours = String(Math.floor(remaining / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const CouponCard = ({ coupon, userCoupon, context = 'market', onAction, timerText, loading }) => {
  if (!coupon) return null;

  const cid = coupon._id || coupon.id;
  const category = coupon.category || '';
  const isAdminAuthored = coupon.isAdminAuthored || !coupon.vendor;
  const isExclusive = !!(coupon.isExclusive);
  const value = coupon.value || 0;
  const offerLabel = buildOfferLabel(coupon.type, value);
  const vendorName = coupon.vendor?.name || (isAdminAuthored ? 'Dear Kolkata' : '');
  const descLine = coupon.description ? coupon.description.split('.')[0] : '';
  const validUntil = coupon.validityEnd ? fmtDate(coupon.validityEnd) : '';
  const price = coupon.price || 0;
  const couponArtwork = coupon.images?.[0]?.url || (category === 'food' ? '/cat_food.png' : category === 'jewellery' ? '/cat_jewellery.png' : category === 'sarees' || category === 'apparel' ? '/cat_sarees.png' : category === 'luxury' || isAdminAuthored ? '/cat_luxury.png' : '/durga_puja_hero_banner.png');
  const ownedState = userCoupon?.status;
  const isOwnedCoupon = ['Available', 'CodeGenerated'].includes(ownedState);
  const isActiveCoupon = ownedState === 'CodeGenerated';
  const activeTimer = timerText || formatRemaining(userCoupon?.code?.expiresAt);

  // Determine card style layout
  let cardClass = 'coupon-jewellery';
  let overlayColor = 'rgba(163, 107, 34, 0.97)'; // Gold stub overlay color

  if (category === 'food') {
    cardClass = 'coupon-sweets';
    overlayColor = 'rgba(110, 14, 16, 0.98)';
  } else if (category === 'sarees' || category === 'apparel') {
    cardClass = 'coupon-sarees';
    overlayColor = 'rgba(112, 26, 32, 0.98)';
  } else if (category === 'luxury' || isAdminAuthored) {
    cardClass = 'coupon-wallet';
    overlayColor = 'rgba(163, 107, 34, 0.97)';
  }

  // Price pill for market context
  const renderPricePill = () => {
    if (context !== 'market' && context !== 'home') return null;
    if (isOwnedCoupon) {
      return (
        <div className="coupon-price-pill owned">
          <span>{isActiveCoupon ? 'ACTIVE' : 'IN LOCKER'}</span>
        </div>
      );
    }
    if (price > 0) {
      return (
        <div className="coupon-price-pill paid">
          <span>₹{price}</span>
        </div>
      );
    }
    return (
      <div className="coupon-price-pill free">
        <span>FREE</span>
      </div>
    );
  };

  // Action button overlay inside stub
  const renderStubAction = () => {
    if (context === 'home' || context === 'market') {
      const isFree = price === 0;
      const btnLabel = coupon.buttonText || (isFree ? 'Claim Free' : `Buy ₹${price}`);

      if (isOwnedCoupon) {
        return (
          <div className="coupon-card-stub-interactive owned">
            {renderPricePill()}
            {isActiveCoupon ? (
              <div className="coupon-owned-timer-box">
                <span className="coupon-owned-label">LIVE TIMER</span>
                <span className="coupon-owned-timer"><span className="pulsing-red-dot"></span>{activeTimer}</span>
              </div>
            ) : (
              <div className="coupon-owned-timer-box purchased">
                <span className="coupon-owned-label">ALREADY BOUGHT</span>
                <span className="coupon-owned-timer">OPEN IN LOCKER</span>
              </div>
            )}
            {(!isActiveCoupon || context === 'home') && (
              <button
                className="coupon-stub-claim-overlay-btn owned"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAction) onAction(cid);
                }}
                disabled={loading}
              >
                {loading ? <Loader size={14} className="spin" /> : isActiveCoupon ? 'OPEN LOCKER' : 'PURCHASED'}
              </button>
            )}
          </div>
        );
      }
      return (
        <div className="coupon-card-stub-interactive">
          {renderPricePill()}
          <button 
            className="coupon-stub-claim-overlay-btn" 
            onClick={(e) => {
              e.stopPropagation();
              if (onAction) onAction(cid);
            }}
            disabled={loading}
          >
            {loading ? <Loader size={14} className="spin" /> : btnLabel}
          </button>
        </div>
      );
    }

    if (context === 'locker' && userCoupon) {
      const status = userCoupon.status;
      const code = userCoupon.code?.value || userCoupon.code;

      if (status === 'Available') {
        return (
          <div className="coupon-card-stub-overlay" style={{ backgroundColor: overlayColor }}>
            <div className="coupon-stub-locker-content">
              {isExclusive && <span className="locker-exclusive-badge"><Star size={8} fill="currentColor" /> EXCLUSIVE</span>}
              <span className="locker-tag">UNUSED</span>
              <button 
                className="btn-stub-generate" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAction) onAction(userCoupon._id || userCoupon.id);
                }}
                disabled={loading}
              >
                {loading ? <Loader size={14} className="spin" /> : 'GENERATE'}
              </button>
            </div>
          </div>
        );
      }

      if (status === 'CodeGenerated') {
        return (
          <div className="coupon-card-stub-overlay active-code" style={{ backgroundColor: overlayColor }}>
            <div className="coupon-stub-locker-content" onClick={(e) => {
              e.stopPropagation();
              if (onAction) onAction(userCoupon);
            }}>
              {isExclusive && <span className="locker-exclusive-badge"><Star size={8} fill="currentColor" /> EXCLUSIVE</span>}
              <span className="locker-tag active">ACTIVE</span>
              <span className="locker-code">{code}</span>
              <div className="locker-timer">
                <span className="pulsing-red-dot"></span>
                <span>{activeTimer}</span>
              </div>
              <span className="locker-click-hint">Click to show</span>
            </div>
          </div>
        );
      }

      if (status === 'Redeemed') {
        return (
          <div className="coupon-card-stub-overlay redeemed" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
            <div className="coupon-stub-locker-content">
              {isExclusive && <span className="locker-exclusive-badge"><Star size={8} fill="currentColor" /> EXCLUSIVE</span>}
              <span className="locker-status-stamp redeemed">REDEEMED</span>
              <span style={{ fontSize: '10px', color: '#ccc', marginTop: '4px' }}>
                {userCoupon.redemption?.redeemedAt
                  ? new Date(userCoupon.redemption.redeemedAt).toLocaleDateString('en-IN')
                  : userCoupon.redeemedAt ? new Date(userCoupon.redeemedAt).toLocaleDateString('en-IN') : ''}
              </span>
            </div>
          </div>
        );
      }

      return (
        <div className="coupon-card-stub-overlay expired" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="coupon-stub-locker-content">
            {isExclusive && <span className="locker-exclusive-badge"><Star size={8} fill="currentColor" /> EXCLUSIVE</span>}
            <span className="locker-status-stamp expired">EXPIRED</span>
          </div>
        </div>
      );
    }

    return null;
  };

  /* ── Dynamic Left Layout Elements ── */

  const renderLeftGraphics = () => {
    switch (cardClass) {
      case 'coupon-jewellery':
        return (
          <>
            {/* Hanging Lamps */}
            <div style={{ position: 'absolute', top: 0, left: 16, display: 'flex', gap: '8px' }}>
              <HangingDiyaSVG />
              <HangingDiyaSVG />
            </div>

            {/* Programmatic SVG Necklace Drawing */}
            <div className="jewellery-necklace-svg-container">
              <svg viewBox="0 0 100 60" width="130" height="80">
                {/* Arc chain */}
                <path d="M 10,10 Q 50,45 90,10" stroke="#E2A638" strokeWidth="2.5" fill="none" />
                <path d="M 18,14 Q 50,40 82,14" stroke="#D4AF37" strokeWidth="1.2" fill="none" strokeDasharray="3 2" />
                {/* Center pendant */}
                <path d="M 45,36 L 50,45 L 55,36 Z" fill="#9A1A18" stroke="#D4AF37" strokeWidth="0.8" />
                <circle cx="50" cy="46.5" r="1.5" fill="#D4AF37" />
                {/* Hanging gold beads */}
                <circle cx="34" cy="27" r="2" fill="#D4AF37" />
                <circle cx="42" cy="31" r="2" fill="#D4AF37" />
                <circle cx="58" cy="31" r="2" fill="#D4AF37" />
                <circle cx="66" cy="27" r="2" fill="#D4AF37" />
                {/* Inner red beads */}
                <circle cx="28" cy="22" r="1.5" fill="#9A1A18" />
                <circle cx="38" cy="28.5" r="1.5" fill="#9A1A18" />
                <circle cx="50" cy="30.5" r="2.2" fill="#9A1A18" />
                <circle cx="62" cy="28.5" r="1.5" fill="#9A1A18" />
                <circle cx="72" cy="22" r="1.5" fill="#9A1A18" />
              </svg>
            </div>

            {/* Bottom-left Medallion */}
            <div className="medallion-badge-gold">
              <svg viewBox="0 0 40 40" width="30" height="30">
                <circle cx="20" cy="20" r="18" fill="none" stroke="#D4AF37" strokeWidth="1" strokeDasharray="2 1" />
                {/* Simple lotus inside */}
                <path d="M 20,12 C 18,17 18,23 20,28 C 22,23 22,17 20,12 Z" fill="#D4AF37" />
                <path d="M 20,18 C 14,22 17,28 20,28 C 23,28 26,22 20,18 Z" fill="#C99E49" opacity="0.8" />
              </svg>
              <div className="medallion-text">PUJA SPECIAL</div>
            </div>

            {/* Text Contents */}
            <div className="coupon-left-text-container">
              <span className="ribbon-tag-gold">{isExclusive ? '✦ EXCLUSIVE OFFER' : 'EXCLUSIVE OFFER'}</span>
              <div className="main-offer-title">{offerLabel || `FLAT ₹${value} OFF`}</div>
              {descLine ? (
                <div className="offer-min-order">{descLine}</div>
              ) : (
                <div className="offer-min-order">On Gold Jewellery &amp; Premium Collections</div>
              )}
              <div className="coupon-info-row">
                {vendorName && <span className="coupon-info-chip"><Store size={9} />{vendorName}</span>}
                {validUntil && <span className="coupon-info-chip"><Calendar size={9} />Till {validUntil}</span>}
              </div>
            </div>
          </>
        );

      case 'coupon-sweets':
        return (
          <>
            {/* Background Mandalas */}
            <div className="sweets-mandala-container">
              <svg viewBox="0 0 100 100" width="120" height="120" style={{ opacity: 0.05, color: '#D4AF37' }}>
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
                <path d="M 50,5 L 50,95 M 5,50 L 95,50 M 18,18 L 82,82 M 18,82 L 82,18" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>

            {/* Marigold Garland & Bell */}
            <div style={{ position: 'absolute', top: 0, left: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="marigold-garland-svg">
                <span className="garland-orange"></span>
                <span className="garland-yellow"></span>
                <span className="garland-orange"></span>
                <span className="garland-yellow"></span>
              </div>
              <svg viewBox="0 0 20 20" width="14" height="14" style={{ marginTop: '-2px' }}>
                {/* Little metal temple bell */}
                <path d="M 6,5 L 14,5 L 16,14 L 4,14 Z" fill="#D4AF37" stroke="#A37B30" strokeWidth="0.8" />
                <circle cx="10" cy="16" r="1.5" fill="#D4AF37" />
              </svg>
            </div>

            {/* Sweets Basket Icon */}
            <div className="sweets-basket-container">
              <svg viewBox="0 0 100 100" width="80" height="80">
                <circle cx="50" cy="50" r="38" fill="#FAF6EE" stroke="#D4AF37" strokeWidth="1.5" />
                {/* Basket representation */}
                <path d="M 22,60 C 22,78 78,78 78,60 Z" fill="#D4AF37" stroke="#A37B30" strokeWidth="1.2" />
                <path d="M 22,60 C 35,56 65,56 78,60" fill="none" stroke="#A37B30" strokeWidth="2" />
                {/* Ladoos / Sweets */}
                <circle cx="36" cy="54" r="7" fill="#F59E0B" />
                <circle cx="48" cy="51" r="7.5" fill="#D97706" />
                <circle cx="62" cy="53" r="7" fill="#FBBF24" />
                <circle cx="42" cy="42" r="7" fill="#F59E0B" />
                <circle cx="56" cy="42" r="6.5" fill="#D97706" />
                <circle cx="49" cy="33" r="6" fill="#FBBF24" />
                {/* Marigold flower next to basket */}
                <circle cx="28" cy="68" r="4" fill="#EA580C" />
                <circle cx="72" cy="68" r="4" fill="#FBBF24" />
              </svg>
            </div>

            {/* Text Contents */}
            <div className="coupon-left-text-container text-dark">
              <span className="ribbon-tag-red">{isExclusive ? '✦ EXCLUSIVE OFFER' : 'FESTIVE OFFER'}</span>
              {coupon.type === 'bogo' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <div className="main-offer-title crimson-color">BUY 1 GET 1</div>
                  <div className="free-vertical-badge">FREE</div>
                </div>
              ) : (
                <div className="main-offer-title crimson-color">{offerLabel}</div>
              )}
              {descLine ? (
                <div className="offer-min-order" style={{ color: '#6A5652', marginTop: '4px' }}>
                  <Gift size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-top' }} />{descLine}
                </div>
              ) : (
                <div className="offer-min-order" style={{ color: '#6A5652', marginTop: '6px' }}>
                  <Gift size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-top' }} /> On Selected Products
                </div>
              )}
              <div className="coupon-info-row">
                {vendorName && <span className="coupon-info-chip dark"><Store size={9} />{vendorName}</span>}
                {validUntil && <span className="coupon-info-chip dark"><Calendar size={9} />Till {validUntil}</span>}
              </div>
            </div>
          </>
        );

      case 'coupon-sarees':
        return (
          <>
            {/* Background Howrah Bridge */}
            <div style={{ position: 'absolute', bottom: 4, left: 16, right: 16, zIndex: 1 }}>
              <HowrahBridgeSVG color="rgba(154, 26, 24, 0.08)" />
            </div>

            {/* Programmatic Durga Ma Face (Beige/Maroon) */}
            <div className="sarees-durga-face-container">
              <svg viewBox="0 0 100 100" width="95" height="95">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(154, 26, 24, 0.12)" strokeWidth="1" strokeDasharray="3 3" />
                {/* Crown / Mukut */}
                <path d="M 50,16 C 47,24 47,28 50,33 C 53,28 53,24 50,16 Z" fill="#9A1A18" />
                <circle cx="50" cy="24" r="1.5" fill="#D4AF37" />
                {/* Left eyebrow / eye */}
                <path d="M 28,34 Q 38,26 45,34" stroke="#111" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M 28,35 C 33,30 40,30 45,35 C 38,39 33,39 28,35 Z" fill="#111" />
                <circle cx="37" cy="35" r="2.5" fill="#111" />
                <circle cx="36.2" cy="34.2" r="0.8" fill="#fff" />
                {/* Right eyebrow / eye */}
                <path d="M 72,34 Q 62,26 55,34" stroke="#111" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M 72,35 C 67,30 60,30 55,35 C 60,39 67,39 72,35 Z" fill="#111" />
                <circle cx="63" cy="35" r="2.5" fill="#111" />
                <circle cx="63.8" cy="34.2" r="0.8" fill="#fff" />
                {/* Red third eye bindi */}
                <circle cx="50" cy="30" r="4" fill="#9A1A18" />
                {/* Nose Ring */}
                <circle cx="43" cy="46" r="6.5" stroke="#D4AF37" strokeWidth="1.2" fill="none" />
                <circle cx="39.5" cy="50.5" r="1" fill="#9A1A18" />
                {/* Lips */}
                <path d="M 45,54 Q 50,58 55,54 Q 50,56 45,54 Z" fill="#9A1A18" />
              </svg>
            </div>

            {/* Clay Kalash Coconut Pot */}
            <div className="sarees-kalash-container">
              <svg viewBox="0 0 60 70" width="50" height="58">
                {/* Clay pot */}
                <path d="M 12,45 C 12,65 48,65 48,45 Z" fill="#B25E3B" stroke="#92400E" strokeWidth="1" />
                <ellipse cx="30" cy="45" rx="18" ry="4" fill="#92400E" opacity="0.8" />
                <path d="M 16,45 L 44,45" stroke="#92400E" strokeWidth="1.5" />
                {/* Swastika on pot */}
                <path d="M 26,50 H 34 M 30,47 V 55 M 26,47 V 50 M 34,50 V 53 M 30,47 H 28 M 30,55 H 32" stroke="#9A1A18" strokeWidth="0.8" fill="none" />
                {/* Mango leaves */}
                <path d="M 12,44 C 18,34 30,40 30,44 Z" fill="#047857" />
                <path d="M 48,44 C 42,34 30,40 30,44 Z" fill="#047857" />
                <path d="M 30,44 C 30,30 20,38 12,44 Z" fill="#059669" />
                <path d="M 30,44 C 30,30 40,38 48,44 Z" fill="#059669" />
                <path d="M 30,44 C 30,28 30,38 30,44 Z" fill="#10B981" />
                {/* Coconut */}
                <path d="M 22,40 C 22,25 38,25 38,40 Z" fill="#78350F" />
                <path d="M 22,40 C 24,30 36,30 38,40 Z" stroke="#451A03" strokeWidth="1" fill="none" />
              </svg>
            </div>

            {/* Text Contents */}
            <div className="coupon-left-text-container text-dark" style={{ zIndex: 2 }}>
              <span className="ribbon-tag-red">{isExclusive ? '✦ EXCLUSIVE OFFER' : 'PUJA SPECIAL'}</span>
              <div className="main-offer-title crimson-color" style={{ fontSize: '26px' }}>{offerLabel}</div>
              {descLine ? (
                <div className="offer-min-order" style={{ color: '#9A1A18', fontWeight: '700' }}>{descLine}</div>
              ) : (
                <div className="offer-min-order" style={{ color: '#9A1A18', fontWeight: '800' }}>Celebrate Durga Puja with Blessings &amp; Savings!</div>
              )}
              <div className="coupon-info-row">
                {vendorName && <span className="coupon-info-chip dark"><Store size={9} />{vendorName}</span>}
                {validUntil && <span className="coupon-info-chip dark"><Calendar size={9} />Till {validUntil}</span>}
              </div>
            </div>
          </>
        );

      case 'coupon-wallet':
        default:
        return (
          <>
            {/* Lights strings */}
            <div style={{ position: 'absolute', top: 0, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
              <svg viewBox="0 0 100 20" width="80" height="18">
                <path d="M 0,2 Q 25,18 50,2 Q 75,18 100,2" fill="none" stroke="#D4AF37" strokeWidth="0.8" strokeDasharray="2 2" />
                <circle cx="25" cy="10" r="1.5" fill="#FEF9C3" />
                <circle cx="50" cy="2" r="1.5" fill="#FEF9C3" />
                <circle cx="75" cy="10" r="1.5" fill="#FEF9C3" />
              </svg>
              <svg viewBox="0 0 100 20" width="80" height="18">
                <path d="M 0,2 Q 25,18 50,2 Q 75,18 100,2" fill="none" stroke="#D4AF37" strokeWidth="0.8" strokeDasharray="2 2" />
                <circle cx="25" cy="10" r="1.5" fill="#FEF9C3" />
                <circle cx="50" cy="2" r="1.5" fill="#FEF9C3" />
                <circle cx="75" cy="10" r="1.5" fill="#FEF9C3" />
              </svg>
            </div>

            {/* Wallet with Coins Vector Illustration */}
            <div className="wallet-vector-container">
              <svg viewBox="0 0 100 90" width="95" height="85">
                {/* Diya next to wallet */}
                <path d="M 68,68 C 68,76 84,76 84,68 Z" fill="#D4AF37" />
                <path d="M 76,58 C 74,63 78,63 76,58 Z" fill="#EA580C" />
                {/* Gold Coins behind wallet */}
                <circle cx="26" cy="42" r="10" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
                <circle cx="26" cy="42" r="6" fill="#F59E0B" />
                <circle cx="38" cy="38" r="10" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
                <circle cx="38" cy="38" r="6" fill="#F59E0B" />
                <circle cx="48" cy="46" r="10" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
                <circle cx="48" cy="46" r="6" fill="#F59E0B" />
                {/* Leather wallet shape */}
                <path d="M 12,42 L 68,42 C 72,42 74,45 74,48 L 74,74 C 74,78 72,80 68,80 L 12,80 C 8,80 6,78 6,74 L 6,48 C 6,45 8,42 12,42 Z" fill="#4B1054" stroke="#D4AF37" strokeWidth="1.2" />
                {/* Stitching lines inside wallet */}
                <path d="M 10,46 H 70 M 10,76 H 70 M 10,46 V 76 M 70,46 V 76" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="0.8" strokeDasharray="2 1" />
                {/* Wallet flap & gold snap button */}
                <path d="M 52,50 L 68,50 C 72,50 74,52 74,55 L 74,65 C 74,68 72,70 68,70 L 52,70 Z" fill="#36083C" stroke="#D4AF37" strokeWidth="1" />
                <circle cx="62" cy="60" r="3.5" fill="#D4AF37" />
                <circle cx="62" cy="60" r="1.5" fill="#FAF6EE" />
                {/* Falling Gold Coin in front */}
                <circle cx="56" cy="74" r="11" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />
                <circle cx="56" cy="74" r="8" fill="#F59E0B" />
                <text x="56" y="77" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#78350F">₹</text>
              </svg>
            </div>

            {/* Text Contents */}
            <div className="coupon-left-text-container">
              <span className="ribbon-tag-gold">{isExclusive ? '✦ EXCLUSIVE OFFER' : 'EXTRA SAVINGS'}</span>
              <div className="main-offer-title gold-gradient-text" style={{ fontSize: '26px' }}>{offerLabel || `GET ${value}% CASHBACK`}</div>
              {descLine ? (
                <div className="offer-min-order">{descLine}</div>
              ) : (
                <div className="offer-min-order">ON ALL PAYMENTS — THIS PUJA</div>
              )}
              <div className="coupon-info-row">
                {vendorName && <span className="coupon-info-chip light"><Store size={9} />{vendorName}</span>}
                {validUntil && <span className="coupon-info-chip light"><Calendar size={9} />Till {validUntil}</span>}
              </div>
            </div>
          </>
        );
    }
  };

  const renderArtwork = () => (
    <div className="coupon-artwork-badge" aria-hidden="true">
      <img src={couponArtwork} alt="" loading="lazy" />
      <div className="coupon-artwork-fade"></div>
      <div className="coupon-artwork-chip">
        {isOwnedCoupon ? (isActiveCoupon ? 'ACTIVE OFFER' : 'IN LOCKER') : (coupon.category || coupon.vendor?.category || 'FEATURED')}
      </div>
    </div>
  );

  /* ── Dynamic Right Stub Layout Elements ── */

  const renderRightGraphics = () => {
    switch (cardClass) {
      case 'coupon-jewellery':
        return (
          <>
            <div className="stub-top-group">
              <DurgaEyesSVG color="#382402" />
              <div className="stub-heading-tag text-dark">SHINE THIS PUJA</div>
              <div className="stub-sub-tag text-dark cursive-elegant">Celebrate in Gold</div>
              <div className="stub-divider-ornament gold-theme"></div>
              <div className="stub-brand-promise text-dark">✦ PREMIUM QUALITY</div>
            </div>
            {renderStubAction()}
          </>
        );

      case 'coupon-sweets':
        return (
          <>
            <div className="stub-top-group">
              <svg viewBox="0 0 24 24" width="18" height="18" style={{ color: '#FEF9C3', opacity: 0.9, flexShrink: 0 }}>
                <path d="M12,4 Q14,9 12,12 Q10,9 12,4 Z M3,14 C3,18 21,18 21,14 Q21,10 12,11 Q3,10 3,14 Z" fill="currentColor" />
              </svg>
              <div className="stub-heading-tag" style={{ marginTop: '4px' }}>DOUBLE THE JOY</div>
              <div className="stub-sub-tag text-gold-metallic">Double the Love!</div>
              <div className="stub-divider-ornament"></div>
              <div className="stub-brand-promise" style={{ opacity: 0.9 }}>LIMITED OFFER</div>
            </div>
            {renderStubAction()}
          </>
        );

      case 'coupon-sarees':
        return (
          <>
            <div className="stub-top-group">
              <DurgaEyesSVG color="#fff" />
              <div className="stub-heading-tag" style={{ marginTop: '4px' }}>GOOD THINGS HAPPEN</div>
              <div className="stub-sub-tag text-gold-metallic">This Puja Festival</div>
              <div className="stub-divider-ornament"></div>
              <div className="stub-brand-promise" style={{ opacity: 0.9 }}>EXTRA SAVINGS</div>
            </div>
            {renderStubAction()}
          </>
        );

      case 'coupon-wallet':
      default:
        return (
          <>
            <div className="stub-top-group">
              <div className="stub-luxury-badge">
                <img src="/cat_luxury.png" alt="Luxury" loading="lazy" />
              </div>
              <div className="stub-heading-tag text-dark" style={{ marginTop: '4px' }}>
                {coupon.name ? coupon.name.substring(0, 14).toUpperCase() : 'MORE SPEND'}
              </div>
              <div className="stub-sub-tag text-dark cursive-elegant">More Smiles</div>
              <div className="stub-divider-ornament gold-theme"></div>
              <div className="stub-brand-promise text-dark">PUJA CASHBACK</div>
            </div>
            {renderStubAction()}
          </>
        );
    }
  };

  return (
    <div className={`coupon-card-design ${cardClass}${isExclusive ? ' coupon-exclusive' : ''}`} onClick={() => {
      if ((context === 'home' || context === 'market') && onAction && !loading) {
        onAction(cid);
      }
    }}>
      {/* Rounded Ticket Notches */}
      <div className="coupon-notch top"></div>
      <div className="coupon-notch bottom"></div>

      {/* Dashed Separator Line */}
      <div className="coupon-dashed-separator"></div>

      {/* Programmatic Left Visual Card (65% width) */}
      <div className="coupon-section-left">
        {renderLeftGraphics()}
      </div>

      {/* Programmatic Right Ticket Stub (35% width) */}
      <div className="coupon-section-right">
        {renderArtwork()}
        {renderRightGraphics()}
      </div>
    </div>
  );
};

export default CouponCard;
