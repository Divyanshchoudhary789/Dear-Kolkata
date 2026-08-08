import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { MapPin, ArrowRight, ShieldAlert, Loader } from 'lucide-react';

const LocationGate = () => {
  const { verifyKolkataPin } = useContext(AppContext);
  const [pin, setPin]     = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) { setError('Please enter a PIN code'); return; }
    setLoading(true);
    setError('');
    const ok = await verifyKolkataPin(pin.trim());
    setLoading(false);
    if (!ok) {
      setError('Service is limited to Kolkata only. Please enter a valid Kolkata PIN code starting with 700 (e.g., 700019).');
    }
  };

  return (
    <div className="gate-screen animate-fade-in">
      <div className="gate-card">
        <div className="trust-icon-container" style={{ margin: '0 auto 20px auto', width: '56px', height: '56px' }}>
          <MapPin size={24} style={{ color: 'var(--crimson)' }} />
        </div>
        <h2 className="gate-logo">Dear Kolkata</h2>
        <p className="gate-subtitle">A curated Gifting &amp; Coupon Experience</p>

        <div style={{ backgroundColor: 'var(--bg-festive)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'flex-start', textAlign: 'left' }}>
          <ShieldAlert size={20} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--text-muted)' }}>
            <strong>Geography restriction:</strong> All vendors, delivery fulfillment, and coupon redemptions are strictly limited to the Kolkata region.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="pin-input">Enter Kolkata PIN Code</label>
            <input
              id="pin-input"
              type="text"
              maxLength={6}
              placeholder="e.g. 700019"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--crimson)', fontSize: '13px', textAlign: 'left', marginBottom: '16px', fontWeight: '500' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <><Loader size={16} className="spin" /> Verifying...</> : <>Confirm Location <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="gate-info">
          Enter a valid Kolkata PIN like <strong>700019</strong> or <strong>700091</strong>.
        </div>
      </div>
    </div>
  );
};

export default LocationGate;
