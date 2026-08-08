import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { ArrowRight, PhoneCall, Key, Loader, Mail, Lock, ShoppingBag, Store, Shield } from 'lucide-react';

const OtpGate = () => {
  const { sendOTP, loginClient, vendorSignIn, adminSignIn } = useContext(AppContext);
  
  // Tab state: 'shopper', 'vendor', 'admin' (initialized from session storage if redirected)
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('dk_login_tab') || 'shopper';
  });
  
  // Shopper Form State
  const [phone, setPhone] = useState('');
  const [step, setStep]   = useState(1); // 1 = phone, 2 = OTP
  const [otp, setOtp]     = useState(['', '', '', '', '', '']); // 6-digit OTP
  
  // Vendor Form State
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorPassword, setVendorPassword] = useState('');
  
  // Admin Form State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Shared States
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync tab change
  useEffect(() => {
    sessionStorage.removeItem('dk_login_tab');
  }, [activeTab]);

  // ─── SHOPPER FLOW ──────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (phone.length < 10) { 
      setError('Please enter a valid 10-digit phone number'); 
      return; 
    }
    setLoading(true);
    setError('');
    const res = await sendOTP(phone);
    setLoading(false);
    if (res.success) {
      setStep(2);
      // If we got a devOtp back, autofill it
      if (res.devOtp) {
        const otpDigits = res.devOtp.split('');
        setOtp(otpDigits);
      }
    } else {
      setError(res.error || 'Failed to send OTP. Please try again.');
    }
  };

  const handleOtpChange = (value, idx) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[idx] = clean;
    setOtp(next);
    if (clean && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) { 
      setError('Please enter the complete 6-digit OTP'); 
      return; 
    }
    setLoading(true);
    setError('');
    const res = await loginClient(phone, otpString);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    }
  };

  // ─── VENDOR FLOW ───────────────────────────────────────────────────────────
  const handleVendorLogin = async (e) => {
    if (e) e.preventDefault();
    if (vendorPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (!vendorPassword) {
      setError('Password is required');
      return;
    }
    setLoading(true);
    setError('');
    const res = await vendorSignIn(vendorPhone, vendorPassword);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Invalid phone or password');
    }
  };

  // ─── ADMIN FLOW ────────────────────────────────────────────────────────────
  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    if (!adminEmail || !/\S+@\S+\.\S+/.test(adminEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!adminPassword) {
      setError('Password is required');
      return;
    }
    setLoading(true);
    setError('');
    const res = await adminSignIn(adminEmail, adminPassword);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Invalid email or password');
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setLoading(false);
    // Reset inputs
    setPhone('');
    setStep(1);
    setOtp(['', '', '', '', '', '']);
    setVendorPhone('');
    setVendorPassword('');
    setAdminEmail('');
    setAdminPassword('');
  };

  // ─── QUICK LOGINS FOR DEV ──────────────────────────────────────────────────
  const quickLoginShopper = async () => {
    setError('');
    setLoading(true);
    const targetPhone = '9830098300';
    setPhone(targetPhone);
    
    // Request OTP
    const res = await sendOTP(targetPhone);
    if (res.success && res.devOtp) {
      setStep(2);
      setOtp(res.devOtp.split(''));
      
      // Auto submit OTP
      const loginRes = await loginClient(targetPhone, res.devOtp);
      setLoading(false);
      if (!loginRes.success) {
        setError(loginRes.error || 'Quick login failed.');
      }
    } else {
      setLoading(false);
      setError(res.error || 'Failed to send quick login OTP.');
    }
  };

  const quickLoginVendor = async (phoneNum) => {
    setError('');
    setLoading(true);
    setVendorPhone(phoneNum);
    setVendorPassword('Vendor@123');
    
    const res = await vendorSignIn(phoneNum, 'Vendor@123');
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Quick login failed.');
    }
  };

  const quickLoginAdmin = async () => {
    setError('');
    setLoading(true);
    setAdminEmail('admin@dearkolkata.com');
    setAdminPassword('Admin@DearKolkata2026');
    
    const res = await adminSignIn('admin@dearkolkata.com', 'Admin@DearKolkata2026');
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Quick login failed.');
    }
  };

  return (
    <div className="gate-screen animate-fade-in">
      <div className="gate-card" style={{ maxWidth: '440px', width: '100%' }}>
        
        {/* Title */}
        <h2 className="gate-logo" style={{ marginBottom: '8px' }}>Dear Kolkata</h2>
        <p className="gate-subtitle" style={{ marginBottom: '24px' }}>Boutique & Gifting Marketplace</p>

        {/* Custom Tabs Header */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-festive)',
          padding: '4px',
          borderRadius: '28px',
          border: '1px solid var(--border)',
          marginBottom: '24px',
          justifyContent: 'space-between'
        }}>
          {[
            { id: 'shopper', icon: <ShoppingBag size={14} />, label: 'Shopper' },
            { id: 'vendor', icon: <Store size={14} />, label: 'Vendor' },
            { id: 'admin', icon: <Shield size={14} />, label: 'Admin' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                border: 'none',
                borderRadius: '24px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: activeTab === tab.id ? 'var(--crimson)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.25s ease'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Forms */}
        {activeTab === 'shopper' && (
          <div className="animate-fade-in">
            <div className="trust-icon-container" style={{ margin: '0 auto 20px auto', width: '56px', height: '56px' }}>
              {step === 1 ? <PhoneCall size={22} style={{ color: 'var(--crimson)' }} /> : <Key size={22} style={{ color: 'var(--crimson)' }} />}
            </div>
            <h3 style={{ textAlign: 'center', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>
              {step === 1 ? 'Shopper Sign In' : 'Verify Mobile OTP'}
            </h3>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              {step === 1 ? 'Access your cart, locker coupons, and place orders.' : `Enter the 6-digit OTP code sent to +91 ${phone}`}
            </p>

            {step === 1 ? (
              <form onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label htmlFor="phone-input">Mobile Phone Number</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-festive)', fontWeight: '600', fontSize: '14px' }}>+91</span>
                    <input
                      id="phone-input"
                      type="text"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                      disabled={loading}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                {error && <div style={{ color: 'var(--crimson)', fontSize: '13px', textAlign: 'left', marginBottom: '16px', fontWeight: '500' }}>{error}</div>}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><Loader size={16} className="spin" /> Sending...</> : <>Send Verification Code <ArrowRight size={16} /></>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div className="form-group" style={{ textAlign: 'center' }}>
                  <label style={{ textAlign: 'center', marginBottom: '12px' }}>Enter 6-Digit OTP</label>
                  <div className="otp-box" style={{ justifyContent: 'center', gap: '8px' }}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, idx)}
                        onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                        style={{ width: '40px', height: '44px', textAlign: 'center', fontSize: '20px', fontWeight: '700' }}
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>
                {error && <div style={{ color: 'var(--crimson)', fontSize: '13px', textAlign: 'center', marginBottom: '16px', fontWeight: '500' }}>{error}</div>}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><Loader size={16} className="spin" /> Verifying...</> : <>Verify &amp; Proceed <ArrowRight size={16} /></>}
                </button>
                <button type="button" onClick={() => { setStep(1); setError(''); setOtp(['','','','','','']); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px', cursor: 'pointer', textDecoration: 'underline', display: 'block', width: '100%', textAlign: 'center' }}>
                  Change Phone Number
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'vendor' && (
          <form onSubmit={handleVendorLogin} className="animate-fade-in">
            <div className="trust-icon-container" style={{ margin: '0 auto 20px auto', width: '56px', height: '56px' }}>
              <Store size={22} style={{ color: 'var(--crimson)' }} />
            </div>
            <h3 style={{ textAlign: 'center', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>Vendor Login</h3>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Manage your products, process orders, and view payouts.
            </p>

            <div className="form-group">
              <label htmlFor="vendor-phone">Registered Mobile Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-festive)', fontWeight: '600', fontSize: '14px' }}>+91</span>
                <input
                  id="vendor-phone"
                  type="text"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={vendorPhone}
                  onChange={(e) => { setVendorPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                  disabled={loading}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="vendor-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="vendor-password"
                  type="password"
                  placeholder="••••••••"
                  value={vendorPassword}
                  onChange={(e) => { setVendorPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {error && <div style={{ color: 'var(--crimson)', fontSize: '13px', textAlign: 'left', marginBottom: '16px', fontWeight: '500' }}>{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><Loader size={16} className="spin" /> Logging in...</> : <>Login to Store Panel <ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="animate-fade-in">
            <div className="trust-icon-container" style={{ margin: '0 auto 20px auto', width: '56px', height: '56px' }}>
              <Shield size={22} style={{ color: 'var(--crimson)' }} />
            </div>
            <h3 style={{ textAlign: 'center', margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>Admin Console</h3>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Access analytics, onboard vendors, moderate products, and handle payouts.
            </p>

            <div className="form-group">
              <label htmlFor="admin-email">Admin Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-email"
                  type="email"
                  placeholder="admin@dearkolkata.com"
                  value={adminEmail}
                  onChange={(e) => { setAdminEmail(e.target.value); setError(''); }}
                  disabled={loading}
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => { setAdminPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {error && <div style={{ color: 'var(--crimson)', fontSize: '13px', textAlign: 'left', marginBottom: '16px', fontWeight: '500' }}>{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><Loader size={16} className="spin" /> Authenticating...</> : <>Enter Admin Console <ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        {/* Development info & Quick Logins */}
        {import.meta.env.DEV && (
          <div style={{ marginTop: '24px', backgroundColor: 'var(--bg-festive)', border: '1px dashed var(--border)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '10px' }}>Dev Fast-Login Shortcuts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                type="button" 
                onClick={quickLoginShopper}
                className="btn-primary"
                style={{ padding: '8px', fontSize: '12px', backgroundColor: '#059669', borderColor: '#059669' }}
                disabled={loading}
              >
                1-Click Shopper (Amit)
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => quickLoginVendor('9876543210')}
                  className="btn-primary"
                  style={{ flex: 1, padding: '8px', fontSize: '11px', backgroundColor: 'var(--gold)', borderColor: 'var(--gold)', color: '#000' }}
                  disabled={loading}
                >
                  Sarees Vendor
                </button>
                <button 
                  type="button" 
                  onClick={() => quickLoginVendor('9876543211')}
                  className="btn-primary"
                  style={{ flex: 1, padding: '8px', fontSize: '11px', backgroundColor: 'var(--gold)', borderColor: 'var(--gold)', color: '#000' }}
                  disabled={loading}
                >
                  Jewellery Vendor
                </button>
              </div>
              <button 
                type="button" 
                onClick={quickLoginAdmin}
                className="btn-primary"
                style={{ padding: '8px', fontSize: '12px', backgroundColor: '#1E293B', borderColor: '#1E293B' }}
                disabled={loading}
              >
                1-Click Admin Console
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OtpGate;
