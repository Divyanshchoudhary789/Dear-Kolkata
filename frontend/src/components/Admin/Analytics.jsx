import React, { useEffect, useState } from 'react';
import { Landmark, TrendingUp, Users, Map, Wallet, Loader, RefreshCw } from 'lucide-react';
import * as adminApi from '../../api/adminApi';

const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ovRes, anRes] = await Promise.all([
        adminApi.getAnalyticsOverview(),
        adminApi.getAnalytics(),
      ]);
      if (ovRes?.success) setOverview(ovRes.data);
      if (anRes?.success) setAnalytics(anRes.data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const ov = overview || {};
  const an = analytics || {};

  const PINS = [
    { pin:'700091', region:'Salt Lake' }, { pin:'700012', region:'Bowbazar' },
    { pin:'700016', region:'Park Street' }, { pin:'700029', region:'Gariahat' },
    { pin:'700019', region:'Ballygunge' }, { pin:'700087', region:'Lindsay St' },
    { pin:'700045', region:'South Kol' }, { pin:'700001', region:'Dalhousie' },
  ];

  const heatColor = (n) => n === 0 ? '#F3F4F6' : n === 1 ? '#FCA5A5' : n < 4 ? '#F87171' : '#DC2626';

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ margin:0, fontFamily:'var(--font-serif)', fontSize:'24px' }}>Platform Analytics</h2>
          <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>Real-time GMV, commission and demand metrics.</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'8px 14px', cursor: loading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? <Loader size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'64px' }}><Loader size={28} className="spin" style={{ color:'var(--crimson)' }}/></div>
      ) : (
        <>
          <div className="analytics-grid" style={{ marginBottom:'32px' }}>
            <div className="analytics-card">
              <div className="analytics-icon" style={{ backgroundColor:'#ECFDF5', color:'#10B981' }}><TrendingUp size={20}/></div>
              <div className="analytics-info"><div className="value">₹{(ov.totalRevenue||0).toLocaleString()}</div><div className="label">Cumulative GMV</div></div>
            </div>
            <div className="analytics-card">
              <div className="analytics-icon" style={{ backgroundColor:'var(--crimson-light)', color:'var(--crimson)' }}><Landmark size={20}/></div>
              <div className="analytics-info"><div className="value">₹{(ov.totalCommission||0).toLocaleString()}</div><div className="label">Commission Earned</div></div>
            </div>
            <div className="analytics-card">
              <div className="analytics-icon" style={{ backgroundColor:'#FEF3C7', color:'#D97706' }}><Wallet size={20}/></div>
              <div className="analytics-info"><div className="value">₹{(ov.pendingPayouts||0).toLocaleString()}</div><div className="label">Pending Payouts</div></div>
            </div>
            <div className="analytics-card">
              <div className="analytics-icon" style={{ backgroundColor:'#E0F2FE', color:'#0284C7' }}><Users size={20}/></div>
              <div className="analytics-info"><div className="value">{ov.activeVendors||0}</div><div className="label">Active Vendors</div></div>
            </div>
          </div>

          <div className="analytics-two-col" style={{ display: 'grid', gap: '24px', alignItems: 'start' }}>
            {/* Category Breakdown */}
            <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
              <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
                <Map size={18} style={{ color:'var(--crimson)' }}/> Category Revenue Breakdown
              </h3>
              {(an.categoryBreakdown || []).length === 0 ? (
                <p style={{ color:'var(--text-muted)', fontSize:'13px' }}>No data yet.</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {an.categoryBreakdown.map((c,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', backgroundColor:'var(--bg-festive)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
                      <span style={{ fontSize:'13px', fontWeight:'700', textTransform:'capitalize' }}>{c._id || 'General'}</span>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'14px', fontWeight:'700', color:'var(--crimson)' }}>₹{(c.totalRevenue||0).toLocaleString()}</div>
                        <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{c.orderCount} order(s)</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary Card */}
            <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
              <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>Platform Summary</h3>
              {[
                { label:'Total Orders',    value: (ov.totalOrders||0).toLocaleString() },
                { label:'Total Clients',   value: (ov.totalClients||0).toLocaleString() },
                { label:'Active Vendors',  value: (ov.activeVendors||0).toLocaleString() },
                { label:'Coupon Revenue',  value: `₹${(an.couponRevenue||0).toLocaleString()}` },
              ].map((r,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom: i<3?'1px solid var(--border)':'none' }}>
                  <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>{r.label}</span>
                  <strong style={{ fontSize:'14px' }}>{r.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
