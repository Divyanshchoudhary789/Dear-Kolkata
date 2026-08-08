import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { Sparkles, MapPin, Wallet, Truck, Gift, ShoppingBag, ArrowRight, Shield, Loader, Tag, Gem, Footprints, Shirt, Utensils, Crown } from 'lucide-react';

const RELATIONSHIPS = [
  { id:'wife',       name:'For Your Wife',       sub:'Banarasi & Gold Jewellery',     tag:'For Your Wife',       image:'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600', badge:'Festive Special' },
  { id:'gf',         name:'For Your Girlfriend', sub:'Dhakai Jamdanis & Apparels',    tag:'For Your Girlfriend', image:'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=600', badge:'Trending' },
  { id:'loved',      name:'For Your Loved One',  sub:'Royal Kurtas & Sweet Platters', tag:'For Your Loved One',  image:'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?auto=format&fit=crop&q=80&w=600', badge:'Popular' },
  { id:'colleagues', name:'For Your Colleagues', sub:'Puja Sweets & Ethnic Footwear', tag:'For Your Colleagues', image:'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=600', badge:'Corporate' },
];

const CAT_ICONS = {
  jewellery: <Gem size={22} />,
  footwear: <Footprints size={22} />,
  sarees: <Shirt size={22} />,
  apparel: <Shirt size={22} />,
  food: <Utensils size={22} />,
  luxury: <Crown size={22} />,
};

