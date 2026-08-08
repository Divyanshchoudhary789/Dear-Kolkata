import React, { useState, useContext } from 'react';
import { AppProvider, AppContext } from './context/AppContext';
import Header        from './components/Common/Header';
import Footer        from './components/Common/Footer';
import LocationGate  from './components/Client/LocationGate';
import OtpGate       from './components/Client/OtpGate';
import ClientHome    from './components/Client/ClientHome';
import ClientShop    from './components/Client/ClientShop';
import ProductDetail from './components/Client/ProductDetail';
import Cart          from './components/Client/Cart';
import Checkout      from './components/Client/Checkout';
import MyCoupons     from './components/Client/MyCoupons';
import CouponMarket  from './components/Client/CouponMarket';
import MyOrders      from './components/Client/MyOrders';
import Wallet        from './components/Client/Wallet';
import Profile       from './components/Client/Profile';
import VendorDashboard from './components/Vendor/VendorDashboard';
import AdminDashboard  from './components/Admin/AdminDashboard';
import {
  Home, Tag, ShoppingBag, Package, BookOpen, ShoppingCart
} from 'lucide-react';
import './App.css';

/* ── Bottom tab bar (mobile only) ── */
const BottomTabBar = ({ activeTab, setActiveTab, cartCount }) => {
  const tabs = [
    { tab: 'home',         label: 'Home',    Icon: Home },
    { tab: 'coupon-market',label: 'Coupons', Icon: Tag },
    { tab: 'shop',         label: 'Shop',    Icon: ShoppingBag },
    { tab: 'orders',       label: 'Orders',  Icon: Package },
    { tab: 'cart',         label: 'Cart',    Icon: ShoppingCart, badge: cartCount },
  ];
  return (
    <nav className="bottom-tab-bar" role="navigation" aria-label="Main navigation">
      {tabs.map(({ tab, label, Icon, badge }) => (
        <button key={tab} className={`bottom-tab-item ${activeTab === tab ? 'active' : ''}`}
          onClick={() => setActiveTab(tab)} style={{ position: 'relative' }}>
          <Icon size={20} />
          {badge > 0 && <span className="btab-badge">{badge > 9 ? '9+' : badge}</span>}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
};

/* ── Main app content ── */
const AppContent = () => {
  const { currentRole, isKolkataVerified, isLoggedIn, cart } = useContext(AppContext);

  const [clientTab,       setClientTab]       = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productFilter,   setProductFilter]   = useState({ category: '', tag: '' });
  const [checkoutDetails, setCheckoutDetails] = useState(null);

  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);

  const renderClientTab = () => {
    switch (clientTab) {
      case 'home':           return <ClientHome setActiveTab={setClientTab} setSelectedProduct={setSelectedProduct} setProductFilter={setProductFilter}/>;
      case 'shop':           return <ClientShop setActiveTab={setClientTab} setSelectedProduct={setSelectedProduct} filter={productFilter} setFilter={setProductFilter}/>;
      case 'product-detail': return <ProductDetail product={selectedProduct} setActiveTab={setClientTab}/>;
      case 'cart':           return <Cart setActiveTab={setClientTab} setCheckoutDetails={setCheckoutDetails}/>;
      case 'checkout':       return <Checkout details={checkoutDetails} setActiveTab={setClientTab}/>;
      case 'coupon-market':  return <CouponMarket setActiveTab={setClientTab}/>;
      case 'coupons':        return <MyCoupons/>;
      case 'orders':         return <MyOrders/>;
      case 'wallet':         return <Wallet/>;
      case 'profile':        return <Profile/>;
      default:               return <ClientHome setActiveTab={setClientTab} setSelectedProduct={setSelectedProduct} setProductFilter={setProductFilter}/>;
    }
  };

  if (isLoggedIn && currentRole === 'vendor') {
    return (
      <div className="app-container">
        <VendorDashboard/>
        <Footer/>
      </div>
    );
  }

  if (isLoggedIn && currentRole === 'admin') {
    return (
      <div className="app-container">
        <AdminDashboard/>
        <Footer/>
      </div>
    );
  }

  if (!isKolkataVerified) return <LocationGate/>;
  if (!isLoggedIn)        return <OtpGate/>;

  return (
    <div className="app-container">
      <Header activeTab={clientTab} setActiveTab={setClientTab}/>
      <main className="panel-content">
        {renderClientTab()}
      </main>
      <Footer/>
      <BottomTabBar activeTab={clientTab} setActiveTab={setClientTab} cartCount={cartCount}/>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent/>
    </AppProvider>
  );
}

export default App;
