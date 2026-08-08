/**
 * useRazorpay — dynamically loads the Razorpay checkout script
 * and provides a helper to open the payment modal.
 *
 * Usage:
 *   const { openRazorpayModal, loading } = useRazorpay();
 *   openRazorpayModal({ orderId, amount, currency, keyId, prefill, onSuccess, onFailure });
 */

import { useCallback, useRef } from 'react';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const loadScript = () => {
  return new Promise((resolve) => {
    // If already loaded, resolve immediately
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    // If script tag exists but not loaded yet, wait for it
    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    // Create and append script tag
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const useRazorpay = () => {
  const rzpRef = useRef(null);

  const openRazorpayModal = useCallback(async ({
    orderId,      // Razorpay order ID from server
    amount,       // Amount in paise
    currency = 'INR',
    keyId,        // Razorpay public key
    prefill = {}, // { name, email, contact }
    onSuccess,    // ({ razorpayPaymentId, razorpayOrderId, razorpaySignature }) => void
    onFailure,    // (error) => void
    description = 'Dear Kolkata — Gift Order',
    theme = { color: '#C41E3A' }, // Crimson brand color
  }) => {
    const loaded = await loadScript();

    if (!loaded) {
      onFailure?.({ message: 'Payment gateway failed to load. Please check your internet connection.' });
      return;
    }

    const options = {
      key:         keyId,
      amount,
      currency,
      order_id:    orderId,
      name:        'Dear Kolkata',
      description,
      image:       '/favicon.svg',
      theme,
      prefill: {
        name:    prefill.name    || '',
        email:   prefill.email   || '',
        contact: prefill.contact || '',
      },
      handler: (response) => {
        // Called by Razorpay on successful payment
        onSuccess?.({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId:   response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          onFailure?.({ message: 'Payment cancelled by user.', cancelled: true });
        },
        escape:         false, // Don't close on Escape key — prevent accidental dismiss
        backdropclose:  false,
      },
    };

    // Destroy previous instance if any
    if (rzpRef.current) {
      try { rzpRef.current.close(); } catch (_) {}
    }

    rzpRef.current = new window.Razorpay(options);

    rzpRef.current.on('payment.failed', (response) => {
      onFailure?.({
        message: response.error?.description || 'Payment failed. Please try another method.',
        code:    response.error?.code,
        reason:  response.error?.reason,
      });
    });

    rzpRef.current.open();
  }, []);

  return { openRazorpayModal };
};

export default useRazorpay;
