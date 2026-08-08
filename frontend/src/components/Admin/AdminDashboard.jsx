import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import Onboarding      from './Onboarding';
import CommissionConfig from './CommissionConfig';
import PackageBuilder  from './PackageBuilder';
import DisputeQueue    from './DisputeQueue';
import Analytics       from './Analytics';
import OpsCenter       from './OpsCenter';
import { Users, Settings, Gift, AlertTriangle, BarChart, ShieldCheck, LogOut } from 'lucide-react';

const AdminDashboard = () => {
  const { adminRole, orders, fetchAdminVendors, fetchAdminOrders, logoutClient } = useContext(AppContext);
  const [adminTab, setAdminTab] = useState('analytics');

  // Fetch admin operational data on mount
  useEffect(() => {
    fetchAdminVendors();
    fetchAdminOrders();
  }, [fetchAdminVendors, fetchAdminOrders]);

  const disputed  = orders.filter(o => o.status === 'Disputed').length;

  const TABS = [
    { key:'analytics',  icon:<BarChart      size={18}/>, label:'Platform Analytics' },
    { key:'onboarding', icon:<Users         size={18}/>, label:'Vendor Directory' },
    { key:'commission', icon:<Settings      size={18}/>, label:'Commission Config' },
    { key:'packages',   icon:<Gift          size={18}/>, label:'Pass Builder' },
    { key:'ops',        icon:<ShieldCheck   size={18}/>, label:'Ops Center' },
    { key:'disputes',   icon:<AlertTriangle size={18}/>, label:'Disputes Queue', badge: disputed },
  ];

  const VIEWS = {
    analytics:  <Analytics/>,
    onboarding: <Onboarding/>,
    commission: <CommissionConfig/>,
    packages:   <PackageBuilder/>,
    ops:        <OpsCenter/>,
    disputes:   <DisputeQueue/>,
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      <div className="dashboard-sidebar">
        <div style={{ padding:'0 16px 16px 16px', borderBottom:'1px solid var(--border)', marginBottom:'16px' }}>
          <span style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:'700', textTransform:'uppercase' }}>System Console</span>
          <div style={{ fontSize:'13px', fontWeight:'700', color:'var(--crimson)', marginTop:'4px' }}>{adminRole}</div>
        </div>

        {TABS.map(t => (
          <button key={t.key} className={`sidebar-link ${adminTab === t.key ? 'active' : ''}`} onClick={() => setAdminTab(t.key)}>
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
        {VIEWS[adminTab] || <Analytics/>}
      </div>
    </div>
  );
};

export default AdminDashboard;
