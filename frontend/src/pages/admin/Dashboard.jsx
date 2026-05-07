import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useSocketEvent } from '../../context/SocketContext';
import dashboardService from '../../services/dashboardService';
import { RefreshCw, Calendar } from 'lucide-react';

/* ─── Sparkline SVG ────────────────────────────────────────────── */
const Sparkline = ({ data, color = 'var(--accent)', w = 120, h = 32 }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / span) * (h - 4) - 2,
  ]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      <path d={area} fill={color} opacity="0.10" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />
    </svg>
  );
};

/* ─── Area Chart ───────────────────────────────────────────────── */
const AreaChart = ({ inS, outS, h = 200 }) => {
  if (!inS.length && !outS.length) {
    return (
      <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>
        No movement data for this period
      </div>
    );
  }
  const w = 600, max = Math.max(...inS, ...outS, 1) * 1.15;
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

/* ─── KPI Card ─────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, delta, deltaDir, tone, series, path }) => {
  const content = (
    <div className="kpi">
      <div className="kpi__label">
        <span className="kpi__icon" data-tone={tone}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </span>
        {label}
      </div>
      <div className="kpi__value">{value}</div>
      <div className="kpi__foot">
        <span style={{ color: 'var(--fg-muted)' }}>{sub || 'vs. last period'}</span>
        {delta && (
          <span className={`kpi__delta kpi__delta--${deltaDir}`}>
            {deltaDir === 'up'
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            }
            {delta}
          </span>
        )}
      </div>
      {series && <Sparkline data={series} color={tone === 'warning' ? 'var(--warning)' : 'var(--accent)'} />}
    </div>
  );
  return path ? <Link to={path} style={{ textDecoration: 'none' }}>{content}</Link> : content;
};

/* ─── Activity icon by action type ───────────────────────────── */
const ActivityIcon = ({ action }) => {
  const kind = action?.includes('CREAT') || action?.includes('IN') || action?.includes('ADD')
    ? 'in'
    : action?.includes('DELET') || action?.includes('OUT') || action?.includes('REJECT')
      ? 'out'
      : 'warn';
  if (kind === 'in') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  );
  if (kind === 'out') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  );
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
  );
};

