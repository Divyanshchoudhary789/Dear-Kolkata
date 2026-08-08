import React, { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../context/AppContext';
import { Package, Plus, Edit2, Trash2, Loader } from 'lucide-react';

const TAGS = ['For Your Wife','For Your Girlfriend','For Your Loved One','For Your Colleagues'];
const CATS = ['sarees','jewellery','footwear','apparel','food','luxury'];

const ProductList = () => {
  const { products, addEditProduct, deleteProduct, vendorProfile } = useContext(AppContext);

  const skuCap  = vendorProfile?.skuCap || 20;
  const vendorId = vendorProfile?._id || vendorProfile?.id;

  // Filter products belonging to this vendor
  const vendorProducts = products.filter(p => {
    const pid = typeof p.vendor === 'object' ? (p.vendor?._id || p.vendor?.id) : p.vendor;
    return pid === vendorId || pid === vendorId?.toString();
  });
  const activeCount = vendorProducts.filter(p => p.status === 'Approved' && p.isActive !== false).length;

  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');

  // Form state
  const [name,          setName]          = useState('');
  const [category,      setCategory]      = useState('sarees');
  const [price,         setPrice]         = useState('');
  const [stock,         setStock]         = useState('');
  const [description,   setDescription]   = useState('');
  const [returnPolicy,  setReturnPolicy]  = useState(true);
  const [imageFiles,    setImageFiles]    = useState([]);
  const [tags,          setTags]          = useState([]);

  const openAdd = () => {
    if (activeCount >= skuCap) { alert(`SKU cap reached (${activeCount}/${skuCap}). Deactivate a product first.`); return; }
    setEditing(null); setName(''); setCategory('sarees'); setPrice(''); setStock('');
    setDescription(''); setReturnPolicy(true); setImageFiles([]); setTags([]); setFormError(''); setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setName(p.name); setCategory(p.category); setPrice(String(p.price)); setStock(String(p.stock));
    setDescription(p.description || ''); setReturnPolicy(p.returnPolicy);
    setImageFiles([]); setTags(p.tags || []);
    setFormError(''); setShowForm(true);
  };

  const handleTagToggle = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x!==t) : [...prev,t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !price || !stock || !description.trim()) {
      setFormError('Name, description, price and stock are required.');
      return;
    }
    if (imageFiles.length > 5) {
      setFormError('Upload up to 5 product images.');
      return;
    }
    setSaving(true); setFormError('');
    const payload = {
      name, category, price: +price, stock: +stock, description,
      returnPolicy, tags,
      imageFiles,
      ...(editing && { _id: editing._id || editing.id }),
    };
    const res = await addEditProduct(payload);
    setSaving(false);
    if (res?.success) { setShowForm(false); }
    else if (res?.error) { setFormError(res.error); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    await deleteProduct(p._id || p.id);
  };

  const getImg = (p) => p.images?.[0]?.url || p.images?.[0] || '';
  const getPid = (p) => p._id || p.id;

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px', flexWrap:'wrap', gap:'16px' }}>
        <div>
          <h2 style={{ margin:0, fontFamily:'var(--font-serif)', fontSize:'24px' }}>Product SKU Inventory</h2>
          <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>Hard cap: {skuCap} active SKUs per store.</span>
        </div>
        <button className="btn-primary" style={{ width:'auto', display:'inline-flex', alignItems:'center', gap:'6px' }} onClick={openAdd}>
          <Plus size={16}/> Add Product
        </button>
      </div>

      {/* SKU Meter */}
      <div className="sku-meter-box">
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', fontWeight:'700' }}>
          <span style={{ display:'flex', alignItems:'center', gap:'6px' }}><Package size={16} style={{ color:'var(--crimson)' }}/> SKU Capacity</span>
          <span>{activeCount} / {skuCap}</span>
        </div>
        <div className="sku-meter-bar">
          <div className="sku-meter-fill" style={{ width:`${(activeCount/skuCap)*100}%`, backgroundColor: activeCount >= skuCap ? '#EF4444' : 'var(--crimson)' }}/>
        </div>
        <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'4px' }}>
          {activeCount >= skuCap ? 'Limit reached. Deactivate a listing to add new one.' : `${skuCap - activeCount} slots remaining.`}
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
        {vendorProducts.length === 0 ? (
          <div style={{ padding:'48px', textAlign:'center', color:'var(--text-muted)' }}>No products listed yet. Click "Add Product" to get started.</div>
        ) : (
          <div className="table-responsive">
            <table className="tx-table" style={{ width:'100%' }}>
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Return</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
              <tbody>
                {vendorProducts.map(p => (
                  <tr key={getPid(p)}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        {getImg(p) && <img src={getImg(p)} alt={p.name} style={{ width:'36px', height:'36px', objectFit:'cover', borderRadius:'4px' }} onError={e => { e.target.style.display='none'; }}/>}
                        <div>
                          <strong style={{ fontSize:'13px', display:'block' }}>{p.name}</strong>
                          <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{getPid(p)}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform:'capitalize', fontSize:'13px' }}>{p.category}</td>
                    <td style={{ fontWeight:'700', fontSize:'13px' }}>₹{p.price}</td>
                    <td style={{ fontSize:'13px' }}>{p.stock} pcs</td>
                    <td>
                      <span style={{ fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'4px', backgroundColor: p.returnPolicy ? '#E0F2FE' : '#F1F5F9', color: p.returnPolicy ? '#0369A1' : '#475569' }}>
                        {p.returnPolicy ? '7-Day ON' : 'Final Sale'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'4px', backgroundColor: p.status === 'Approved' ? '#ECFDF5' : '#FEF3C7', color: p.status === 'Approved' ? '#065F46' : '#92400E' }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign:'right' }}>
                      <div style={{ display:'inline-flex', gap:'8px' }}>
                        <button onClick={() => openEdit(p)} style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', color:'var(--text-muted)' }} title="Edit"><Edit2 size={15}/></button>
                        <button onClick={() => handleDelete(p)} style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', color:'#EF4444' }} title="Delete"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && createPortal(
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth:'520px' }}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Product' : 'Add New Product'}</h3>
              <button className="modal-close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div style={{ color:'#EF4444', backgroundColor:'#FEE2E2', padding:'10px', borderRadius:'4px', marginBottom:'16px', fontSize:'13px' }}>{formError}</div>}

                <div className="form-group"><label>Product Name *</label><input type="text" value={name} onChange={e=>setName(e.target.value)} required/></div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <div className="form-group"><label>Category *</label>
                    <select value={category} onChange={e=>setCategory(e.target.value)}>
                      {CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Images</label><input type="file" accept="image/*" multiple onChange={e=>setImageFiles(Array.from(e.target.files || []).slice(0, 5))}/></div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <div className="form-group"><label>Price (₹) *</label><input type="number" min={1} value={price} onChange={e=>setPrice(e.target.value)} required/></div>
                  <div className="form-group"><label>Stock Qty *</label><input type="number" min={0} value={stock} onChange={e=>setStock(e.target.value)} required/></div>
                </div>

                <div className="form-group"><label>Description *</label><textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)} required/></div>

                {imageFiles.length > 0 && (
                  <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:'12px' }}>
                    {imageFiles.length} image(s) selected. Images upload after product details are saved.
                  </div>
                )}

                <div className="form-group">
                  <label>Gifting Tags</label>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'6px' }}>
                    {TAGS.map(t=>(
                      <button key={t} type="button" onClick={()=>handleTagToggle(t)}
                        style={{ padding:'6px 12px', borderRadius:'50px', fontSize:'11px', border:'1px solid var(--border)', cursor:'pointer', backgroundColor: tags.includes(t)?'var(--crimson)':'#fff', color: tags.includes(t)?'#fff':'var(--text-muted)' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex', gap:'10px', alignItems:'flex-start', borderTop:'1px solid var(--border)', paddingTop:'16px', marginTop:'16px' }}>
                  <input type="checkbox" id="rp" checked={returnPolicy} onChange={e=>setReturnPolicy(e.target.checked)} style={{ marginTop:'4px' }}/>
                  <div>
                    <label htmlFor="rp" style={{ fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>Enable 7-day return policy</label>
                    <span style={{ display:'block', fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>ON = T+7 payout hold. OFF = immediate payout on delivery.</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline-white" style={{ color:'var(--text-main)', borderColor:'var(--border)' }} onClick={()=>setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width:'auto', display:'inline-flex', alignItems:'center', gap:'6px' }} disabled={saving}>
                  {saving ? <><Loader size={14}/> Saving...</> : (editing ? 'Save Changes' : 'List Product')}
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

export default ProductList;
