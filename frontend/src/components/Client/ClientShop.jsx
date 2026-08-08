import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { Search, SlidersHorizontal, X, Eye, Shield, Loader } from 'lucide-react';

const TAGS = ['For Your Wife','For Your Girlfriend','For Your Loved One','For Your Colleagues'];

const ClientShop = ({ setActiveTab, setSelectedProduct, filter, setFilter }) => {
  const { products, categories, loadingProducts } = useContext(AppContext);
  const [search,      setSearch]      = useState('');
  const [selectedCat, setSelectedCat] = useState(filter.category || '');
  const [selectedTag, setSelectedTag] = useState(filter.tag || '');
  const [maxPrice,    setMaxPrice]    = useState(25000);
  const [showFilter,  setShowFilter]  = useState(false);

  useEffect(() => {
    setSelectedCat(filter.category || '');
    setSelectedTag(filter.tag || '');
  }, [filter]);

  const getPid     = (p) => p._id || p.id;
  const getImg     = (p) => p.images?.[0]?.url || p.images?.[0] || '';
  const getVendorName = (p) => p.vendor?.name || '—';

  const filtered = products.filter(p => {
    if (p.status !== 'Approved' || !p.isActive) return false;
    const s = search.toLowerCase();
    if (s && !p.name.toLowerCase().includes(s) && !p.description?.toLowerCase().includes(s)) return false;
    if (selectedCat && p.category !== selectedCat) return false;
    if (selectedTag && !(p.tags || []).includes(selectedTag)) return false;
    if (p.price > maxPrice) return false;
    return true;
  });

  const clearFilters = () => {
    setSelectedCat(''); setSelectedTag(''); setMaxPrice(25000); setSearch('');
    setFilter({ category: '', tag: '' });
  };

  const activeFilterCount = [selectedCat, selectedTag, maxPrice < 25000].filter(Boolean).length;

  const FilterPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Category</label>
        <select className="filter-select" style={{ width: '100%' }} value={selectedCat}
          onChange={e => { setSelectedCat(e.target.value); setFilter(p => ({ ...p, category: e.target.value })); }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>For Whom</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {TAGS.map(t => (
            <button key={t} onClick={() => { const v = selectedTag === t ? '' : t; setSelectedTag(v); setFilter(p => ({ ...p, tag: v })); }}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: selectedTag === t ? 'var(--crimson-light)' : '#fff', color: selectedTag === t ? 'var(--crimson)' : 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', borderColor: selectedTag === t ? 'var(--crimson)' : 'var(--border)' }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
          Max Price: <span style={{ color: 'var(--crimson)' }}>₹{maxPrice.toLocaleString()}</span>
        </label>
        <input type="range" min={500} max={25000} step={500} value={maxPrice}
          onChange={e => setMaxPrice(+e.target.value)}
          style={{ width: '100%', accentColor: 'var(--crimson)' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>₹500</span><span>₹25,000</span>
        </div>
      </div>
      {activeFilterCount > 0 && (
        <button onClick={clearFilters} style={{ width: '100%', padding: '9px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', color: 'var(--crimson)', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
          Clear all filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Header row */}
      <div className="page-title-banner">
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '22px' }}>Festive Catalog</h2>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }}/>
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '9px 14px 9px 34px', border: '1px solid var(--border)', borderRadius: '24px', fontSize: '13px', outline: 'none', width: '180px', fontFamily: 'var(--font-sans)', background: '#fff' }}/>
          </div>
          {/* Mobile filter button — only visible on mobile via CSS */}
          <button className="mobile-filter-btn" onClick={() => setShowFilter(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: '#fff', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: activeFilterCount > 0 ? 'var(--crimson)' : 'var(--text-muted)' }}>
            <SlidersHorizontal size={15}/>
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '20px' }} className="shop-outer">
        <div className="shop-inner" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px' }}>
          {/* Desktop sidebar */}
          <aside className="shop-sidebar-desktop">
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Filter Products</h3>
            <FilterPanel/>
          </aside>

          {/* Product grid */}
          <div>
            {loadingProducts && products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px' }}><Loader size={28} className="spin" style={{ color: 'var(--crimson)' }}/></div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '48px' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No products match your filters.</p>
                {activeFilterCount > 0 && <button onClick={clearFilters} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>Clear Filters</button>}
              </div>
            ) : (
              <div className="grid-marketplace">
                {filtered.map(p => (
                  <div key={getPid(p)} className="product-card" onClick={() => { setSelectedProduct(p); setActiveTab('product-detail'); }}>
                    <div className="product-image">
                      <img src={getImg(p)} alt={p.name} loading="lazy" onError={e => { e.target.style.display = 'none'; }}/>
                      <span className="product-policy-badge">
                        {p.returnPolicy ? <><Shield size={10} style={{ color: '#10B981' }}/> 7-Day Return</> : 'Final Sale'}
                      </span>
                    </div>
                    <div className="product-card-body">
                      <div>
                        <span className="product-vendor">{getVendorName(p)}</span>
                        <h3 className="product-name">{p.name}</h3>
                      </div>
                      <div className="product-footer">
                        <span className="product-price">₹{p.price.toLocaleString()}</span>
                        <span style={{ fontSize: '12px', color: 'var(--crimson)', fontWeight: '600' }}>View →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilter && (
        <div className="modal-overlay" onClick={() => setShowFilter(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)' }}>Filter Products</h3>
              <button onClick={() => setShowFilter(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={22}/></button>
            </div>
            <FilterPanel/>
            <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowFilter(false)}>
              Show {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientShop;
