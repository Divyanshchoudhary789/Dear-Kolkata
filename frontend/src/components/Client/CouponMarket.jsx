import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { Award, Percent, Gift, Tag, Check, ArrowRight, Loader } from 'lucide-react';

const CouponMarket = ({ setActiveTab }) => {
  const { coupons, packages, buyCoupon, buyAdminPackage } = useContext(AppContext);
  const [filterTag, setFilterTag]           = useState('all');
  const [filterCat, setFilterCat]           = useState('all');
  const [loadingId, setLoadingId]           = useState(null);

  const getVendor = (c) => c.vendor || {};
  const getId     = (c) => c._id  || c.id;

  const handleClaim = async (couponId) => {
    setLoadingId(couponId);
    const res = await buyCoupon(couponId);
    setLoadingId(null);
    if (res?.success) setActiveTab('coupons');
  };

  const handleClaimPkg = async (pkgId) => {
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

  return (
    <div className="animate-fade-in">
      <div className="page-title-banner">
        <div>
          <h2>Exclusive Coupons &amp; Passes</h2>
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
                    {loadingId === pkgId ? <Loader size={14} /> : <>Buy Bundle <ArrowRight size={14} /></>}
                  </button>
                </div>
              </div>
            );
          })}
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
          <div className="grid-marketplace">
            {approvedCoupons.map(c => {
              const cid    = getId(c);
              const vendor = getVendor(c);
              const isLoading = loadingId === cid;
              return (
                <div key={cid} className="coupon-card">
                  <div className="coupon-card-header">
                    <span className="coupon-badge-top" style={{ backgroundColor: c.price === 0 ? '#D1FAE5' : 'var(--gold-light)', color: c.price === 0 ? '#065F46' : 'var(--gold)' }}>
                      {c.price === 0 ? 'FREE' : `₹${c.price}`}
                    </span>
                    <div className="coupon-discount" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {c.type === 'percentage' && <><Percent size={20} style={{ color: 'var(--crimson)' }} />{c.value}% OFF</>}
                      {c.type === 'flat'       && <><Gift   size={20} style={{ color: 'var(--crimson)' }} />₹{c.value} Back</>}
                      {c.type === 'bogo'       && <><Award  size={20} style={{ color: 'var(--crimson)' }} />B1G1</>}
                    </div>
                    <div className="coupon-vendor" style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {vendor.name || 'Store'}
                    </div>
                  </div>
                  <div className="coupon-card-body">
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>{c.name}</strong>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Timer: <strong>{c.codeTimerHours}h</strong> from code generation. Redeem at {vendor.location || 'store'}.
                      </span>
                    </div>
                    <div className="coupon-meta" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '14px', fontSize: '11px' }}>
                      <span>Expires: {c.validityEnd ? new Date(c.validityEnd).toLocaleDateString() : '—'}</span>
                      {c.redemptionCap && <span>Cap: {c.redeemedCount}/{c.redemptionCap}</span>}
                    </div>
                    <button className="btn-primary coupon-btn" onClick={() => handleClaim(cid)} disabled={isLoading}>
                      {isLoading ? <Loader size={14} /> : (c.price === 0 ? 'Claim Free' : `Purchase • ₹${c.price}`)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponMarket;
