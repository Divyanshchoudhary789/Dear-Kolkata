import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { Loader } from 'lucide-react';
import * as adminApi from '../../api/adminApi';
import { showSuccess, showError } from '../../utils/toast';

const CATS  = ['sarees','jewellery','footwear','apparel','food','luxury'];
const BANKS = ['State Bank of India','HDFC Bank','ICICI Bank','Axis Bank','Bandhan Bank','Kotak Mahindra Bank'];

const Onboarding = () => {
  const { vendors, updateVendorStatus, fetchAdminVendors } = useContext(AppContext);

  // Form state
  const [phone,    setPhone]    = useState('');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [category, setCategory] = useState('sarees');
  const [location, setLocation] = useState('');
  const [pin,      setPin]      = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [bankAcc,  setBankAcc]  = useState('');
  const [ifsc,     setIfsc]     = useState('');
  const [accHolder,setAccHolder]= useState('');
  const [pan,      setPan]      = useState('');
  const [returnPolicy, setReturnPolicy] = useState(false);
  const [skuCap,   setSkuCap]   = useState(20);
  const [commOverride, setCommOverride] = useState('');
  const [saving,   setSaving]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !name || !location || !pin || !bankAcc || !ifsc || !accHolder) {
      showError('Please fill all required fields including bank details.'); return;
    }
    if (!/^700\d{3}$/.test(pin)) { showError('Invalid Kolkata PIN (must start with 700)'); return; }

    setSaving(true);
    try {
      const res = await adminApi.onboardVendor({
        phone, name, email: email || undefined, category, location, pin,
        bankName, accountNumber: bankAcc, ifscCode: ifsc,
        accountHolderName: accHolder, panNumber: pan || undefined,
        returnPolicy,
        skuCap: +skuCap || 20,
        commissionOverride: commOverride ? +commOverride : null,
      });
      if (res?.success) {
        showSuccess(`Vendor "${name}" onboarded! Credentials sent.`);
        setPhone(''); setName(''); setEmail(''); setLocation(''); setPin('');
        setBankAcc(''); setIfsc(''); setAccHolder(''); setPan(''); setCommOverride('');
        await fetchAdminVendors();
      }
    } catch (err) { showError(err.message); }
    setSaving(false);
  };

  const handleToggleStatus = async (v) => {
    const newStatus = v.status === 'Active' ? 'Suspended' : 'Active';
    await updateVendorStatus(v._id || v.id, newStatus);
  };

  const getId = (v) => v._id || v.id;

  return (
    <div className="animate-fade-in admin-two-col" style={{ display: 'grid', gap: '28px', alignItems: 'start' }}>

      {/* ── Onboarding Form ─────────────────────────────────────────────── */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
        <h3 style={{ margin:'0 0 16px 0', fontSize:'18px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>
          Onboard New Vendor
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div className="form-group">
              <label>Phone * <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(becomes login)</span></label>
              <input type="text" maxLength={10} placeholder="98765 43210" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,''))} required/>
            </div>
            <div className="form-group">
              <label>Email <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(optional)</span></label>
              <input type="email" placeholder="vendor@store.com" value={email} onChange={e=>setEmail(e.target.value)}/>
            </div>
          </div>

          <div className="form-group">
            <label>Vendor / Store Name *</label>
            <input type="text" placeholder="e.g. Sabyasachi Heritage" value={name} onChange={e=>setName(e.target.value)} required/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div className="form-group">
              <label>Category *</label>
              <select value={category} onChange={e=>setCategory(e.target.value)}>
                {CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>SKU Cap</label>
              <input type="number" min={1} max={100} value={skuCap} onChange={e=>setSkuCap(e.target.value)}/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'12px' }}>
            <div className="form-group">
              <label>Shop Address *</label>
              <input type="text" placeholder="e.g. 12 Bowbazar Street" value={location} onChange={e=>setLocation(e.target.value)} required/>
            </div>
            <div className="form-group">
              <label>Kolkata PIN *</label>
              <input type="text" maxLength={6} placeholder="700012" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} required/>
            </div>
          </div>

          {/* Bank Details */}
          <div style={{ backgroundColor:'var(--bg-festive)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'16px', marginBottom:'12px' }}>
            <p style={{ margin:'0 0 12px 0', fontSize:'12px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase' }}>Bank Details for Payouts</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Account Holder Name *</label>
                <input type="text" value={accHolder} onChange={e=>setAccHolder(e.target.value)} required/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Bank Name</label>
                <select value={bankName} onChange={e=>setBankName(e.target.value)}>
                  {BANKS.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Account Number *</label>
                <input type="text" placeholder="12345678901234" value={bankAcc} onChange={e=>setBankAcc(e.target.value)} required/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>IFSC Code *</label>
                <input type="text" placeholder="SBIN0001234" value={ifsc} onChange={e=>setIfsc(e.target.value.toUpperCase())} required/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>PAN Number</label>
                <input type="text" maxLength={10} placeholder="ABCDE1234F" value={pan} onChange={e=>setPan(e.target.value.toUpperCase())}/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Commission Override (%)</label>
                <input type="number" min={0} max={99} placeholder="Blank = category default" value={commOverride} onChange={e=>setCommOverride(e.target.value)}/>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'16px' }}>
            <input type="checkbox" id="rp" checked={returnPolicy} onChange={e=>setReturnPolicy(e.target.checked)}/>
            <label htmlFor="rp" style={{ fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>Enable 7-day return policy</label>
          </div>

          <button type="submit" className="btn-primary" disabled={saving} style={{ display:'inline-flex', alignItems:'center', gap:'6px' }}>
            {saving ? <><Loader size={14}/> Onboarding...</> : 'Onboard Vendor Account'}
          </button>
        </form>
      </div>

      {/* ── Vendor Directory ─────────────────────────────────────────────── */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
        <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>
          Vendor Directory ({vendors.length})
        </h3>

        {vendors.length === 0 ? (
          <div style={{ padding:'32px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>
            No vendors onboarded yet. Use the form to add the first one.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px', maxHeight:'520px', overflowY:'auto' }}>
            {vendors.map(v => (
              <div key={getId(v)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', backgroundColor:'var(--bg-festive)' }}>
                <div>
                  <strong style={{ fontSize:'14px', display:'block' }}>{v.name}</strong>
                  <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>
                    {v.category?.toUpperCase()} • PIN: {v.pin} • SKU: {v.skuCap}
                  </span>
                  <span style={{ fontSize:'11px', color:'var(--text-muted)', display:'block', marginTop:'2px' }}>
                    Commission: {v.commissionOverride ? `${v.commissionOverride}% (override)` : 'Category default'} •{' '}
                    {v.returnPolicy ? 'T+7 payout' : 'Immediate payout'}
                  </span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px' }}>
                  <span style={{ fontSize:'11px', fontWeight:'700', color: v.status==='Active'?'#059669':'#EF4444' }}>{v.status}</span>
                  <button onClick={() => handleToggleStatus(v)}
                    style={{ padding:'4px 10px', fontSize:'11px', fontWeight:'600', border:'1px solid var(--border)', borderRadius:'4px', cursor:'pointer',
                      backgroundColor: v.status==='Active'?'#FEF2F2':'#ECFDF5',
                      color: v.status==='Active'?'#EF4444':'#059669' }}>
                    {v.status === 'Active' ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
