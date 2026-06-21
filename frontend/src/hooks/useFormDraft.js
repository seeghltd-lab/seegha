import { useEffect, useRef } from 'react';

const PREFIX = 'formDraft:';

/**
 * Read a previously saved draft for `key`, or null if there isn't one
 * (or it's corrupted/unavailable). Call this once per form, e.g. as the
 * lazy initializer for each useState: useState(() => draft?.foo ?? defaultFoo).
 */
export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Remove the saved draft for `key`. Call this right after a successful submit. */
export function clearDraft(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* localStorage unavailable */ }
}

/**
 * Auto-saves `data` to localStorage under `key` whenever it changes, so navigating
 * away and back restores in-progress form input instead of losing it.
 *
 * Usage:
 *   const draft = loadDraft('create-requisition');
 *   const [items, setItems] = useState(draft?.items ?? [emptyItem()]);
 *   const [siteId, setSiteId] = useState(draft?.siteId ?? '');
 *   useFormDraft('create-requisition', { items, siteId });
 *   // ...on successful submit: clearDraft('create-requisition');
 *
 * @param {string} key - unique key per form
 * @param {*} data - current form snapshot (plain object/array), saved as JSON
 * @param {boolean} enabled - set false to pause saving (e.g. while submitting/loading)
 */
export function useFormDraft(key, data, enabled = true) {
  const prevJsonRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      const json = JSON.stringify(data);
      if (json === prevJsonRef.current) return;
      prevJsonRef.current = json;
      localStorage.setItem(PREFIX + key, json);
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — fail silently
    }
  }, [key, data, enabled]);
}
