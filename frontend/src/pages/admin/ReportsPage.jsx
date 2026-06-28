import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Calendar, Printer, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import reportService from '../../services/reportService';

/* ─── Helpers ──────────────────────────────────────────────────── */
const fmtCurrency = (n) => {
  const num = Number(n ?? 0);
  if (num >= 1_000_000) return `RWF ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `RWF ${(num / 1_000).toFixed(0)}K`;
  return `RWF ${num.toLocaleString()}`;
};

const fmtNum = (n) => Number(n ?? 0).toLocaleString();

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const statusColor = (status) => {
  const map = {
    ACTIVE: 'var(--accent)',
    FULLY_RECEIVED: 'var(--accent)',
    APPROVED: 'var(--accent)',
    PENDING: 'var(--warning)',
    IN_TRANSIT: 'var(--warning)',
    PARTIALLY_RECEIVED: 'var(--warning)',
    INACTIVE: 'var(--fg-subtle)',
    COMPLETED: 'var(--fg-subtle)',
    PAUSED: 'var(--fg-subtle)',
    CANCELLED: 'var(--fg-subtle)',
    SUSPENDED: 'var(--danger, #e53e3e)',
    REJECTED: 'var(--danger, #e53e3e)',
    OUT: 'var(--danger, #e53e3e)',
  };
  return map[status] || 'var(--fg-muted)';
};

const StatusBadge = ({ status }) => (
  <span style={{
    display: 'inline-block', padding: '2px 7px', borderRadius: 4, fontSize: 10,
    fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
    background: statusColor(status) + '22',
    color: statusColor(status),
    border: `1px solid ${statusColor(status)}44`,
  }}>
    {status?.replace(/_/g, ' ')}
  </span>
);

/* ─── Inline bar chart ──────────────────────────────────────────── */
const MiniBar = ({ value, max, tone }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bg = tone === 'danger' ? 'var(--danger, #e53e3e)'
    : tone === 'warn' ? 'var(--warning)'
    : 'var(--accent)';
  return (
    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, minWidth: 80 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: bg, borderRadius: 2, transition: 'width 0.4s' }} />
    </div>
  );
};

/* ─── Area chart (reused from Dashboard pattern) ────────────────── */
const AreaChart = ({ inS = [], outS = [], h = 180 }) => {
  if (!inS.length && !outS.length) {
    return (
      <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>
        No movement data for this period
      </div>
    );
  }
  const w = 600;
  const max = Math.max(...inS, ...outS, 1) * 1.15;
  const build = (arr, fill) => {
    if (arr.length < 2) return '';
    const pts = arr.map((v, i) => [
      (i / (arr.length - 1)) * w,
      h - (v / max) * (h - 16) - 8,
    ]);
    const dPath = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    return fill ? `${dPath} L ${w} ${h} L 0 ${h} Z` : dPath;
  };
  const gridLines = [0, 1, 2, 3].map(i => {
    const y = ((i / 3) * (h - 16) + 8).toFixed(1);
    return <line key={i} x1="0" x2={w} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      {gridLines}
      <path d={build(inS, true)} fill="var(--accent)" opacity="0.10" />
      <path d={build(inS, false)} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      <path d={build(outS, false)} fill="none" stroke="var(--warning)" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  );
};

/* ─── Donut chart for requisition status ───────────────────────── */
const DonutChart = ({ slices, size = 100 }) => {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;
  const r = 38, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
  let offset = 0;
  const paths = slices.map((sl, i) => {
    const pct = sl.value / total;
    const dash = pct * circumference;
    const el = (
      <circle key={i} cx={cx} cy={cy} r={r}
        fill="none" stroke={sl.color} strokeWidth="14"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset * circumference}
        style={{ transition: 'stroke-dasharray 0.4s' }}
      />
    );
    offset += pct;
    return el;
  });
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="14" />
      {paths}
    </svg>
  );
};

/* ─── Stat card ─────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, tone }) => {
  const borderColor = tone === 'danger' ? 'var(--danger, #e53e3e)'
    : tone === 'warn' ? 'var(--warning)'
    : tone === 'good' ? 'var(--accent)'
    : 'var(--border)';
  return (
    <div style={{
      padding: '14px 16px', background: 'var(--panel)',
      border: `1px solid var(--border)`, borderTop: `3px solid ${borderColor}`,
      borderRadius: 'var(--r-sm)', display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{sub}</div>}
    </div>
  );
};

/* ─── Table helpers ─────────────────────────────────────────────── */
const Th = ({ children, align = 'left' }) => (
  <th style={{
    padding: '8px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border)',
    textAlign: align, whiteSpace: 'nowrap', background: 'var(--bg-sunk)',
  }}>{children}</th>
);
const Td = ({ children, align = 'left', style: s }) => (
  <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--fg)', borderBottom: '1px solid var(--border)', textAlign: align, ...s }}>
    {children}
  </td>
);
const EmptyRow = ({ cols, message = 'No data' }) => (
  <tr>
    <td colSpan={cols} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>
      {message}
    </td>
  </tr>
);

const Table = ({ children }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      {children}
    </table>
  </div>
);

/* ─── Panel wrapper ─────────────────────────────────────────────── */
const Panel = ({ title, sub, badge, children, action }) => (
  <div className="stoq-panel" style={{ marginBottom: 'var(--gap-card)' }}>
    <div className="stoq-panel__head">
      <div>
        <div className="stoq-panel__title">{title}</div>
        {sub && <div className="stoq-panel__sub">{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badge}
        {action}
      </div>
    </div>
    {children}
  </div>
);

/* ─── Period selector ───────────────────────────────────────────── */
const PERIODS = [
  { label: '7d',    value: 'week' },
  { label: '30d',   value: 'month' },
  { label: '90d',   value: 'quarter' },
  { label: 'Year',  value: 'year' },
  { label: 'Custom', value: 'custom' },
];

/* ─── Tab definitions ───────────────────────────────────────────── */
const TABS = [
  { id: 'stock',    label: 'Stock Health' },
  { id: 'movements', label: 'Movements' },
  { id: 'stockouts', label: 'Stockouts' },
  { id: 'po',       label: 'Purchase Orders' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'requisitions', label: 'Requisitions' },
  { id: 'sites',    label: 'Sites' },
];

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const ReportsPage = () => {
  const [period, setPeriod]       = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('stock');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const result = await reportService.getReport({
        period,
        from: period === 'custom' ? customFrom : undefined,
        to: period === 'custom' ? customTo : undefined,
      });
      setData(result);
    } catch (err) {
      console.error('Report fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handlePeriod = (v) => {
    setPeriod(v);
    setShowCustom(v === 'custom');
  };

  /* ── Derived alert counts ── */
  const alertOutOfStock  = data?.stock?.outOfStockItems?.length ?? 0;
  const alertLowStock    = data?.stock?.lowStockItems?.length ?? 0;
  const alertOverduePO   = data?.purchaseOrders?.overdueOrders?.length ?? 0;
  const alertExpiring30  = data?.stock?.expiringItems?.filter(i => i.daysLeft <= 30).length ?? 0;
  const alertPendingReqs = data?.requisitions?.statusCounts?.PENDING ?? 0;
  const totalAlerts      = alertOutOfStock + alertOverduePO + alertExpiring30;

  const stock        = data?.stock ?? {};
  const movements    = data?.movements ?? {};
  const stockOuts    = data?.stockOuts ?? {};
  const pos          = data?.purchaseOrders ?? {};
  const suppliers    = data?.suppliers ?? {};
  const requisitions = data?.requisitions ?? {};
  const sites        = data?.sites ?? {};

  const inSeries  = (movements.dailyTrend ?? []).map(m => m.in);
  const outSeries = (movements.dailyTrend ?? []).map(m => m.out);
  const maxCatVal = Math.max(...(stock.categoryBreakdown ?? []).map(c => c.totalValue), 1);

  const reqSlices = [
    { value: requisitions.statusCounts?.PENDING ?? 0,            color: 'var(--warning)' },
    { value: requisitions.statusCounts?.APPROVED ?? 0,           color: '#63b3ed' },
    { value: requisitions.statusCounts?.PARTIALLY_RECEIVED ?? 0, color: '#76e4f7' },
    { value: requisitions.statusCounts?.FULLY_RECEIVED ?? 0,     color: 'var(--accent)' },
    { value: requisitions.statusCounts?.REJECTED ?? 0,           color: 'var(--danger, #e53e3e)' },
  ].filter(s => s.value > 0);

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-head">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <div className="page-head__sub">
            Comprehensive operational snapshot · {data?.period ? `${fmtDate(data.period.from)} – ${fmtDate(data.period.to)}` : '—'}
          </div>
        </div>
        <div className="page-head__actions">
          <div className="stoq-segment">
            {PERIODS.map(p => (
              <button key={p.value} data-active={period === p.value ? 'true' : undefined}
                onClick={() => handlePeriod(p.value)}>
                {p.label}
              </button>
            ))}
          </div>
          {loading && <RefreshCw size={14} style={{ color: 'var(--fg-subtle)', animation: 'spin 1s linear infinite' }} />}
          <button className="stoq-btn stoq-btn--icon" title="Refresh" onClick={fetchReport}>
            <RefreshCw size={13} />
          </button>
          <button className="stoq-btn stoq-btn--ghost" onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      {/* ── Custom date picker ── */}
      {showCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--gap-card)', padding: '10px 14px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
          <Calendar size={13} style={{ color: 'var(--fg-subtle)' }} />
          <label style={{ fontSize: 12, color: 'var(--fg-muted)' }}>From</label>
          <input type="date" className="stoq-input" style={{ width: 150, padding: '4px 8px', fontSize: 12 }}
            value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <label style={{ fontSize: 12, color: 'var(--fg-muted)' }}>To</label>
          <input type="date" className="stoq-input" style={{ width: 150, padding: '4px 8px', fontSize: 12 }}
            value={customTo} onChange={e => setCustomTo(e.target.value)} />
          <button className="stoq-btn stoq-btn--primary stoq-btn--sm" onClick={fetchReport}
            disabled={!customFrom || !customTo}>Apply</button>
        </div>
      )}

      {/* ── Critical alerts bar ── */}
      {!loading && totalAlerts > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          padding: '10px 16px', marginBottom: 'var(--gap-card)',
          background: 'rgba(229,62,62,0.06)', border: '1px solid rgba(229,62,62,0.25)',
          borderRadius: 'var(--r-sm)',
        }}>
          <AlertTriangle size={15} style={{ color: 'var(--danger, #e53e3e)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger, #e53e3e)' }}>
            {totalAlerts} issue{totalAlerts !== 1 ? 's' : ''} need attention
          </span>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {alertOutOfStock > 0 && (
              <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ color: 'var(--danger, #e53e3e)' }}
                onClick={() => setActiveTab('stock')}>
                {alertOutOfStock} out of stock
              </button>
            )}
            {alertLowStock > 0 && (
              <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ color: 'var(--warning)' }}
                onClick={() => setActiveTab('stock')}>
                {alertLowStock} low stock
              </button>
            )}
            {alertExpiring30 > 0 && (
              <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ color: 'var(--warning)' }}
                onClick={() => setActiveTab('stock')}>
                {alertExpiring30} expiring &lt;30d
              </button>
            )}
            {alertOverduePO > 0 && (
              <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ color: 'var(--danger, #e53e3e)' }}
                onClick={() => setActiveTab('po')}>
                {alertOverduePO} overdue POs
              </button>
            )}
            {alertPendingReqs > 0 && (
              <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ color: 'var(--warning)' }}
                onClick={() => setActiveTab('requisitions')}>
                {alertPendingReqs} pending approvals
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tab navigation ── */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 'var(--gap-card)',
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)', padding: 4, overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 14px', fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500,
              borderRadius: 'calc(var(--r-sm) - 2px)', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--fg-muted)',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>
            {tab.label}
            {tab.id === 'stock' && (alertOutOfStock + alertLowStock) > 0 && (
              <span style={{ marginLeft: 5, background: 'rgba(229,62,62,0.8)', color: '#fff', borderRadius: 8, padding: '0 5px', fontSize: 9, fontWeight: 800 }}>
                {alertOutOfStock + alertLowStock}
              </span>
            )}
            {tab.id === 'po' && alertOverduePO > 0 && (
              <span style={{ marginLeft: 5, background: 'rgba(229,62,62,0.8)', color: '#fff', borderRadius: 8, padding: '0 5px', fontSize: 9, fontWeight: 800 }}>
                {alertOverduePO}
              </span>
            )}
            {tab.id === 'requisitions' && alertPendingReqs > 0 && (
              <span style={{ marginLeft: 5, background: 'var(--warning)', color: '#fff', borderRadius: 8, padding: '0 5px', fontSize: 9, fontWeight: 800 }}>
                {alertPendingReqs}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--fg-subtle)', fontSize: 13 }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
          <div>Loading report data…</div>
        </div>
      )}

      {!loading && (
        <>
          {/* ══ TAB: STOCK HEALTH ══ */}
          {activeTab === 'stock' && (
            <div>
              {/* KPI row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 'var(--gap-card)' }}>
                <StatCard label="Total SKUs" value={fmtNum(stock.totalSKUs)} sub="across all sites" />
                <StatCard label="Inventory Value" value={fmtCurrency(stock.totalValue)} sub="at cost" tone="good" />
                <StatCard label="Low Stock" value={fmtNum(stock.lowStockItems?.length)} sub="below reorder level" tone={stock.lowStockItems?.length > 0 ? 'warn' : undefined} />
                <StatCard label="Out of Stock" value={fmtNum(stock.outOfStockItems?.length)} sub="zero qty" tone={stock.outOfStockItems?.length > 0 ? 'danger' : undefined} />
                <StatCard label="Expiring ≤30d" value={fmtNum(alertExpiring30)} sub="needs action" tone={alertExpiring30 > 0 ? 'danger' : undefined} />
                <StatCard label="Materials" value={fmtNum(stock.byType?.MATERIAL)} sub="stock items" />
                <StatCard label="Equipment" value={fmtNum(stock.byType?.EQUIPMENT)} sub="stock items" />
              </div>

              {/* Low / out-of-stock table */}
              <Panel title="Low Stock Items" sub="Quantity at or below reorder level — order immediately"
                badge={stock.lowStockItems?.length > 0
                  ? <span className="stoq-badge" style={{ background: 'rgba(229,62,62,0.12)', color: 'var(--danger,#e53e3e)', border: '1px solid rgba(229,62,62,0.3)' }}>{stock.lowStockItems.length} items</span>
                  : <span className="stoq-badge stoq-badge--accent">All OK</span>}>
                <Table>
                  <thead>
                    <tr>
                      <Th>SKU</Th><Th>Item</Th><Th>Category</Th><Th>Site</Th>
                      <Th align="right">Qty On Hand</Th><Th align="right">Reorder At</Th><Th align="right">Deficit</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stock.lowStockItems ?? []).length === 0
                      ? <EmptyRow cols={7} message="No low-stock items — inventory levels are healthy" />
                      : (stock.lowStockItems ?? []).map(item => (
                        <tr key={item.id}>
                          <Td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{item.sku}</span></Td>
                          <Td><Link to={`/admin/stock/${item.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{item.itemName}</Link></Td>
                          <Td style={{ color: 'var(--fg-muted)' }}>{item.categoryName ?? '—'}</Td>
                          <Td style={{ color: 'var(--fg-muted)' }}>{item.siteName ?? '—'}</Td>
                          <Td align="right" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--warning)', fontWeight: 700 }}>{fmtNum(item.quantity)} {item.unit}</Td>
                          <Td align="right" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg-muted)' }}>{fmtNum(item.reorderLevel)}</Td>
                          <Td align="right" style={{ color: 'var(--danger,#e53e3e)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{fmtNum(item.deficit)}</Td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              </Panel>

              <Panel title="Out-of-Stock Items" sub="Zero quantity — cannot fulfill any demand"
                badge={stock.outOfStockItems?.length > 0
                  ? <span className="stoq-badge" style={{ background: 'rgba(229,62,62,0.12)', color: 'var(--danger,#e53e3e)', border: '1px solid rgba(229,62,62,0.3)' }}>{stock.outOfStockItems.length} items</span>
                  : <span className="stoq-badge stoq-badge--accent">None</span>}>
                <Table>
                  <thead>
                    <tr><Th>SKU</Th><Th>Item</Th><Th>Category</Th><Th>Site</Th><Th>Unit</Th></tr>
                  </thead>
                  <tbody>
                    {(stock.outOfStockItems ?? []).length === 0
                      ? <EmptyRow cols={5} message="No items are out of stock" />
                      : (stock.outOfStockItems ?? []).map(item => (
                        <tr key={item.id}>
                          <Td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{item.sku}</span></Td>
                          <Td><Link to={`/admin/stock/${item.id}`} style={{ color: 'var(--danger,#e53e3e)', textDecoration: 'none', fontWeight: 600 }}>{item.itemName}</Link></Td>
                          <Td style={{ color: 'var(--fg-muted)' }}>{item.categoryName ?? '—'}</Td>
                          <Td style={{ color: 'var(--fg-muted)' }}>{item.siteName ?? '—'}</Td>
                          <Td style={{ color: 'var(--fg-muted)' }}>{item.unit}</Td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              </Panel>

              {/* Expiring items */}
              <Panel title="Expiring Items" sub="Stock with expiry date within the next 90 days">
                <Table>
                  <thead>
                    <tr><Th>SKU</Th><Th>Item</Th><Th>Site</Th><Th align="right">Qty</Th><Th>Expiry Date</Th><Th align="right">Days Left</Th></tr>
                  </thead>
                  <tbody>
                    {(stock.expiringItems ?? []).length === 0
                      ? <EmptyRow cols={6} message="No items expiring within 90 days" />
                      : (stock.expiringItems ?? []).map(item => {
                        const urgent = item.daysLeft <= 14;
                        const warn   = item.daysLeft <= 30 && !urgent;
                        return (
                          <tr key={item.id}>
                            <Td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{item.sku}</span></Td>
                            <Td><Link to={`/admin/stock/${item.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{item.itemName}</Link></Td>
                            <Td style={{ color: 'var(--fg-muted)' }}>{item.siteName ?? '—'}</Td>
                            <Td align="right">{fmtNum(item.quantity)} {item.unit}</Td>
                            <Td>{fmtDate(item.expiryDate)}</Td>
                            <Td align="right" style={{ fontWeight: 700, color: urgent ? 'var(--danger,#e53e3e)' : warn ? 'var(--warning)' : 'var(--fg-muted)' }}>
                              {item.daysLeft}d
                            </Td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </Table>
              </Panel>

              {/* Category breakdown */}
              <Panel title="Inventory by Category" sub="Value and count of active SKUs per category">
                <div style={{ padding: '8px 14px 14px' }}>
                  {(stock.categoryBreakdown ?? []).length === 0
                    ? <div style={{ color: 'var(--fg-subtle)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No categories</div>
                    : (stock.categoryBreakdown ?? []).map((cat, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 90px 100px', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: i < (stock.categoryBreakdown.length - 1) ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.categoryName}</span>
                        <MiniBar value={cat.totalValue} max={maxCatVal} tone="good" />
                        <span style={{ fontSize: 11, color: 'var(--fg-muted)', textAlign: 'right' }}>{cat.count} SKUs</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(cat.totalValue)}</span>
                      </div>
                    ))
                  }
                </div>
              </Panel>

              {/* Top value items */}
              <Panel title="Top 10 Items by Value" sub="Highest-value stock items — protect and prioritize these">
                <Table>
                  <thead>
                    <tr><Th>#</Th><Th>SKU</Th><Th>Item</Th><Th align="right">Qty</Th><Th align="right">Total Value</Th></tr>
                  </thead>
                  <tbody>
                    {(stock.topValueItems ?? []).length === 0
                      ? <EmptyRow cols={5} />
                      : (stock.topValueItems ?? []).map((item, i) => (
                        <tr key={item.id}>
                          <Td style={{ color: 'var(--fg-subtle)', fontVariantNumeric: 'tabular-nums', width: 32 }}>{i + 1}</Td>
                          <Td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{item.sku}</span></Td>
                          <Td><Link to={`/admin/stock/${item.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{item.itemName}</Link></Td>
                          <Td align="right" style={{ color: 'var(--fg-muted)' }}>{fmtNum(item.quantity)} {item.unit}</Td>
                          <Td align="right" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(item.totalValue)}</Td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              </Panel>
            </div>
          )}

          {/* ══ TAB: MOVEMENTS ══ */}
          {activeTab === 'movements' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 'var(--gap-card)' }}>
                <StatCard label="Total Received" value={fmtNum(movements.totalIn)} sub="units IN" tone="good" />
                <StatCard label="Total Issued" value={fmtNum(movements.totalOut)} sub="units OUT" tone="warn" />
                <StatCard label="Net Change" value={(movements.totalIn - movements.totalOut >= 0 ? '+' : '') + fmtNum(movements.totalIn - movements.totalOut)} sub="IN minus OUT"
                  tone={movements.totalIn - movements.totalOut >= 0 ? 'good' : 'danger'} />
                <StatCard label="Adjustments" value={fmtNum(movements.totalAdjustments)} sub="quantity corrections" />
                <StatCard label="Pending Migrations" value={fmtNum(movements.pendingMigrations?.length)} sub="in transit" tone={movements.pendingMigrations?.length > 0 ? 'warn' : undefined} />
              </div>

              <Panel title="Daily Movement Trend" sub="Stock received (solid) vs. issued (dashed)">
                <div style={{ padding: '8px 16px 16px' }}>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 14, height: 2, background: 'var(--accent)', display: 'inline-block' }} />Received
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--warning)', display: 'inline-block' }} />Issued
                    </span>
                  </div>
                  <AreaChart inS={inSeries} outS={outSeries} h={200} />
                  {(movements.dailyTrend ?? []).length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
                      <span>{movements.dailyTrend[0]?.date}</span>
                      {movements.dailyTrend.length > 2 && <span>{movements.dailyTrend[Math.floor(movements.dailyTrend.length / 2)]?.date}</span>}
                      <span>{movements.dailyTrend[movements.dailyTrend.length - 1]?.date}</span>
                    </div>
                  )}
                </div>
              </Panel>

              <Panel title="Top Items by Issue Volume" sub="Most-used items in this period — ensure sufficient reorder quantities">
                <Table>
                  <thead>
                    <tr><Th>#</Th><Th>Item</Th><Th align="right">Units Issued</Th></tr>
                  </thead>
                  <tbody>
                    {(movements.topOutItems ?? []).length === 0
                      ? <EmptyRow cols={3} message="No issues recorded in this period" />
                      : (movements.topOutItems ?? []).map((item, i) => {
                        const maxOut = movements.topOutItems[0]?.totalOut ?? 1;
                        return (
                          <tr key={i}>
                            <Td style={{ color: 'var(--fg-subtle)', width: 32 }}>{i + 1}</Td>
                            <Td>
                              <div style={{ fontWeight: 600 }}>{item.itemName}</div>
                              <MiniBar value={item.totalOut} max={maxOut} tone="warn" />
                            </Td>
                            <Td align="right" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(item.totalOut)}</Td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </Table>
              </Panel>

              <Panel title="Pending Stock Migrations" sub="Stock in transit between sites — awaiting confirmation"
                badge={movements.pendingMigrations?.length > 0
                  ? <span className="stoq-badge" style={{ background: 'rgba(234,179,8,0.12)', color: 'var(--warning)', border: '1px solid rgba(234,179,8,0.3)' }}>{movements.pendingMigrations.length} in transit</span>
                  : null}>
                <Table>
                  <thead>
                    <tr><Th>Item</Th><Th>From Site</Th><Th>To Site</Th><Th align="right">Qty</Th><Th>Initiated</Th><Th>Status</Th></tr>
                  </thead>
                  <tbody>
                    {(movements.pendingMigrations ?? []).length === 0
                      ? <EmptyRow cols={6} message="No pending migrations" />
                      : (movements.pendingMigrations ?? []).map(m => (
                        <tr key={m.id}>
                          <Td style={{ fontWeight: 600 }}>{m.itemName}</Td>
                          <Td style={{ color: 'var(--fg-muted)' }}>{m.fromSite}</Td>
                          <Td style={{ color: 'var(--fg-muted)' }}>{m.toSite}</Td>
                          <Td align="right" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(m.quantity)} {m.unit}</Td>
                          <Td style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>{timeAgo(m.createdAt)}</Td>
                          <Td><StatusBadge status={m.status} /></Td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              </Panel>
            </div>
          )}

          {/* ══ TAB: STOCKOUTS ══ */}
          {activeTab === 'stockouts' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 'var(--gap-card)' }}>
                <StatCard label="Outstanding" value={fmtNum(stockOuts.totalActive)} sub="items not yet returned" tone={stockOuts.totalActive > 0 ? 'warn' : undefined} />
                <StatCard label="Sites Affected" value={fmtNum(stockOuts.bySite?.length)} sub="with active stockouts" />
              </div>

              <Panel title="Active Stockouts by Site" sub="Sites with unreturned stock-out records">
                <div style={{ padding: '8px 14px 14px' }}>
                  {(stockOuts.bySite ?? []).length === 0
                    ? <div style={{ color: 'var(--fg-subtle)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No active stockouts</div>
                    : (() => {
                      const maxCount = Math.max(...(stockOuts.bySite ?? []).map(s => s.count), 1);
                      return (stockOuts.bySite ?? []).map((site, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 60px 80px', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: i < stockOuts.bySite.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.siteName}</span>
                          <MiniBar value={site.count} max={maxCount} tone="warn" />
                          <span style={{ fontSize: 11, color: 'var(--fg-muted)', textAlign: 'right' }}>{site.count} items</span>
                          <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(site.totalQty)} units</span>
                        </div>
                      ));
                    })()
                  }
                </div>
              </Panel>

              <Panel title="All Active Stockout Records" sub="Items currently issued and not yet returned">
                <Table>
                  <thead>
                    <tr><Th>Item</Th><Th>Site</Th><Th align="right">Qty</Th><Th>Date Out</Th><Th>Recorded By</Th><Th>Notes</Th></tr>
                  </thead>
                  <tbody>
                    {(stockOuts.activeItems ?? []).length === 0
                      ? <EmptyRow cols={6} message="No active stockouts" />
                      : (stockOuts.activeItems ?? []).map(so => (
                        <tr key={so.id}>
                          <Td>
                            <div style={{ fontWeight: 600 }}>{so.itemName}</div>
                            <div style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>{so.sku}</div>
                          </Td>
                          <Td style={{ color: 'var(--fg-muted)' }}>{so.siteName}</Td>
                          <Td align="right" style={{ fontWeight: 700, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(so.quantity)} {so.unit}</Td>
                          <Td style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{fmtDate(so.date)}</Td>
                          <Td style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{so.recordedByName ?? '—'}</Td>
                          <Td style={{ color: 'var(--fg-subtle)', fontSize: 11, maxWidth: 200 }}>{so.notes ?? '—'}</Td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              </Panel>
            </div>
          )}

          {/* ══ TAB: PURCHASE ORDERS ══ */}
          {activeTab === 'po' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 'var(--gap-card)' }}>
                <StatCard label="Pending" value={fmtNum(pos.statusCounts?.PENDING)} sub="awaiting delivery" tone="warn" />
                <StatCard label="Partial" value={fmtNum(pos.statusCounts?.PARTIALLY_RECEIVED)} sub="partly received" tone="warn" />
                <StatCard label="Completed" value={fmtNum(pos.statusCounts?.FULLY_RECEIVED)} sub="fully received" tone="good" />
                <StatCard label="Cancelled" value={fmtNum(pos.statusCounts?.CANCELLED)} sub="cancelled" />
                <StatCard label="Overdue" value={fmtNum(pos.overdueOrders?.length)} sub="past expected date" tone={pos.overdueOrders?.length > 0 ? 'danger' : undefined} />
              </div>

              <Panel title="Overdue Purchase Orders" sub="Orders past their expected delivery date with stock not yet fully received"
                badge={pos.overdueOrders?.length > 0
                  ? <span className="stoq-badge" style={{ background: 'rgba(229,62,62,0.12)', color: 'var(--danger,#e53e3e)', border: '1px solid rgba(229,62,62,0.3)' }}>
                      {pos.overdueOrders.length} overdue
                    </span>
                  : <span className="stoq-badge stoq-badge--accent">None overdue</span>}>
                <Table>
                  <thead>
                    <tr><Th>Reference</Th><Th>Supplier</Th><Th>Items</Th><Th>Expected</Th><Th align="right">Days Overdue</Th><Th>Status</Th><Th></Th></tr>
                  </thead>
                  <tbody>
                    {(pos.overdueOrders ?? []).length === 0
                      ? <EmptyRow cols={7} message="No overdue purchase orders" />
                      : (pos.overdueOrders ?? []).map(po => (
                        <tr key={po.id}>
                          <Td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>{po.reference || po.id.slice(-8).toUpperCase()}</span></Td>
                          <Td style={{ fontWeight: 600 }}>{po.supplierName}</Td>
                          <Td style={{ color: 'var(--fg-muted)' }}>{po.itemCount}</Td>
                          <Td style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{fmtDate(po.expectedDate)}</Td>
                          <Td align="right" style={{ fontWeight: 700, color: po.daysPastDue > 14 ? 'var(--danger,#e53e3e)' : 'var(--warning)' }}>
                            {po.daysPastDue}d
                          </Td>
                          <Td><StatusBadge status={po.status} /></Td>
                          <Td>
                            <Link to={`/admin/purchase-orders/${po.id}/receive`}
                              className="stoq-btn stoq-btn--sm" style={{ textDecoration: 'none' }}>
                              Receive
                            </Link>
                          </Td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              </Panel>

              <Panel title="Recent Purchase Orders" sub="Latest 10 orders across all suppliers">
                <Table>
                  <thead>
                    <tr><Th>Reference</Th><Th>Supplier</Th><Th>Items</Th><Th>Date</Th><Th>Status</Th><Th></Th></tr>
                  </thead>
                  <tbody>
                    {(pos.recentOrders ?? []).length === 0
                      ? <EmptyRow cols={6} />
                      : (pos.recentOrders ?? []).map(po => (
                        <tr key={po.id}>
                          <Td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>{po.reference || po.id.slice(-8).toUpperCase()}</span></Td>
                          <Td style={{ fontWeight: 600 }}>{po.supplierName}</Td>
                          <Td style={{ color: 'var(--fg-muted)' }}>{po.itemCount}</Td>
                          <Td style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{fmtDate(po.date)}</Td>
                          <Td><StatusBadge status={po.status} /></Td>
                          <Td>
                            <Link to={`/admin/purchase-orders/${po.id}/receive`}
                              className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ textDecoration: 'none' }}>
                              View
                            </Link>
                          </Td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              </Panel>
            </div>
          )}

          {/* ══ TAB: SUPPLIERS ══ */}
          {activeTab === 'suppliers' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 'var(--gap-card)' }}>
                <StatCard label="Active" value={fmtNum(suppliers.statusCounts?.ACTIVE)} sub="suppliers" tone="good" />
                <StatCard label="Inactive" value={fmtNum(suppliers.statusCounts?.INACTIVE)} sub="suppliers" />
                <StatCard label="Suspended" value={fmtNum(suppliers.statusCounts?.SUSPENDED)} sub="suppliers" tone={suppliers.statusCounts?.SUSPENDED > 0 ? 'danger' : undefined} />
                <StatCard label="Outstanding Payments" value={fmtCurrency(suppliers.outstanding)} sub="unpaid / partial" tone={suppliers.outstanding > 0 ? 'warn' : undefined} />
              </div>

              <Panel title="Top Suppliers by Order Volume" sub="Suppliers ranked by number of purchase orders placed">
                <Table>
                  <thead>
                    <tr><Th>#</Th><Th>Supplier</Th><Th align="right">Orders</Th><Th align="right">Total Value</Th></tr>
                  </thead>
                  <tbody>
                    {(suppliers.topSuppliers ?? []).length === 0
                      ? <EmptyRow cols={4} message="No purchase orders placed yet" />
                      : (() => {
                        const maxOrders = Math.max(...(suppliers.topSuppliers ?? []).map(s => s.orderCount), 1);
                        return (suppliers.topSuppliers ?? []).map((s, i) => (
                          <tr key={s.supplierId}>
                            <Td style={{ color: 'var(--fg-subtle)', width: 32 }}>{i + 1}</Td>
                            <Td>
                              <Link to={`/admin/suppliers/${s.supplierId}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{s.supplierName}</Link>
                              <MiniBar value={s.orderCount} max={maxOrders} />
                            </Td>
                            <Td align="right" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(s.orderCount)}</Td>
                            <Td align="right" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(s.totalValue)}</Td>
                          </tr>
                        ));
                      })()
                    }
                  </tbody>
                </Table>
              </Panel>

              {suppliers.outstanding > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)',
                  borderRadius: 'var(--r-sm)', marginBottom: 'var(--gap-card)',
                }}>
                  <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
                      {fmtCurrency(suppliers.outstanding)} in outstanding supplier payments
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                      Review individual supplier records to reconcile unpaid or partial payments.
                    </div>
                  </div>
                  <Link to="/admin/suppliers" className="stoq-btn stoq-btn--sm" style={{ textDecoration: 'none', marginLeft: 'auto', flexShrink: 0 }}>
                    View Suppliers
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: REQUISITIONS ══ */}
          {activeTab === 'requisitions' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 'var(--gap-card)' }}>
                <StatCard label="Pending" value={fmtNum(requisitions.statusCounts?.PENDING)} sub="awaiting approval" tone={requisitions.statusCounts?.PENDING > 0 ? 'warn' : undefined} />
                <StatCard label="Approved" value={fmtNum(requisitions.statusCounts?.APPROVED)} sub="approved" tone="good" />
                <StatCard label="Partial" value={fmtNum(requisitions.statusCounts?.PARTIALLY_RECEIVED)} sub="partly received" tone="warn" />
                <StatCard label="Fulfilled" value={fmtNum(requisitions.statusCounts?.FULLY_RECEIVED)} sub="fully received" tone="good" />
                <StatCard label="Rejected" value={fmtNum(requisitions.statusCounts?.REJECTED)} sub="rejected" />
              </div>

              {/* Donut + legend */}
              <Panel title="Requisition Status Overview" sub="Distribution across all requisitions">
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
                  <DonutChart slices={reqSlices} size={120} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Pending',            value: requisitions.statusCounts?.PENDING,            color: 'var(--warning)' },
                      { label: 'Approved',           value: requisitions.statusCounts?.APPROVED,           color: '#63b3ed' },
                      { label: 'Partially Received', value: requisitions.statusCounts?.PARTIALLY_RECEIVED, color: '#76e4f7' },
                      { label: 'Fully Received',     value: requisitions.statusCounts?.FULLY_RECEIVED,     color: 'var(--accent)' },
                      { label: 'Rejected',           value: requisitions.statusCounts?.REJECTED,           color: 'var(--danger, #e53e3e)' },
                    ].filter(s => (s.value ?? 0) > 0).map(sl => (
                      <div key={sl.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: sl.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--fg-muted)' }}>{sl.label}</span>
                        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginLeft: 'auto', minWidth: 24 }}>{fmtNum(sl.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel title="Pending Approvals Queue" sub="Oldest pending requests — review and approve to unblock employees"
                badge={requisitions.pendingApprovals?.length > 0
                  ? <span className="stoq-badge" style={{ background: 'rgba(234,179,8,0.12)', color: 'var(--warning)', border: '1px solid rgba(234,179,8,0.3)' }}>
                      {requisitions.statusCounts?.PENDING ?? 0} total pending
                    </span>
                  : null}
                action={<Link to="/admin/requisition-management" className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ textDecoration: 'none' }}>View All</Link>}>
                <Table>
                  <thead>
                    <tr><Th>ID</Th><Th>Employee</Th><Th>Position</Th><Th align="right">Items</Th><Th>Submitted</Th><Th></Th></tr>
                  </thead>
                  <tbody>
                    {(requisitions.pendingApprovals ?? []).length === 0
                      ? <EmptyRow cols={6} message="No pending approvals — all requests have been processed" />
                      : (requisitions.pendingApprovals ?? []).map(r => (
                        <tr key={r.id}>
                          <Td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>#{r.id.slice(-6).toUpperCase()}</span></Td>
                          <Td style={{ fontWeight: 600 }}>{r.employeeName || '—'}</Td>
                          <Td style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{r.position || '—'}</Td>
                          <Td align="right" style={{ color: 'var(--fg-muted)' }}>{r.itemCount}</Td>
                          <Td style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>{timeAgo(r.createdAt)}</Td>
                          <Td>
                            <Link to={`/admin/requisition-management/approve/${r.id}`}
                              className="stoq-btn stoq-btn--sm" style={{ textDecoration: 'none' }}>
                              Review
                            </Link>
                          </Td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              </Panel>
            </div>
          )}

          {/* ══ TAB: SITES ══ */}
          {activeTab === 'sites' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 'var(--gap-card)' }}>
                <StatCard label="Active Sites" value={fmtNum(sites.statusCounts?.ACTIVE)} sub="operational" tone="good" />
                <StatCard label="Paused" value={fmtNum(sites.statusCounts?.PAUSED)} sub="on hold" tone="warn" />
                <StatCard label="Completed" value={fmtNum(sites.statusCounts?.COMPLETED)} sub="closed out" />
                <StatCard label="Total Sites" value={fmtNum((sites.siteDetails ?? []).length)} sub="all time" />
              </div>

              <Panel title="Site Performance Overview" sub="Stock levels, workforce, and expenses by site">
                <Table>
                  <thead>
                    <tr>
                      <Th>Site</Th><Th>Status</Th>
                      <Th align="right">Stock SKUs</Th>
                      <Th align="right">Stock Value</Th>
                      <Th align="right">Workers</Th>
                      <Th align="right">Expenses (period)</Th>
                      <Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sites.siteDetails ?? []).length === 0
                      ? <EmptyRow cols={7} message="No sites configured" />
                      : (() => {
                        const maxVal = Math.max(...(sites.siteDetails ?? []).map(s => s.stockValue), 1);
                        return (sites.siteDetails ?? []).map(site => (
                          <tr key={site.id}>
                            <Td>
                              <Link to={`/admin/sites/${site.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{site.name}</Link>
                              <MiniBar value={site.stockValue} max={maxVal} />
                            </Td>
                            <Td><StatusBadge status={site.status} /></Td>
                            <Td align="right" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(site.stockCount)}</Td>
                            <Td align="right" style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(site.stockValue)}</Td>
                            <Td align="right" style={{ fontVariantNumeric: 'tabular-nums', color: site.workerCount > 0 ? 'var(--fg)' : 'var(--fg-subtle)' }}>
                              {site.workerCount > 0 ? fmtNum(site.workerCount) : '—'}
                            </Td>
                            <Td align="right" style={{ fontVariantNumeric: 'tabular-nums', color: site.expenseTotal > 0 ? 'var(--fg)' : 'var(--fg-subtle)' }}>
                              {site.expenseTotal > 0 ? fmtCurrency(site.expenseTotal) : '—'}
                            </Td>
                            <Td>
                              <Link to={`/admin/sites/${site.id}`} className="stoq-btn stoq-btn--ghost stoq-btn--sm" style={{ textDecoration: 'none' }}>
                                Detail
                              </Link>
                            </Td>
                          </tr>
                        ));
                      })()
                    }
                  </tbody>
                </Table>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
