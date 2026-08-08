import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { Gift, Loader } from 'lucide-react';

const GIFTING_TAGS = ['For Your Wife','For Your Girlfriend','For Your Loved One','For Your Colleagues'];

const PackageBuilder = () => {
  const { coupons, packages, createAdminPackage } = useContext(AppContext);

  const [name,        setName]        = useState('');
  const [price,       setPrice]       = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [tags,        setTags]        = useState(['For Your Loved One']);
  const [validityEnd, setValidityEnd] = useState('');
  const [saving,      setSaving]      = useState(false);

  const approvedCoupons = coupons.filter(c => c.status === 'Approved');

  const toggleId  = (id)  => setSelectedIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const toggleTag = (tag) => setTags(p => p.includes(tag) ? p.filter(t=>t!==tag) : [...p,tag]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !price || !description || selectedIds.length === 0) {
      alert('Fill all fields and select at least one coupon.'); return;
    }
    setSaving(true);
    const res = await createAdminPackage({
      name, price: +price, description,
      couponIds: selectedIds, tags,
      validityEnd: validityEnd || undefined,
    });
    setSaving(false);
    if (res?.success) {
      setName(''); setPrice(''); setDescription(''); setSelectedIds([]); setValidityEnd('');
    }
  };

  const getCId   = (c) => c._id || c.id;
  const getVName = (c) => typeof c.vendor === 'object' ? (c.vendor?.name || '—') : '—';

  return (
    <div className="animate-fade-in admin-two-col" style={{ display: 'grid', gap: '28px', alignItems: 'start' }}>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
        <h3 style={{ margin:'0 0 16px 0', fontSize:'18px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
          <Gift size={18} style={{ color:'var(--crimson)' }}/> Create Gifting Package
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Package Title *</label>
            <input type="text" placeholder="e.g. Durga Pujo VIP Gifting Combo" value={name} onChange={e=>setName(e.target.value)} required/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div className="form-group">
              <label>Price (₹) *</label>
              <input type="number" min={1} placeholder="e.g. 299" value={price} onChange={e=>setPrice(e.target.value)} required/>
            </div>
            <div className="form-group">
              <label>Valid Until</label>
              <input type="date" value={validityEnd} onChange={e=>setValidityEnd(e.target.value)} min={new Date().toISOString().split('T')[0]}/>
            </div>
          </div>
          <div className="form-group">
            <label>Description *</label>
            <textarea rows={3} placeholder="Describe what's included..." value={description} onChange={e=>setDescription(e.target.value)} required/>
          </div>
          <div className="form-group">
            <label>Gifting Tags</label>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'6px' }}>
              {GIFTING_TAGS.map(t => (
                <button key={t} type="button" onClick={()=>toggleTag(t)}
                  style={{ padding:'6px 12px', borderRadius:'50px', fontSize:'11px', border:'1px solid var(--border)', cursor:'pointer',
                    backgroundColor: tags.includes(t)?'var(--crimson)':'#fff', color: tags.includes(t)?'#fff':'var(--text-muted)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop:'8px', display:'inline-flex', alignItems:'center', gap:'6px' }} disabled={saving}>
            {saving ? <><Loader size={14}/> Publishing...</> : 'Publish Package'}
          </button>
        </form>
      </div>

      {/* ── Coupon selector ───────────────────────────────────────────────── */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
        <h3 style={{ margin:'0 0 4px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>
          Select Coupons to Bundle * ({selectedIds.length} selected)
        </h3>
        {approvedCoupons.length === 0 ? (
          <div style={{ padding:'24px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>No approved coupons available to bundle.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', maxHeight:'400px', overflowY:'auto' }}>
            {approvedCoupons.map(c => {
              const cid     = getCId(c);
              const checked = selectedIds.includes(cid);
              return (
                <label key={cid} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer',
                  backgroundColor: checked?'var(--crimson-light)':'#fff', borderColor: checked?'var(--crimson)':'var(--border)' }}>
                  <input type="checkbox" checked={checked} onChange={()=>toggleId(cid)}/>
                  <div style={{ flex:1 }}>
                    <strong style={{ fontSize:'13px', display:'block' }}>{c.name}</strong>
                    <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>
                      {getVName(c)} • {c.type === 'percentage' ? `${c.value}%` : c.type === 'flat' ? `₹${c.value}` : 'BOGO'}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Live packages list ─────────────────────────────────────────────── */}
      {packages.length > 0 && (
        <div style={{ gridColumn:'1/-1', backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
          <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>
            Live Packages ({packages.length})
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'16px' }}>
            {packages.map(pkg => {
              const pkgId = pkg._id || pkg.id;
              return (
                <div key={pkgId} style={{ padding:'16px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', backgroundColor:'var(--bg-festive)' }}>
                  <strong style={{ display:'block', fontSize:'14px', marginBottom:'4px' }}>{pkg.name}</strong>
                  <span style={{ fontSize:'13px', color:'var(--crimson)', fontWeight:'700' }}>₹{pkg.price}</span>
                  <span style={{ fontSize:'11px', color:'var(--text-muted)', marginLeft:'8px' }}>{(pkg.couponIds||[]).length} coupons</span>
                  <div style={{ marginTop:'6px', fontSize:'11px', fontWeight:'700', color: (pkg.status==='Active'||pkg.status==='Approved') ? '#059669' : '#D97706' }}>{pkg.status}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageBuilder;
