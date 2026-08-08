import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { Ticket, CheckCircle, ShieldAlert, Loader } from 'lucide-react';

const RedemptionTerminal = () => {
  const { redeemCouponInStore, vendorProfile } = useContext(AppContext);
  const [code,       setCode]       = useState('');
  const [bill,       setBill]       = useState('');
  const [error,      setError]      = useState('');
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);

  const handleRedeem = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    if (!code.trim() || !bill) { setError('Both code and bill amount are required.'); return; }
    if (+bill <= 0)             { setError('Bill amount must be a positive number.'); return; }

    setLoading(true);
    const res = await redeemCouponInStore(code.trim().toUpperCase(), +bill);
    setLoading(false);

    if (res?.success) {
      setResult(res); setCode(''); setBill('');
    } else {
      setError(res?.error || 'Redemption failed. Please check the code and try again.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth:'600px', margin:'0 auto' }}>
      <div style={{ textAlign:'center', marginBottom:'32px' }}>
        <h2 style={{ margin:'0 0 8px 0', fontFamily:'var(--font-serif)', fontSize:'26px' }}>In-Store Coupon Terminal</h2>
        <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>Verify and apply client coupon codes at checkout.</span>
      </div>

      <div className="terminal-container">
        <div style={{ display:'flex', alignItems:'center', gap:'8px', borderBottom:'1px solid var(--border)', paddingBottom:'12px', marginBottom:'24px' }}>
          <Ticket size={20} style={{ color:'var(--crimson)' }}/>
          <strong>Register: {vendorProfile?.name || 'Your Store'}</strong>
        </div>

        <form onSubmit={handleRedeem}>
          <div className="form-group">
            <label htmlFor="rcode">Client Redemption Code</label>
            <input id="rcode" type="text" placeholder="e.g. DK-SENJ-4821" value={code}
              onChange={e => { setCode(e.target.value); setError(''); }} required/>
          </div>
          <div className="form-group">
            <label htmlFor="rbill">Total Bill Amount (₹)</label>
            <input id="rbill" type="number" min={1} placeholder="Enter total purchase amount" value={bill}
              onChange={e => { setBill(e.target.value); setError(''); }} required/>
          </div>

          {error && (
            <div style={{ backgroundColor:'#FEF2F2', border:'1px solid #FEE2E2', padding:'12px', borderRadius:'var(--radius-sm)', color:'#991B1B', fontSize:'13px', display:'flex', gap:'8px', alignItems:'flex-start', marginBottom:'20px' }}>
              <ShieldAlert size={16} style={{ flexShrink:0, marginTop:'2px' }}/>
              <div><strong>Error:</strong> {error}</div>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ padding:'14px' }} disabled={loading}>
            {loading ? <><Loader size={16}/> Verifying...</> : 'Validate & Redeem'}
          </button>
        </form>

        {result && (
          <div className="terminal-success-card animate-fade-in">
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'6px', fontSize:'15px', fontWeight:'700', marginBottom:'8px' }}>
              <CheckCircle size={18}/> Redemption Finalised!
            </div>
            <div style={{ fontSize:'13px', opacity:0.9 }}>Applied: <strong>{result.couponName}</strong></div>
            <div className="terminal-success-amount">₹{result.finalBill}</div>
            <div style={{ fontSize:'11px', color:'#065F46', marginBottom:'16px' }}>Final Discounted Bill</div>
            {result.isBogo && <div style={{ fontSize:'12px', color:'#065F46', fontWeight:'700', marginBottom:'12px' }}>BOGO applied — confirm the free item at your billing counter.</div>}
            <div style={{ borderTop:'1px dashed #A7F3D0', paddingTop:'12px', fontSize:'12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', textAlign:'left' }}>
              <div>Gross bill:</div>         <div style={{ textAlign:'right' }}>₹{result.originalBill}</div>
              <div>Discount applied:</div>   <div style={{ textAlign:'right', color:'var(--crimson)', fontWeight:'700' }}>-₹{result.discountAmount}</div>
              <div style={{ color:'#047857', fontWeight:'700' }}>Cashback to client:</div>
              <div style={{ textAlign:'right', color:'#047857', fontWeight:'700' }}>+₹{result.cashbackCredited}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedemptionTerminal;
