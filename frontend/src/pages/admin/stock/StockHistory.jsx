import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowDownCircle, ArrowUpCircle, RefreshCw,
  Search, ChevronLeft, ChevronRight, Filter, X,
  Package, TrendingUp, TrendingDown, Activity, Download,
} from 'lucide-react';
import { useRole } from '../../../hooks/useRole';
import stockService from '../../../services/stockService';

// --- helpers ---

function fmt(n) {
  return Number(n ?? 0).toLocaleString();
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const MOVEMENT_META = {
  IN:         { label: 'IN',         cls: 'stoq-badge--success', icon: ArrowDownCircle, color: 'var(--success)' },
  OUT:        { label: 'OUT',        cls: 'stoq-badge--danger',  icon: ArrowUpCircle,   color: 'var(--danger)'  },
  ADJUSTMENT: { label: 'ADJUSTMENT', cls: 'stoq-badge--warning', icon: Activity,        color: 'var(--warning)' },
};

function MovementBadge({ type }) {
  const m = MOVEMENT_META[type] || { label: type, cls: '', color: 'var(--fg)' };
  return <span className={`stoq-badge ${m.cls}`} style={{ fontSize: 10, fontWeight: 700 }}>{m.label}</span>;
}

// --- QtyFlow - the before → change → after visual ---
function QtyFlow({ before, change, after, type, unit }) {
  const isIn  = type === 'IN';
  const isOut = type === 'OUT';
  const isAdj = type === 'ADJUSTMENT';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      {/* Before */}
      <span style={{ color: 'var(--fg-muted)', minWidth: 36, textAlign: 'right' }}>{fmt(before)}</span>

      {/* Arrow + delta */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
          color: isIn ? 'var(--success)' : isOut ? 'var(--danger)' : 'var(--warning)',
        }}>
          {isIn ? `+${fmt(change)}` : isOut ? `-${fmt(change)}` : `±${fmt(change)}`}
        </span>
        <span style={{ color: 'var(--fg-subtle)', fontSize: 14, lineHeight: 1 }}>→</span>
      </div>

      {/* After */}
      <span style={{
        fontWeight: 700, minWidth: 36,
        color: isIn ? 'var(--success)' : isOut ? 'var(--danger)' : 'var(--fg)',
      }}>
        {fmt(after)}
      </span>

      {unit && <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{unit}</span>}
    </div>
  );
}

// --- main page ---

