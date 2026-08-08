import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { User, Mail, Phone, MapPin, Plus, Trash2, Loader } from 'lucide-react';
import { showError } from '../../utils/toast';

const Profile = () => {
  const { clientProfile, updateClientProfile, uploadClientAvatar, addClientAddress, deleteClientAddress } = useContext(AppContext);
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [name, setName] = useState(clientProfile?.name || '');
  const [email, setEmail] = useState(clientProfile?.email || '');

  const [label, setLabel] = useState('Home');
  const [text, setText] = useState('');
  const [pin, setPin] = useState('');

  const addresses = clientProfile?.addresses || [];

  useEffect(() => {
    setName(clientProfile?.name || '');
    setEmail(clientProfile?.email || '');
  }, [clientProfile]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!/^700\d{3}$/.test(pin)) {
      showError('Invalid Kolkata PIN (must start with 700)');
      return;
    }

    setSaving(true);
    const res = await addClientAddress({ label, text, pin, isDefault: addresses.length === 0 });
    if (res?.success) {
      setShowAddAddr(false);
      setLabel('Home');
      setText('');
      setPin('');
    }
    setSaving(false);
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Remove this address?')) return;
    await deleteClientAddress(addrId);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }
    setProfileSaving(true);
    await updateClientProfile({ name, email: email || undefined });
    setProfileSaving(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file.');
      return;
    }
    setAvatarSaving(true);
    await uploadClientAvatar(file);
    setAvatarSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-title-banner">
        <div>
          <h2>Your Profile</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Account details and shipping addresses</p>
        </div>
      </div>

      <div className="profile-grid" style={{ display: 'grid', gap: '28px', alignItems: 'start' }}>
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
          <div className="trust-icon-container" style={{ margin: '0 auto 16px auto', width: '80px', height: '80px', backgroundColor: 'var(--crimson-light)', color: 'var(--crimson)' }}>
            {clientProfile?.profileImage?.url
              ? <img src={clientProfile.profileImage.url} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%' }} />
              : <User size={36} />}
          </div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700' }}>{clientProfile?.name || '-'}</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-festive)', padding: '4px 10px', borderRadius: '4px', fontWeight: '600' }}>Shopper Account</span>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '24px', paddingTop: '16px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={14} style={{ color: 'var(--crimson)' }} />
              <span>+91 {clientProfile?.phone || '-'}</span>
            </div>
            {clientProfile?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} style={{ color: 'var(--crimson)' }} />
                <span>{clientProfile.email}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleProfileSubmit} style={{ borderTop: '1px solid var(--border)', marginTop: '18px', paddingTop: '16px', textAlign: 'left' }}>
            <div className="form-group">
              <label>Profile Image</label>
              <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={avatarSaving} />
              {avatarSaving && <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Uploading...</span>}
            </div>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" className="btn-primary" disabled={profileSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {profileSaving ? <><Loader size={14} /> Saving...</> : 'Save Profile'}
            </button>
          </form>
        </div>

        <div style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} style={{ color: 'var(--crimson)' }} /> Saved Addresses
            </h3>
            <button onClick={() => setShowAddAddr(p => !p)} className="btn-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add Address
            </button>
          </div>

          {showAddAddr && (
            <form onSubmit={handleAddAddress} style={{ backgroundColor: 'var(--bg-festive)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px' }}>
              <div className="addr-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Label</label>
                  <select value={label} onChange={e => setLabel(e.target.value)}>
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Kolkata PIN *</label>
                  <input type="text" maxLength={6} placeholder="700019" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} required />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Full Address *</label>
                <input type="text" placeholder="Street, Area, Kolkata" value={text} onChange={e => setText(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddAddr(false)} className="btn-outline-white" style={{ color: 'var(--text-main)', borderColor: 'var(--border)', padding: '8px 14px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 14px' }} disabled={saving}>
                  {saving ? <Loader size={14} /> : 'Save Address'}
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {addresses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No saved addresses yet. Add one above.</p>
            ) : addresses.map(addr => {
              const id = addr._id || addr.id;
              return (
                <div key={id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-festive)', position: 'relative' }}>
                  {addr.isDefault && (
                    <span style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'var(--crimson)', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>DEFAULT</span>
                  )}
                  <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{addr.label}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.4' }}>{addr.text}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '600' }}>PIN: {addr.pin}</div>
                  <button onClick={() => handleDeleteAddress(id)} style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }} title="Remove">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
