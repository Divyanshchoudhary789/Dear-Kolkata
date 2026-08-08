import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { ThumbsUp, ThumbsDown, Loader } from 'lucide-react';

const DisputeQueue = () => {
  const { orders, resolveAdminDispute } = useContext(AppContext);
  const [notes,     setNotes]     = useState({});
  const [loadingId, setLoadingId] = useState('');

  const disputed = orders.filter(o => o.status === 'Disputed');

  const getId = (o) => o._id || o.id;
  const getVendorName = (o) => {
    if (typeof o.vendor === 'object') return o.vendor?.name || '—';
    return '—';
  };

  const handleResolve = async (order, favorClient) => {
    const label = favorClient
      ? 'Rule in favour of Customer? Refund issued + payout cancelled.'
      : 'Rule in favour of Vendor? Payout released + refund declined.';
    if (!window.confirm(label)) return;

    const oid = getId(order);
    setLoadingId(oid);
    await resolveAdminDispute(oid, favorClient, notes[oid] || '');
    setLoadingId('');
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom:'24px' }}>
        <h2 style={{ margin:0, fontFamily:'var(--font-serif)', fontSize:'24px' }}>Return Dispute Queue</h2>
        <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>Arbitrate rejected 7-day return cases. Your decision is final.</span>
      </div>

      {disputed.length === 0 ? (
        <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'48px', textAlign:'center', color:'var(--text-muted)' }}>
          No pending disputes. All cases resolved.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          {disputed.map(o => {
            const oid  = getId(o);
            const busy = loadingId === oid;
            return (
              <div key={oid} style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
                {/* Header */}
                <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid var(--border)', paddingBottom:'12px', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <strong style={{ fontSize:'15px' }}>{o.orderNumber || oid}</strong>
                      <span className="badge-status disputed">DISPUTED</span>
                    </div>
                    <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>Store: <strong>{getVendorName(o)}</strong></span>
                  </div>
                  <strong style={{ fontSize:'16px', color:'var(--crimson)' }}>₹{o.totalAmount}</strong>
                </div>

                {/* Reason cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ backgroundColor:'var(--bg-festive)', padding:'16px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
                    <h4 style={{ margin:'0 0 6px 0', fontSize:'12px', fontWeight:'800', color:'var(--crimson)' }}>Client Return Reason</h4>
                    <p style={{ margin:0, fontSize:'13px', lineHeight:'1.4' }}>"{o.returnRequest?.reason || '—'}"</p>
                  </div>
                  <div style={{ backgroundColor:'#FFFBEB', padding:'16px', borderRadius:'var(--radius-sm)', border:'1px solid #FEF3C7' }}>
                    <h4 style={{ margin:'0 0 6px 0', fontSize:'12px', fontWeight:'800', color:'var(--gold)' }}>Vendor Rejection Reason</h4>
                    <p style={{ margin:0, fontSize:'13px', lineHeight:'1.4' }}>"{o.returnRequest?.rejectReason || '—'}"</p>
                  </div>
                </div>

                {/* Admin notes */}
                <div className="form-group" style={{ marginBottom:'16px' }}>
                  <label style={{ fontSize:'12px' }}>Admin Resolution Notes (optional)</label>
                  <input type="text" placeholder="Internal notes for this decision..." value={notes[oid]||''} onChange={e=>setNotes(p=>({...p,[oid]:e.target.value}))}/>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end', borderTop:'1px solid var(--border)', paddingTop:'16px', flexWrap: 'wrap' }}>
                  <button className="btn-outline-white" style={{ color:'#059669', borderColor:'#A7F3D0', padding:'8px 16px', fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}
                    onClick={() => handleResolve(o, false)} disabled={busy}>
                    {busy ? <Loader size={14}/> : <ThumbsUp size={14}/>} Favour Vendor
                  </button>
                  <button className="btn-primary" style={{ width:'auto', padding:'8px 16px', fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}
                    onClick={() => handleResolve(o, true)} disabled={busy}>
                    {busy ? <Loader size={14}/> : <ThumbsDown size={14}/>} Favour Client
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DisputeQueue;
