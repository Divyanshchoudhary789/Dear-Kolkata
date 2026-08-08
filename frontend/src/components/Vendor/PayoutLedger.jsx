import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { Landmark, ArrowUpRight, Clock, CheckCircle, ShieldAlert, Loader, RefreshCw } from 'lucide-react';
import * as vendorApi from '../../api/vendorApi';

const PayoutLedger = () => {
  const { vendorProfile } = useContext(AppContext);
  const [payouts,  setPayouts]  = useState([]);
  const [summary,  setSummary]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await vendorApi.getVendorPayouts();
      if (res?.success) { setPayouts(res.data.payouts || []); setSummary(res.data.summary || []); }
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const getStatusVal = (key) => summary.find(s => s._id === key)?.total || 0;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ margin:0, fontFamily:'var(--font-serif)', fontSize:'24px' }}>Payouts &amp; Settlement</h2>
          <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>Commission deductions and upcoming payout dates.</span>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'8px 14px', cursor: refreshing ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', opacity: refreshing ? 0.6 : 1 }}
        >
          {refreshing ? <Loader size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="analytics-grid" style={{ marginBottom:'32px' }}>
        {[
          { label:'Released',         val: getStatusVal('released'), icon:<CheckCircle size={20}/>, color:'#10B981', bg:'#ECFDF5' },
          { label:'Scheduled / Held', val: getStatusVal('scheduled') + getStatusVal('held'), icon:<Clock size={20}/>, color:'#D97706', bg:'#FEF3C7' },
          { label:'Total Paid Out',   val: getStatusVal('released'), icon:<ArrowUpRight size={20}/>, color:'var(--crimson)', bg:'var(--crimson-light)' },
          { label:'Cancelled',        val: getStatusVal('cancelled'), icon:<Landmark size={20}/>, color:'#0284C7', bg:'#E0F2FE' },
        ].map((c,i) => (
          <div key={i} className="analytics-card">
            <div className="analytics-icon" style={{ backgroundColor:c.bg, color:c.color }}>{c.icon}</div>
            <div className="analytics-info"><div className="value">₹{c.val.toLocaleString()}</div><div className="label">{c.label}</div></div>
          </div>
        ))}
      </div>

      {/* Rules box */}
      <div style={{ backgroundColor:'#EFF6FF', border:'1px solid #BFDBFE', padding:'16px', borderRadius:'var(--radius-sm)', color:'#1E40AF', fontSize:'13px', display:'flex', gap:'10px', alignItems:'flex-start', marginBottom:'24px' }}>
        <ShieldAlert size={18} style={{ color:'#2563EB', flexShrink:0, marginTop:'2px' }}/>
        <div>
          <strong>Settlement Rules:</strong>
          <ul style={{ margin:'4px 0 0 0', paddingLeft:'20px', lineHeight:'1.5' }}>
            <li><strong>Return policy OFF:</strong> Payout released immediately on delivery.</li>
            <li><strong>Return policy ON:</strong> Payout held T+7 days from delivery, auto-released if no return raised.</li>
          </ul>
        </div>
      </div>

      {/* Payouts table */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
        {loading ? (
          <div style={{ padding:'48px', textAlign:'center' }}><Loader size={24} className="spin" style={{ color:'var(--crimson)' }}/></div>
        ) : payouts.length === 0 ? (
          <div style={{ padding:'48px', textAlign:'center', color:'var(--text-muted)' }}>No payout records yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="tx-table">
              <thead>
                <tr><th>Order</th><th>Order Total</th><th>Commission</th><th>Net Payout</th><th>Status</th><th>Scheduled</th></tr>
              </thead>
              <tbody>
                {payouts.map(p => {
                  const pid = p._id || p.id;
                  return (
                    <tr key={pid}>
                      <td style={{ fontWeight:'600' }}>{p.order?.orderNumber || '—'}</td>
                      <td>₹{p.orderTotal}</td>
                      <td>{p.commissionRate}% = ₹{p.commissionDeducted}</td>
                      <td style={{ fontWeight:'700', color:'var(--crimson)' }}>₹{p.amount}</td>
                      <td>
                        {p.status === 'released' && <span style={{ color:'#059669', fontWeight:'600', fontSize:'12px', display:'inline-flex', alignItems:'center', gap:'4px' }}><CheckCircle size={12}/> Released</span>}
                        {p.status === 'scheduled' && <span style={{ color:'#D97706', fontWeight:'600', fontSize:'12px', display:'inline-flex', alignItems:'center', gap:'4px' }}><Clock size={12}/> T+7 Hold</span>}
                        {p.status === 'held'      && <span style={{ color:'#D97706', fontWeight:'600', fontSize:'12px' }}>On Hold</span>}
                        {p.status === 'cancelled' && <span style={{ color:'#EF4444', fontWeight:'600', fontSize:'12px' }}>Cancelled</span>}
                        {p.status === 'pending'   && <span style={{ color:'var(--text-muted)', fontWeight:'600', fontSize:'12px' }}>Pending</span>}
                      </td>
                      <td style={{ color:'var(--text-muted)', fontSize:'13px' }}>
                        {p.scheduledFor ? new Date(p.scheduledFor).toLocaleDateString() : p.releasedAt ? new Date(p.releasedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutLedger;
