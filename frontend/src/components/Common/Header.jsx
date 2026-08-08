import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  Search, ShoppingCart, Wallet, Bell, MapPin, User,
  LogOut, Menu, X, Home, Tag, ShoppingBag, Package, BookOpen
} from 'lucide-react';

const NAV_ITEMS = [
  { tab: 'home',          label: 'Home',       Icon: Home },
  { tab: 'coupon-market', label: 'Coupons',    Icon: Tag },
  { tab: 'shop',          label: 'Shop',       Icon: ShoppingBag },
  { tab: 'orders',        label: 'My Orders',  Icon: Package },
  { tab: 'coupons',       label: 'My Locker',  Icon: BookOpen },
];

const Header = ({ activeTab, setActiveTab }) => {
  const {
    currentRole,
    cart, walletBalance,
    notifications, unreadCount, markNotifRead, markAllNotifsRead,
    isKolkataVerified, isLoggedIn, logoutClient,
  } = useContext(AppContext);

  const [showNotif,    setShowNotif]    = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showSearch,   setShowSearch]   = useState(false);
  const notifRef  = useRef(null);
  const searchRef = useRef(null);

  const totalCartItems = cart.reduce((a, i) => a + i.quantity, 0);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current  && !notifRef.current.contains(e.target))  setShowNotif(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile nav on tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowMobileNav(false);
  };

  const isClientActive = currentRole === 'client' && isKolkataVerified && isLoggedIn;

  return (
    <header className="site-header-container">

      {/* ── Client header ── */}
      {isClientActive && (
        <div className="site-header">
          <div className="header-top">
            {/* Logo */}
            <a href="#home" className="logo-container" onClick={e => { e.preventDefault(); handleTabChange('home'); }}>
              <span className="logo-text">Dear <span>Kolkata</span></span>
            </a>

            {/* Desktop search */}
            <div className="search-bar desktop-search">
              <Search size={16} />
              <input type="text" placeholder="Search sarees, jewellery, coupons…"
                onKeyDown={e => { if (e.key === 'Enter') handleTabChange('shop'); }} />
            </div>

            <div className="header-actions">
              <div className="location-indicator"><MapPin size={14} /><span>Kolkata</span></div>

              {/* Mobile search toggle */}
              <button className="action-btn mobile-search-btn" onClick={() => setShowSearch(p => !p)}
                aria-label="Search">
                <Search size={20} />
              </button>

              {/* Wallet */}
              <button className={`action-btn wallet-btn ${activeTab === 'wallet' ? 'active-icon' : ''}`}
                onClick={() => handleTabChange('wallet')} aria-label="Wallet">
                <Wallet size={20} />
                <span className="wallet-label">₹{walletBalance.toFixed(0)}</span>
              </button>

              {/* Cart */}
              <button className="action-btn" onClick={() => handleTabChange('cart')} aria-label="Cart">
                <ShoppingCart size={20} />
                {totalCartItems > 0 && <span className="badge">{totalCartItems}</span>}
              </button>

              {/* Notifications */}
              <div className="notif-bell-container" ref={notifRef}>
                <button className="action-btn" onClick={() => setShowNotif(p => !p)} aria-label="Notifications">
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                {showNotif && (
                  <div className="notif-dropdown">
                    <div className="notif-header">
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllNotifsRead}
                          style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--crimson)', cursor: 'pointer', fontWeight: '600' }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="notif-list">
                      {notifications.length === 0
                        ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No notifications yet</div>
                        : notifications.map(n => (
                          <div key={n._id} className="notif-item"
                            style={{ backgroundColor: n.read ? 'transparent' : 'var(--crimson-light)' }}
                            onClick={() => { if (!n.read) markNotifRead(n._id); }}>
                            <div style={{ fontSize: '13px', fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>{n.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</div>
                            <div className="notif-time">{new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>

              <button className="action-btn" onClick={() => handleTabChange('profile')} aria-label="Profile"><User size={20} /></button>
              <button className="action-btn" onClick={logoutClient} style={{ color: '#DC2626' }} aria-label="Logout"><LogOut size={20} /></button>

              {/* Mobile hamburger */}
              <button className="action-btn mobile-menu-btn" onClick={() => setShowMobileNav(p => !p)} aria-label="Menu">
                {showMobileNav ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile search bar (slides in) */}
          {showSearch && (
            <div ref={searchRef} style={{ padding: '8px 16px 10px', borderTop: '1px solid var(--border)' }}>
              <div className="search-bar" style={{ maxWidth: '100%' }}>
                <Search size={16} />
                <input type="text" placeholder="Search products, coupons…" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') { handleTabChange('shop'); setShowSearch(false); } }} />
              </div>
            </div>
          )}

          {/* Desktop nav */}
          <nav className="site-nav desktop-nav">
            {NAV_ITEMS.map(({ tab, label }) => (
              <button key={tab} className={`nav-link ${activeTab === tab ? 'active' : ''}`} onClick={() => handleTabChange(tab)}>
                {label}
              </button>
            ))}
          </nav>

          {/* Mobile slide-down nav */}
          {showMobileNav && (
            <nav className="mobile-nav-sheet">
              {NAV_ITEMS.map(({ tab, label, Icon }) => (
                <button key={tab} className={`mobile-nav-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab)}>
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
