import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { Trash2, Calendar, MapPin, ArrowRight, ShoppingBag } from 'lucide-react';

const Cart = ({ setActiveTab, setCheckoutDetails }) => {
  const { cart, updateCartQuantity, clientProfile } = useContext(AppContext);

  const addresses = clientProfile?.addresses || [];
  const [selectedAddrId, setSelectedAddrId] = useState(addresses[0]?._id || addresses[0]?.id || '');
  const [deliverySlot, setDeliverySlot] = useState('12:00 PM - 04:00 PM');

  const subtotal    = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 2000 ? 0 : 150;
  const grandTotal  = subtotal + deliveryFee;

  const getProductId = (item) => item._id || item.id;

  const handleProceed = () => {
    const addr = addresses.find(a => (a._id || a.id) === selectedAddrId) || addresses[0];
    setCheckoutDetails({
      address: addr?.text || 'Kolkata Address',
      pin:     addr?.pin  || '700019',
      slot:    deliverySlot,
      subtotal,
      deliveryFee,
      grandTotal,
    });
    setActiveTab('checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '64px 24px', boxShadow: 'var(--shadow-sm)' }}>
        <div className="trust-icon-container" style={{ margin: '0 auto 20px auto', width: '56px', height: '56px' }}>
          <ShoppingBag size={24} style={{ color: 'var(--crimson)' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', margin: '0 0 12px 0' }}>Your Gifting Cart is Empty</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Add products from our seasonal collections to gift your loved ones.</p>
        <button className="btn-primary" style={{ display: 'inline-flex', width: 'auto' }} onClick={() => setActiveTab('shop')}>
          Browse Shop Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-title-banner">
        <div>
          <h2>Your Gifting Cart</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Review products and configure your delivery details</p>
        </div>
      </div>

      <div className="cart-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Cart Items */}
          <div className="cart-items-list">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              Items in Cart ({cart.length})
            </h3>
            {cart.map(item => {
              const pid = getProductId(item);
              const img = item.images?.[0]?.url || item.images?.[0] || '';
              return (
                <div key={pid} className="cart-item-row">
                  <img src={img} alt={item.name} className="cart-item-img" onError={e => e.target.style.display='none'} />
                  <div className="cart-item-details">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-vendor">₹{item.price} • Return: {item.returnPolicy ? 'Available' : 'No'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div className="cart-item-qty">
                      <button onClick={() => updateCartQuantity(pid, item.quantity - 1)}>-</button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: '600' }}>{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(pid, item.quantity + 1)}>+</button>
                    </div>
                    <div style={{ minWidth: '64px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>₹{item.price * item.quantity}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery Config */}
          <div className="cart-items-list">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} style={{ color: 'var(--crimson)' }} /> Delivery Destination &amp; Slot
            </h3>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Select Saved Kolkata Address</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {addresses.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No saved addresses. Please add one in your Profile.</p>
                ) : addresses.map(addr => {
                  const addrId = addr._id || addr.id;
                  return (
                    <label key={addrId} style={{ display: 'flex', gap: '10px', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: selectedAddrId === addrId ? 'var(--crimson-light)' : '#fff', borderColor: selectedAddrId === addrId ? 'var(--crimson)' : 'var(--border)' }}>
                      <input type="radio" name="deliveryAddress" value={addrId} checked={selectedAddrId === addrId} onChange={() => setSelectedAddrId(addrId)} style={{ marginTop: '3px' }} />
                      <div>
                        <strong style={{ fontSize: '14px' }}>{addr.label} ({addr.pin})</strong>
                        <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{addr.text}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> Choose Delivery Time Slot</label>
              <select className="filter-select" style={{ width: '100%', padding: '12px' }} value={deliverySlot} onChange={e => setDeliverySlot(e.target.value)}>
                <option value="08:00 AM - 12:00 PM">Morning (08:00 AM - 12:00 PM)</option>
                <option value="12:00 PM - 04:00 PM">Afternoon (12:00 PM - 04:00 PM)</option>
                <option value="04:00 PM - 08:00 PM">Evening (04:00 PM - 08:00 PM)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="cart-summary animate-fade-in">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Checkout Summary</h3>
          <div className="summary-row"><span>Items Subtotal</span><span>₹{subtotal}</span></div>
          <div className="summary-row"><span>Delivery Charges</span><span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
          {deliveryFee > 0 && <div style={{ fontSize: '11px', color: 'var(--gold)', marginBottom: '12px', textAlign: 'right' }}>Add ₹{2000 - subtotal} more for free delivery</div>}
          <div className="summary-row summary-total"><span>Grand Total</span><span>₹{grandTotal}</span></div>
          <button className="btn-primary" style={{ marginTop: '24px' }} onClick={handleProceed} disabled={addresses.length === 0}>
            Proceed to Checkout <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
