/**
 * VendorAdminLoginModal.jsx — Vendor (phone + password) and Admin (email + password) login.
 * Triggered from Footer "Partner Login" link or Header "Partner Login" button.
 */
import React, { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../context/AppContext';
import { X, Store, Shield, Lock, Mail, ArrowRight, Loader } from 'lucide-react';

const VendorAdminLoginModal = ({ onClose }) => {
  const { vendorSignIn, adminSignIn } = useContext(AppContext);

  const [tab,     setTab]     = useState('vendor');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  /* Vendor fields */
  const [vPhone, setVPhone] = useState('');
  const [vPass,  setVPass]  = useState('');

  /* Admin fields */
  const [aEmail, setAEmail] = useState('');
  const [aPass,  setAPass]  = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const switchTab = (t) => {
    setTab(t); setError('');
    setVPhone(''); setVPass('');
    setAEmail(''); setAPass('');
  };

  const handleVendorLogin = async (e) => {
    e?.preventDefault();
    if (vPhone.length < 10) { setError('Enter a valid 10-digit phone number'); return; }
    if (!vPass)              { setError('Password is required'); return; }
    setLoading(true); setError('');
    const res = await vendorSignIn(vPhone, vPass);
    setLoading(false);
    if (res.success) { onClose(); } else { setError(res.error || 'Invalid credentials'); }
  };

  const handleAdminLogin = async (e) => {
    e?.preventDefault();
    if (!aEmail || !/\S+@\S+\.\S+/.test(aEmail)) { setError('Enter a valid email address'); return; }
    if (!aPass) { setError('Password is required'); return; }
    setLoading(true); setError('');
    const res = await adminSignIn(aEmail, aPass);
    setLoading(false);
    if (res.success) { onClose(); } else { setError(res.error || 'Invalid credentials'); }
  };

  const modal = (
    <div
      role="dialog" aria-modal="true" aria-labelledby="partner-login-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)', padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: '#fff', borderRadius: 'var(--radius-md)',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        animation: 'fadeInUp 0.22s ease',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
          <h2 id="partner-login-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', margin: 0 }}>
            Partner Login
          </h2>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)', display: 'flex', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 24px 28px' }}>

          {/* Tab switcher */}
          <div style={{
            display: 'flex', backgroundColor: 'var(--bg-festive)',
            padding: '4px', borderRadius: '24px', border: '1px solid var(--border)',
            marginBottom: '24px',
          }}>
            {[
              { id: 'vendor', icon: <Store  size={14} />, label: 'Vendor' },
              { id: 'admin',  icon: <Shield size={14} />, label: 'Admin'  },
            ].map(t => (
              <button key={t.id} onClick={() => switchTab(t.id)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', padding: '8px 12px', border: 'none', borderRadius: '20px',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                backgroundColor: tab === t.id ? 'var(--crimson)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── Vendor form ── */}
          {tab === 'vendor' && (
            <form onSubmit={handleVendorLogin} className="animate-fade-in">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div className="trust-icon-container" style={{ margin: '0 auto 10px', width: '48px', height: '48px' }}>
                  <Store size={20} style={{ color: 'var(--crimson)' }} />
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Manage your store, products &amp; payouts
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="va-vphone">Registered Phone Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    padding: '12px 14px', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-festive)',
                    fontWeight: '600', fontSize: '14px', flexShrink: 0,
                  }}>+91</span>
                  <input id="va-vphone" type="text" inputMode="numeric" maxLength={10}
                    placeholder="98765 43210" value={vPhone}
                    onChange={(e) => { setVPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                    disabled={loading} autoFocus style={{ flex: 1 }} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="va-vpass">Password</label>
                <div style={{ position: 'relative' }}>
                  <input id="va-vpass" type="password" placeholder="••••••••"
                    value={vPass} onChange={(e) => { setVPass(e.target.value); setError(''); }}
                    disabled={loading} style={{ paddingLeft: '36px' }} />
                  <Lock size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {error && <p style={{ color: 'var(--crimson)', fontSize: '13px', marginBottom: '12px', fontWeight: '500' }}>{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><Loader size={16} className="spin" /> Logging in…</> : <>Login to Store Panel <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* ── Admin form ── */}
          {tab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="animate-fade-in">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div className="trust-icon-container" style={{ margin: '0 auto 10px', width: '48px', height: '48px' }}>
                  <Shield size={20} style={{ color: 'var(--crimson)' }} />
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Admin console — analytics, vendors &amp; payouts
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="va-aemail">Admin Email</label>
                <div style={{ position: 'relative' }}>
                  <input id="va-aemail" type="email" placeholder="admin@dearkolkata.com"
                    value={aEmail} onChange={(e) => { setAEmail(e.target.value); setError(''); }}
                    disabled={loading} autoFocus style={{ paddingLeft: '36px' }} />
                  <Mail size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="va-apass">Password</label>
                <div style={{ position: 'relative' }}>
                  <input id="va-apass" type="password" placeholder="••••••••"
                    value={aPass} onChange={(e) => { setAPass(e.target.value); setError(''); }}
                    disabled={loading} style={{ paddingLeft: '36px' }} />
                  <Lock size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {error && <p style={{ color: 'var(--crimson)', fontSize: '13px', marginBottom: '12px', fontWeight: '500' }}>{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><Loader size={16} className="spin" /> Authenticating…</> : <>Enter Admin Console <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* Dev shortcuts */}
          {import.meta.env.DEV && (
            <div style={{ marginTop: '20px', backgroundColor: 'var(--bg-festive)', border: '1px dashed var(--border)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>⚡ Dev Fast-Login</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" disabled={loading}
                  onClick={async () => { setLoading(true); const r = await vendorSignIn('9876543210', 'Vendor@123'); setLoading(false); if (r.success) onClose(); else setError(r.error); }}
                  className="btn-primary" style={{ flex: 1, padding: '7px', fontSize: '11px', backgroundColor: 'var(--gold)', borderColor: 'var(--gold)', color: '#000' }}>
                  Sarees Vendor
                </button>
                <button type="button" disabled={loading}
                  onClick={async () => { setLoading(true); const r = await vendorSignIn('9876543211', 'Vendor@123'); setLoading(false); if (r.success) onClose(); else setError(r.error); }}
                  className="btn-primary" style={{ flex: 1, padding: '7px', fontSize: '11px', backgroundColor: 'var(--gold)', borderColor: 'var(--gold)', color: '#000' }}>
                  Jewellery Vendor
                </button>
                <button type="button" disabled={loading}
                  onClick={async () => { setLoading(true); const r = await adminSignIn('admin@dearkolkata.com', 'Admin@DearKolkata2026'); setLoading(false); if (r.success) onClose(); else setError(r.error); }}
                  className="btn-primary" style={{ width: '100%', padding: '7px', fontSize: '11px', backgroundColor: '#1E293B', borderColor: '#1E293B' }}>
                  Admin Console
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default VendorAdminLoginModal;