export default function StockHistory() {
  const navigate = useNavigate();
  const { path } = useRole();

  const [history, setHistory]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState(null);

  // filters
  const [search, setSearch]               = useState('');
  const [movementType, setMovementType]   = useState('');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');

  // summary stats derived from current page
  const [summary, setSummary] = useState({ in: 0, out: 0, adj: 0 });

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const data = await stockService.getHistory({
        page: pg,
        limit: 20,
        search: search || undefined,
        movementType: movementType || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setHistory(data.history);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(pg);

      // derive summary from current page
      const s = { in: 0, out: 0, adj: 0 };
      data.history.forEach(h => {
        if (h.movementType === 'IN')         s.in  += h.qtyChange;
        else if (h.movementType === 'OUT')   s.out += h.qtyChange;
        else                                 s.adj += 1;
      });
      setSummary(s);
    } catch {
      showToast('Failed to load stock history');
    } finally {
      setLoading(false);
    }
  }, [search, movementType, dateFrom, dateTo]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => load(1), 350);
    return () => clearTimeout(t);
  }, [search, movementType, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch('');
    setMovementType('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = search || movementType || dateFrom || dateTo;

  const exportCSV = () => {
    const headers = ['Date', 'Item', 'SKU', 'Movement', 'Qty Before', 'Qty Change', 'Qty After', 'Unit', 'Unit Price', 'Notes'];
    const rows = history.map(h => [
      new Date(h.createdAt).toLocaleString('en-GB'),
      h.stock?.itemName || '',
      h.stock?.sku || '',
      h.movementType,
      h.qtyBefore,
      h.qtyChange,
      h.qtyAfter,
      h.stock?.unit || '',
      h.unitPrice ?? '',
      (h.notes || '').replace(/,/g, ';'),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.msg}
        </div>
      )}

      {/* Page head */}
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(path('/stock'))}><ArrowLeft size={14} /></button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={{ color: 'var(--accent-soft-fg)' }} />
              Stock History
            </h1>
            <div className="page-head__sub">{total.toLocaleString()} movement records</div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={exportCSV} disabled={history.length === 0}>
            <Download size={13} /> Export CSV
          </button>
          <button className="stoq-btn stoq-btn--icon" onClick={() => load(page)} title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid kpi-grid--3" style={{ marginBottom: 'var(--gap-card)' }}>
        <div className="kpi">
          <div className="kpi__label">
            <span className="kpi__icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
              <TrendingUp size={12} />
            </span>
            Stock IN (this page)
          </div>
          <div className="kpi__value" style={{ color: 'var(--success)' }}>+{fmt(summary.in)}</div>
          <div className="kpi__foot"><span>units received</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__label">
            <span className="kpi__icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              <TrendingDown size={12} />
            </span>
            Stock OUT (this page)
          </div>
          <div className="kpi__value" style={{ color: 'var(--danger)' }}>-{fmt(summary.out)}</div>
          <div className="kpi__foot"><span>units consumed / issued</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__label">
            <span className="kpi__icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
              <Activity size={12} />
            </span>
            Adjustments (this page)
          </div>
          <div className="kpi__value">{summary.adj}</div>
          <div className="kpi__foot"><span>detail-only changes</span></div>
        </div>
      </div>

      {/* Panel */}
      <div className="stoq-panel">

        {/* Toolbar */}
        <div className="stoq-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
          {/* Search */}
          <div className="stoq-toolbar__search" style={{ position: 'relative', minWidth: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
            <input
              className="stoq-input stoq-input--search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search item, SKU, notes..."
            />
          </div>

          {/* Movement type filter */}
          <div className="stoq-segment">
            {[['', 'All'], ['IN', 'IN'], ['OUT', 'OUT'], ['ADJUSTMENT', 'Adjustment']].map(([val, label]) => (
              <button key={val} data-active={movementType === val ? 'true' : undefined}
                onClick={() => setMovementType(val)}>
                {label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={12} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
            <input type="date" className="stoq-input" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} style={{ width: 140 }} title="From" />
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>-</span>
            <input type="date" className="stoq-input" value={dateTo}
              onChange={e => setDateTo(e.target.value)} style={{ width: 140 }} title="To" />
          </div>

          {hasFilters && (
            <button className="stoq-btn stoq-btn--sm" onClick={clearFilters} style={{ color: 'var(--fg-subtle)' }}>
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="stoq-tbl">
            <thead>
              <tr>
                <th className="no-sort">Date & Time</th>
                <th className="no-sort">Item</th>
                <th className="no-sort">Movement</th>
                <th className="no-sort">Before → Change → After</th>
                <th className="no-sort num-cell">Unit Price</th>
                <th className="no-sort">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0' }}>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', margin: '0 auto' }} />
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg-subtle)' }}>
                    <Package size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                    <div style={{ fontSize: 12 }}>No history records found</div>
                    {hasFilters && (
                      <button className="stoq-btn stoq-btn--sm" style={{ marginTop: 10 }} onClick={clearFilters}>
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : history.map(h => {
                const meta = MOVEMENT_META[h.movementType] || MOVEMENT_META.ADJUSTMENT;
                const Icon = meta.icon;
                return (
                  <tr key={h.id}>
                    {/* Date */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                        {fmtDate(h.createdAt)}
                      </span>
                    </td>

                    {/* Item */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="kpi__icon" style={{ width: 28, height: 28, flexShrink: 0 }}>
                          <Package size={12} />
                        </span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
                            {h.stock?.itemName || 'â€”'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                            {h.stock?.sku || ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Movement type */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon size={14} style={{ color: meta.color, flexShrink: 0 }} />
                        <MovementBadge type={h.movementType} />
                      </div>
                    </td>

                    {/* Qty flow â€” the key column */}
                    <td>
                      <QtyFlow
                        before={h.qtyBefore}
                        change={h.qtyChange}
                        after={h.qtyAfter}
                        type={h.movementType}
                        unit={h.stock?.unit}
                      />
                    </td>

                    {/* Unit price */}
                    <td className="num-cell">
                      {h.unitPrice != null
                        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            RWF {Number(h.unitPrice).toLocaleString()}
                          </span>
                        : <span style={{ color: 'var(--fg-subtle)' }}>â€”</span>}
                    </td>

                    {/* Notes */}
                    <td style={{ maxWidth: 260 }}>
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.4, display: 'block' }}>
                        {h.notes || <span style={{ color: 'var(--fg-subtle)' }}>â€”</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
              Page {page} of {totalPages} - {total.toLocaleString()} records
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="stoq-btn stoq-btn--icon" disabled={page <= 1}
                style={{ opacity: page <= 1 ? 0.4 : 1 }} onClick={() => load(page - 1)}>
                <ChevronLeft size={14} />
              </button>
              <button className="stoq-btn stoq-btn--icon" disabled={page >= totalPages}
                style={{ opacity: page >= totalPages ? 0.4 : 1 }} onClick={() => load(page + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

