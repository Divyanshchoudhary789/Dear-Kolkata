import React, { useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../context/AppContext';
import { CheckCircle, Key, RefreshCw, Loader } from 'lucide-react';
import { showError } from '../../utils/toast';

const pad = (n) => String(n).padStart(2, '0');

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
        const expiresAt = uc.code?.expiresAt || uc.expiresAt;
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
  const getExpiry  = (uc) => uc.code?.expiresAt || uc.expiresAt;

  const handleGenerate = async (ucId) => {
    setGenerating(ucId);
    const result = await generateCouponCode(ucId);
    setGenerating(null);
    if (result) {
      // fetchMyCoupons is called inside generateCouponCode in AppContext
      // Open modal — use result data directly since userCoupons may not be updated yet
      setModalUC({ ...userCoupons.find(u => getUCId(u) === ucId), code: { value: result.code, expiresAt: result.expiresAt } });
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
          <h2>My Coupons Locker</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Claimed store promotions and coupon vouchers</p>
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

      <div className="grid-marketplace">
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '48px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No coupons in this category.</p>
          </div>
        ) : filtered.map(uc => {
          const coupon = getCoupon(uc);
          const vendor = getVendor(uc);
          const ucId   = getUCId(uc);
          const code   = getCode(uc);
          const timer  = timeRemaining[ucId];

          return (
            <div key={ucId} className="coupon-card">
              <div className="coupon-card-header" style={{ borderBottom: '1px dashed var(--border)' }}>
                <div className="coupon-discount">
                  {coupon.type === 'percentage' && `${coupon.value}% OFF`}
                  {coupon.type === 'flat'       && `₹${coupon.value} Back`}
                  {coupon.type === 'bogo'       && 'B1G1'}
                </div>
                <div className="coupon-vendor">{coupon.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {vendor.name || 'Store'}
                </div>
              </div>

              <div className="coupon-card-body">
                {/* AVAILABLE */}
                {uc.status === 'Available' && (
                  <div style={{ flex: 1 }}>
                    <p className="coupon-desc" style={{ fontSize: '12px' }}>
                      Generate your code only when you're at the store — it starts a <strong>{coupon.codeTimerHours || 2}h countdown</strong>.
                    </p>
                    <div className="coupon-meta" style={{ fontSize: '11px', marginTop: '10px' }}>
                      <span>Valid till: {coupon.validityEnd ? new Date(coupon.validityEnd).toLocaleDateString() : '—'}</span>
                      <span>Timer: {coupon.codeTimerHours || 2}h</span>
                    </div>
                    <button className="btn-primary coupon-btn" onClick={() => handleGenerate(ucId)} disabled={generating === ucId}>
                      {generating === ucId ? <Loader size={14} /> : <Key size={14} style={{ marginRight: '6px' }} />}
                      {generating === ucId ? 'Generating...' : 'Generate Code'}
                    </button>
                  </div>
                )}

                {/* CODE GENERATED */}
                {uc.status === 'CodeGenerated' && (
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div className="countdown-box" style={{ margin: '0 0 16px 0', padding: '12px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Redemption Countdown</span>
                      <div className="countdown-timer-digits" style={{ fontSize: '24px', margin: '4px 0' }}>
                        {timer || '--:--:--'}
                      </div>
                    </div>
                    <button className="btn-gold coupon-btn" style={{ margin: 0 }} onClick={() => { setModalUC(uc); setShowModal(true); }}>
                      Show Code to Vendor
                    </button>
                  </div>
                )}

                {/* REDEEMED */}
                {uc.status === 'Redeemed' && (
                  <div style={{ flex: 1 }}>
                    <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #DCFCE7', padding: '12px', borderRadius: 'var(--radius-sm)', color: '#065F46', fontSize: '12px', marginBottom: '12px' }}>
                      <CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      <strong>Redeemed Successfully</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                      <div><strong>Date:</strong> {uc.redemption?.redeemedAt ? new Date(uc.redemption.redeemedAt).toLocaleDateString() : '—'}</div>
                      <div><strong>Bill:</strong> ₹{uc.redemption?.billAmount || 0}</div>
                      <div><strong>Cashback:</strong> <span style={{ color: '#10B981', fontWeight: '700' }}>+₹{uc.redemption?.cashbackCredited || 0}</span></div>
                    </div>
                  </div>
                )}

                {/* EXPIRED */}
                {uc.status === 'Expired' && (
                  <div style={{ flex: 1 }}>
                    <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', padding: '12px', borderRadius: 'var(--radius-sm)', color: '#991B1B', fontSize: '12px' }}>
                      <strong>Code Expired</strong>
                    </div>
                    <p className="coupon-desc" style={{ fontSize: '12px', marginTop: '10px' }}>The redemption code expired before it was validated at the store.</p>
                  </div>
                )}
              </div>
            </div>
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
                {getVendor(modalUC).name || 'Store'}
              </span>
              <div className="coupon-ticket-code">{getCode(modalUC)}</div>
              <div style={{ backgroundColor: 'var(--gold-light)', border: '1px dashed var(--gold)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Time Remaining</span>
                <div style={{ fontSize: '28px', fontFamily: 'monospace', color: 'var(--gold)', fontWeight: '800' }}>
                  {timeRemaining[getUCId(modalUC)] || '--:--:--'}
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
