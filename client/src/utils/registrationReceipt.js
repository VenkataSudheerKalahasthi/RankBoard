/**
 * Registration Receipt Utilities
 * Provides resilient multi-storage persistence (Cookie + localStorage)
 * so registration status is preserved even if one storage layer is cleared,
 * without relying solely on localStorage or sessionStorage.
 */

const RECEIPT_KEY = 'rankboard_reg_receipt';
const COOKIE_MAX_AGE_SECONDS = 180 * 24 * 60 * 60; // 180 days

/**
 * Retrieve the registration receipt from cookie or localStorage
 * Automatically synchronizes between both layers
 */
export const getStoredRegistrationReceipt = () => {
  let receipt = null;

  // 1. Try Document Cookie
  if (typeof document !== 'undefined' && document.cookie) {
    try {
      const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + RECEIPT_KEY + '=([^;]*)'));
      if (match && match[1]) {
        receipt = decodeURIComponent(match[1]);
      }
    } catch (e) {
      // Ignore cookie read error
    }
  }

  // 2. Fall back to LocalStorage if not found in cookie
  if (!receipt && typeof window !== 'undefined' && window.localStorage) {
    try {
      receipt = localStorage.getItem(RECEIPT_KEY);
    } catch (e) {
      // Ignore localStorage read error
    }
  }

  // If receipt is present in one storage layer, ensure it is mirrored to the other
  if (receipt) {
    mirrorReceipt(receipt);
  }

  return receipt;
};

/**
 * Persist registration receipt across both Cookie and LocalStorage
 */
export const saveRegistrationReceipt = (receipt) => {
  if (!receipt) return;
  mirrorReceipt(receipt);
};

/**
 * Remove registration receipt from both Cookie and LocalStorage
 */
export const clearRegistrationReceipt = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(RECEIPT_KEY);
    } catch (e) {}
  }

  if (typeof document !== 'undefined') {
    try {
      document.cookie = `${RECEIPT_KEY}=; path=/; max-age=0; SameSite=Lax`;
    } catch (e) {}
  }
};

/**
 * Internal helper to mirror receipt to both cookie and localStorage
 */
const mirrorReceipt = (receipt) => {
  if (typeof document !== 'undefined') {
    try {
      document.cookie = `${RECEIPT_KEY}=${encodeURIComponent(receipt)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
    } catch (e) {}
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(RECEIPT_KEY, receipt);
    } catch (e) {}
  }
};
