import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Package, DollarSign, History, Zap, MapPin,
  Users, FileText, Truck, ChevronLeft, ChevronRight, AlertCircle,
  CheckCircle, Calendar, RefreshCw, Edit2, X,
} from 'lucide-react';
import stockService from '../../../services/stockService';
import requisitionService from '../../../services/requisitionService';
import { useRole } from '../../../hooks/useRole';

const TABS = [
  { id: 'info', label: 'Info', icon: Package },
  { id: 'history', label: 'History', icon: History },
  { id: 'requisitions', label: 'Requisitions', icon: FileText },
  { id: 'sites', label: 'Sites', icon: MapPin },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'supplier', label: 'Supplier', icon: Truck },
];

const fmtCurrency = (v) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(v ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
      {toast.msg}
    </div>
  );
}

// ── Info Tab ──────────────────────────────────────────────────────────────

function InfoTab({ stock }) {
  const statusColor = {
    ok: 'var(--success)',
    low: 'var(--warning)',
    out: 'var(--danger)',
  };

  const isEquipment = stock.stockType === 'EQUIPMENT';
  const available = isEquipment ? (stock.quantity || 0) - (stock.quantityOut || 0) : (stock.quantity || 0);

  const getStatus = () => {
    if (available === 0) return { label: 'Out of stock', color: 'var(--danger)' };
    if (available <= stock.reorderLevel) return { label: 'Low stock', color: 'var(--warning)' };
    return { label: 'In stock', color: 'var(--success)' };
  };

  const status = getStatus();
  const stockValue = (stock.quantity || 0) * (stock.unitCost || 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Basic Info */}
        <div className="stoq-panel">
          <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--fg-subtle)' }}>Basic Info</h3>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>SKU</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{stock.sku || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Item Name</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{stock.itemName}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Category</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{stock.category?.name || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Unit</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{stock.unit || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Stock Type</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                <span className={`stoq-badge ${isEquipment ? 'stoq-badge--warning' : 'stoq-badge--plain'}`}>
                  {isEquipment ? 'Equipment' : 'Material'}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Location</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{stock.warehouseLocation || '—'}</div>
            </div>
          </div>
        </div>

        {/* Description */}
        {stock.description && (
          <div className="stoq-panel">
            <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--fg-subtle)' }}>Description</h3>
            </div>
            <div style={{ padding: 14 }}>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg)' }}>{stock.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Quantity & Status */}
        <div className="stoq-panel">
          <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--fg-subtle)' }}>Stock Status</h3>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>{isEquipment ? 'Available' : 'Current Quantity'}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: status.color }}>{available}</div>
              {isEquipment && (
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>
                  {stock.quantity || 0} total · {stock.quantityOut || 0} checked out
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Reorder Level</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{stock.reorderLevel || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: status.color }}>{status.label}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg-sunk)', borderRadius: 'var(--r-sm)', borderLeft: `3px solid ${status.color}` }}>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Value on hand</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{fmtCurrency(stockValue)}</div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="stoq-panel">
          <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--fg-subtle)' }}>Pricing</h3>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Unit Cost</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtCurrency(stock.unitCost)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Total Value</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtCurrency(stock.totalValue)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Created</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtDate(stock.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── History Tab ────────────────────────────────────────────────────────────

