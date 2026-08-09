import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { Gift, Loader, Search, Plus, Trash2 } from 'lucide-react';

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

  // Search & Exclusive Offers States
  const [searchTerm,          setSearchTerm]          = useState('');
  const [exclusiveOffers,     setExclusiveOffers]     = useState([]);
  const [newOfferName,        setNewOfferName]        = useState('');
  const [newOfferType,        setNewOfferType]        = useState('percentage');
  const [newOfferValue,       setNewOfferValue]       = useState('');
  const [newOfferDescription, setNewOfferDescription] = useState('');

  const approvedCoupons = coupons.filter(c => c.status === 'Approved');

  const toggleId  = (id)  => setSelectedIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const toggleTag = (tag) => setTags(p => p.includes(tag) ? p.filter(t=>t!==tag) : [...p,tag]);

  const getCId   = (c) => c._id || c.id;
  const getVName = (c) => typeof c.vendor === 'object' ? (c.vendor?.name || '—') : '—';

  // Search filter
  const filteredCoupons = approvedCoupons.filter(c => {
    const term = searchTerm.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(term);
    const vendorMatch = getVName(c).toLowerCase().includes(term);
    const valueStr = c.type === 'percentage' ? `${c.value}%` : c.type === 'flat' ? `₹${c.value}` : 'bogo';
    const valueMatch = valueStr.toLowerCase().includes(term);
    return nameMatch || vendorMatch || valueMatch;
  });

  // Exclusive Offers Management
  const addExclusiveOffer = () => {
    if (!newOfferName || !newOfferValue) {
      alert('Please fill out the offer name and value.');
      return;
    }
    const val = newOfferType === 'bogo' ? newOfferValue : Number(newOfferValue);
    if (newOfferType !== 'bogo' && isNaN(val)) {
      alert('Please enter a valid number for the discount value.');
      return;
    }

    setExclusiveOffers(prev => [
      ...prev,
      {
        name: newOfferName,
        type: newOfferType,
        value: val,
        description: newOfferDescription
      }
    ]);

    setNewOfferName('');
    setNewOfferValue('');
    setNewOfferDescription('');
  };

  const removeExclusiveOffer = (index) => {
    setExclusiveOffers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !price || !description) {
      alert('Please fill in name, price, and description.');
      return;
    }
    if (selectedIds.length === 0 && exclusiveOffers.length === 0) {
      alert('Please select at least one coupon or add an exclusive offer.');
      return;
    }
    setSaving(true);
    const res = await createAdminPackage({
      name,
      price: +price,
      description,
      couponIds: selectedIds,
      exclusiveOffers,
      tags,
      validityEnd: validityEnd || undefined,
    });
    setSaving(false);
    if (res?.success) {
      setName('');
      setPrice('');
      setDescription('');
      setSelectedIds([]);
      setExclusiveOffers([]);
      setValidityEnd('');
    }
  };

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

          {/* ── Exclusive Offers Section ────────────────────────────────────────── */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <label style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
              Exclusive Package Offers (Not in general coupon pool)
            </label>
            
            {exclusiveOffers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {exclusiveOffers.map((offer, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--crimson-light)', border: '1px solid var(--crimson)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--text)' }}>{offer.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--crimson)', fontWeight: '600' }}>
                        {offer.type === 'percentage' ? `${offer.value}% OFF` : offer.type === 'flat' ? `₹${offer.value} OFF` : `BOGO: ${offer.value}`}
                      </span>
                      {offer.description && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{offer.description}</span>}
                    </div>
                    <button type="button" onClick={() => removeExclusiveOffer(idx)} style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ backgroundColor: '#fafafa', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px' }}>
                <input type="text" placeholder="Offer name (e.g. Free Dessert)" value={newOfferName} onChange={e => setNewOfferName(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', width: '100%' }}/>
                <select value={newOfferType} onChange={e => { setNewOfferType(e.target.value); setNewOfferValue(''); }} style={{ padding: '8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', width: '100%', backgroundColor: '#fff' }}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Discount (₹)</option>
                  <option value="bogo">BOGO details</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                <input type={newOfferType === 'bogo' ? 'text' : 'number'} placeholder={newOfferType === 'bogo' ? 'e.g. Buy 1 Get 1' : 'Value (e.g. 15)'} value={newOfferValue} onChange={e => setNewOfferValue(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', width: '100%' }}/>
                <input type="text" placeholder="Description/Conditions" value={newOfferDescription} onChange={e => setNewOfferDescription(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', width: '100%' }}/>
              </div>
              <button type="button" onClick={addExclusiveOffer} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', alignSelf: 'flex-start', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: '#fff' }}>
                <Plus size={12} /> Add Exclusive Offer
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop:'20px', display:'inline-flex', alignItems:'center', gap:'6px', width: '100%', justifyContent: 'center' }} disabled={saving}>
            {saving ? <><Loader size={14}/> Publishing...</> : 'Publish Package'}
          </button>
        </form>
      </div>

      {/* ── Coupon selector ───────────────────────────────────────────────── */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
        <h3 style={{ margin:'0 0 12px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>
          Select Coupons to Bundle * ({selectedIds.length} selected)
        </h3>

        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search coupons by title or vendor name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 32px',
              fontSize: '13px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              backgroundColor: '#fafafa'
            }}
          />
        </div>

        {filteredCoupons.length === 0 ? (
          <div style={{ padding:'24px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>
            {approvedCoupons.length === 0 ? 'No approved coupons available to bundle.' : 'No coupons match your search.'}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', maxHeight:'480px', overflowY:'auto' }}>
            {filteredCoupons.map(c => {
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
