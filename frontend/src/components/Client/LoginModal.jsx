/**
 * LoginModal.jsx — Phone + OTP login for existing clients.
 * Opens as an overlay when unauthenticated user tries a protected action.
 */
import React, { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../context/AppContext';
import { X, PhoneCall, Key, ArrowRight, Loader } from 'lucide-react';

const LoginModal = ({ onClose, onSwitchToRegister }) => {
  const { sendOTP, loginClient } = useContext(AppContext);

  const [phone,   setPhone]   = useState('');
  const [step,    setStep]    = useState(1);
  const [otp,     setOtp]     = useState(['', '', '', '', '', '']);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  /* lock body scroll, close on Escape */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  /* ── Step 1: send OTP ── */
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (phone.length < 10) { setError('Please enter a valid 10-digit phone number'); return; }
    setLoading(true); setError('');
    const res = await sendOTP(phone);
    setLoading(false);
    if (res.success) {
      setStep(2);
      if (res.devOtp) setOtp(res.devOtp.split(''));
      setTimeout(() => document.getElementById('lm-otp-0')?.focus(), 50);
    } else if (res.notFound) {
      setError('No account found with this number. Please create an account first.');
    } else {
      setError(res.error || 'Failed to send OTP. Please try again.');
    }
  };

  /* ── OTP input helpers ── */
  const handleOtpChange = (value, idx) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    const next  = [...otp]; next[idx] = clean; setOtp(next);
    if (clean && idx < 5) document.getElementById(`lm-otp-${idx + 1}`)?.focus();
  };
  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0)
      document.getElementById(`lm-otp-${idx - 1}`)?.focus();
  };

  /* ── Step 2: verify OTP ── */
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length < 6) { setError('Please enter the complete 6-digit OTP'); return; }
    setLoading(true); setError('');
    const res = await loginClient(phone, otpStr);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => document.getElementById('lm-otp-0')?.focus(), 50);
    }
  };

  const modal = (
    <div
      role="dialog" aria-modal="true" aria-labelledby="login-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)', padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: '#fff', borderRadius: 'var(--radius-md)',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        animation: 'fadeInUp 0.22s ease',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
          <h2 id="login-modal-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', margin: 0 }}>
            Sign In
          </h2>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)', display: 'flex', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px 28px' }}>

          {/* Icon + subtitle */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div className="trust-icon-container" style={{ margin: '0 auto 12px', width: '52px', height: '52px' }}>
              {step === 1
                ? <PhoneCall size={22} style={{ color: 'var(--crimson)' }} />
                : <Key       size={22} style={{ color: 'var(--crimson)' }} />}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              {step === 1 ? 'Enter your registered mobile number' : `OTP sent to +91 ${phone}`}
            </p>
          </div>

          {/* Step 1 — Phone */}
          {step === 1 && (
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label htmlFor="lm-phone">Mobile Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    padding: '12px 14px', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-festive)',
                    fontWeight: '600', fontSize: '14px', flexShrink: 0,
                  }}>+91</span>
                  <input id="lm-phone" type="text" inputMode="numeric" maxLength={10}
                    placeholder="98765 43210" value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                    disabled={loading} autoFocus style={{ flex: 1 }} />
                </div>
              </div>
              {error && <p style={{ color: 'var(--crimson)', fontSize: '13px', marginBottom: '12px', fontWeight: '500' }}>{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><Loader size={16} className="spin" /> Sending…</> : <>Send OTP <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* Step 2 — OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group" style={{ textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '12px' }}>Enter 6-Digit OTP</label>
                <div className="otp-box" style={{ justifyContent: 'center', gap: '8px' }}>
                  {otp.map((digit, idx) => (
                    <input key={idx} id={`lm-otp-${idx}`} type="text" inputMode="numeric"
                      maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      disabled={loading} autoFocus={idx === 0} />
                  ))}
                </div>
              </div>
              {error && <p style={{ color: 'var(--crimson)', fontSize: '13px', textAlign: 'center', marginBottom: '12px', fontWeight: '500' }}>{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><Loader size={16} className="spin" /> Verifying…</> : <>Verify & Sign In <ArrowRight size={16} /></>}
              </button>
              <button type="button"
                onClick={() => { setStep(1); setError(''); setOtp(['','','','','','']); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: '13px', marginTop: '12px', cursor: 'pointer',
                  textDecoration: 'underline', display: 'block', width: '100%', textAlign: 'center',
                }}>
                Change number
              </button>
            </form>
          )}

          {/* Switch to register */}
          <div style={{
            marginTop: '24px', paddingTop: '20px',
            borderTop: '1px solid var(--border)',
            textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)',
          }}>
            New to Dear Kolkata?{' '}
            <button onClick={onSwitchToRegister}
              style={{ background: 'none', border: 'none', color: 'var(--crimson)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default LoginModal;
