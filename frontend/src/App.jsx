import React, { useState, useContext, useCallback, useEffect } from 'react';
import { AppProvider, AppContext } from './context/AppContext';
import Header               from './components/Common/Header';
import Footer               from './components/Common/Footer';
import LocationGate         from './components/Client/LocationGate';
import LoginModal           from './components/Client/LoginModal';
import RegisterModal        from './components/Client/RegisterModal';
import VendorAdminLoginModal from './components/Client/VendorAdminLoginModal';
import ClientHome           from './components/Client/ClientHome';
import ClientShop           from './components/Client/ClientShop';
import ProductDetail        from './components/Client/ProductDetail';
import Cart                 from './components/Client/Cart';
import Checkout             from './components/Client/Checkout';
import MyCoupons            from './components/Client/MyCoupons';
import CouponMarket         from './components/Client/CouponMarket';
import MyOrders             from './components/Client/MyOrders';
import Wallet               from './components/Client/Wallet';
import Profile              from './components/Client/Profile';
import VendorDashboard      from './components/Vendor/VendorDashboard';
import AdminDashboard       from './components/Admin/AdminDashboard';
import {
  Home, Tag, ShoppingBag, Package, BookOpen, ShoppingCart,
} from 'lucide-react';
import './App.css';

/**
 * Tabs that require authentication.
 * home / shop / product-detail / coupon-market → publicly accessible.
 */
const PROTECTED_TABS = new Set(['cart', 'checkout', 'orders', 'coupons', 'wallet', 'profile']);

/* ─── Bottom tab bar (mobile) ─────────────────────────────────────────────── */
const BottomTabBar = ({ activeTab, onNavigate, cartCount }) => {
  const tabs = [
    { tab: 'home',          label: 'Home',    Icon: Home },
    { tab: 'coupon-market', label: 'Coupons', Icon: Tag },
    { tab: 'shop',          label: 'Shop',    Icon: ShoppingBag },
    { tab: 'orders',        label: 'Orders',  Icon: Package },
    { tab: 'cart',          label: 'Cart',    Icon: ShoppingCart, badge: cartCount },
  ];
  return (
    <nav className="bottom-tab-bar" role="navigation" aria-label="Main navigation">
      {tabs.map(({ tab, label, Icon, badge }) => (
        <button
          key={tab}
          className={`bottom-tab-item ${activeTab === tab ? 'active' : ''}`}
          onClick={() => onNavigate(tab)}
          style={{ position: 'relative' }}
        >
          <Icon size={20} />
          {badge > 0 && <span className="btab-badge">{badge > 9 ? '9+' : badge}</span>}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
};

/* ─── Main app content ─────────────────────────────────────────────────────── */
const AppContent = () => {
  const { currentRole, isKolkataVerified, isLoggedIn, cart } = useContext(AppContext);

  const [clientTab,       setClientTab]       = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productFilter,   setProductFilter]   = useState({ category: '', tag: '' });
  const [checkoutDetails, setCheckoutDetails] = useState(null);

  /**
   * authModal:
   *   null               → no modal
   *   'login'            → client login
   *   'register'         → client register
   *   'partner'          → vendor / admin login
   *
   * pendingTab: tab to navigate to after successful login
   */
  const [authModal,   setAuthModal]   = useState(null);
  const [pendingTab,  setPendingTab]  = useState(null);

  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);

  // After login, navigate to pending tab if set
  useEffect(() => {
    if (isLoggedIn && pendingTab) {
      setClientTab(pendingTab);
      setPendingTab(null);
    }
  }, [isLoggedIn, pendingTab]);

  const openLogin    = useCallback((returnTab = null) => {
    if (returnTab) setPendingTab(returnTab);
    setAuthModal('login');
  }, []);
  const openRegister = useCallback(() => setAuthModal('register'), []);
  const openPartner  = useCallback(() => setAuthModal('partner'),  []);
  const closeModal   = useCallback(() => setAuthModal(null),       []);

  /**
   * Central navigation — always use this instead of setClientTab directly.
   * If the tab is protected and user isn't logged in, show login modal
   * and remember the intended destination.
   */
  const navigateTo = useCallback((tab) => {
    if (!isLoggedIn && PROTECTED_TABS.has(tab)) {
      openLogin(tab);
      return;
    }
    setClientTab(tab);
  }, [isLoggedIn, openLogin]);

  /* ── Vendor / Admin full-screen dashboards ── */
  if (isLoggedIn && currentRole === 'vendor') {
    return (
      <div className="app-container">
        <VendorDashboard />
        <Footer onPartnerLogin={openPartner} />
      </div>
    );
  }
  if (isLoggedIn && currentRole === 'admin') {
    return (
      <div className="app-container">
        <AdminDashboard />
        <Footer onPartnerLogin={openPartner} />
      </div>
    );
  }

  /* ── Kolkata PIN gate ── */
  if (!isKolkataVerified) return <LocationGate />;

  /* ── Tab renderer ── */
  const renderTab = () => {
    switch (clientTab) {
      case 'home':
        return (
          <ClientHome
            setActiveTab={navigateTo}
            setSelectedProduct={setSelectedProduct}
            setProductFilter={setProductFilter}
            onRequireLogin={() => openLogin()}
          />
        );
      case 'shop':
        return (
          <ClientShop
            setActiveTab={navigateTo}
            setSelectedProduct={setSelectedProduct}
            filter={productFilter}
            setFilter={setProductFilter}
          />
        );
      case 'product-detail':
        return <ProductDetail product={selectedProduct} setActiveTab={navigateTo} />;
      case 'coupon-market':
        return (
          <CouponMarket
            setActiveTab={navigateTo}
            onRequireLogin={() => openLogin('coupons')}
          />
        );
      case 'cart':
        return <Cart setActiveTab={navigateTo} setCheckoutDetails={setCheckoutDetails} />;
      case 'checkout':
        return <Checkout details={checkoutDetails} setActiveTab={navigateTo} />;
      case 'coupons':
        return <MyCoupons />;
      case 'orders':
        return <MyOrders />;
      case 'wallet':
        return <Wallet />;
      case 'profile':
        return <Profile />;
      default:
        return (
          <ClientHome
            setActiveTab={navigateTo}
            setSelectedProduct={setSelectedProduct}
            setProductFilter={setProductFilter}
            onRequireLogin={() => openLogin()}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Header
        activeTab={clientTab}
        setActiveTab={navigateTo}
        openLogin={openLogin}
        openRegister={openRegister}
        openPartner={openPartner}
      />

      <main className="panel-content">
        {renderTab()}
      </main>

      <Footer onPartnerLogin={openPartner} />

      <BottomTabBar
        activeTab={clientTab}
        onNavigate={navigateTo}
        cartCount={cartCount}
      />

      {/* ── Auth Modals ── */}
      {authModal === 'login' && (
        <LoginModal
          onClose={closeModal}
          onSwitchToRegister={() => setAuthModal('register')}
        />
      )}
      {authModal === 'register' && (
        <RegisterModal
          onClose={closeModal}
          onSwitchToLogin={() => setAuthModal('login')}
        />
      )}
      {authModal === 'partner' && (
        <VendorAdminLoginModal onClose={closeModal} />
      )}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
