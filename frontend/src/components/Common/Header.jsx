import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  Search, ShoppingCart, Wallet, Bell, MapPin, User,
  LogOut, Menu, X, Home, Tag, ShoppingBag, Package, BookOpen,
  LogIn, UserPlus, Zap, Store,
} from 'lucide-react';

/* ─── Nav definitions ───────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { tab: 'home',          label: 'Home',      Icon: Home        },
  { tab: 'coupon-market', label: 'Coupons',   Icon: Tag         },
  { tab: 'shop',          label: 'Shop',      Icon: ShoppingBag },
  { tab: 'orders',        label: 'My Orders', Icon: Package     },
  { tab: 'coupons',       label: 'My Locker', Icon: BookOpen    },
];
const PUBLIC_NAV = [
  { tab: 'home',          label: 'Home',    Icon: Home        },
  { tab: 'coupon-market', label: 'Coupons', Icon: Tag         },
  { tab: 'shop',          label: 'Shop',    Icon: ShoppingBag },
];

/* ─── DEV-only quick-login bar ──────────────────────────────────────────── */
const DevBar = ({ openPartner }) => {
  const { sendOTP, loginClient, isLoggedIn, logoutClient } = useContext(AppContext);
  const [busy, setBusy] = useState(false);

  const quickShopperLogin = async () => {
    setBusy(true);
    const phone = '9830098300';
    const r = await sendOTP(phone);
    if (r.success && r.devOtp) await loginClient(phone, r.devOtp);
    setBusy(false);
  };

  return (
    <div className="dev-bar">
      <Zap size={12} style={{ color: '#facc15', flexShrink: 0 }} />
      <span className="dev-bar__label">DEV</span>
      {!isLoggedIn ? (
        <>
          <button className="dev-bar__btn dev-bar__btn--green" onClick={quickShopperLogin} disabled={busy}>
            {busy ? '…' : '⚡ Quick Shopper'}
          </button>
          <button className="dev-bar__btn dev-bar__btn--amber" onClick={openPartner} disabled={busy}>
            <Store size={11} /> Partner / Admin
          </button>
        </>
      ) : (
        <button className="dev-bar__btn dev-bar__btn--red" onClick={logoutClient}>
          Logout
        </button>
      )}
    </div>
  );
};

