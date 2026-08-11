/**
 * RegisterModal.jsx — 3-step client registration:
 *   Step 1 — Name + Email (optional) + Phone
 *   Step 2 — OTP verification
 *   Step 3 — Kolkata delivery address
 * On success: account activated, JWT issued, ₹350 welcome bonus credited.
 */
import React, { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../context/AppContext';
import {
  X, User, Mail, PhoneCall, Key, MapPin,
  ArrowRight, Loader, CheckCircle,
} from 'lucide-react';

/* ── Step indicator dot ── */
const StepDot = ({ n, current, label }) => {
  const done   = n < current;
  const active = n === current;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: '700', transition: 'all 0.2s',
        backgroundColor: done || active ? 'var(--crimson)' : 'var(--border)',
        color: done || active ? '#fff' : 'var(--text-muted)',
      }}>
        {done ? <CheckCircle size={14} /> : n}
      </div>
      <span style={{ fontSize: '10px', color: active ? 'var(--crimson)' : 'var(--text-muted)', fontWeight: active ? '700' : '400' }}>
        {label}
      </span>
    </div>
  );
};

const STEPS = [
  { n: 1, label: 'Details' },
  { n: 2, label: 'Verify'  },
  { n: 3, label: 'Address' },
];

const RegisterModal = ({ onClose, onSwitchToLogin }) => {
  const { registerSendOTP, registerVerify } = useContext(AppContext);

  /* Step 1 */
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  /* Step 2 */
  const [otp,   setOtp]   = useState(['', '', '', '', '', '']);
  /* Step 3 */
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrText,  setAddrText]  = useState('');
  const [addrPin,   setAddrPin]   = useState('');

  const [step,    setStep]    = useState(1);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  /* ── Step 1 → send OTP ── */
  const handleStep1 = async (e) => {
    e?.preventDefault();
    if (name.trim().length < 2)  { setError('Please enter your full name (at least 2 characters)'); return; }
    if (phone.length !== 10)      { setError('Please enter a valid 10-digit phone number'); return; }
    if (email && !/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address'); return; }
    setLoading(true); setError('');
    const res = await registerSendOTP(phone, name.trim(), email.trim());
    setLoading(false);
    if (res.success) {
      setStep(2);
      if (res.devOtp) setOtp(res.devOtp.split(''));
      setTimeout(() => document.getElementById('rm-otp-0')?.focus(), 50);
    } else if (res.alreadyExists) {
      setError('This phone number is already registered. Please sign in instead.');
    } else {
      setError(res.error || 'Failed to send OTP. Please try again.');
    }
  };

  /* ── OTP helpers ── */
  const handleOtpChange = (value, idx) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    const next  = [...otp]; next[idx] = clean; setOtp(next);
    if (clean && idx < 5) document.getElementById(`rm-otp-${idx + 1}`)?.focus();
  };
  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0)
      document.getElementById(`rm-otp-${idx - 1}`)?.focus();
  };

  /* ── Step 2 → go to address (OTP verified on final submit) ── */
  const handleStep2 = async (e) => {
    e?.preventDefault();
    if (otp.join('').length < 6) { setError('Please enter the complete 6-digit OTP'); return; }
    setStep(3); setError('');
    setTimeout(() => document.getElementById('rm-addr-text')?.focus(), 50);
  };

  /* ── Step 3 → register + auto-login ── */
  const handleStep3 = async (e) => {
    e?.preventDefault();
    if (addrText.trim().length < 10) { setError('Please enter a complete address (at least 10 characters)'); return; }
    if (!/^700\d{3}$/.test(addrPin.trim())) { setError('Please enter a valid Kolkata PIN code (e.g. 700019)'); return; }
    setLoading(true); setError('');
    const res = await registerVerify({
      phone,
      otp:          otp.join(''),
      addressLabel: addrLabel.trim() || 'Home',
      addressText:  addrText.trim(),
      addressPin:   addrPin.trim(),
    });
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      const isOtpError = res.error?.toLowerCase().includes('otp') || res.error?.toLowerCase().includes('expired');
      if (isOtpError) {
        setStep(2); setOtp(['', '', '', '', '', '']);
        setError(res.error + ' Please re-enter the OTP.');
      } else {
        setError(res.error || 'Registration failed. Please try again.');
      }
    }
  };

  const modal = (
    <div
      role="dialog" aria-modal="true" aria-labelledby="register-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)', padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div style={{
        backgroundColor: '#fff', borderRadius: 'var(--radius-md)',
        width: '100%', maxWidth: '460px', margin: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        animation: 'fadeInUp 0.22s ease',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
          <h2 id="register-modal-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', margin: 0 }}>
            Create Account
          </h2>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)', display: 'flex', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Step indicators ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', padding: '16px 24px 0', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)', width: '160px', height: '2px', background: 'var(--border)', zIndex: 0 }} />
          {STEPS.map(s => (
            <div key={s.n} style={{ position: 'relative', zIndex: 1, backgroundColor: '#fff', padding: '0 4px' }}>
              <StepDot n={s.n} current={step} label={s.label} />
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px 28px' }}>

          {/* ══ STEP 1 — Details ══ */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="animate-fade-in">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div className="trust-icon-container" style={{ margin: '0 auto 10px', width: '48px', height: '48px' }}>
                  <User size={20} style={{ color: 'var(--crimson)' }} />
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Tell us a bit about yourself</p>
              </div>

              <div className="form-group">
                <label htmlFor="rm-name">Full Name *</label>
                <input id="rm-name" type="text" placeholder="Rahul Sharma"
                  value={name} onChange={(e) => { setName(e.target.value); setError(''); }}
                  disabled={loading} autoFocus maxLength={60} />
              </div>

              <div className="form-group">
                <label htmlFor="rm-email">
                  Email Address <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input id="rm-email" type="email" placeholder="rahul@example.com"
                    value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    disabled={loading} style={{ paddingLeft: '36px' }} />
                  <Mail size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  For order confirmations and receipts
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="rm-phone">Mobile Number *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    padding: '12px 14px', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-festive)',
                    fontWeight: '600', fontSize: '14px', flexShrink: 0,
                  }}>+91</span>
                  <input id="rm-phone" type="text" inputMode="numeric" maxLength={10}
                    placeholder="98765 43210" value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                    disabled={loading} style={{ flex: 1 }} />
                </div>
              </div>

              {error && <p style={{ color: 'var(--crimson)', fontSize: '13px', marginBottom: '12px', fontWeight: '500' }}>{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><Loader size={16} className="spin" /> Sending OTP…</> : <>Continue <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* ══ STEP 2 — Verify OTP ══ */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="animate-fade-in">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div className="trust-icon-container" style={{ margin: '0 auto 10px', width: '48px', height: '48px' }}>
                  <PhoneCall size={20} style={{ color: 'var(--crimson)' }} />
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  OTP sent to <strong>+91 {phone}</strong>
                </p>
              </div>

              <div className="form-group" style={{ textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '12px' }}>Enter 6-Digit OTP</label>
                <div className="otp-box" style={{ justifyContent: 'center', gap: '8px' }}>
                  {otp.map((digit, idx) => (
                    <input key={idx} id={`rm-otp-${idx}`} type="text" inputMode="numeric"
                      maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      disabled={loading} />
                  ))}
                </div>
              </div>

              {error && <p style={{ color: 'var(--crimson)', fontSize: '13px', textAlign: 'center', marginBottom: '12px', fontWeight: '500' }}>{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><Loader size={16} className="spin" /> Verifying…</> : <>Verify OTP <ArrowRight size={16} /></>}
              </button>
              <button type="button"
                onClick={() => { setStep(1); setError(''); setOtp(['','','','','','']); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', marginTop: '12px', cursor: 'pointer', textDecoration: 'underline', display: 'block', width: '100%', textAlign: 'center' }}>
                ← Change details
              </button>
            </form>
          )}

          {/* ══ STEP 3 — Address ══ */}
          {step === 3 && (
            <form onSubmit={handleStep3} className="animate-fade-in">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div className="trust-icon-container" style={{ margin: '0 auto 10px', width: '48px', height: '48px' }}>
                  <MapPin size={20} style={{ color: 'var(--crimson)' }} />
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Add your Kolkata delivery address</p>
              </div>

              <div className="form-group">
                <label>Address Label</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Home', 'Office', 'Other'].map(l => (
                    <button key={l} type="button" onClick={() => setAddrLabel(l)} style={{
                      padding: '6px 16px', border: '1px solid',
                      borderColor: addrLabel === l ? 'var(--crimson)' : 'var(--border)',
                      borderRadius: '20px',
                      backgroundColor: addrLabel === l ? 'var(--crimson-light)' : '#fff',
                      color: addrLabel === l ? 'var(--crimson)' : 'var(--text-muted)',
                      fontWeight: addrLabel === l ? '700' : '400',
                      fontSize: '13px', cursor: 'pointer',
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="rm-addr-text">Full Address *</label>
                <textarea id="rm-addr-text" rows={3}
                  placeholder="Flat 4B, Gupta Mansion, 22 Shakespeare Sarani, Park Street"
                  value={addrText} onChange={(e) => { setAddrText(e.target.value); setError(''); }}
                  disabled={loading} maxLength={200} style={{ resize: 'vertical' }} />
              </div>

              <div className="form-group">
                <label htmlFor="rm-addr-pin">Kolkata PIN Code *</label>
                <div style={{ position: 'relative' }}>
                  <input id="rm-addr-pin" type="text" inputMode="numeric" maxLength={6}
                    placeholder="700019" value={addrPin}
                    onChange={(e) => { setAddrPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                    disabled={loading} style={{ paddingLeft: '36px' }} />
                  <MapPin size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Must start with 700 (e.g. 700019)
                </span>
              </div>

              {error && <p style={{ color: 'var(--crimson)', fontSize: '13px', marginBottom: '12px', fontWeight: '500' }}>{error}</p>}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><Loader size={16} className="spin" /> Creating account…</> : <>Create My Account <ArrowRight size={16} /></>}
              </button>

              {/* Welcome bonus hint */}
              <div style={{
                marginTop: '14px', padding: '10px 14px',
                backgroundColor: 'var(--bg-festive)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)',
                textAlign: 'center',
              }}>
                🎁 You'll receive <strong style={{ color: 'var(--crimson)' }}>₹350 welcome bonus</strong> instantly after sign-up!
              </div>
            </form>
          )}

          {/* Switch to login */}
          <div style={{
            marginTop: '20px', paddingTop: '16px',
            borderTop: '1px solid var(--border)',
            textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)',
          }}>
            Already have an account?{' '}
            <button onClick={onSwitchToLogin}
              style={{ background: 'none', border: 'none', color: 'var(--crimson)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default RegisterModal;