const fmtCurrency = (n) => {
  if (n >= 1_000_000) return `RWF ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `RWF ${(n / 1_000).toFixed(0)}K`;
  return `RWF ${n.toLocaleString()}`;
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const actionLabel = (action) =>
  action?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || action;

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: '7d',    value: 'week' },
  { label: '30d',   value: 'month' },
  { label: 'Year',  value: 'year' },
  { label: 'Custom', value: 'custom' },
];

/* ─── Main Dashboard ───────────────────────────────────────────── */
const AdminDashboard = () => {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await dashboardService.getAdminDashboard({
        period,
        from: period === 'custom' ? customFrom : undefined,
        to: period === 'custom' ? customTo : undefined,
      });
      setData(result);
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Real-time refresh on any relevant socket event
  useSocketEvent('stock-created',          fetchDashboard);
  useSocketEvent('stock-updated',          fetchDashboard);
  useSocketEvent('stock-deleted',          fetchDashboard);
  useSocketEvent('requisition-created',    fetchDashboard);
  useSocketEvent('requisition-updated',    fetchDashboard);
  useSocketEvent('requisition-deleted',    fetchDashboard);

  const kpi = data?.kpi ?? {};
  const movements = data?.movements ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const siteUtilization = data?.siteUtilization ?? [];
  const approvalsQueue = data?.approvalsQueue ?? [];

  const inSeries  = movements.map(m => m.in);
  const outSeries = movements.map(m => m.out);
  const maxSiteVal = Math.max(...siteUtilization.map(s => s.stockCount), 1);

  const handlePeriod = (v) => {
    setPeriod(v);
    setShowCustom(v === 'custom');
  };

  return (
    <div>
      {/* Page head */}
      <div className="page-head">
        <div>
          <h1>Operations overview</h1>
          <div className="page-head__sub">
            Live inventory &amp; site activity · {today}
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
          <button className="stoq-btn stoq-btn--icon" title="Refresh" onClick={fetchDashboard}>
            <RefreshCw size={13} />
          </button>
          <Link to="/admin/stock/add" className="stoq-btn stoq-btn--primary" style={{ textDecoration: 'none' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Add stock
          </Link>
        </div>
      </div>

      {/* Custom date picker */}
      {showCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--gap-card)', padding: '10px 14px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
          <Calendar size={13} style={{ color: 'var(--fg-subtle)' }} />
          <label style={{ fontSize: 12, color: 'var(--fg-muted)' }}>From</label>
          <input type="date" className="stoq-input" style={{ width: 150, padding: '4px 8px', fontSize: 12 }}
            value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <label style={{ fontSize: 12, color: 'var(--fg-muted)' }}>To</label>
          <input type="date" className="stoq-input" style={{ width: 150, padding: '4px 8px', fontSize: 12 }}
            value={customTo} onChange={e => setCustomTo(e.target.value)} />
          <button className="stoq-btn stoq-btn--primary stoq-btn--sm" onClick={fetchDashboard}
            disabled={!customFrom || !customTo}>Apply</button>
        </div>
      )}

      {/* KPI row */}
      <div className="kpi-grid kpi-grid--4" style={{ marginBottom: 'var(--gap-card)' }}>
        <KpiCard
          label="Inventory value"
          value={loading ? '—' : fmtCurrency(kpi.inventoryValue ?? 0)}
          sub="across all sites"
          series={[60,65,70,68,72,75,74,78,80,82,85,88,90,92,95]}
          path="/admin/stock"
        />
        <KpiCard
          label="Active SKUs"
          value={loading ? '—' : kpi.totalSKUs ?? 0}
          sub={`${kpi.totalCategories ?? 0} categories`}
          series={[20,22,22,25,25,28,28,30,32,32,35,35,38,40,40]}
          path="/admin/stock"
        />
        <KpiCard
          label="Pending requisitions"
          value={loading ? '—' : kpi.pendingRequisitions ?? 0}
          sub="awaiting approval"
          series={[1,2,1,3,2,2,4,3,2,3,2,1,2,3,kpi.pendingRequisitions ?? 0]}
          path="/admin/requisition-management"
        />
        <KpiCard
          label="Low / out of stock"
          value={loading ? '—' : kpi.lowStockCount ?? 0}
          sub="needs review"
          tone="warning"
          series={[2,3,3,4,3,4,4,5,4,5,5,4,5,kpi.lowStockCount ?? 0]}
          path="/admin/stock"
        />
      </div>

      {/* Dash grid */}
      <div className="dash-grid">
        {/* Left — movements + activity */}
        <div className="stoq-panel">
          <div className="stoq-panel__head">
            <div>
              <div className="stoq-panel__title">
                Inventory movements · {PERIODS.find(p => p.value === period)?.label}
              </div>
              <div className="stoq-panel__sub">Receipts vs. issues, all sites</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--fg-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 2, background: 'var(--accent)', display: 'inline-block' }} />Received
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--warning)', display: 'inline-block' }} />Issued
              </span>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <AreaChart inS={inSeries} outS={outSeries} h={220} />
            {movements.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
                <span>{movements[0]?.date}</span>
                {movements.length > 2 && <span>{movements[Math.floor(movements.length / 2)]?.date}</span>}
                <span>{movements[movements.length - 1]?.date}</span>
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="stoq-panel__head" style={{ borderTop: '1px solid var(--border)', borderBottom: 'none' }}>
            <div className="stoq-panel__title">Recent activity</div>
            <button className="stoq-btn stoq-btn--ghost stoq-btn--sm" onClick={() => navigate('/admin/notifications')}>
              View all
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          {loading ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>Loading…</div>
          ) : recentActivity.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>No activity in this period</div>
          ) : recentActivity.slice(0, 8).map((a) => (
            <div key={a.id} className="activity-row">
              <div className="activity-icon" data-kind={
                a.action?.includes('CREAT') || a.action?.includes('APPROV') ? 'in' :
                a.action?.includes('DELET') || a.action?.includes('REJECT') ? 'out' : 'warn'
              }>
                <ActivityIcon action={a.action} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="activity-row__title">{actionLabel(a.action)}{a.entityLabel ? ` · ${a.entityLabel}` : ''}</div>
                <div className="activity-row__meta">{a.performedByName || 'System'} · {a.entityType}</div>
              </div>
              <div className="activity-row__time">{timeAgo(a.createdAt)}</div>
            </div>
          ))}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-card)' }}>
          {/* Site utilization */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <div className="stoq-panel__title">Site utilization</div>
              <span className="stoq-panel__sub">stock on hand</span>
            </div>
            <div style={{ padding: '8px 14px' }}>
              {loading ? (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>Loading…</div>
              ) : siteUtilization.length === 0 ? (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>No sites configured</div>
              ) : siteUtilization.map(s => {
                const pct = maxSiteVal > 0 ? Math.round((s.stockCount / maxSiteVal) * 100) : 0;
                return (
                  <div key={s.id} className="progress-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 9h18"/><path d="M9 21V9"/><rect x="3" y="3" width="18" height="18" rx="2"/>
                      </svg>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{s.name.length > 20 ? s.name.slice(0, 18) + '…' : s.name}</span>
                    </div>
                    <div className="progress-row__num">{s.stockCount} SKUs</div>
                    <div
                      className="progress-bar"
                      data-tone={pct < 25 ? 'danger' : pct < 50 ? 'warn' : undefined}
                    >
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Approvals queue */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <div className="stoq-panel__title">Approvals queue</div>
              <span className="stoq-badge stoq-badge--accent">{kpi.pendingRequisitions ?? 0} pending</span>
            </div>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>Loading…</div>
            ) : approvalsQueue.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>
                No pending approvals
              </div>
            ) : (
              approvalsQueue.map(r => (
                <div key={r.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="activity-icon" data-kind="warn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      #{r.id.slice(-6).toUpperCase()} · {r.employee?.firstName} {r.employee?.lastName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                      {r.employee?.position} · {r.itemCount} items · {timeAgo(r.createdAt)}
                    </div>
                  </div>
                  <Link to={`/admin/requisition-management/approve/${r.id}`} className="stoq-btn stoq-btn--sm" style={{ textDecoration: 'none' }}>
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* Quick stats + links */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <div className="stoq-panel__title">System overview</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, borderTop: '1px solid var(--border)' }}>
              {[
                { label: 'Employees', value: kpi.totalEmployees ?? '—', sub: `${kpi.activeEmployees ?? '—'} active`, path: '/admin/employees' },
                { label: 'Suppliers', value: kpi.totalSuppliers ?? '—', sub: 'registered', path: '/admin/suppliers' },
                { label: 'Sites', value: kpi.totalSites ?? '—', sub: 'locations', path: '/admin/site-management' },
                { label: 'Categories', value: kpi.totalCategories ?? '—', sub: 'stock types', path: '/admin/categories' },
              ].map(item => (
                <Link key={item.path} to={item.path} style={{
                  display: 'flex', flexDirection: 'column', padding: '12px 14px',
                  borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                  textDecoration: 'none', background: 'var(--panel)',
                  transition: 'background 0.1s',
                }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg)' }}>{loading ? '—' : item.value}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', marginTop: 2 }}>{item.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{item.sub}</span>
                </Link>
              ))}
            </div>
            {[
              { label: 'Browse stock',    path: '/admin/stock' },
              { label: 'View suppliers',  path: '/admin/suppliers' },
              { label: 'Manage sites',    path: '/admin/site-management' },
            ].map(item => (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 14px', borderBottom: '1px solid var(--border)',
                fontSize: 12, color: 'var(--fg-muted)', textDecoration: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sunk)'; e.currentTarget.style.color = 'var(--fg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}>
                <span>{item.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
