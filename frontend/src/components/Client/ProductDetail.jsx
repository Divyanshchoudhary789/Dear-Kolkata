import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { ShoppingBag, ArrowLeft, Shield, Check, Truck } from 'lucide-react';

const ProductDetail = ({ product, setActiveTab }) => {
  const { addToCart } = useContext(AppContext);
  const [added, setAdded] = useState(false);

  if (!product) return (
    <div style={{ textAlign: 'center', padding: '48px' }}>
      <p>No product selected.</p>
      <button className="btn-primary" style={{ width: 'auto', display: 'inline-flex' }} onClick={() => setActiveTab('shop')}>Back to Shop</button>
    </div>
  );

  // Support both populated vendor object and bare ID
  const vendor     = product.vendor || {};
  const vendorName = vendor.name || '—';
  const getImg     = () => product.images?.[0]?.url || product.images?.[0] || '';
  const category   = product.category || '';

  const handleAdd = () => {
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="animate-fade-in">
      <button onClick={() => setActiveTab('shop')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Catalog
      </button>

      <div className="product-detail-layout">
        {/* Gallery */}
        <div className="product-detail-gallery">
          <img src={getImg()} alt={product.name} onError={e => { e.target.style.background = 'var(--bg-festive)'; }} />
        </div>

        {/* Info */}
        <div className="product-detail-info">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--gold)', letterSpacing: '0.5px' }}>{category.toUpperCase()} Collection</span>
            </div>

            <h1 className="product-detail-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 4vw, 32px)', margin: '0 0 16px 0', lineHeight: '1.2' }}>{product.name}</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sold by:</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--crimson)' }}>{vendorName}</span>
              <span style={{ fontSize: '12px', color: '#10B981', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>Kolkata Verified</span>
            </div>

            <div className="product-detail-price">₹{product.price}</div>

            <div className="product-detail-desc">{product.description || 'Celebrate the festive season with this beautiful handcrafted masterpiece sourced directly from Kolkata boutiques.'}</div>

            {(product.tags || []).length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {product.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-festive)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: '50px' }}>{tag}</span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '16px 0', marginBottom: '24px' }}>
              <Truck size={18} style={{ color: 'var(--crimson)' }} />
              <span>{product.deliveryEstimate || 'Standard delivery within 24-48 Hours in Kolkata.'}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', backgroundColor: product.returnPolicy ? '#F0FDF4' : '#FFFBEB', padding: '16px', borderRadius: 'var(--radius-sm)', border: `1px solid ${product.returnPolicy ? '#DCFCE7' : '#FEF3C7'}`, marginBottom: '24px' }}>
              <Shield size={20} style={{ color: product.returnPolicy ? '#10B981' : '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '14px', display: 'block', color: product.returnPolicy ? '#065F46' : '#92400E' }}>
                  {product.returnPolicy ? '7-Day Return Policy Enabled' : 'Final Sale — No Returns'}
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', display: 'block', marginTop: '2px' }}>
                  {product.returnPolicy ? 'Request a return on My Orders within 7 days of delivery.' : 'This vendor has disabled returns on this product.'}
                </span>
              </div>
            </div>
          </div>

          <button className="btn-primary" style={{ padding: '16px 24px', fontSize: '16px' }} onClick={handleAdd}>
            {added ? <><Check size={18} /> Added to Cart!</> : <><ShoppingBag size={18} /> Add to Gifting Cart</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
