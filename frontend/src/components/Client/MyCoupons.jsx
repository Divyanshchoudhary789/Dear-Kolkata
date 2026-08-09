import React, { useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../context/AppContext';
import { CheckCircle, Key, RefreshCw, Loader } from 'lucide-react';
import { showError } from '../../utils/toast';
import CouponCard from '../Common/CouponCard';

const pad = (n) => String(n).padStart(2, '0');

const getCouponTheme = (coupon) => {
  const cat = coupon.category || coupon.vendor?.category || '';
  if (cat === 'food') return 'theme-crimson';
  if (cat === 'jewellery') return 'theme-gold';
  if (cat === 'sarees' || cat === 'apparel') return 'theme-maroon';
  return 'theme-ivory';
};

const getCouponImage = (coupon) => {
  // Exclusive coupons ke liye pehle DB image check karo
  if (coupon.images?.[0]?.url) return coupon.images[0].url;
  const cat = coupon.category || coupon.vendor?.category || '';
  if (cat === 'food') return '/cat_food.png';
  if (cat === 'jewellery') return '/cat_jewellery.png';
  if (cat === 'sarees' || cat === 'apparel') return '/cat_sarees.png';
  return '/durga_puja_hero_banner.png';
};

const MyCoupons = () => {
  const { userCoupons, generateCouponCode, fetchMyCoupons, loadingCoupons } = useContext(AppContext);
  const [activeTab,     setActiveTab]     = useState('available');
  const [timeRemaining, setTimeRemaining] = useState({});
  const [showModal,     setShowModal]     = useState(false);
  const [modalUC,       setModalUC]       = useState(null);
  const [generating,    setGenerating]    = useState(null); // userCouponId being generated

  // Live countdown ticker — runs every second for CodeGenerated coupons
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const updated = {};
      userCoupons.forEach(uc => {
        // Bug D fix: schema field is code.expiresAt, uc.expiredAt is the cron-set expiry
        const expiresAt = uc.code?.expiresAt;
        if (uc.status === 'CodeGenerated' && expiresAt) {
          const diff = new Date(expiresAt).getTime() - now;
          updated[uc._id || uc.id] = diff <= 0
            ? 'Expired'
            : `${pad(Math.floor(diff / 3600000))}:${pad(Math.floor((diff % 3600000) / 60000))}:${pad(Math.floor((diff % 60000) / 1000))}`;
        }
      });
      setTimeRemaining(updated);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [userCoupons]);

  const tabs = [
    { key: 'available',  label: 'Available' },
    { key: 'CodeGenerated', label: 'Code Active' },
    { key: 'Redeemed',   label: 'Redeemed' },
    { key: 'Expired',    label: 'Expired' },
  ];

  const filtered = userCoupons.filter(uc => {
    if (activeTab === 'available') return uc.status === 'Available';
    return uc.status === activeTab;
  });

  // Safely get coupon & vendor from populated or nested data
  const getCoupon  = (uc) => uc.coupon  || {};
  const getVendor  = (uc) => uc.coupon?.vendor || {};
  const getUCId    = (uc) => uc._id || uc.id;
  const getCode    = (uc) => uc.code?.value   || uc.code;

  const handleGenerate = async (ucId) => {
    setGenerating(ucId);
    const result = await generateCouponCode(ucId);
    setGenerating(null);
    if (result) {
      // Bug C fix: build modal from API response directly, not stale userCoupons snapshot
      const baseUC = userCoupons.find(u => getUCId(u) === ucId) || {};
      setModalUC({
        ...baseUC,
        status: 'CodeGenerated',
        code: { value: result.code, expiresAt: result.expiresAt }
      });
      setShowModal(true);
    }
  };

  const countByStatus = (s) => userCoupons.filter(uc =>
    s === 'available' ? uc.status === 'Available' : uc.status === s
  ).length;

  return (
    <div className="animate-fade-in">
      <div className="page-title-banner">
        <div>
          <h2 className="section-title" style={{ display: 'inline-block' }}>My Coupons Locker</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Claimed store promotions and coupon vouchers
            {userCoupons.some(uc => uc.coupon?.isExclusive) && (
              <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #D4AF37, #F5D07E)', color: '#382402', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.5px' }}>
                ✦ Includes Exclusive Coupons
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchMyCoupons}
          disabled={loadingCoupons}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', cursor: loadingCoupons ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', opacity: loadingCoupons ? 0.6 : 1, flexShrink: 0 }}
        >
          {loadingCoupons ? <Loader size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-header">
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label} ({countByStatus(t.key)})
          </button>
        ))}
      </div>

      <div className="ticket-grid">
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '48px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No coupons in this category.</p>
          </div>
        ) : filtered.map(uc => {
          const coupon = getCoupon(uc);
          const ucId   = getUCId(uc);
          const timer  = timeRemaining[ucId];

          const handleAction = (param) => {
            if (uc.status === 'Available') {
              handleGenerate(ucId);
            } else if (uc.status === 'CodeGenerated') {
              setModalUC(uc);
              setShowModal(true);
            }
          };

          return (
            <CouponCard
              key={ucId}
              coupon={coupon}
              userCoupon={uc}
              context="locker"
              onAction={handleAction}
              timerText={timer}
              loading={generating === ucId}
            />
          );
        })}
      </div>

      {/* Code Modal */}
      {showModal && modalUC && createPortal(
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3>Show to Store Staff</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '32px 24px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
                {getVendor(modalUC).name || getCoupon(modalUC).name || 'Dear Kolkata'}
              </span>
              <div className="coupon-ticket-code">{getCode(modalUC)}</div>
              <div style={{ backgroundColor: 'var(--gold-light)', border: '1px dashed var(--gold)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Time Remaining</span>
                <div style={{ fontSize: '28px', fontFamily: 'monospace', color: 'var(--gold)', fontWeight: '800' }}>
                  {/* Use live timer from state; fallback to direct calculation from expiresAt */}
                  {timeRemaining[getUCId(modalUC)] || (() => {
                    const exp = modalUC.code?.expiresAt;
                    if (!exp) return '--:--:--';
                    const diff = new Date(exp).getTime() - Date.now();
                    if (diff <= 0) return '00:00:00';
                    return `${pad(Math.floor(diff / 3600000))}:${pad(Math.floor((diff % 3600000) / 60000))}:${pad(Math.floor((diff % 60000) / 1000))}`;
                  })()}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Show this screen to the store staff. They will enter the code and bill amount to apply your discount.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowModal(false)}>Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MyCoupons;
