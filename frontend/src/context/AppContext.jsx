import { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import * as authApiService    from '../api/authApi';
import * as productApiService from '../api/productApi';
import * as orderApiService   from '../api/orderApi';
import * as couponApiService  from '../api/couponApi';
import * as walletApiService  from '../api/walletApi';
import * as adminApiService   from '../api/adminApi';
import * as clientApiService  from '../api/clientApi';
import api                    from '../api/axiosInstance';
import useNotifications       from '../hooks/useNotifications';
import { showSuccess, showError, showInfo } from '../utils/toast';
// NOTE: Actual payment calls are made directly inside Checkout.jsx using paymentApi.
// AppContext only exposes clearCart, fetchMyOrders, fetchWallet for post-payment cleanup.

// Fallback static categories — used until API responds (fast paint)
const STATIC_CATEGORIES = [
  { id: 'jewellery', name: 'Jewellery',      commission: 15 },
  { id: 'footwear',  name: 'Footwear / Shoes', commission: 2 },
  { id: 'sarees',    name: 'Sarees',         commission: 10 },
  { id: 'apparel',   name: 'Apparel',         commission: 8 },
  { id: 'food',      name: 'Food Items',      commission: 12 },
  { id: 'luxury',    name: 'Luxury / General',commission: 18 },
];

export const AppContext = createContext();

export const AppProvider = ({ children }) => {

  // ─── Auth & Session ──────────────────────────────────────────────────────
  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('dk_user'));
      return user?.role || 'client';
    } catch {
      return 'client';
    }
  });
  const [isKolkataVerified, setIsKolkataVerified] = useState(
    () => import.meta.env.DEV || sessionStorage.getItem('dk_pin_ok') === 'true'
  );
  const [isLoggedIn, setIsLoggedIn]   = useState(() => localStorage.getItem('dk_session') === 'true');
  const [currentUser, setCurrentUser] = useState(
    () => { try { return JSON.parse(localStorage.getItem('dk_user')) || null; } catch { return null; } }
  );
  const [clientProfile, setClientProfile] = useState(
    () => { try { return JSON.parse(localStorage.getItem('dk_user')) || null; } catch { return null; } }
  );
  const [notifReady, setNotifReady] = useState(false);

  const justLoggedInRef = useRef(false);

  // ─── Vendor / Admin sim bar state ───────────────────────────────────────
  const [activeVendorId, setActiveVendorId] = useState(null);
  const [adminRole, setAdminRole]            = useState('Super Admin');
  const [vendorProfile, setVendorProfile]   = useState(null);

  // ─── Catalogue state (server-sourced) ───────────────────────────────────
  const [categories,      setCategories]      = useState(STATIC_CATEGORIES);
  const [products,        setProducts]        = useState([]);
  const [vendors,         setVendors]         = useState([]);
  const [coupons,         setCoupons]         = useState([]);
  const [exclusiveCoupons,setExclusiveCoupons]= useState([]);
  const [packages,        setPackages]        = useState([]);
  const [orders,       setOrders]       = useState([]);
  const [userCoupons,  setUserCoupons]  = useState([]);
  const [walletBalance,setWalletBalance]= useState(0);
  const [walletTransactions,setWalletTransactions] = useState([]);

  // ─── Cart (kept client-side — intentional) ──────────────────────────────
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dk_cart')) || []; } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('dk_cart', JSON.stringify(cart));
  }, [cart]);

  // ─── Loading & Error states ──────────────────────────────────────────────
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders,   setLoadingOrders]   = useState(false);
  const [loadingWallet,   setLoadingWallet]   = useState(false);
  const [loadingCoupons,  setLoadingCoupons]  = useState(false);

  // ─── Notifications (polled) ──────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) {
      setNotifReady(false);
      return;
    }
    const timer = setTimeout(() => setNotifReady(true), 300);
    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  const notifHook = useNotifications(notifReady);

  // ─── Auth event listener (token expiry) ─────────────────────────────────
  useEffect(() => {
    const handleExpiry = () => {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setClientProfile(null);
      setCurrentRole('client');
      localStorage.removeItem('dk_session');
      localStorage.removeItem('dk_user');
      showError('Session expired. Please sign in again.');
    };
    window.addEventListener('dk:auth:expired', handleExpiry);
    return () => window.removeEventListener('dk:auth:expired', handleExpiry);
  }, []);

  // ─── Boot: fetch user profile when token exists ──────────────────────────
  useEffect(() => {
    // Fetch CSRF token on app startup
    api.get('/csrf-token').catch(() => {});

    if (!isLoggedIn) return;
    if (justLoggedInRef.current) {
      justLoggedInRef.current = false;
      return;
    }
    authApiService.getMe()
      .then(res => {
        if (res?.success) {
          const user = res.data.user;
          setCurrentUser(user);
          setClientProfile(user);
          localStorage.setItem('dk_user', JSON.stringify(user));
          if (user.role === 'vendor' && res.data.vendorProfile) {
            setVendorProfile(res.data.vendorProfile);
            setActiveVendorId(res.data.vendorProfile._id);
          }
          setCurrentRole(user.role);
          // Pre-load role-specific data on boot
          if (user.role === 'admin') {
            fetchAdminVendors();
            fetchAdminOrders();
          } else if (user.role === 'vendor') {
            fetchVendorData();
          }
        }
      })
      .catch(() => { /* handled by interceptor */ });
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch public catalogue on mount ────────────────────────────────────
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCoupons();
    fetchExclusiveCoupons();
    fetchPackages();
  }, []);

  // Fetch wallet + orders when client logs in
  useEffect(() => {
    if (isLoggedIn && currentRole === 'client') {
      fetchWallet();
      fetchMyOrders();
      fetchMyCoupons();
    }
  }, [isLoggedIn, currentRole]);

  // Fetch vendor data when vendor is active
  useEffect(() => {
    if (isLoggedIn && currentRole === 'vendor') {
      fetchVendorData();
    }
  }, [isLoggedIn, currentRole]);

  // Fetch admin data when admin logs in
  useEffect(() => {
    if (isLoggedIn && currentRole === 'admin') {
      fetchAdminVendors();
      fetchAdminOrders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, currentRole]);

  // ─── Data Fetchers ───────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (params = {}) => {
    setLoadingProducts(true);
    try {
      const res = await productApiService.getProducts(params);
      if (res?.success) setProducts(res.data.products || []);
    } catch (e) {
      console.warn('Products fetch:', e.message);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      // Use public endpoint — no auth required
      const res = await api.get('/admin/categories/public');
      if (res?.success) setCategories(res.data.categories || STATIC_CATEGORIES);
    } catch (_) { /* silently use static fallback */ }
  }, []);

  const fetchCoupons = useCallback(async (params = {}) => {
    try {
      const res = await couponApiService.getCoupons(params);
      if (res?.success) setCoupons(res.data.coupons || []);
    } catch (e) { console.warn('Coupons fetch:', e.message); }
  }, []);

  const fetchExclusiveCoupons = useCallback(async () => {
    try {
      const res = await couponApiService.getExclusiveCoupons();
      if (res?.success) setExclusiveCoupons(res.data.coupons || []);
    } catch (e) { console.warn('Exclusive coupons fetch:', e.message); }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      const res = await couponApiService.getPackages();
      if (res?.success) setPackages(res.data.packages || []);
    } catch (e) { console.warn('Packages fetch:', e.message); }
  }, []);

  const fetchMyOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await orderApiService.getMyOrders();
      if (res?.success) setOrders(res.data.orders || []);
    } catch (e) { console.warn('Orders fetch:', e.message); }
    finally { setLoadingOrders(false); }
  }, []);

  const fetchMyCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const res = await couponApiService.getMyCoupons();
      if (res?.success) setUserCoupons(res.data.userCoupons || []);
    } catch (e) { console.warn('UserCoupons fetch:', e.message); }
    finally { setLoadingCoupons(false); }
  }, []);

  const fetchWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const [balRes, txRes] = await Promise.all([
        walletApiService.getWalletBalance(),
        walletApiService.getWalletTransactions({ limit: 50 }),
      ]);
      if (balRes?.success) setWalletBalance(balRes.data.walletBalance);
      if (txRes?.success)  setWalletTransactions(txRes.data.transactions || []);
    } catch (e) { console.warn('Wallet fetch:', e.message); }
    finally { setLoadingWallet(false); }
  }, []);

  const fetchVendorData = useCallback(async () => {
    // Fetch vendor's own orders and coupons (not admin endpoints)
    try {
      const res = await orderApiService.getVendorOrders({ limit: 50 });
      if (res?.success) setOrders(res.data.orders || []);
    } catch (e) { console.warn('Vendor orders fetch:', e.message); }
    try {
      const res = await couponApiService.getVendorCoupons({ limit: 50 });
      if (res?.success) setCoupons(res.data.coupons || []);
    } catch (e) { console.warn('Vendor coupons fetch:', e.message); }
    // Fetch vendor products
    try {
      const res = await productApiService.getVendorProducts({ limit: 50 });
      if (res?.success) setProducts(res.data.products || []);
    } catch (e) { console.warn('Vendor products fetch:', e.message); }
  }, []);

  // ─── AUTH ACTIONS ────────────────────────────────────────────────────────

  const verifyKolkataPin = async (pin) => {
    try {
      const res = await authApiService.verifyPin(pin);
      if (res?.success) {
        setIsKolkataVerified(true);
        sessionStorage.setItem('dk_pin_ok', 'true');
        return true;
      }
      return false;
    } catch (e) {
      showError(e.message);
      return false;
    }
  };

  const sendOTP = async (phone) => {
    try {
      const res = await authApiService.sendOTP(phone);
      if (res?.success) {
        if (import.meta.env.DEV && res.data?.devOtp) {
          showInfo(`[DEV] OTP: ${res.data.devOtp}`);
          return { success: true, devOtp: res.data.devOtp };
        }
        return { success: true };
      }
      return { success: false, error: 'Failed to send OTP' };
    } catch (e) {
      // If account not found, tell UI to redirect to register
      const isNotFound = e.message?.toLowerCase().includes('no account') ||
                         e.message?.toLowerCase().includes('register');
      return { success: false, error: e.message, notFound: isNotFound };
    }
  };

  // Step 1 of registration — send OTP
  const registerSendOTP = async (phone, name, email = '') => {
    try {
      const res = await authApiService.registerSendOTP(phone, name, email);
      if (res?.success) {
        if (import.meta.env.DEV && res.data?.devOtp) {
          showInfo(`[DEV] Register OTP: ${res.data.devOtp}`);
          return { success: true, devOtp: res.data.devOtp };
        }
        return { success: true };
      }
      return { success: false, error: 'Failed to send OTP' };
    } catch (e) {
      const alreadyExists = e.message?.toLowerCase().includes('already exists');
      return { success: false, error: e.message, alreadyExists };
    }
  };

  // Step 2 of registration — verify OTP + address → activate + login
  const registerVerify = async ({ phone, otp, addressLabel, addressText, addressPin }) => {
    try {
      const res = await authApiService.registerVerify({ phone, otp, addressLabel, addressText, addressPin });
      if (res?.success) {
        const { user } = res.data;
        localStorage.setItem('dk_session', 'true');
        localStorage.setItem('dk_user', JSON.stringify(user));
        setCurrentUser(user);
        setClientProfile(user);
        setIsLoggedIn(true);
        setCurrentRole('client');
        justLoggedInRef.current = true;
        showSuccess('Welcome to Dear Kolkata! 🎉 ₹350 bonus added to your wallet.');
        // Fetch full profile (includes the saved address) in background
        authApiService.getMe().then(r => {
          if (r?.success) {
            const fullUser = r.data.user;
            localStorage.setItem('dk_user', JSON.stringify(fullUser));
            setCurrentUser(fullUser);
            setClientProfile(fullUser);
          }
        }).catch(() => {});
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const loginClient = async (phone, otp) => {
    try {
      const res = await authApiService.verifyOTP(phone, otp);
      if (res?.success) {
        const { user } = res.data;
        localStorage.setItem('dk_session', 'true');
        localStorage.setItem('dk_user', JSON.stringify(user));
        setCurrentUser(user);
        setClientProfile(user);
        setIsLoggedIn(true);
        setCurrentRole('client');
        justLoggedInRef.current = true;
        // Fetch full profile (includes addresses) in background
        authApiService.getMe().then(r => {
          if (r?.success) {
            const fullUser = r.data.user;
            localStorage.setItem('dk_user', JSON.stringify(fullUser));
            setCurrentUser(fullUser);
            setClientProfile(fullUser);
          }
        }).catch(() => {});
        return { success: true };
      }
      return { success: false, error: 'Verification failed' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const vendorSignIn = async (phone, password) => {
    try {
      const res = await authApiService.vendorLogin(phone, password);
      if (res?.success) {
        const { user } = res.data;
        localStorage.setItem('dk_session', 'true');
        localStorage.setItem('dk_user', JSON.stringify(user));
        setCurrentUser(user);
        setIsLoggedIn(true);
        setCurrentRole('vendor');
        justLoggedInRef.current = true;
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const adminSignIn = async (email, password) => {
    try {
      const res = await authApiService.adminLogin(email, password);
      if (res?.success) {
        const { user } = res.data;
        localStorage.setItem('dk_session', 'true');
        localStorage.setItem('dk_user', JSON.stringify(user));
        setCurrentUser(user);
        setIsLoggedIn(true);
        setCurrentRole('admin');
        justLoggedInRef.current = true;
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const logoutClient = async () => {
    try { await authApiService.logout(); } catch (_) {}
    localStorage.removeItem('dk_session');
    localStorage.removeItem('dk_user');
    // NOTE: We intentionally keep dk_pin_ok in sessionStorage so the user
    // doesn't have to re-enter their Kolkata PIN after logging out within
    // the same browser session.
    setIsLoggedIn(false);
    setCurrentUser(null);
    setClientProfile(null);
    setCurrentRole('client');
    setCart([]);
    setOrders([]);
    setUserCoupons([]);
    setWalletBalance(0);
    setWalletTransactions([]);
  };

  // ─── ADMIN: VENDOR ONBOARDING ────────────────────────────────────────────

  const onboardVendor = async (vendorData) => {
    try {
      const res = await adminApiService.onboardVendor(vendorData);
      if (res?.success) {
        showSuccess('Vendor onboarded successfully!');
        // Refresh admin vendor list
        const vRes = await adminApiService.getAllVendors();
        if (vRes?.success) setVendors(vRes.data.vendors || []);
        return { success: true, vendor: res.data.vendor, credentials: res.data.credentials };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  // Admin-specific: refresh vendor directory
  const fetchAdminVendors = useCallback(async () => {
    try {
      const res = await adminApiService.getAllVendors({ limit: 100 });
      if (res?.success) setVendors(res.data.vendors || []);
    } catch (e) { console.warn('Admin vendors fetch:', e.message); }
  }, []);

  const fetchAdminOrders = useCallback(async (params = {}) => {
    setLoadingOrders(true);
    try {
      const res = await orderApiService.getAllOrders({ limit: 100, ...params });
      if (res?.success) setOrders(res.data.orders || []);
    } catch (e) { console.warn('Admin orders fetch:', e.message); }
    finally { setLoadingOrders(false); }
  }, []);

  const syncClientAddresses = (addresses = []) => {
    setClientProfile(prev => {
      const updated = { ...(prev || currentUser || {}), addresses };
      localStorage.setItem('dk_user', JSON.stringify(updated));
      return updated;
    });
    setCurrentUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, addresses };
      localStorage.setItem('dk_user', JSON.stringify(updated));
      return updated;
    });
  };

  const addClientAddress = async (addressData) => {
    try {
      const res = await authApiService.addAddress(addressData);
      if (res?.success) {
        syncClientAddresses(res.data.addresses || []);
        showSuccess('Address added.');
        return { success: true };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  const deleteClientAddress = async (addressId) => {
    try {
      const res = await authApiService.deleteAddress(addressId);
      if (res?.success) {
        syncClientAddresses(res.data.addresses || []);
        showSuccess('Address removed.');
        return { success: true };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  const updateClientProfile = async (profileData) => {
    try {
      const res = await clientApiService.updateClientProfile(profileData);
      if (res?.success) {
        const updatedUser = res.data.user;
        setClientProfile(updatedUser);
        setCurrentUser(updatedUser);
        localStorage.setItem('dk_user', JSON.stringify(updatedUser));
        showSuccess('Profile updated.');
        return { success: true };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  const uploadClientAvatar = async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await clientApiService.uploadAvatar(formData);
      if (res?.success) {
        const profileImage = { url: res.data.avatarUrl };
        setClientProfile(prev => {
          const updated = { ...(prev || {}), profileImage };
          localStorage.setItem('dk_user', JSON.stringify(updated));
          return updated;
        });
        setCurrentUser(prev => prev ? { ...prev, profileImage } : prev);
        showSuccess('Profile image updated.');
        return { success: true };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  const updateVendorStatus = async (vendorId, status) => {
    try {
      const res = await adminApiService.updateVendorStatus(vendorId, status);
      if (res?.success) {
        setVendors(prev =>
          prev.map(v => v._id === vendorId || v.id === vendorId ? { ...v, status } : v)
        );
        showSuccess(`Vendor status updated to ${status}`);
      }
    } catch (e) { showError(e.message); }
  };

  // ─── PRODUCTS ────────────────────────────────────────────────────────────

  const addEditProduct = async (productData) => {
    try {
      const { imageFiles = [], ...payload } = productData;
      let res;
      if (payload.id || payload._id) {
        const id = payload._id || payload.id;
        res = await productApiService.updateProduct(id, payload);
      } else {
        res = await productApiService.createProduct(payload);
      }
      if (res?.success) {
        const product = res.data.product;
        const productId = product?._id || product?.id || payload._id || payload.id;

        if (imageFiles.length > 0 && productId) {
          const formData = new FormData();
          imageFiles.slice(0, 5).forEach(file => formData.append('images', file));
          await productApiService.uploadProductImages(productId, formData);
        }

        showSuccess(payload._id ? 'Product updated.' : 'Product submitted for review.');
        if (currentRole === 'vendor') await fetchVendorData();
        else await fetchProducts();
        return { success: true, product };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  const deleteProduct = async (productId) => {
    try {
      await productApiService.deleteProduct(productId);
      setProducts(prev => prev.filter(p => (p._id || p.id) !== productId));
      showSuccess('Product removed from your catalog.');
    } catch (e) { showError(e.message); }
  };

  // ─── CART ────────────────────────────────────────────────────────────────

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const id = product._id || product.id;
      const existing = prev.find(item => (item._id || item.id) === id);
      if (existing) {
        return prev.map(item =>
          (item._id || item.id) === id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => (item._id || item.id) !== productId));
    } else {
      setCart(prev =>
        prev.map(item => (item._id || item.id) === productId ? { ...item, quantity } : item)
      );
    }
  };

  const clearCart = () => setCart([]);

  // ─── ORDERS ──────────────────────────────────────────────────────────────
  //
  // NOTE: The new payment flow (Razorpay / COD / Wallet) is handled directly
  // in Checkout.jsx using paymentApi. The placeOrder function below is kept
  // for backward compatibility only.

  const placeOrder = async (deliveryAddress, deliveryPin, deliverySlot, useWallet) => {
    if (cart.length === 0) return { success: false, error: 'Cart is empty' };

    const items = cart.map(item => ({
      productId: item._id || item.id,
      quantity:  item.quantity,
    }));

    const grandTotal   = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const walletAmount = useWallet ? Math.min(walletBalance, grandTotal) : 0;

    try {
      const res = await orderApiService.createOrder({
        items,
        deliveryAddress,
        deliveryPin,
        deliverySlot,
        paymentMethod: useWallet ? 'wallet' : 'upi',
        walletAmount,
      });

      if (res?.success) {
        clearCart();
        showSuccess('Order placed successfully!');
        await Promise.all([fetchMyOrders(), fetchWallet()]);
        return { success: true };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  const updateOrderStatus = async (orderId, status, extra = {}) => {
    try {
      const res = await orderApiService.updateOrderStatus(orderId, status, extra);
      if (res?.success) {
        setOrders(prev => prev.map(o => (o._id || o.id) === orderId ? res.data.order : o));
        showSuccess(`Order marked as ${status}`);
      }
    } catch (e) { showError(e.message); }
  };

  const requestReturn = async (orderId, reason, description = '') => {
    try {
      const res = await orderApiService.requestReturn(orderId, reason, description);
      if (res?.success) {
        setOrders(prev => prev.map(o => (o._id || o.id) === orderId ? res.data.order : o));
        showSuccess('Return request submitted.');
      }
    } catch (e) { showError(e.message); }
  };

  const handleReturnDecision = async (orderId, approved, rejectReason = '') => {
    try {
      const res = await orderApiService.handleReturnDecision(orderId, approved, rejectReason);
      if (res?.success) {
        setOrders(prev => prev.map(o => (o._id || o.id) === orderId ? res.data.order : o));
        if (approved) {
          showSuccess('Return approved. Refund credited to client wallet.');
          fetchWallet();
        } else {
          showSuccess('Return rejected. Dispute escalated to admin.');
        }
      }
    } catch (e) { showError(e.message); }
  };

  const resolveAdminDispute = async (orderId, favorClient, adminNotes = '') => {
    try {
      const res = await orderApiService.resolveDispute(orderId, favorClient, adminNotes);
      if (res?.success) {
        setOrders(prev => prev.map(o => (o._id || o.id) === orderId ? res.data.order : o));
        showSuccess(favorClient ? 'Ruled in client favour. Refund issued.' : 'Ruled in vendor favour. Payout released.');
      }
    } catch (e) { showError(e.message); }
  };

  // ─── COUPONS ─────────────────────────────────────────────────────────────

  const createVendorCoupon = async (couponData) => {
    try {
      const res = await couponApiService.createCoupon(couponData);
      if (res?.success) {
        showSuccess('Coupon submitted for admin approval.');
        await fetchCoupons();
        return { success: true };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  const approveRejectCoupon = async (couponId, approve) => {
    try {
      const res = approve
        ? await couponApiService.approveCoupon(couponId)
        : await couponApiService.rejectCoupon(couponId, 'Rejected by admin');
      if (res?.success) {
        setCoupons(prev =>
          prev.map(c => (c._id || c.id) === couponId
            ? { ...c, status: approve ? 'Approved' : 'Rejected' }
            : c
          )
        );
        showSuccess(`Coupon ${approve ? 'approved' : 'rejected'}.`);
      }
    } catch (e) { showError(e.message); }
  };

  const buyCoupon = async (couponId) => {
    try {
      const res = await couponApiService.purchaseCoupon(couponId);
      if (res?.success) {
        const newUC = res.data.userCoupon;
        // Optimistic inject — locker dikhne se pehle hi state mein daal do
        if (newUC) {
          setUserCoupons(prev => [newUC, ...prev]);
        }
        showSuccess('Coupon added to your locker!');
        // Background refresh for consistency + wallet deduction
        Promise.all([fetchMyCoupons(), fetchWallet()]).catch(() => {});
        return { success: true };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  const generateCouponCode = async (userCouponId) => {
    try {
      const res = await couponApiService.generateCouponCode(userCouponId);
      if (res?.success) {
        showSuccess(`Code generated! Valid for ${Math.round(res.data.timerSeconds / 3600)}h.`);
        await fetchMyCoupons();
        return res.data;
      }
    } catch (e) { showError(e.message); }
  };

  const redeemCouponInStore = async (code, billAmount) => {
    try {
      const res = await couponApiService.redeemCoupon(code, Number(billAmount));
      if (res?.success) {
        showSuccess('Coupon redeemed successfully!');
        // Refresh client locker so status changes to Redeemed immediately
        await Promise.all([fetchMyCoupons(), fetchWallet()]);
        return { success: true, ...res.data };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // ─── PACKAGES ────────────────────────────────────────────────────────────

  const createAdminPackage = async (pkgData) => {
    try {
      const res = await couponApiService.createPackage(pkgData);
      if (res?.success) {
        showSuccess('Package published!');
        await fetchPackages();
        return { success: true };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  const buyAdminPackage = async (pkgId) => {
    try {
      const res = await couponApiService.purchasePackage(pkgId);
      if (res?.success) {
        showSuccess(`Package purchased! ${res.data.couponsAdded} coupon(s) added to your locker.`);
        await Promise.all([fetchMyCoupons(), fetchWallet()]);
        return { success: true };
      }
    } catch (e) {
      showError(e.message);
      return { success: false, error: e.message };
    }
  };

  // ─── ADMIN: CATEGORY COMMISSION ──────────────────────────────────────────

  const configureCategoryCommission = async (catId, newCommission) => {
    try {
      const res = await adminApiService.updateCategory(catId, { commission: Number(newCommission) });
      if (res?.success) {
        setCategories(prev =>
          prev.map(c => c.id === catId ? { ...c, commission: Number(newCommission) } : c)
        );
        showSuccess(`Commission for "${catId}" updated to ${newCommission}%.`);
      }
    } catch (e) { showError(e.message); }
  };

  // ─── CONTEXT VALUE ───────────────────────────────────────────────────────
  return (
    <AppContext.Provider value={{
      // Auth state
      isKolkataVerified,
      isLoggedIn,
      currentUser,
      clientProfile,
      currentRole,
      setCurrentRole,
      activeVendorId,
      setActiveVendorId,
      vendorProfile,
      adminRole,
      setAdminRole,

      // Catalogue
      categories,
      products,
      vendors,
      coupons,
      exclusiveCoupons,
      packages,

      // Client
      orders,
      userCoupons,
      walletBalance,
      walletTransactions,
      cart,

      // Notifications (from polling hook)
      notifications:  notifHook.notifications,
      unreadCount:    notifHook.unreadCount,
      markNotifRead:  notifHook.markAsRead,
      markAllNotifsRead: notifHook.markAllAsRead,
      refetchNotifs:  notifHook.refetch,

      // Loading states
      loadingProducts,
      loadingOrders,
      loadingWallet,
      loadingCoupons,

      // Refetch helpers
      fetchProducts,
      fetchMyOrders,
      fetchMyCoupons,
      fetchWallet,
      fetchVendorData,
      fetchAdminVendors,
      fetchAdminOrders,

      // Auth actions
      verifyKolkataPin,
      sendOTP,
      loginClient,
      vendorSignIn,
      adminSignIn,
      logoutClient,
      updateClientProfile,
      uploadClientAvatar,
      addClientAddress,
      deleteClientAddress,
      registerSendOTP,
      registerVerify,

      // Admin
      onboardVendor,
      updateVendorStatus,
      configureCategoryCommission,

      // Products
      addEditProduct,
      deleteProduct,

      // Cart
      addToCart,
      updateCartQuantity,
      clearCart,

      // Orders
      placeOrder,
      updateOrderStatus,
      requestReturn,
      handleReturnDecision,
      resolveAdminDispute,

      // Coupons
      createVendorCoupon,
      approveRejectCoupon,
      buyCoupon,
      generateCouponCode,
      redeemCouponInStore,

      // Packages
      createAdminPackage,
      buyAdminPackage,
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Convenience hook
export const useApp = () => useContext(AppContext);
