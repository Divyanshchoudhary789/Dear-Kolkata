import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { Store, Shield, Loader } from 'lucide-react';
import * as vendorApi from '../../api/vendorApi';
import { showSuccess, showError } from '../../utils/toast';

const StoreProfile = () => {
  const { vendorProfile } = useContext(AppContext);
  const v = vendorProfile || {};

  const [description, setDescription] = useState(v.storeDetails?.description || '');
  const [opHours,     setOpHours]     = useState(v.storeDetails?.operatingHours || '');
  const [returnPolicy,setReturnPolicy]= useState(v.returnPolicy ?? false);
  const [saving,      setSaving]      = useState(false);
  const [kycFile,     setKycFile]     = useState(null);
  const [docType,     setDocType]     = useState('Other');
  const [kycSaving,   setKycSaving]   = useState(false);
  const [staff,       setStaff]       = useState(v.staffAccounts || []);
  const [staffName,   setStaffName]   = useState('');
  const [staffPhone,  setStaffPhone]  = useState('');
  const [staffPass,   setStaffPass]   = useState('');
  const [staffSaving, setStaffSaving] = useState(false);

  if (!v._id && !v.id) {
    return <div style={{ padding:'48px', textAlign:'center', color:'var(--text-muted)' }}>Loading vendor profile...</div>;
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await vendorApi.updateVendorProfile({
        returnPolicy,
        storeDetails: { description, operatingHours: opHours },
      });
      if (res?.success) showSuccess('Store profile updated.');
      else showError('Update failed. Please retry.');
    } catch (err) { showError(err.message); }
    setSaving(false);
  };

  const handleKycUpload = async (e) => {
    e.preventDefault();
    if (!kycFile) { showError('Please select a KYC document.'); return; }
    setKycSaving(true);
    try {
      const formData = new FormData();
      formData.append('document', kycFile);
      formData.append('docType', docType);
      const res = await vendorApi.uploadVendorKyc(formData);
      if (res?.success) {
        showSuccess('KYC document uploaded for admin verification.');
        setKycFile(null);
      }
    } catch (err) { showError(err.message); }
    setKycSaving(false);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!staffName || !/^[6-9]\d{9}$/.test(staffPhone) || staffPass.length < 8) {
      showError('Enter staff name, valid phone and password with 8+ characters.');
      return;
    }
    setStaffSaving(true);
    try {
      const res = await vendorApi.addVendorStaff({ name: staffName, phone: staffPhone, password: staffPass });
      if (res?.success) {
        setStaff(prev => [...prev, { ...res.data.staff, isActive: true }]);
        setStaffName(''); setStaffPhone(''); setStaffPass('');
        showSuccess('Staff account created.');
      }
    } catch (err) { showError(err.message); }
    setStaffSaving(false);
  };

  const handleRemoveStaff = async (staffId) => {
    if (!window.confirm('Deactivate this staff account?')) return;
    try {
      const res = await vendorApi.removeVendorStaff(staffId);
      if (res?.success) {
        setStaff(prev => prev.map(s => (s._id || s.id) === staffId ? { ...s, isActive: false } : s));
        showSuccess('Staff account deactivated.');
      }
    } catch (err) { showError(err.message); }
  };

  return (
    <div className="animate-fade-in vendor-profile-grid" style={{ display: 'grid', gap: '28px', alignItems: 'start' }}>

      {/* Edit Form */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
        <h3 style={{ margin:'0 0 20px 0', fontSize:'18px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
          <Store size={18} style={{ color:'var(--crimson)' }}/> Manage Store Profile
        </h3>

        <form onSubmit={handleSave}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div className="form-group">
              <label>Store Name</label>
              <input type="text" value={v.name || ''} disabled style={{ backgroundColor:'var(--border)', cursor:'not-allowed' }}/>
            </div>
            <div className="form-group">
              <label>Category</label>
              <input type="text" value={(v.category || '').toUpperCase()} disabled style={{ backgroundColor:'var(--border)', cursor:'not-allowed' }}/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'12px' }}>
            <div className="form-group">
              <label>Physical Location</label>
              <input type="text" value={v.location || ''} disabled style={{ backgroundColor:'var(--border)', cursor:'not-allowed' }}/>
            </div>
            <div className="form-group">
              <label>PIN Code</label>
              <input type="text" value={v.pin || ''} disabled style={{ backgroundColor:'var(--border)', cursor:'not-allowed' }}/>
            </div>
          </div>

          <div className="form-group">
            <label>Store Description</label>
            <textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe your store for customers..."/>
          </div>

          <div className="form-group">
            <label>Operating Hours</label>
            <input type="text" value={opHours} onChange={e=>setOpHours(e.target.value)} placeholder="e.g. Mon-Sat 10AM-8PM"/>
          </div>

          <div style={{ display:'flex', gap:'10px', alignItems:'center', borderTop:'1px solid var(--border)', paddingTop:'16px', marginTop:'8px' }}>
            <input type="checkbox" id="rp-toggle" checked={returnPolicy} onChange={e=>setReturnPolicy(e.target.checked)}/>
            <label htmlFor="rp-toggle" style={{ fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
              Enable 7-day return policy (affects payout timing — T+7 hold)
            </label>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop:'16px', display:'inline-flex', alignItems:'center', gap:'6px', width:'auto' }} disabled={saving}>
            {saving ? <><Loader size={14}/> Saving...</> : 'Save Store Details'}
          </button>
        </form>
      </div>

      {/* Status Card */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
        <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>Vendor Status</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {[
            { label:'Listing Status',     value: v.status || 'Active', color: v.status === 'Active' ? '#059669' : '#EF4444' },
            { label:'Commission Rate',    value: v.commissionOverride ? `${v.commissionOverride}% (Override)` : 'Category Default' },
            { label:'SKU Cap',            value: `${v.skuCap || 20} products max` },
            { label:'Return Policy',      value: returnPolicy ? '7-Day Return ON' : 'Final Sale (OFF)' },
          ].map((row,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>{row.label}</span>
              <span style={{ fontSize:'12px', fontWeight:'700', color: row.color }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display:'flex', gap:'8px', alignItems:'flex-start', borderTop:'1px solid var(--border)', paddingTop:'16px', marginTop:'8px', fontSize:'12px', color:'var(--text-muted)', lineHeight:'1.4' }}>
            <Shield size={16} style={{ color:'var(--gold)', flexShrink:0, marginTop:'2px' }}/>
            <span>Verification and SKU overrides are managed by the Dear Kolkata sales team. Contact support for changes.</span>
          </div>
        </div>
      </div>

      <div style={{ gridColumn:'1/-1' }} className="store-bottom-grid" style2={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'32px' }}>
        <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
          <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>KYC Documents</h3>
          <form onSubmit={handleKycUpload}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:'12px' }}>
              <div className="form-group">
                <label>Document Type</label>
                <select value={docType} onChange={e=>setDocType(e.target.value)}>
                  <option value="GST">GST</option>
                  <option value="PAN">PAN</option>
                  <option value="Trade License">Trade License</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Upload File</label>
                <input type="file" accept="image/*,.pdf" onChange={e=>setKycFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width:'auto', display:'inline-flex', alignItems:'center', gap:'6px' }} disabled={kycSaving}>
              {kycSaving ? <><Loader size={14}/> Uploading...</> : 'Upload KYC'}
            </button>
          </form>
        </div>

        <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
          <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>Staff Redemption Access</h3>
          <form onSubmit={handleAddStaff} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
            <div className="form-group" style={{ marginBottom:0 }}><label>Name</label><input type="text" value={staffName} onChange={e=>setStaffName(e.target.value)} /></div>
            <div className="form-group" style={{ marginBottom:0 }}><label>Phone</label><input type="text" maxLength={10} value={staffPhone} onChange={e=>setStaffPhone(e.target.value.replace(/\D/g,''))} /></div>
            <div className="form-group" style={{ marginBottom:0 }}><label>Password</label><input type="password" value={staffPass} onChange={e=>setStaffPass(e.target.value)} /></div>
            <button type="submit" className="btn-primary" style={{ alignSelf:'end', display:'inline-flex', alignItems:'center', gap:'6px' }} disabled={staffSaving}>
              {staffSaving ? <><Loader size={14}/> Saving...</> : 'Add Staff'}
            </button>
          </form>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {staff.length === 0 ? (
              <div style={{ color:'var(--text-muted)', fontSize:'13px', textAlign:'center', padding:'12px' }}>No staff accounts added.</div>
            ) : staff.map(s => {
              const sid = s._id || s.id || s.phone;
              return (
                <div key={sid} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', backgroundColor:'var(--bg-festive)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
                  <div><strong style={{ fontSize:'13px' }}>{s.name}</strong><div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{s.phone} | {s.accessLevel || 'redemption-only'} | {s.isActive === false ? 'Inactive' : 'Active'}</div></div>
                  {s.isActive !== false && <button type="button" onClick={()=>handleRemoveStaff(sid)} style={{ border:'1px solid #EF4444', color:'#EF4444', background:'#fff', borderRadius:'4px', padding:'5px 10px', cursor:'pointer', fontSize:'11px', fontWeight:700 }}>Deactivate</button>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreProfile;
