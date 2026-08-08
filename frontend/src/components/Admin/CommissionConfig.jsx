import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { Settings, Check, Loader } from 'lucide-react';

const CommissionConfig = () => {
  const { categories, configureCategoryCommission } = useContext(AppContext);
  const [editId,  setEditId]  = useState('');
  const [rate,    setRate]    = useState('');
  const [saving,  setSaving]  = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    const parsed = parseInt(rate, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) return;
    setSaving(true);
    await configureCategoryCommission(editId, parsed);
    setSaving(false);
    setEditId('');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth:'720px', margin:'0 auto' }}>
      <div style={{ marginBottom:'24px', textAlign:'center' }}>
        <h2 style={{ margin:'0 0 4px 0', fontFamily:'var(--font-serif)', fontSize:'24px' }}>Category &amp; Commission Config</h2>
        <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>
          Master commission rates — applied automatically to all sales in each category.
        </span>
      </div>

      <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
        <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
          <Settings size={18} style={{ color:'var(--crimson)' }}/> Platform Commission Rates
        </h3>

        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {categories.map(c => {
            const isEditing = editId === c.id;
            return (
              <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', backgroundColor:'var(--bg-festive)' }}>
                <div>
                  <strong style={{ fontSize:'15px', textTransform:'capitalize' }}>{c.name}</strong>
                  <span style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>ID: {c.id}</span>
                </div>
                {isEditing ? (
                  <form onSubmit={handleSave} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                      <input type="number" min={0} max={100} value={rate} onChange={e=>setRate(e.target.value)}
                        style={{ padding:'6px', width:'70px', textAlign:'center', border:'1px solid var(--border)', borderRadius:'4px' }} required/>
                      <span style={{ fontSize:'13px', fontWeight:'600' }}>%</span>
                    </div>
                    <button type="submit" className="btn-primary" style={{ padding:'6px 12px', width:'auto', fontSize:'12px', display:'inline-flex', alignItems:'center', gap:'4px' }} disabled={saving}>
                      {saving ? <Loader size={12}/> : <Check size={12}/>} Save
                    </button>
                    <button type="button" onClick={()=>setEditId('')} style={{ padding:'6px 12px', fontSize:'12px', background:'none', border:'1px solid var(--border)', borderRadius:'4px', cursor:'pointer' }}>Cancel</button>
                  </form>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                    <span style={{ fontSize:'20px', fontWeight:'800', color:'var(--crimson)' }}>{c.commission}%</span>
                    <button className="btn-outline-white" style={{ padding:'6px 12px', fontSize:'12px', color:'var(--text-main)' }}
                      onClick={()=>{ setEditId(c.id); setRate(String(c.commission)); }}>
                      Adjust Rate
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommissionConfig;
