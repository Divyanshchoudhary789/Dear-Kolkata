import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { Plus, Loader } from 'lucide-react';

const CouponBuilder = () => {
  const { createVendorCoupon, coupons, vendorProfile } = useContext(AppContext);

  const vendorId = vendorProfile?._id || vendorProfile?.id;
  const vendorCoupons = coupons.filter(c => {
    const vid = typeof c.vendor === 'object' ? (c.vendor?._id || c.vendor?.id) : c.vendor;
    return vid === vendorId;
  });

  const [name,          setName]          = useState('');
  const [type,          setType]          = useState('percentage');
  const [value,         setValue]         = useState('');
  const [validityEnd,   setValidityEnd]   = useState('');
  const [codeTimer,     setCodeTimer]     = useState(2);
  const [price,         setPrice]         = useState(0);
  const [cap,           setCap]           = useState(100);
  const [error,         setError]         = useState('');
  const [saving,        setSaving]        = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !value || !validityEnd) { setError('Name, value and validity date are required.'); return; }
    setError(''); setSaving(true);
    const payload = {
      name,
      type,
      value: type !== 'bogo' ? +value : value,
      validityEnd,
      codeTimerHours: +codeTimer,
      price:          +price,
      redemptionCap:  +cap,
    };
    const res = await createVendorCoupon(payload);
    setSaving(false);
    if (res?.success) {
      setName(''); setValue(''); setPrice(0); setCap(100); setValidityEnd('');
    } else if (res?.error) {
      setError(res.error);
    }
  };

  return (
    <div className="animate-fade-in admin-two-col" style={{ display: 'grid', gap: '24px', alignItems: 'start' }}>

      {/* Form */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
        <h3 style={{ margin:'0 0 16px 0', fontSize:'18px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
          <Plus size={18} style={{ color:'var(--crimson)' }}/> Create Coupon Offer
        </h3>

        <form onSubmit={handleSubmit}>
          {error && <div style={{ color:'#EF4444', backgroundColor:'#FEE2E2', padding:'12px', borderRadius:'4px', marginBottom:'16px', fontSize:'13px' }}>{error}</div>}

          <div className="form-group">
            <label>Coupon Name *</label>
            <input type="text" placeholder="e.g. 20% OFF Pujo Sarees" value={name} onChange={e=>setName(e.target.value)} required/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div className="form-group">
              <label>Discount Type *</label>
              <select value={type} onChange={e=>{ setType(e.target.value); setValue(''); }}>
                <option value="percentage">Percentage OFF</option>
                <option value="flat">Flat Cashback (₹)</option>
                <option value="bogo">Buy 1 Get 1 (BOGO)</option>
              </select>
            </div>
            <div className="form-group">
              <label>{type==='percentage'?'Rate (%)':type==='flat'?'Amount (₹)':'Reward Item'} *</label>
              <input type={type==='bogo'?'text':'number'} placeholder={type==='bogo'?'e.g. Free Doi':'e.g. 20'} value={value} onChange={e=>setValue(e.target.value)} required/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div className="form-group">
              <label>Code Timer *</label>
              <select value={codeTimer} onChange={e=>setCodeTimer(e.target.value)}>
                <option value={1}>1 Hour</option><option value={2}>2 Hours</option>
                <option value={7}>7 Hours</option><option value={24}>24 Hours</option>
              </select>
            </div>
            <div className="form-group">
              <label>Valid Until *</label>
              <input type="date" value={validityEnd} onChange={e=>setValidityEnd(e.target.value)} required min={new Date().toISOString().split('T')[0]}/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div className="form-group">
              <label>Listing Price (₹) <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(0 = free)</span></label>
              <input type="number" min={0} value={price} onChange={e=>setPrice(e.target.value)}/>
            </div>
            <div className="form-group">
              <label>Redemption Cap</label>
              <input type="number" min={1} value={cap} onChange={e=>setCap(e.target.value)}/>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop:'12px', display:'inline-flex', alignItems:'center', gap:'6px' }} disabled={saving}>
            {saving ? <><Loader size={14}/> Submitting...</> : 'Submit for Approval'}
          </button>
        </form>
      </div>

      {/* Active Coupons List */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
        <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>
          Your Coupons ({vendorCoupons.length})
        </h3>
        {vendorCoupons.length === 0 ? (
          <div style={{ padding:'24px', textAlign:'center', color:'var(--text-muted)' }}>No coupons created yet.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {vendorCoupons.map(c => {
              const cid = c._id || c.id;
              return (
                <div key={cid} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', backgroundColor:'var(--bg-festive)' }}>
                  <div>
                    <strong style={{ fontSize:'13px', display:'block' }}>{c.name}</strong>
                    <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>
                      {c.type} • {c.price===0?'FREE':`₹${c.price}`} • {c.codeTimerHours}h timer
                    </span>
                    <span style={{ display:'block', fontSize:'11px', fontWeight:'700', marginTop:'2px',
                      color: c.status==='Approved'?'#059669': c.status==='Pending'?'#D97706':'#EF4444' }}>
                      {c.status}
                    </span>
                  </div>
                  <div style={{ textAlign:'right', fontSize:'12px' }}>
                    <div style={{ fontWeight:'700', color:'var(--crimson)' }}>{c.redeemedCount}/{c.redemptionCap}</div>
                    <span style={{ fontSize:'10px', color:'var(--text-muted)' }}>
                      {c.validityEnd ? new Date(c.validityEnd).toLocaleDateString() : ''}
                    </span>
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

export default CouponBuilder;
