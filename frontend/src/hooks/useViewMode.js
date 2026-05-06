import { useState, useEffect, useCallback } from 'react';

const SMALL_BREAKPOINT = 768;

function isSmallScreen() {
  return window.innerWidth < SMALL_BREAKPOINT;
}

/**
 * Manages table/grid view mode per page.
 * - Small screens: always forces `smallMode` (default 'grid'), toggle is hidden
 * - Large screens: persists chosen mode in localStorage per pageKey, defaulting to `defaultMode`
 *
 * @param {string} pageKey       - unique key per page for localStorage
 * @param {string} defaultMode   - default mode on large screens ('table' | 'grid' | 'cards')
 * @param {string} smallMode     - mode forced on small screens (default 'grid')
 * @returns {[string, Function, boolean]} [viewMode, setViewMode, isSmallScreen]
 */
export function useViewMode(pageKey, defaultMode = 'table', smallMode = 'grid') {
  const storageKey = `viewMode_${pageKey}`;

  const getMode = useCallback(() => {
    if (isSmallScreen()) return smallMode;
    try {
      return localStorage.getItem(storageKey) || defaultMode;
    } catch {
      return defaultMode;
    }
  }, [storageKey, defaultMode, smallMode]);

  const [viewMode, setViewModeState] = useState(getMode);
  const [isSmall, setIsSmall] = useState(isSmallScreen);

  useEffect(() => {
    const handler = () => {
      const small = isSmallScreen();
      setIsSmall(small);
      if (small) {
        setViewModeState(smallMode);
      } else {
        setViewModeState(() => {
          try {
            return localStorage.getItem(storageKey) || defaultMode;
          } catch {
            return defaultMode;
          }
        });
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [storageKey, defaultMode, smallMode]);

  const setViewMode = useCallback((mode) => {
    setViewModeState(mode);
    if (!isSmallScreen()) {
      try {
        localStorage.setItem(storageKey, mode);
      } catch {}
    }
  }, [storageKey]);

  return [viewMode, setViewMode, isSmall];
}
