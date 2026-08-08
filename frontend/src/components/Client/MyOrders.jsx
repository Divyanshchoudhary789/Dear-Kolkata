import React, { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../context/AppContext';
import { ShoppingBag, ChevronDown, ChevronUp, AlertCircle, RefreshCw, CheckCircle, Clock, Loader } from 'lucide-react';
import { showError } from '../../utils/toast';

const MyOrders = () => {
  const { orders, requestReturn, fetchMyOrders, loadingOrders } = useContext(AppContext);
  const [expandedId, setExpandedId]       = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnOrderId, setReturnOrderId]   = useState('');
  const [returnReason, setReturnReason]     = useState('');
  const [submitting, setSubmitting]         = useState(false);

  const getId = (o) => o._id || o.id;

  const getStatusClass = (s) => {
    const map = { Placed:'placed', Packed:'packed', Shipped:'shipped', Delivered:'delivered', ReturnRequested:'returned', Refunded:'refunded', Disputed:'disputed', Cancelled:'placed' };
    return map[s] || 'placed';
  };

  const getPaymentBadge = (order) => {
    const method = order.payment?.method;
    const status = order.payment?.status;
    if (method === 'cod' && status === 'pending') return { label: 'COD – Pay on Delivery', color: '#D97706', bg: '#FFFBEB' };
    if (method === 'cod' && status === 'completed') return { label: 'COD – Paid', color: '#059669', bg: '#ECFDF5' };
    if (method === 'wallet') return { label: 'Paid via Wallet', color: '#7C3AED', bg: '#F5F3FF' };
    if (status === 'completed') return { label: 'Payment Received', color: '#059669', bg: '#ECFDF5' };
    if (status === 'failed') return { label: 'Payment Failed', color: '#DC2626', bg: '#FEF2F2' };
    return null;
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) { showError('Please state a reason for the return'); return; }
    setSubmitting(true);
    await requestReturn(returnOrderId, returnReason);
    setSubmitting(false);
    setShowReturnModal(false);
    setReturnReason('');
  };

  // Check 7-day return window
  const isReturnWindowOpen = (order) => {
    if (!order.returnPolicy || order.status !== 'Delivered') return false;
    const deliveredAt = order.deliveredAt || order.statusTimeline?.find(s => s.status === 'Delivered')?.timestamp;
    if (!deliveredAt) return false;
    return Date.now() - new Date(deliveredAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-title-banner">
        <div>
          <h2>Your Orders</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Monitor shipment status and manage return windows</p>
        </div>
        <button onClick={fetchMyOrders} disabled={loadingOrders} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          {loadingOrders ? <Loader size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      {loadingOrders && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}><Loader size={24} className="spin" /></div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '48px' }}>
          <ShoppingBag size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-muted)' }}>No orders placed yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map(o => {
            const oid = getId(o);
            const isExpanded = expandedId === oid;
            const vendorName = o.vendor?.name || '—';
            const returnOpen = isReturnWindowOpen(o);

            return (
              <div key={oid} style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                {/* Summary row */}
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }} onClick={() => setExpandedId(isExpanded ? null : oid)}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '14px', wordBreak: 'break-word' }}>Order {o.orderNumber || oid}</strong>
                      <span className={`badge-status ${getStatusClass(o.status)}`}>{o.status}</span>
                      {(() => {
                        const badge = getPaymentBadge(o);
                        return badge ? (
                          <span style={{
                            fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                            borderRadius: '12px', backgroundColor: badge.bg, color: badge.color,
                            border: `1px solid ${badge.color}33`,
                          }}>
                            {badge.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(o.createdAt).toLocaleDateString()} • <strong>{vendorName}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--crimson)' }}>₹{o.totalAmount}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.items?.length || 0} item(s)</div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '24px', backgroundColor: 'var(--bg-festive)' }}>
                    {/* Status timeline */}
                    {['Placed','Packed','Shipped','Delivered'].includes(o.status) && (
                      <div className="timeline">
                        {['Placed','Packed','Shipped','Delivered'].map((step, i) => {
                          const idx = ['Placed','Packed','Shipped','Delivered'].indexOf(o.status);
                          const isCompleted = i <= idx;
                          const isActive    = i === idx;
                          return (
                            <div key={step} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                              <div className="timeline-node">{isCompleted ? <CheckCircle size={14} /> : <Clock size={14} />}</div>
                              <div className="timeline-label">{step}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Status alerts */}
                    {o.status === 'Refunded'        && <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 'var(--radius-sm)', color: '#991B1B', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}><AlertCircle size={16} /><span><strong>Refund Credited:</strong> ₹{o.totalAmount} returned to your wallet.</span></div>}
                    {o.status === 'Disputed'        && <div style={{ padding: '12px 16px', backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 'var(--radius-sm)', color: '#9A3412', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}><AlertCircle size={16} /><span><strong>Under Review:</strong> Support team is reviewing the dispute.</span></div>}
                    {o.status === 'ReturnRequested' && <div style={{ padding: '12px 16px', backgroundColor: '#F3E8FF', border: '1px solid #E9D5FF', borderRadius: 'var(--radius-sm)', color: '#6B21A8', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}><Clock size={16} /><span><strong>Return Pending:</strong> Vendor is reviewing your request.</span></div>}

                    {/* Items */}
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700' }}>Items</h4>
                    <div style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '20px' }}>
                      {(o.items || []).map((item, idx) => {
                        const img = item.productSnapshot?.image || item.images?.[0]?.url || item.image || '';
                        return (
                          <div key={idx} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: idx < o.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            {img && <img src={img} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.productSnapshot?.name || item.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Qty: {item.quantity} • ₹{item.unitPrice || item.price}</div>
                            </div>
                            <strong style={{ fontSize: '13px' }}>₹{item.subtotal || (item.price * item.quantity)}</strong>
                          </div>
                        );
                      })}
                    </div>

                    {/* Address + Return action */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', flex: 1, minWidth: '200px' }}>
                        <strong>Ship to:</strong> {o.deliveryAddress} ({o.deliveryPin})<br />
                        <strong>Slot:</strong> {o.deliverySlot}
                      </div>
                      {returnOpen && (
                        <button className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px', flexShrink: 0 }} onClick={() => { setReturnOrderId(oid); setShowReturnModal(true); }}>
                          Request 7-Day Return
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>File Return Request</h3>
              <button className="modal-close-btn" onClick={() => setShowReturnModal(false)}>✕</button>
            </div>
            <form onSubmit={handleReturnSubmit}>
              <div className="modal-body">
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>State your reason for returning this order. The vendor will review it within 24 hours.</p>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="reason-text">Reason for Return *</label>
                  <textarea id="reason-text" rows={3} required placeholder="e.g. Defective stitching / wrong size" value={returnReason} onChange={e => setReturnReason(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline-white" style={{ color: 'var(--text-main)', borderColor: 'var(--border)' }} onClick={() => setShowReturnModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <Loader size={14} /> : 'Submit Return'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MyOrders;
