import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import ProductList         from './ProductList';
import OrderQueue          from './OrderQueue';
import RedemptionTerminal  from './RedemptionTerminal';
import PayoutLedger        from './PayoutLedger';
import CouponBuilder       from './CouponBuilder';
import StoreProfile        from './StoreProfile';
import { LayoutDashboard, Package, ShoppingCart, Ticket, Landmark, PlusCircle, Store, TrendingUp, AlertCircle, Loader, LogOut } from 'lucide-react';
import * as vendorApi from '../../api/vendorApi';

const VendorDashboard = () => {
  const { vendorProfile, orders, coupons, products, fetchVendorData, logoutClient } = useContext(AppContext);
  const [vendorTab,  setVendorTab]  = useState('dashboard');
  const [dashboard,  setDashboard]  = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    // Fetch live dashboard summary from backend
    vendorApi.getVendorDashboard()
      .then(res => { if (res?.success) setDashboard(res.data.summary); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fallback: compute from local state when API data not yet available
  const vendor = vendorProfile || {};
  const pendingCount = orders.filter(o => ['Placed','Packed','Shipped'].includes(o.status)).length;

  const TABS = [
    { key:'dashboard', icon:<LayoutDashboard size={18}/>, label:'Dashboard' },
    { key:'products',  icon:<Package         size={18}/>, label:'Products SKU' },
    { key:'orders',    icon:<ShoppingCart    size={18}/>, label:'Fulfilment Queue', badge: pendingCount },
    { key:'terminal',  icon:<Ticket          size={18}/>, label:'Redemption Terminal' },
    { key:'payouts',   icon:<Landmark        size={18}/>, label:'Payouts & Settlement' },
    { key:'coupons',   icon:<PlusCircle      size={18}/>, label:'Coupon Builder' },
    { key:'profile',   icon:<Store           size={18}/>, label:'Store Profile' },
  ];

  const renderOverview = () => {
    const d = dashboard || {};
    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom:'24px' }}>
          <h2 style={{ margin:'0 0 4px 0', fontFamily:'var(--font-serif)', fontSize:'26px' }}>
            {vendor.name ? `Welcome back, ${vendor.name}!` : 'Vendor Dashboard'}
          </h2>
          <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>
            {vendor.location && `${vendor.location} • `}
            Status: <strong style={{ color: vendor.status === 'Active' ? '#059669' : '#EF4444' }}>{vendor.status || 'Active'}</strong>
          </span>
        </div>

        {vendor.status && vendor.status !== 'Active' && (
          <div style={{ backgroundColor:'#FEF2F2', border:'1px solid #FEE2E2', padding:'16px', borderRadius:'var(--radius-sm)', color:'#991B1B', display:'flex', gap:'8px', alignItems:'center', marginBottom:'24px', fontSize:'14px' }}>
            <AlertCircle size={18}/>
            <span><strong>Notice:</strong> Your profile is suspended. Customers cannot see your listings.</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:'center', padding:'48px' }}><Loader size={28} className="spin" style={{ color:'var(--crimson)' }}/></div>
        ) : (
          <>
            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="analytics-icon" style={{ backgroundColor:'#ECFDF5', color:'#10B981' }}><TrendingUp size={20}/></div>
                <div className="analytics-info"><div className="value">₹{(d.totalRevenue || 0).toLocaleString()}</div><div className="label">Gross Sales GMV</div></div>
              </div>
              <div className="analytics-card">
                <div className="analytics-icon" style={{ backgroundColor:'#FFFBEB', color:'#D97706' }}><ShoppingCart size={20}/></div>
                <div className="analytics-info"><div className="value">{d.pendingOrders ?? pendingCount}</div><div className="label">Pending Orders</div></div>
              </div>
              <div className="analytics-card">
                <div className="analytics-icon" style={{ backgroundColor:'#E0F2FE', color:'#0284C7' }}><Ticket size={20}/></div>
                <div className="analytics-info"><div className="value">{d.couponsRedeemed ?? 0}</div><div className="label">In-Store Redemptions</div></div>
              </div>
              <div className="analytics-card">
                <div className="analytics-icon" style={{ backgroundColor:'#F3E8FF', color:'#6B21A8' }}><Package size={20}/></div>
                <div className="analytics-info"><div className="value">{d.skuCapUsage || `${d.activeProducts ?? 0}/${vendor.skuCap ?? 20}`}</div><div className="label">SKU Usage</div></div>
              </div>
            </div>

            <div className="analytics-two-col" style={{ display: 'grid', gap: '20px' }}>
              <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
                <h3 style={{ margin:'0 0 16px 0', fontSize:'15px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>Coupon Stats</h3>
                {[
                  { label:'Coupons sold', value: d.couponsSold ?? 0 },
                  { label:'Redeemed', value: `${d.couponsRedeemed ?? 0} clients`, color:'#10B981' },
                  { label:'Conversion rate', value: d.couponsSold > 0 ? `${((d.couponsRedeemed / d.couponsSold)*100).toFixed(1)}%` : '0%', color:'var(--gold)' },
                  { label:'Active templates', value: d.activeCoupons ?? 0 },
                ].map((row,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
                    <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>{row.label}</span>
                    <strong style={{ fontSize:'14px', color: row.color }}>{row.value}</strong>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor:'#fff', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'24px', boxShadow:'var(--shadow-sm)' }}>
                <h3 style={{ margin:'0 0 16px 0', fontSize:'15px', fontWeight:'700', borderBottom:'1px solid var(--border)', paddingBottom:'12px' }}>Payout Summary</h3>
                {[
                  { label:'Pending payout',   value: `₹${(d.pendingPayout    ?? 0).toLocaleString()}`, color:'var(--gold)' },
                  { label:'Commission paid',  value: `₹${(d.commissionPaid   ?? 0).toLocaleString()}`, color:'var(--crimson)' },
                  { label:'Total revenue',    value: `₹${(d.totalRevenue     ?? 0).toLocaleString()}` },
                ].map((row,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
                    <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>{row.label}</span>
                    <strong style={{ fontSize:'14px', color: row.color }}>{row.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const views = {
    dashboard: renderOverview,
    products:  () => <ProductList/>,
    orders:    () => <OrderQueue/>,
    payouts:   () => <PayoutLedger/>,
    coupons:   () => <CouponBuilder/>,
    terminal:  () => <RedemptionTerminal/>,
    profile:   () => <StoreProfile/>,
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      <div className="dashboard-sidebar">
        {TABS.map(t => (
          <button key={t.key} className={`sidebar-link ${vendorTab === t.key ? 'active' : ''}`} onClick={() => setVendorTab(t.key)}>
            {t.icon}
            <span>{t.label}</span>
            {t.badge > 0 && <span style={{ backgroundColor:'var(--crimson)', color:'#fff', fontSize:'10px', padding:'2px 6px', borderRadius:'10px', fontWeight:'700', marginLeft:'auto' }}>{t.badge}</span>}
          </button>
        ))}
        <button className="sidebar-link sidebar-logout" onClick={logoutClient}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
      <div className="dashboard-main">
        {(views[vendorTab] || views.dashboard)()}
      </div>
    </div>
  );
};

export default VendorDashboard;
