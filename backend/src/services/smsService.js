const axios = require('axios');

/**
 * SMS Service using 2Factor.in
 * Used for sending OTP via SMS to Indian phone numbers
 *
 * 2Factor API Docs: https://2factor.in/API/
 *
 * Supported flows:
 *  1. Auto-generate OTP  → 2Factor generates + sends OTP, returns it
 *  2. Custom OTP         → We generate OTP, send it via 2Factor
 *
 * We use Flow 2 (Custom OTP) so we stay in control of the value
 * and can store it in DB for verification.
 */

const TWOFACTOR_BASE_URL = 'https://2factor.in/API/V1';

/**
 * Send OTP via 2Factor.in SMS API
 * @param {string} phone  - 10-digit Indian mobile number (no +91 prefix)
 * @param {string} otp    - The OTP to send (4–6 digits)
 * @param {string} [templateName] - Optional: 2Factor template name (if DLT registered)
 * @returns {Promise<{ success: boolean, sessionId?: string, error?: string }>}
 */
const sendOTPViaSMS = async (phone, otp, templateName = null) => {
  const apiKey = process.env.TWOFACTOR_API_KEY;

  if (!apiKey) {
    console.error('[SMS] TWOFACTOR_API_KEY is not set in environment variables');
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    // Remove +91 prefix if present, keep only 10 digits
    const cleanPhone = phone.replace(/^\+?91/, '').trim();

    // Build URL: /API/V1/{api_key}/SMS/{phone}/{otp}/{templateName_or_AUTOGEN2}
    const template = templateName || process.env.TWOFACTOR_TEMPLATE_NAME || 'AUTOGEN2';
    const url = `${TWOFACTOR_BASE_URL}/${apiKey}/SMS/${cleanPhone}/${otp}/${template}`;

    const response = await axios.get(url, { timeout: 10000 });

    if (response.data && response.data.Status === 'Success') {
      console.log(`[SMS] OTP sent to ${cleanPhone} | Session: ${response.data.Details}`);
      return { success: true, sessionId: response.data.Details };
    }

    console.error(`[SMS] 2Factor API error:`, response.data);
    return {
      success: false,
      error: response.data?.Details || 'Failed to send SMS'
    };

  } catch (error) {
    console.error(`[SMS] Exception while sending OTP to ${phone}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Verify OTP via 2Factor session (optional — we do DB verification,
 * but this can be used as a second layer if needed)
 * @param {string} sessionId - Session ID returned by sendOTPViaSMS
 * @param {string} otp       - OTP entered by user
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
const verifyOTPSession = async (sessionId, otp) => {
  const apiKey = process.env.TWOFACTOR_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    const url = `${TWOFACTOR_BASE_URL}/${apiKey}/SMS/VERIFY/${sessionId}/${otp}`;
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data && response.data.Status === 'Success') {
      return { success: true };
    }

    return {
      success: false,
      error: response.data?.Details || 'OTP verification failed'
    };

  } catch (error) {
    console.error(`[SMS] Exception while verifying session ${sessionId}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPViaSMS, verifyOTPSession };
