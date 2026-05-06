import { useOutletContext } from 'react-router-dom';

/**
 * Returns the role ('admin' | 'employee') from the DashboardLayout outlet context.
 * Also provides a helper to build role-aware paths.
 *
 * Usage:
 *   const { role, isAdmin, path } = useRole();
 *   navigate(path('/stock'));  // → '/admin/stock' or '/stock'
 */
export function useRole() {
  const ctx = useOutletContext() || {};
  const role = ctx.role || 'admin';
  const isAdmin = role === 'admin';


  
  /**
   * Build a role-aware path.
   * Admin:    path('/stock')  → '/admin/stock'
   * Employee: path('/stock')  → '/stock'
   */
  const path = (suffix) => {
    const s = suffix.startsWith('/') ? suffix : `/${suffix}`;
    console.log(isAdmin ? `/admin${s}` : s);
    
    return isAdmin ? `/admin${s}` : s;
  };


  return { role, isAdmin, isEmployee: !isAdmin, path };
}
