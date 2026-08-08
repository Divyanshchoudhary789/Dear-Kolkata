/**
 * Checkout.jsx — Complete Payment Flow
 *
 * Supports:
 * 1. Razorpay (UPI / NetBanking / Card / EMI)
 *    - Step 1: POST /payments/create-razorpay-order → get Razorpay orderId
 *    - Step 2: Open Razorpay modal
 *    - Step 3: On success → POST /payments/verify → create DB order
 * 2. Dear Kolkata Wallet (full balance)
 *    - POST /payments/place-wallet-order
 * 3. Razorpay + Partial Wallet
 *    - Step 1 sends walletAmount → Razorpay charges only the remainder
 *    - Step 3 verify call also sends walletAmount → server deducts wallet + creates order
 * 4. Cash on Delivery (COD)
 *    - Optional wallet partial pay
 *    - POST /payments/place-cod
 */

import React, { useContext, useState, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  ShieldCheck, Wallet, CreditCard, Truck, CheckCircle,
  ArrowLeft, Loader, AlertCircle, IndianRupee,
} from 'lucide-react';
import useRazorpay from '../../hooks/useRazorpay';
import * as paymentApi from '../../api/paymentApi';
import { showError, showSuccess } from '../../utils/toast';

// ─── Payment Method Config ────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id:          'razorpay',
    label:       'UPI / NetBanking / Card / EMI',
    description: 'Secure checkout via Razorpay gateway',
    Icon:        CreditCard,
    online:      true,
  },
  {
    id:          'wallet',
    label:       'Dear Kolkata Wallet (Full)',
    description: 'Deduct entire amount from wallet',
    Icon:        Wallet,
    online:      true,
  },
  {
    id:          'cod',
    label:       'Cash on Delivery',
    description: 'Pay cash when your order arrives',
    Icon:        Truck,
    online:      false,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
const Checkout = ({ details, setActiveTab }) => {
  const {
    cart,
    walletBalance,
    currentUser,
    clearCart,
    fetchMyOrders,
    fetchWallet,
  } = useContext(AppContext);

  const { openRazorpayModal } = useRazorpay();

  const [paymentMethod,    setPaymentMethod]    = useState('razorpay');
  const [usePartialWallet, setUsePartialWallet] = useState(false);
  const [isProcessing,     setIsProcessing]     = useState(false);
  const [processingStep,   setProcessingStep]   = useState('');
  const [isSuccess,        setIsSuccess]        = useState(false);
  const [successData,      setSuccessData]      = useState(null);
  const [error,            setError]            = useState('');

  if (!details) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p>Checkout session expired.</p>
        <button
          className="btn-primary"
          style={{ width: 'auto', display: 'inline-flex' }}
          onClick={() => setActiveTab('cart')}
        >
          Back to Cart
        </button>
      </div>
    );
  }

  const grandTotal      = details.grandTotal;
  const partialWallet   = usePartialWallet
    ? Math.min(walletBalance, grandTotal)
    : 0;
  const razorpayAmount  = grandTotal - partialWallet;
  const isWalletFull    = walletBalance >= grandTotal;

  // Cart items formatted for API
  const cartItems = cart.map((item) => ({
    productId: item._id || item.id,
    quantity:  item.quantity,
  }));

  const cartPayload = {
    items:           cartItems,
    deliveryAddress: details.address,
    deliveryPin:     details.pin,
    deliverySlot:    details.slot,
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSuccess = async (orders, extra = {}) => {
    setSuccessData({ orders, ...extra });
    setIsSuccess(true);
    clearCart();
    await Promise.all([fetchMyOrders(), fetchWallet()]);
  };

  const handleError = (msg) => {
    setError(msg || 'Payment failed. Please try again.');
    setIsProcessing(false);
    setProcessingStep('');
  };

  // 1. Razorpay flow (with optional partial wallet)
  const handleRazorpay = async () => {
    setIsProcessing(true);
    setError('');
    setProcessingStep('Creating payment order…');

    try {
      // Step 1: Create Razorpay order on server
      const res = await paymentApi.createRazorpayOrder({
        ...cartPayload,
        walletAmount: partialWallet,
      });

      if (!res?.success) {
        handleError(res?.message || 'Could not initiate payment.');
        return;
      }

      const {
        razorpayOrderId,
        amount,
        currency,
        keyId,
        grandTotal: serverGrandTotal,
        walletAmountUsed,
      } = res.data;

      setProcessingStep('Opening payment gateway…');

      // Step 2: Open Razorpay modal
      openRazorpayModal({
        orderId:  razorpayOrderId,
        amount,
        currency,
        keyId,
        prefill: {
          name:    currentUser?.name    || '',
          email:   currentUser?.email   || '',
          contact: currentUser?.phone   || '',
        },
        onSuccess: async ({ razorpayPaymentId, razorpayOrderId: rpOid, razorpaySignature }) => {
          setProcessingStep('Verifying payment…');

          try {
            // Step 3: Verify + create order in DB
            const verifyRes = await paymentApi.verifyPayment({
              razorpayOrderId:   rpOid,
              razorpayPaymentId,
              razorpaySignature,
              ...cartPayload,
              walletAmount: walletAmountUsed,
            });

            if (verifyRes?.success) {
              showSuccess('Payment successful! Order placed.');
              await handleSuccess(verifyRes.data.orders, {
                grandTotal: verifyRes.data.grandTotal,
                method:     'razorpay',
                walletUsed: walletAmountUsed,
              });
            } else {
              handleError('Payment verified but order creation failed. Contact support.');
            }
          } catch (e) {
            handleError(e?.message || 'Verification failed. Contact support with your payment ID.');
          }
        },
        onFailure: ({ message, cancelled }) => {
          if (cancelled) {
            setIsProcessing(false);
            setProcessingStep('');
            setError('Payment cancelled. You can try again.');
          } else {
            handleError(message);
          }
        },
      });

    } catch (e) {
      handleError(e?.message || 'Something went wrong. Please try again.');
    }
  };

  // 2. Full wallet flow
  const handleWalletPayment = async () => {
    if (walletBalance < grandTotal) {
      setError('Insufficient wallet balance.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProcessingStep('Processing wallet payment…');

    try {
      const res = await paymentApi.placeWalletOrder(cartPayload);

      if (res?.success) {
        showSuccess('Order placed via wallet!');
        await handleSuccess(res.data.orders, {
          grandTotal: res.data.grandTotal,
          method:     'wallet',
          walletUsed: res.data.grandTotal,
        });
      } else {
        handleError(res?.message);
      }
    } catch (e) {
      handleError(e?.message);
    }
  };

  // 3. COD flow (with optional partial wallet)
  const handleCOD = async () => {
    const walletForCOD = usePartialWallet
      ? Math.min(walletBalance, grandTotal)
      : 0;

    if (walletForCOD > walletBalance) {
      setError('Insufficient wallet balance for partial payment.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProcessingStep('Placing COD order…');

    try {
      const res = await paymentApi.placeCODOrder({
        ...cartPayload,
        walletAmount: walletForCOD,
      });

      if (res?.success) {
        showSuccess('COD order placed!');
        await handleSuccess(res.data.orders, {
          grandTotal:  res.data.grandTotal,
          codAmount:   res.data.codAmount,
          walletUsed:  res.data.walletAmountUsed,
          method:      'cod',
          codMessage:  res.data.message,
        });
      } else {
        handleError(res?.message);
      }
    } catch (e) {
      handleError(e?.message);
    }
  };

  const handlePlaceOrder = () => {
    setError('');
    if (paymentMethod === 'razorpay') return handleRazorpay();
    if (paymentMethod === 'wallet')   return handleWalletPayment();
    if (paymentMethod === 'cod')      return handleCOD();
  };

  // ── Success Screen ─────────────────────────────────────────────────────────
  if (isSuccess && successData) {
    const method  = successData.method;
    const isCOD   = method === 'cod';
    const codAmt  = successData.codAmount;

    return (
      <div className="gate-screen animate-fade-in" style={{ minHeight: '60vh', padding: 0 }}>
        <div className="gate-card" style={{ maxWidth: '520px' }}>
          <div
            className="trust-icon-container"
            style={{ margin: '0 auto 20px auto', width: '64px', height: '64px', backgroundColor: '#ECFDF5', color: '#10B981' }}
          >
            <CheckCircle size={32} />
          </div>

          <h2 style={{ fontFamily: 'var(--font-serif)', margin: '0 0 8px 0' }}>
            {isCOD ? 'Order Confirmed!' : 'Payment Successful!'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
            {isCOD
              ? successData.codMessage || `Pay ₹${codAmt} cash on delivery. Order is confirmed!`
              : 'Your order has been placed. The vendor is packing your gift.'}
          </p>

          <div style={{
            backgroundColor: 'var(--bg-festive)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            textAlign: 'left',
            marginBottom: '24px',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div><strong>Address:</strong> {details.address}</div>
            <div><strong>PIN:</strong> {details.pin}</div>
            <div><strong>Time Slot:</strong> {details.slot}</div>
            <div><strong>Order Total:</strong> ₹{details.grandTotal}</div>
            {isCOD && codAmt > 0 && (
              <div style={{ color: '#D97706', fontWeight: '600' }}>
                <strong>Cash to pay on delivery:</strong> ₹{codAmt}
              </div>
            )}
            {successData.walletUsed > 0 && (
              <div style={{ color: '#059669' }}>
                <strong>Wallet deducted:</strong> ₹{successData.walletUsed}
              </div>
            )}
            {method === 'razorpay' && (
              <div><strong>Payment via:</strong> Razorpay (UPI / Card / Net Banking)</div>
            )}
            {method === 'wallet' && (
              <div><strong>Payment via:</strong> Dear Kolkata Wallet</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ flex: 1, minWidth: '120px' }}
              onClick={() => setActiveTab('orders')}
            >
              Track Orders
            </button>
            <button
              className="btn-gold"
              style={{ flex: 1, minWidth: '120px' }}
              onClick={() => setActiveTab('home')}
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Checkout UI ───────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      <button
        onClick={() => setActiveTab('cart')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontWeight: '600', cursor: 'pointer', marginBottom: '24px',
        }}
      >
        <ArrowLeft size={16} /> Back to Cart
      </button>

      <div className="page-title-banner">
        <div>
          <h2>Secure Payment</h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Complete your checkout — Kolkata delivery only
          </p>
        </div>
      </div>

      <div className="cart-layout">
        {/* Left column — payment method selection */}
        <div>
          <div className="cart-items-list" style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700',
              borderBottom: '1px solid var(--border)', paddingBottom: '12px',
            }}>
              Select Payment Method
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {PAYMENT_METHODS.map(({ id, label, description, Icon }) => {
                const isDisabled = id === 'wallet' && !isWalletFull;
                const isSelected = paymentMethod === id;

                return (
                  <label
                    key={id}
                    style={{
                      display:         'flex',
                      alignItems:      'center',
                      padding:         '16px',
                      border:          `1px solid ${isSelected ? 'var(--crimson)' : 'var(--border)'}`,
                      borderRadius:    'var(--radius-sm)',
                      cursor:          isDisabled ? 'not-allowed' : 'pointer',
                      backgroundColor: isSelected ? 'var(--crimson-light)' : '#fff',
                      opacity:         isDisabled ? 0.5 : 1,
                      transition:      'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="pm"
                      value={id}
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => {
                        setPaymentMethod(id);
                        setError('');
                        // Reset partial wallet when switching methods
                        if (id === 'wallet') setUsePartialWallet(false);
                      }}
                      style={{ marginRight: '12px', accentColor: 'var(--crimson)' }}
                    />
                    <Icon size={18} style={{ marginRight: '10px', flexShrink: 0, color: isSelected ? 'var(--crimson)' : 'inherit' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '14px' }}>{label}</strong>
                        {id === 'wallet' && (
                          <strong style={{ fontSize: '14px', color: isWalletFull ? 'var(--crimson)' : '#9CA3AF' }}>
                            ₹{walletBalance.toFixed(2)}
                          </strong>
                        )}
                      </div>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {id === 'wallet' && !isWalletFull
                          ? `Insufficient balance — need ₹${(grandTotal - walletBalance).toFixed(2)} more`
                          : description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Partial wallet toggle — shown when Razorpay or COD selected and wallet has balance */}
            {(paymentMethod === 'razorpay' || paymentMethod === 'cod') && walletBalance > 0 && (
              <div style={{
                marginTop: '16px',
                padding: '14px 16px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: 'var(--radius-sm)',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={usePartialWallet}
                    onChange={(e) => setUsePartialWallet(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#059669' }}
                  />
                  <div>
                    <strong style={{ fontSize: '13px', color: '#065F46' }}>
                      Use Wallet Balance (₹{Math.min(walletBalance, grandTotal).toFixed(2)})
                    </strong>
                    <span style={{ display: 'block', fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                      {usePartialWallet
                        ? paymentMethod === 'razorpay'
                          ? `₹${razorpayAmount.toFixed(2)} will be charged via Razorpay`
                          : `₹${(grandTotal - Math.min(walletBalance, grandTotal)).toFixed(2)} to pay on delivery`
                        : 'Apply your wallet balance to reduce the payable amount'}
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Trust badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px',
            backgroundColor: 'var(--bg-festive)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-muted)',
          }}>
            <ShieldCheck size={18} style={{ color: '#10B981', flexShrink: 0 }} />
            <span>256-bit SSL encrypted. Powered by Razorpay. Commission is not shown to you — only the product price.</span>
          </div>
        </div>

        {/* Right column — order summary */}
        <div className="cart-summary">
          <h3 style={{
            margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700',
            borderBottom: '1px solid var(--border)', paddingBottom: '12px',
          }}>
            Order Summary
          </h3>

          <div className="summary-row">
            <span>Items Total</span>
            <span>₹{details.subtotal}</span>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <span>{details.deliveryFee === 0 ? 'FREE' : `₹${details.deliveryFee}`}</span>
          </div>

          {usePartialWallet && walletBalance > 0 && (
            <div className="summary-row" style={{ color: '#059669' }}>
              <span>Wallet Deduction</span>
              <span>− ₹{Math.min(walletBalance, grandTotal).toFixed(2)}</span>
            </div>
          )}

          <div className="summary-row summary-total">
            <span>
              {paymentMethod === 'cod' && usePartialWallet
                ? 'Cash on Delivery'
                : paymentMethod === 'razorpay' && usePartialWallet
                ? 'Via Razorpay'
                : 'Grand Total'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IndianRupee size={14} />
              {paymentMethod === 'razorpay' && usePartialWallet
                ? razorpayAmount.toFixed(2)
                : paymentMethod === 'cod' && usePartialWallet
                ? (grandTotal - Math.min(walletBalance, grandTotal)).toFixed(2)
                : grandTotal}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '12px 0 16px', lineHeight: '1.4' }}>
            <strong>Ship to:</strong> {details.address}<br />
            <strong>Slot:</strong> {details.slot}
          </div>

          {paymentMethod === 'cod' && (
            <div style={{
              padding: '10px 14px', marginBottom: '14px',
              backgroundColor: '#FFFBEB', border: '1px solid #FCD34D',
              borderRadius: 'var(--radius-sm)', fontSize: '12px', color: '#92400E',
              display: 'flex', gap: '8px', alignItems: 'flex-start',
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                Please keep exact change ready at delivery.
                {usePartialWallet && walletBalance > 0 && (
                  <> Wallet balance of ₹{Math.min(walletBalance, grandTotal).toFixed(2)} will be deducted now.</>
                )}
              </span>
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'flex-start',
              color: 'var(--crimson)', fontSize: '13px', fontWeight: '600',
              marginBottom: '12px', padding: '10px 14px',
              backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2',
              borderRadius: 'var(--radius-sm)',
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              {error}
            </div>
          )}

          {/* Processing step indicator */}
          {isProcessing && processingStep && (
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px',
            }}>
              <Loader size={14} className="spin" />
              {processingStep}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            style={{ width: '100%' }}
          >
            {isProcessing ? (
              <><Loader size={16} className="spin" /> {processingStep || 'Processing…'}</>
            ) : paymentMethod === 'cod' ? (
              `Confirm COD Order • ₹${grandTotal}`
            ) : paymentMethod === 'wallet' ? (
              `Pay from Wallet • ₹${grandTotal}`
            ) : usePartialWallet ? (
              `Pay ₹${razorpayAmount.toFixed(2)} via Razorpay`
            ) : (
              `Pay ₹${grandTotal} via Razorpay`
            )}
          </button>

          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px', lineHeight: '1.4' }}>
            By placing this order, you agree to our Terms of Service and Return Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
