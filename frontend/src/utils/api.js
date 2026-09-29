/**
 * Safe API and JSON parsing utilities for PHANTOM Frontend
 * Prevents "JSON.parse: unexpected end of data at line 1 column 1" errors
 * caused by empty responses, 404s, or malformed data in Firefox/Chrome.
 */

export const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location) {
    return `http://${window.location.hostname}:8001`;
  }
  return 'http://localhost:8001';
};

/**
 * Safely parse response body as JSON.
 * Returns fallback if response is empty, not JSON, or fails to parse.
 */
export const safeJson = async (res, fallback = null) => {
  try {
    if (!res) return fallback;
    const text = await res.text();
    if (!text || !text.trim() || text.trim() === 'undefined' || text.trim() === 'null') {
      return fallback;
    }
    return JSON.parse(text);
  } catch (err) {
    console.warn('[PHANTOM] safeJson parse error suppressed:', err);
    return fallback;
  }
};

/**
 * Safely read and parse localStorage items with fallback.
 */
export const safeStorageGet = (key, fallback = null) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const val = localStorage.getItem(key);
    if (!val || !val.trim() || val.trim() === 'undefined' || val.trim() === 'null') {
      return fallback;
    }
    return JSON.parse(val);
  } catch (err) {
    console.warn(`[PHANTOM] safeStorageGet error for key "${key}":`, err);
    return fallback;
  }
};
