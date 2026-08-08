import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { ArrowRight, AlertTriangle, Loader, Package, MapPin, RefreshCw } from 'lucide-react';

const STATUS_COLOR = { Placed:'#2563EB', Packed:'#D97706', Shipped:'#0284C7', Delivered:'#059669' };
const STATUS_BG    = { Placed:'#DBEAFE', Packed:'#FEF3C7', Shipped:'#E0F2FE', Delivered:'#D1FAE5' };
const NEXT_STATUS  = { Placed:'Packed', Packed:'Shipped', Shipped:'Delivered' };
const NEXT_LABEL   = { Placed:'Mark as Packed', Packed:'Mark as Shipped', Shipped:'Mark as Delivered' };

const OrderQueue = () => {
  const { orders, updateOrderStatus, handleReturnDecision, fetchVendorData, loadingOrders } = useContext(AppContext);
  const [rejectMap,      setRejectMap]      = useState({});
  const [activeReturnId, setActiveReturnId] = useState('');
  const [loadingId,      setLoadingId]      = useState('');

  const getId      = (o) => o._id || o.id;
  const getItemImg  = (item) => item.productSnapshot?.image || item.image || '';
  const getItemName = (item) => item.productSnapshot?.name || item.name || '—';

  const handleNext = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    const oid = getId(order);
    setLoadingId(oid);
    await updateOrderStatus(oid, next);
    setLoadingId('');
  };

  const handleReturnAction = async (order, approve) => {
    const oid = getId(order);
    if (approve) {
      if (!window.confirm('Approve return? Client will be refunded and your payout cancelled.')) return;
      setLoadingId(oid);
      await handleReturnDecision(oid, true);
      setLoadingId('');
    } else {
      const reason = rejectMap[oid] || '';
      if (!reason.trim()) { alert('Please state a reason for declining.'); return; }
      setLoadingId(oid);
      await handleReturnDecision(oid, false, reason);
      setLoadingId('');
      setActiveReturnId('');
    }
  };

  if (orders.length === 0) {
    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '22px' }}>Fulfilment Queue</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Manage packing, shipping and returns</p>
        </div>
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Package size={32} style={{ marginBottom: '12px', opacity: 0.4 }}/>
          <p style={{ margin: 0 }}>No orders received yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '22px' }}>Fulfilment Queue</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{orders.length} order{orders.length !== 1 ? 's' : ''} · Pack, ship and verify deliveries</p>
        </div>
        <button onClick={fetchVendorData} disabled={loadingOrders}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          {loadingOrders ? <Loader size={14} className="spin"/> : <RefreshCw size={14}/>} Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {orders.map(o => {
          const oid   = getId(o);
          const color = STATUS_COLOR[o.status] || '#6B7280';
          const bg    = STATUS_BG[o.status]    || '#F3F4F6';
          const busy  = loadingId === oid;

          return (
            <div key={oid} className="order-queue-card">
              {/* ── Card header ── */}
              <div className="order-queue-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                  <strong style={{ fontSize: '15px' }}>{o.orderNumber || oid}</strong>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', backgroundColor: bg, color, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {o.status}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--crimson)' }}>₹{o.totalAmount?.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Net ₹{o.vendorPayout?.toLocaleString()} · {o.commissionRate}% comm.
                  </div>
                </div>
              </div>

              {/* ── Items + Delivery — stack on mobile ── */}
              <div className="order-queue-body">
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                    Items ({(o.items || []).length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(o.items || []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {getItemImg(item) && (
                          <img src={getItemImg(item)} alt="" loading="lazy"
                            style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, border: '1px solid var(--border)' }}/>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getItemName(item)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>×{item.quantity}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>₹{item.unitPrice || item.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-festive)', borderRadius: 'var(--radius-sm)', padding: '14px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={12}/> Delivery Info
                  </h4>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.7' }}>
                    <div>{o.deliveryAddress}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>PIN: {o.deliveryPin} · {o.deliverySlot}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      Customer: <strong>{o.client?.name || o.client?.phone || '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Action button ── */}
              {['Placed', 'Packed', 'Shipped'].includes(o.status) && (
                <div className="order-queue-action">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {o.status === 'Placed' ? 'Pack the items before dispatch'
                     : o.status === 'Packed' ? 'Hand off to courier'
                     : 'Confirm delivery to customer'}
                  </span>
                  <button className="btn-primary"
                    style={{ width: 'auto', padding: '9px 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                    onClick={() => handleNext(o)} disabled={busy}>
                    {busy ? <Loader size={14}/> : <>{NEXT_LABEL[o.status]} <ArrowRight size={14}/></>}
                  </button>
                </div>
              )}

              {/* ── Return request ── */}
              {o.status === 'ReturnRequested' && o.returnRequest && (
                <div style={{ borderTop: '1px dashed #C084FC', padding: '14px 20px', backgroundColor: '#F9F5FF', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
                  <div style={{ display: 'flex', gap: '8px', color: '#6B21A8', fontWeight: '700', fontSize: '13px', marginBottom: '12px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }}/>
                    <span>Return: "{o.returnRequest.reason}"</span>
                  </div>
                  {activeReturnId !== oid ? (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={() => setActiveReturnId(oid)}
                        style={{ flex: 1, minWidth: '120px', padding: '9px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                        Decline
                      </button>
                      <button onClick={() => handleReturnAction(o, true)} disabled={busy}
                        style={{ flex: 1, minWidth: '120px', padding: '9px', border: 'none', backgroundColor: '#059669', color: '#fff', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {busy ? <Loader size={13}/> : 'Approve & Refund'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: '700' }}>Reason for Declining *</label>
                        <input type="text" placeholder="e.g. Item returned in used condition"
                          value={rejectMap[oid] || ''} onChange={e => setRejectMap(p => ({ ...p, [oid]: e.target.value }))}/>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => setActiveReturnId('')}
                          style={{ flex: 1, minWidth: '100px', padding: '8px', border: '1px solid var(--border)', background: '#fff', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontSize: '13px', cursor: 'pointer' }}>
                          Cancel
                        </button>
                        <button onClick={() => handleReturnAction(o, false)} disabled={busy}
                          style={{ flex: 1, minWidth: '100px', padding: '8px', border: 'none', backgroundColor: '#EF4444', color: '#fff', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          {busy ? <Loader size={12}/> : 'Decline & Escalate'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderQueue;