function HistoryTab({ stockId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await stockService.getHistoryByStock(stockId);
        setHistory(Array.isArray(data) ? data : data?.history || []);
      } catch (err) {
        console.error('Failed to load history:', err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [stockId]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (history.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-subtle)' }}>No history</div>;

  return (
    <div className="stoq-panel">
      <div className="table-wrap">
        <table className="stoq-tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th className="num-cell">Quantity</th>
              <th>Reference</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id}>
                <td>{fmtDate(h.date || h.createdAt)}</td>
                <td>
                  <span className={`stoq-badge ${h.type === 'IN' ? 'stoq-badge--success' : h.type === 'OUT' ? 'stoq-badge--warning' : ''}`}>
                    {h.type || '—'}
                  </span>
                </td>
                <td className="num-cell">{h.quantity || 0}</td>
                <td>{h.reference || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{h.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Requisitions Tab ────────────────────────────────────────────────────────

function RequisitionsTab({ stock }) {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await requisitionService.getAll({ stockId: stock.id, limit: 100 });
        setRequisitions(Array.isArray(data) ? data : data?.requisitions || []);
      } catch (err) {
        console.error('Failed to load requisitions:', err);
        setRequisitions([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [stock.id]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (requisitions.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-subtle)' }}>No requisitions</div>;

  return (
    <div className="stoq-panel">
      <div className="table-wrap">
        <table className="stoq-tbl">
          <thead>
            <tr>
              <th>Ref #</th>
              <th>Employee</th>
              <th className="num-cell">Qty</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {requisitions.map(r => (
              <tr key={r.id}>
                <td>{r.referenceNumber || r.id.slice(-8)}</td>
                <td>{r.employee?.name || '—'}</td>
                <td className="num-cell">{r.quantity || 0}</td>
                <td>
                  <span className={`stoq-badge stoq-badge--${r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : r.status === 'rejected' ? 'danger' : ''}`}>
                    {r.status || '—'}
                  </span>
                </td>
                <td>{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sites Tab ──────────────────────────────────────────────────────────────

function SitesTab({ stock }) {
  // Assuming stock has a sites array or we derive it from the site field
  const sites = stock.site ? [stock.site] : [];

  if (sites.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-subtle)' }}>Not assigned to any site</div>;

  return (
    <div className="stoq-panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, padding: 16 }}>
        {sites.map(site => (
          <div key={site.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--panel)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{site.name}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1.6 }}>
              <div>Location: {site.location || '—'}</div>
              <div>Manager: {site.manager?.name || '—'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Finance Tab ────────────────────────────────────────────────────────────

function FinanceTab({ stockId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await stockService.getStockPayments(stockId);
        setPayments(Array.isArray(data) ? data : data?.payments || []);
      } catch (err) {
        console.error('Failed to load payments:', err);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [stockId]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (payments.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-subtle)' }}>No payments recorded</div>;

  const totalPaid = payments.filter(p => p.type === 'DEBIT').reduce((s, p) => s + (p.amount || 0), 0);
  const totalOwed = payments.filter(p => p.type === 'CREDIT').reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="kpi-grid kpi-grid--2">
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon">✓</span>Paid</div>
          <div className="kpi__value">{fmtCurrency(totalPaid)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon">⚠</span>Owed</div>
          <div className="kpi__value">{fmtCurrency(totalOwed)}</div>
        </div>
      </div>

      <div className="stoq-panel">
        <div className="table-wrap">
          <table className="stoq-tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th className="num-cell">Amount</th>
                <th>Reference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{fmtDate(p.date || p.createdAt)}</td>
                  <td>
                    <span className={`stoq-badge stoq-badge--${p.type === 'DEBIT' ? 'success' : 'warning'}`}>
                      {p.type === 'DEBIT' ? 'Paid' : 'Owed'}
                    </span>
                  </td>
                  <td className="num-cell">{fmtCurrency(p.amount)}</td>
                  <td>{p.reference || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Supplier Tab ───────────────────────────────────────────────────────────

function SupplierTab({ stock }) {
  const suppliers = (stock.stockSuppliers ?? []).map(ss => ss.supplier).filter(Boolean);

  if (suppliers.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-subtle)' }}>No supplier assigned</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {suppliers.map(supplier => (
        <div key={supplier.id} className="stoq-panel">
          <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--fg-subtle)' }}>Supplier Details</h3>
          </div>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Name</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{supplier.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Contact Person</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{supplier.contactPerson || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Email</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{supplier.email || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Phone</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{supplier.phone || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Address</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{supplier.address || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>Status</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{supplier.status || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function StockDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { path } = useRole();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await stockService.getOne(id);
        setStock(data);
      } catch (err) {
        showToast('Failed to load stock details', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <RefreshCw size={24} style={{ animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
        Loading stock details...
      </div>
    );
  }

  if (!stock) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={24} style={{ color: 'var(--danger)', marginBottom: 12 }} />
        Stock not found
      </div>
    );
  }

  return (
    <div>
      <Toast toast={toast} />

      {/* Header */}
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="stoq-btn stoq-btn--ghost stoq-btn--icon" onClick={() => navigate(path('/stock'))}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{stock.itemName}</h1>
            <div className="page-head__sub">SKU: {stock.sku}</div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path(`/stock/edit/${stock.id}`))}>
            <Edit2 size={13} /> Edit
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid kpi-grid--4" style={{ marginBottom: 'var(--gap-card)' }}>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Package size={12} /></span>{stock.stockType === 'EQUIPMENT' ? 'Available' : 'On Hand'}</div>
          <div className="kpi__value">{stock.stockType === 'EQUIPMENT' ? (stock.quantity || 0) - (stock.quantityOut || 0) : (stock.quantity || 0)}</div>
          <div className="kpi__foot"><span>{stock.stockType === 'EQUIPMENT' ? `${stock.quantityOut || 0} checked out` : 'units'}</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><DollarSign size={12} /></span>Unit Cost</div>
          <div className="kpi__value" style={{ fontSize: 16 }}>{fmtCurrency(stock.unitCost)}</div>
          <div className="kpi__foot"><span>per unit</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Zap size={12} /></span>Stock Value</div>
          <div className="kpi__value" style={{ fontSize: 16 }}>{fmtCurrency((stock.quantity || 0) * (stock.unitCost || 0))}</div>
          <div className="kpi__foot"><span>value on hand</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><AlertCircle size={12} /></span>Reorder Level</div>
          <div className="kpi__value">{stock.reorderLevel || 0}</div>
          <div className="kpi__foot"><span>units</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="stoq-panel">
        <div className="stoq-tabs">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className="stoq-tab"
                data-active={activeTab === tab.id ? 'true' : undefined}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 'var(--gap-card)' }}>
          {activeTab === 'info' && <InfoTab stock={stock} />}
          {activeTab === 'history' && <HistoryTab stockId={stock.id} />}
          {activeTab === 'requisitions' && <RequisitionsTab stock={stock} />}
          {activeTab === 'sites' && <SitesTab stock={stock} />}
          {activeTab === 'finance' && <FinanceTab stockId={stock.id} />}
          {activeTab === 'supplier' && <SupplierTab stock={stock} />}
        </div>
      </div>
    </div>
  );
}