const ClientHome = ({ setActiveTab, setSelectedProduct, setProductFilter }) => {
  const { products, categories, loadingProducts, coupons, packages } = useContext(AppContext);

  const getImg  = (p) => p.images?.[0]?.url || p.images?.[0] || '';
  const getPid  = (p) => p._id || p.id;
  const featured = products.filter(p => p.status === 'Approved' && p.isActive !== false).slice(0, 8);
  const topCoupons = coupons.filter(c => c.status === 'Approved').slice(0, 4);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
          <div className="hero-tag">
            <Sparkles size={13} style={{ color: 'var(--gold-metallic)' }} />
            <span>Kolkata's Premier Gifting Platform</span>
          </div>
          <h1 className="hero-title">
            Celebrate Relationships with Vetted Local Gifts
          </h1>
          <p className="hero-desc">
            Handloom sarees, gold jewellery from Bowbazar, and authentic Pujo thalis.
            Shop directly from verified Kolkata vendors or grab exclusive discount coupons.
          </p>
          <div className="hero-actions">
            <button className="btn-gold" onClick={() => { setProductFilter({ category:'', tag:'' }); setActiveTab('shop'); }}>
              <ShoppingBag size={16}/> Explore Catalog
            </button>
            <button className="btn-outline-white" onClick={() => setActiveTab('coupon-market')}>
              <Tag size={16}/> View Coupons
            </button>
          </div>
        </div>
      </div>

      {/* ── Trust Rail ────────────────────────────────────────────── */}
      <div className="trust-rail">
        {[
          { icon: <Sparkles size={18}/>, text: '100% Handcrafted',       sub: 'Pure silk & certified fabrics' },
          { icon: <MapPin size={18}/>,   text: 'Verified Boutiques',      sub: 'Bowbazar & Gariahat sellers' },
          { icon: <Wallet size={18}/>,   text: 'Wallet Cashbacks',        sub: 'Earn on every redemption' },
          { icon: <Truck size={18}/>,    text: 'Kolkata-Only Delivery',   sub: 'Within 24-48 hours' },
        ].map((item, i) => (
          <div key={i} className="trust-item">
            <div className="trust-icon-container">{item.icon}</div>
            <div>
              <div className="trust-text">{item.text}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Shop by Relationship ───────────────────────────────────── */}
      <div style={{ marginBottom: '40px' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Shop by Relationship</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Handpicked festive presents for every loved one</p>
          </div>
          <button onClick={() => setActiveTab('shop')} className="section-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            View All <ArrowRight size={14}/>
          </button>
        </div>
        <div className="grid-occasions">
          {RELATIONSHIPS.map(rel => (
            <div key={rel.id} className="occasion-card" onClick={() => { setProductFilter({ category:'', tag: rel.tag }); setActiveTab('shop'); }}>
              <img src={rel.image} alt={rel.name} loading="lazy"/>
              <div className="occasion-overlay">
                <span className="occasion-badge">{rel.badge}</span>
                <span className="occasion-name">{rel.name}</span>
                <span className="occasion-sub">{rel.sub}</span>
              </div>
            </div>
          ))}
          <div className="occasion-card" onClick={() => { setProductFilter({ category:'', tag:'' }); setActiveTab('shop'); }}>
            <div style={{ background: 'linear-gradient(135deg,var(--crimson-dark),var(--crimson))', height:'100%', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center', padding:'20px' }}>
              <Gift size={28} style={{ color: 'var(--gold-metallic)', marginBottom: '10px' }} />
              <span className="occasion-name" style={{ fontSize: '15px' }}>View All</span>
              <span className="occasion-sub" style={{ color: 'var(--gold-light)', display:'flex', alignItems:'center', gap:'4px', marginTop:'6px', fontSize:'11px' }}>Catalog <ArrowRight size={12}/></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Heritage Categories ────────────────────────────────────── */}
      <div style={{ marginBottom: '40px' }}>
        <div className="section-header">
          <h2 className="section-title">Heritage Categories</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '12px' }}>
          {categories.map(cat => (
            <div key={cat.id} className="category-chip"
              onClick={() => { setProductFilter({ category: cat.id, tag:'' }); setActiveTab('shop'); }}>
              <span style={{ fontSize: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crimson)' }}>
                {CAT_ICONS[cat.id] || <Gift size={22} />}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{cat.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--crimson)', fontWeight: '600' }}>{cat.commission}% cashback</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured Coupons (if any) ───────────────────────────────── */}
      {topCoupons.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">Hot Deals</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Exclusive coupons from verified boutiques</p>
            </div>
            <button onClick={() => setActiveTab('coupon-market')} className="section-link" style={{ background:'none', border:'none', cursor:'pointer' }}>
              All Coupons <ArrowRight size={14}/>
            </button>
          </div>
          <div className="grid-marketplace">
            {topCoupons.map(c => {
              const cid = c._id || c.id;
              return (
                <div key={cid} className="coupon-card" onClick={() => setActiveTab('coupon-market')} style={{ cursor:'pointer' }}>
                  <div className="coupon-card-header">
                    <span className="coupon-badge-top" style={{ backgroundColor: c.price === 0 ? '#D1FAE5' : 'var(--gold-light)', color: c.price === 0 ? '#065F46' : 'var(--gold)' }}>
                      {c.price === 0 ? 'FREE' : `₹${c.price}`}
                    </span>
                    <div className="coupon-discount">
                      {c.type === 'percentage' && `${c.value}% OFF`}
                      {c.type === 'flat'       && `₹${c.value} Back`}
                      {c.type === 'bogo'       && 'B1G1 FREE'}
                    </div>
                    <div className="coupon-vendor">{c.vendor?.name || 'Store'}</div>
                  </div>
                  <div className="coupon-card-body">
                    <strong style={{ fontSize: '13px', display:'block', marginBottom:'6px' }}>{c.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Valid till {c.validityEnd ? new Date(c.validityEnd).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}
                    </span>
                    <div className="coupon-meta" style={{ marginTop:'10px' }}>
                      <span>Timer: {c.codeTimerHours}h</span>
                      <span style={{ color:'var(--crimson)', fontWeight:'700' }}>Claim →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Trending Products ──────────────────────────────────────── */}
      <div>
        <div className="section-header">
          <div>
            <h2 className="section-title">Trending Gifts</h2>
            <p style={{ margin:'4px 0 0', fontSize:'13px', color:'var(--text-muted)' }}>From Bowbazar, Lindsay Street & Gariahat</p>
          </div>
          <button onClick={() => { setProductFilter({ category:'', tag:'' }); setActiveTab('shop'); }} className="section-link" style={{ background:'none', border:'none', cursor:'pointer' }}>
            See All <ArrowRight size={14}/>
          </button>
        </div>

        {loadingProducts && featured.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px' }}><Loader size={28} className="spin" style={{ color:'var(--crimson)' }}/></div>
        ) : (
          <div className="grid-marketplace">
            {featured.map(prod => (
              <div key={getPid(prod)} className="product-card" onClick={() => { setSelectedProduct(prod); setActiveTab('product-detail'); }}>
                <div className="product-image">
                  <img src={getImg(prod)} alt={prod.name} loading="lazy" onError={e => { e.target.style.display='none'; }}/>
                  {prod.returnPolicy && <span className="product-policy-badge"><Shield size={10} style={{ color:'#10B981' }}/> 7-Day Return</span>}
                </div>
                <div className="product-card-body">
                  <div>
                    <span className="product-vendor">{prod.vendor?.name || 'Kolkata Artisan'}</span>
                    <h3 className="product-name">{prod.name}</h3>
                  </div>
                  <div className="product-footer">
                    <span className="product-price">₹{prod.price.toLocaleString()}</span>
                    <span style={{ fontSize:'11px', color:'var(--gold)', fontWeight:'700' }}>View →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientHome;