/* ─── Main Header ───────────────────────────────────────────────────────── */
const Header = ({ activeTab, setActiveTab, openLogin, openRegister, openPartner }) => {
  const {
    currentRole, cart, walletBalance,
    notifications, unreadCount, markNotifRead, markAllNotifsRead,
    isKolkataVerified, isLoggedIn, logoutClient,
  } = useContext(AppContext);

  const [showNotif,     setShowNotif]     = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showSearch,    setShowSearch]    = useState(false);
  const notifRef  = useRef(null);
  const searchRef = useRef(null);

  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current  && !notifRef.current.contains(e.target))  setShowNotif(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowMobileNav(false);
    setShowSearch(false);
  };

  const isClientLoggedIn = isLoggedIn && currentRole === 'client' && isKolkataVerified;
  const showPublicActions = !isClientLoggedIn && isKolkataVerified;
  const navItems = isClientLoggedIn ? NAV_ITEMS : PUBLIC_NAV;

  return (
    <header className="site-header-container">
      {import.meta.env.DEV && <DevBar openPartner={openPartner} />}

      <div className="site-header">

        {/* ══ TOP ROW ══════════════════════════════════════════════════════ */}
        <div className="header-top">

          {/* Logo */}
          <a href="#home" className="logo-container"
            onClick={(e) => { e.preventDefault(); handleTabChange('home'); }}>
            <span className="logo-text">Dear <span>Kolkata</span></span>
          </a>

          {/* Search — hidden on mobile, shown on ≥768px */}
          <div className="search-bar desktop-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search sarees, jewellery, coupons…"
              onKeyDown={(e) => { if (e.key === 'Enter') handleTabChange('shop'); }}
            />
          </div>

          {/* ── Right-side action group ── */}
          <div className="header-actions">

            {/* Kolkata badge — desktop only */}
            <div className="location-indicator">
              <MapPin size={14} /><span>Kolkata</span>
            </div>

            {/* Mobile search toggle */}
            <button className="action-btn mobile-search-btn"
              onClick={() => setShowSearch(p => !p)} aria-label="Search">
              <Search size={20} />
            </button>

            {/* ── LOGGED-IN CLIENT ── */}
            {isClientLoggedIn && (
              <>
                <button
                  className={`action-btn wallet-btn ${activeTab === 'wallet' ? 'active-icon' : ''}`}
                  onClick={() => handleTabChange('wallet')} aria-label="Wallet">
                  <Wallet size={20} />
                  <span className="wallet-label">₹{walletBalance.toFixed(0)}</span>
                </button>

                <button className="action-btn" onClick={() => handleTabChange('cart')} aria-label="Cart">
                  <ShoppingCart size={20} />
                  {cartCount > 0 && <span className="badge">{cartCount > 9 ? '9+' : cartCount}</span>}
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
                          <button onClick={markAllNotifsRead} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--crimson)', cursor: 'pointer', fontWeight: '600' }}>
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="notif-list">
                        {notifications.length === 0 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                            No notifications yet
                          </div>
                        ) : notifications.map(n => (
                          <div key={n._id} className="notif-item"
                            style={{ backgroundColor: n.read ? 'transparent' : 'var(--crimson-light)' }}
                            onClick={() => { if (!n.read) markNotifRead(n._id); }}>
                            <div style={{ fontSize: '13px', fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>{n.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</div>
                            <div className="notif-time">
                              {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button className="action-btn" onClick={() => handleTabChange('profile')} aria-label="Profile">
                  <User size={20} />
                </button>
                <button className="action-btn" onClick={logoutClient} style={{ color: '#DC2626' }} aria-label="Logout">
                  <LogOut size={20} />
                </button>
              </>
            )}

            {/* ── PUBLIC (not logged in) ── */}
            {showPublicActions && (
              <>
                {/* Cart — still usable, prompts login on click */}
                <button className="action-btn" aria-label="Cart"
                  onClick={() => isLoggedIn ? handleTabChange('cart') : openLogin()}>
                  <ShoppingCart size={20} />
                  {cartCount > 0 && <span className="badge">{cartCount > 9 ? '9+' : cartCount}</span>}
                </button>

                {/* Sign In */}
                <button className="header-btn header-btn--outline" onClick={openLogin}>
                  <LogIn size={15} />
                  <span>Sign In</span>
                </button>

                {/* Register */}
                <button className="header-btn header-btn--solid" onClick={openRegister}>
                  <UserPlus size={15} />
                  <span>Register</span>
                </button>
              </>
            )}

            {/* Hamburger — always last */}
            <button className="action-btn mobile-menu-btn"
              onClick={() => setShowMobileNav(p => !p)} aria-label="Menu">
              {showMobileNav ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ── Mobile search expansion ── */}
        {showSearch && (
          <div ref={searchRef} className="mobile-search-expand">
            <div className="search-bar" style={{ maxWidth: '100%' }}>
              <Search size={16} />
              <input type="text" placeholder="Search products, coupons…" autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { handleTabChange('shop'); setShowSearch(false); } }} />
            </div>
          </div>
        )}

        {/* ══ NAV ROW ══════════════════════════════════════════════════════ */}
        <nav className="site-nav desktop-nav header-nav-row">
          {/* Left: page links */}
          <div className="header-nav-links">
            {navItems.map(({ tab, label }) => (
              <button key={tab}
                className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                onClick={() => handleTabChange(tab)}>
                {label}
              </button>
            ))}
          </div>

          {/* Right: Partner Login — only when not logged in as client */}
          {!isClientLoggedIn && (
            <button className="partner-login-link" onClick={openPartner}>
              <Store size={13} />
              <span>Partner Login</span>
            </button>
          )}
        </nav>

        {/* ── Mobile slide-down nav ── */}
        {showMobileNav && (
          <nav className="mobile-nav-sheet">
            {navItems.map(({ tab, label, Icon }) => (
              <button key={tab}
                className={`mobile-nav-item ${activeTab === tab ? 'active' : ''}`}
                onClick={() => handleTabChange(tab)}>
                <Icon size={18} /><span>{label}</span>
              </button>
            ))}

            {showPublicActions && (
              <div className="mobile-nav-auth-section">
                <button className="mobile-nav-item" onClick={() => { setShowMobileNav(false); openLogin(); }}>
                  <LogIn size={18} /><span>Sign In</span>
                </button>
                <button className="mobile-nav-item" onClick={() => { setShowMobileNav(false); openRegister(); }}>
                  <UserPlus size={18} /><span>Create Account</span>
                </button>
                <button className="mobile-nav-item mobile-nav-item--partner"
                  onClick={() => { setShowMobileNav(false); openPartner(); }}>
                  <Store size={18} /><span>Partner / Admin Login</span>
                </button>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
