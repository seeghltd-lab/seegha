import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Landmark, MapPin, User, Calendar, DollarSign, Activity, Package, Users, Plus, Trash2, X, Save, Edit2, AlertCircle, RefreshCw, CheckCircle, ChevronLeft, ChevronRight, Printer, PackageMinus, LayoutGrid, List, Search, AlertTriangle, TrendingDown, Eye, Download, ArrowLeftRight, XCircle } from "lucide-react";
import siteService from "../../../services/siteService";
import stockService from "../../../services/stockService";
import stockMigrationService from "../../../services/stockMigrationService";
import categoryService from "../../../services/categoryService";
import { useRole } from "../../../hooks/useRole";
import { useViewMode } from "../../../hooks/useViewMode";
import { useSocketEvent } from "../../../context/SocketContext";
import { SupplierReceiptModal } from "../../../components/ReceiptModal";
import Sparkline, { genSpark } from "../../../components/Sparkline";
import { exportToExcel } from "../../../lib/exportExcel";

const ALL_TABS = [
  { id: "info",     label: "Info",      icon: Landmark },
  { id: "workers",  label: "Workers",   icon: Users },
  { id: "expenses", label: "Expenses",  icon: DollarSign },
  { id: "stock",    label: "Stock",     icon: Package },
  { id: "stockout", label: "Stock Out", icon: PackageMinus },
  { id: "migrations", label: "Migrations", icon: ArrowLeftRight },
];

const fmtCurrency = (v) => new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(v ?? 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_BADGE = { ACTIVE: "stoq-badge stoq-badge--success", PAUSED: "stoq-badge stoq-badge--warning", COMPLETED: "stoq-badge" };

const DATE_PRESETS = [
  { label: "All time", value: "" },
  { label: "Today",    value: "today" },
  { label: "Week",     value: "week" },
  { label: "Month",    value: "month" },
  { label: "Custom",   value: "custom" },
];

function getDateRange(preset, customFrom, customTo) {
  const now = new Date();
  if (preset === "today") { const s = new Date(now); s.setHours(0,0,0,0); return { from: s, to: now }; }
  if (preset === "week")  { const s = new Date(now); s.setDate(now.getDate()-7); return { from: s, to: now }; }
  if (preset === "month") { const s = new Date(now); s.setDate(1); s.setHours(0,0,0,0); return { from: s, to: now }; }
  if (preset === "custom" && customFrom) { return { from: new Date(customFrom), to: customTo ? new Date(customTo + "T23:59:59") : now }; }
  return null;
}

function inRange(dateStr, range) {
  if (!range) return true;
  const d = new Date(dateStr);
  return d >= range.from && d <= range.to;
}

function Pagination({ page, totalPages, total, onPage, label = "items" }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--bg-sunk)" }}>
      <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Page {page} of {totalPages} · {total} {label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        <button className="stoq-btn stoq-btn--icon" disabled={page <= 1} style={{ opacity: page <= 1 ? 0.4 : 1 }} onClick={() => onPage(page - 1)}><ChevronLeft size={13} /></button>
        <button className="stoq-btn stoq-btn--icon" disabled={page >= totalPages} style={{ opacity: page >= totalPages ? 0.4 : 1 }} onClick={() => onPage(page + 1)}><ChevronRight size={13} /></button>
      </div>
    </div>
  );
}

function DateFilterBar({ preset, customFrom, customTo, onPreset, onCustomFrom, onCustomTo }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 0", marginBottom: 12 }}>
      <Calendar size={13} style={{ color: "var(--fg-subtle)", flexShrink: 0 }} />
      <div className="stoq-segment">
        {DATE_PRESETS.map(p => (
          <button key={p.value} data-active={preset === p.value ? "true" : undefined} onClick={() => onPreset(p.value)}>{p.label}</button>
        ))}
      </div>
      {preset === "custom" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="date" className="stoq-input" value={customFrom} onChange={e => onCustomFrom(e.target.value)} style={{ width: 140, height: 28, fontSize: 11 }} />
          <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>→</span>
          <input type="date" className="stoq-input" value={customTo} onChange={e => onCustomTo(e.target.value)} style={{ width: 140, height: 28, fontSize: 11 }} />
        </div>
      )}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`stoq-toast ${toast.type === "error" ? "stoq-toast--error" : "stoq-toast--success"}`}
      style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {toast.type === "error" ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
      {toast.msg}
    </div>
  );
}

// ── Workers Tab ──────────────────────────────────────────────────────────────

function WorkersTab({ siteId, datePreset, customFrom, customTo, navigate, path }) {
  const [data, setData] = useState({ records: [], totalWorkers: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const PAGE = 10;

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await siteService.getWorkerRecords(siteId)); }
    catch { showToast("Failed to load worker records", "error"); }
    finally { setLoading(false); }
  }, [siteId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [datePreset, customFrom, customTo]);

  const handleDelete = async (recordId) => {
    if (!window.confirm("Remove this worker record?")) return;
    try { await siteService.removeWorkerRecord(siteId, recordId); showToast("Record removed"); load(); }
    catch { showToast("Failed to remove record", "error"); }
  };

  const dateRange = getDateRange(datePreset, customFrom, customTo);
  const filtered = data.records.filter(r => inRange(r.date || r.createdAt, dateRange));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);
  const filteredTotal = filtered.reduce((s, r) => s + r.workerCount, 0);

  const exportExcelFile = () => {
    const headers = ["Date", "Category", "Workers", "Notes", "Recorded By"];
    const rows = filtered.map(r => [fmtDate(r.date), r.category?.name || "", r.workerCount, r.notes || "", r.recordedBy || ""]);
    exportToExcel(`site-workers-${new Date().toISOString().slice(0, 10)}`, headers, rows, "Workers");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Toast toast={toast} />
      <div className="kpi-grid kpi-grid--3">
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Users size={12} /></span>Entries{datePreset ? " (filtered)" : ""}</div>
          <div className="kpi__value">{filtered.length}</div>
          <div className="kpi__foot"><span>daily records logged</span></div>
          <Sparkline data={genSpark(3, 14, 0.2)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Users size={12} /></span>Workers{datePreset ? " (filtered)" : " Recorded"}</div>
          <div className="kpi__value">{filteredTotal.toLocaleString()}</div>
          <div className="kpi__foot"><span>total headcount entries</span></div>
          <Sparkline data={genSpark(5, 14, 0.3)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Users size={12} /></span>Avg / Entry</div>
          <div className="kpi__value">{filtered.length > 0 ? Math.round(filteredTotal / filtered.length) : 0}</div>
          <div className="kpi__foot"><span>workers per record</span></div>
          <Sparkline data={genSpark(2, 14, 0.1)} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="stoq-btn" onClick={exportExcelFile} disabled={filtered.length === 0}>
          <Download size={13} /> Export
        </button>
        <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path(`/sites/${siteId}/workers/add`))}>
          <Plus size={13} /> Record Workers
        </button>
      </div>

      <div className="stoq-panel">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", color: "var(--fg-subtle)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="stoq-empty">
            <Users size={24} className="stoq-empty__icon" />
            <div className="stoq-empty__title">No worker records{datePreset ? " in this period" : " yet"}</div>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="stoq-tbl">
                <thead>
                  <tr>
                    <th className="no-sort">Date</th>
                    <th className="no-sort">Category</th>
                    <th className="no-sort">Workers</th>
                    <th className="no-sort">Notes</th>
                    <th className="no-sort">Recorded By</th>
                    <th className="no-sort col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(r => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.date)}</td>
                      <td>{r.category ? <span className="stoq-badge stoq-badge--plain">{r.category.name}</span> : <span style={{ color: "var(--fg-subtle)" }}>—</span>}</td>
                      <td><span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--accent-soft-fg)" }}>{r.workerCount}</span></td>
                      <td style={{ color: "var(--fg-muted)" }}>{r.notes || "—"}</td>
                      <td style={{ color: "var(--fg-subtle)" }}>{r.recordedBy}</td>
                      <td>
                        <button className="icon-btn" style={{ color: "var(--danger)" }} onClick={() => handleDelete(r.id)}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} label="records" />
          </>
        )}
      </div>
    </div>
  );
}

// ── Expenses Tab ─────────────────────────────────────────────────────────────

const EXPENSE_CATS = ["Materials", "Labour", "Equipment", "Transport", "Food & Welfare", "Utilities", "Other"];

function buildExpenseReceipt(ex, siteName) {
  return {
    id:          ex.id,
    type:        'PAYMENT',
    title:       'EXPENSE RECEIPT',
    reference:   ex.reference || `EXP-${ex.id.slice(-8).toUpperCase()}`,
    issuedBy:    ex.recordedBy || '',
    issuedTo:    siteName || '',
    status:      ex.category || null,
    createdAt:   ex.date || ex.createdAt,
    completedAt: null,
    items: [{ name: ex.description, sku: ex.category || '', quantity: 1, unitCost: Number(ex.amount), total: Number(ex.amount) }],
    totalAmount: Number(ex.amount),
    notes:       ex.notes || null,
  };
}

function ExpensesTab({ siteId, siteName, datePreset, customFrom, customTo }) {
  const [data, setData] = useState({ expenses: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "", date: new Date().toISOString().split("T")[0], reference: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const PAGE = 10;

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await siteService.getExpenses(siteId)); }
    catch { showToast("Failed to load expenses", "error"); }
    finally { setLoading(false); }
  }, [siteId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [datePreset, customFrom, customTo]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount || Number(form.amount) <= 0) return showToast("Description and amount are required", "error");
    try {
      setSubmitting(true);
      await siteService.addExpense(siteId, { description: form.description, amount: Number(form.amount), category: form.category || undefined, date: form.date, reference: form.reference || undefined, notes: form.notes || undefined });
      setForm({ description: "", amount: "", category: "", date: new Date().toISOString().split("T")[0], reference: "", notes: "" });
      setShowForm(false);
      showToast("Expense added");
      load();
    } catch (err) { showToast(err.response?.data?.message || "Failed to add expense", "error"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm("Remove this expense?")) return;
    try { await siteService.removeExpense(siteId, expenseId); showToast("Expense removed"); load(); }
    catch { showToast("Failed to remove expense", "error"); }
  };

  const dateRange = getDateRange(datePreset, customFrom, customTo);
  const filtered = data.expenses.filter(e => inRange(e.date || e.createdAt, dateRange));
  const filteredTotal = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const exportExcelFile = () => {
    const headers = ["Date", "Description", "Category", "Reference", "Amount", "Notes"];
    const rows = filtered.map(e => [fmtDate(e.date), e.description, e.category || "", e.reference || "", Number(e.amount), e.notes || ""]);
    exportToExcel(`site-expenses-${new Date().toISOString().slice(0, 10)}`, headers, rows, "Expenses");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {receiptData && <SupplierReceiptModal data={receiptData} onClose={() => setReceiptData(null)} />}
      <Toast toast={toast} />
      <div className="kpi-grid kpi-grid--3">
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="warning"><DollarSign size={12} /></span>Total Expenses{datePreset ? " (filtered)" : ""}</div>
          <div className="kpi__value" style={{ fontSize: 18, color: "var(--danger)" }}>{fmtCurrency(filteredTotal)}</div>
          <div className="kpi__foot"><span>{filtered.length} entries</span>{filtered.length > 0 && <span className="kpi__delta kpi__delta--down">{filtered.length} txns</span>}</div>
          <Sparkline data={genSpark(7, 14, 0)} color="var(--warning)" />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><DollarSign size={12} /></span>Avg per Entry</div>
          <div className="kpi__value" style={{ fontSize: 18 }}>{fmtCurrency(filtered.length > 0 ? filteredTotal / filtered.length : 0)}</div>
          <div className="kpi__foot"><span>average expense amount</span></div>
          <Sparkline data={genSpark(4, 14, 0.1)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="warning"><DollarSign size={12} /></span>Largest Expense</div>
          <div className="kpi__value" style={{ fontSize: 18 }}>{fmtCurrency(filtered.length > 0 ? Math.max(...filtered.map(e => Number(e.amount))) : 0)}</div>
          <div className="kpi__foot"><span>single highest amount</span></div>
          <Sparkline data={genSpark(6, 14, -0.1)} color="var(--danger)" />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="stoq-btn" onClick={exportExcelFile} disabled={filtered.length === 0}>
          <Download size={13} /> Export
        </button>
        <button className="stoq-btn stoq-btn--primary" onClick={() => setShowForm(true)}>
          <Plus size={13} /> Add Expense
        </button>
      </div>

      {showForm && (
        <div className="stoq-panel">
          <div className="stoq-panel__head">
            <span className="stoq-panel__title">Add Site Expense</span>
            <button className="icon-btn" onClick={() => setShowForm(false)}><X size={14} /></button>
          </div>
          <form onSubmit={handleAdd} style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="stoq-field">
                <label className="stoq-field__label">Description *</label>
                <input className="stoq-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Cement purchase — 50 bags" />
              </div>
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label">Amount (RWF) *</label>
              <input type="number" min="1" className="stoq-input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label">Category</label>
              <select className="stoq-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: "100%" }}>
                <option value="">— Select —</option>
                {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label">Date</label>
              <input type="date" className="stoq-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label">Reference</label>
              <input className="stoq-input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Receipt no., invoice ref…" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="stoq-field">
                <label className="stoq-field__label">Notes</label>
                <textarea className="stoq-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ height: "auto", padding: "6px 10px", resize: "none" }} />
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="stoq-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="stoq-btn stoq-btn--primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
                <Save size={13} /> Add Expense
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="stoq-panel">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", color: "var(--fg-subtle)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="stoq-empty">
            <DollarSign size={24} className="stoq-empty__icon" />
            <div className="stoq-empty__title">No expenses{datePreset ? " in this period" : " recorded yet"}</div>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="stoq-tbl">
                <thead>
                  <tr>
                    <th className="no-sort">Date</th>
                    <th className="no-sort">Description</th>
                    <th className="no-sort">Category</th>
                    <th className="no-sort">Reference</th>
                    <th className="no-sort num-cell">Amount</th>
                    <th className="no-sort col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(ex => (
                    <tr key={ex.id}>
                      <td style={{ color: "var(--fg-muted)" }}>{fmtDate(ex.date)}</td>
                      <td>
                        <span className="cell-stack__main">{ex.description}</span>
                        {ex.notes && <span className="cell-stack__sub">{ex.notes}</span>}
                      </td>
                      <td>{ex.category ? <span className="stoq-badge stoq-badge--plain">{ex.category}</span> : "—"}</td>
                      <td style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{ex.reference || "—"}</td>
                      <td className="num-cell" style={{ fontWeight: 700, color: "var(--danger)" }}>{fmtCurrency(ex.amount)}</td>
                      <td style={{ display: "flex", gap: 4 }}>
                        <button className="icon-btn" title="Print receipt" onClick={() => setReceiptData(buildExpenseReceipt(ex, siteName))}><Printer size={13} /></button>
                        <button className="icon-btn" style={{ color: "var(--danger)" }} onClick={() => handleDelete(ex.id)}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border)" }}>
                    <td colSpan={4} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {datePreset ? "Filtered total" : "Total"}
                    </td>
                    <td className="num-cell" style={{ fontWeight: 700, color: "var(--danger)", fontSize: 14 }}>{fmtCurrency(filteredTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} label="expenses" />
          </>
        )}
      </div>
    </div>
  );
}

// ── Stock Tab ────────────────────────────────────────────────────────────────

const STOCK_STATUS_FILTERS = [
  { label: "All",      value: "" },
  { label: "In stock", value: "ok" },
  { label: "Low",      value: "low" },
  { label: "Out",      value: "out" },
];

function StockTab({ siteId, navigate, path }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useViewMode("site-stock");
  const [categories, setCategories] = useState([]);
  const PAGE = 12;

  const load = useCallback(() => {
    setLoading(true);
    stockService.getAll({ siteId, limit: 200 })
      .then(d => setStocks(d.stocks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { categoryService.getAll().then(setCategories).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [search, categoryId, statusFilter]);

  const filtered = stocks
    .filter(s => !search || s.itemName?.toLowerCase().includes(search.toLowerCase()) || s.sku?.toLowerCase().includes(search.toLowerCase()))
    .filter(s => !categoryId || s.category?.id === categoryId)
    .filter(s => {
      if (statusFilter === "ok")  return s.quantity > (s.reorderLevel || 0);
      if (statusFilter === "low") return s.quantity > 0 && s.quantity <= (s.reorderLevel || 0);
      if (statusFilter === "out") return s.quantity <= 0;
      return true;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const totalValue = stocks.reduce((s, i) => s + parseFloat(i.totalValue || 0), 0);
  const lowCount   = stocks.filter(s => s.quantity > 0 && s.quantity <= (s.reorderLevel || 0)).length;
  const outCount   = stocks.filter(s => s.quantity <= 0).length;

  const StockBadge = ({ s }) => {
    if (s.quantity <= 0) return <span className="stoq-badge stoq-badge--danger">Out</span>;
    if (s.quantity <= (s.reorderLevel || 0)) return <span className="stoq-badge stoq-badge--warning"><AlertTriangle size={9} /> Low</span>;
    return <span className="stoq-badge stoq-badge--success">In stock</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPI row */}
      <div className="kpi-grid kpi-grid--3">
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Package size={12} /></span>Total Items</div>
          <div className="kpi__value">{stocks.length}</div>
          <div className="kpi__foot"><span>SKUs on this site</span></div>
          <Sparkline data={genSpark(1, 14, 0.4)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><DollarSign size={12} /></span>Total Stock Value</div>
          <div className="kpi__value" style={{ fontSize: 18 }}>RWF {(totalValue / 1_000).toFixed(1)}K</div>
          <div className="kpi__foot"><span>across all items</span></div>
          <Sparkline data={genSpark(2, 14, 0.3)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="warning"><TrendingDown size={12} /></span>Low / Out of Stock</div>
          <div className="kpi__value">{lowCount + outCount}</div>
          <div className="kpi__foot"><span>below minimum threshold</span>{(lowCount + outCount) > 0 && <span className="kpi__delta kpi__delta--down">{outCount} out</span>}</div>
          <Sparkline data={genSpark(7, 14, 0)} color="var(--warning)" />
        </div>
      </div>

      <div className="stoq-panel">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", color: "var(--fg-subtle)" }} />
          </div>
        ) : stocks.length === 0 ? (
          <div className="stoq-empty">
            <Package size={28} className="stoq-empty__icon" />
            <div className="stoq-empty__title">No stock assigned to this site</div>
            <button className="stoq-btn stoq-btn--primary" style={{ marginTop: 12 }}
              onClick={() => navigate(`${path("/sites/" + siteId)}/stock/add`)}>
              <Plus size={13} /> Add Stock
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="stoq-toolbar">
              <div className="stoq-toolbar__search" style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-subtle)", pointerEvents: "none" }} />
                <input className="stoq-input stoq-input--search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item, SKU…" style={{ paddingLeft: 32 }} />
              </div>
              <select className="stoq-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ width: 150 }}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="stoq-segment">
                {STOCK_STATUS_FILTERS.map(f => (
                  <button key={f.value} data-active={statusFilter === f.value ? "true" : undefined} onClick={() => setStatusFilter(f.value)}>{f.label}</button>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              <div className="stoq-segment">
                <button data-active={viewMode === "table" ? "true" : undefined} onClick={() => setViewMode("table")}><List size={13} /></button>
                <button data-active={viewMode === "grid" ? "true" : undefined} onClick={() => setViewMode("grid")}><LayoutGrid size={13} /></button>
              </div>
              <button className="stoq-btn stoq-btn--icon" onClick={load} title="Refresh"><RefreshCw size={13} /></button>
              <button className="stoq-btn stoq-btn--primary stoq-btn--sm" onClick={() => navigate(`${path("/sites/" + siteId)}/stock/add`)}>
                <Plus size={12} /> Add Stock
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="stoq-empty" style={{ padding: "32px 0" }}>
                <Package size={22} className="stoq-empty__icon" />
                <div className="stoq-empty__title">No items match your filters</div>
              </div>
            ) : viewMode === "table" ? (
              <>
                <div className="table-wrap">
                  <table className="stoq-tbl">
                    <thead>
                      <tr>
                        <th className="no-sort">SKU / Item</th>
                        <th className="no-sort">Category</th>
                        <th className="no-sort num-cell">On Hand</th>
                        <th className="no-sort">Unit</th>
                        <th className="no-sort num-cell">Unit Cost</th>
                        <th className="no-sort num-cell">Total Value</th>
                        <th className="no-sort">Status</th>
                        <th className="no-sort col-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(s => (
                        <tr key={s.id}>
                          <td>
                            <span className="cell-stack__main">{s.itemName}</span>
                            <span className="cell-stack__sub" style={{ fontFamily: "var(--font-mono)" }}>{s.sku}</span>
                          </td>
                          <td>{s.category?.name ? <span className="stoq-badge stoq-badge--plain">{s.category.name}</span> : "—"}</td>
                          <td className="num-cell" style={{ fontWeight: 700, fontSize: 14 }}>{s.quantity}</td>
                          <td style={{ color: "var(--fg-subtle)", fontSize: 11 }}>{s.unit}</td>
                          <td className="num-cell" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{fmtCurrency(s.unitCost)}</td>
                          <td className="num-cell" style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{fmtCurrency(s.totalValue)}</td>
                          <td><StockBadge s={s} /></td>
                          <td>
                            <div className="stoq-btn-group" style={{ justifyContent: "flex-end" }}>
                              <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Details" onClick={() => navigate(path("/stock/" + s.id))}><Eye size={13} /></button>
                              <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Edit" onClick={() => navigate(path("/stock/edit/" + s.id))}><Edit2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} label="items" />
              </>
            ) : (
              <>
                <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {paged.map(s => (
                    <div key={s.id} style={{ background: "var(--bg-sunk)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 12, cursor: "pointer" }}
                      onClick={() => navigate(path("/stock/" + s.id))}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)" }}>{s.sku}</span>
                        <StockBadge s={s} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, marginBottom: 4 }}>{s.itemName}</div>
                      <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginBottom: 10 }}>{s.category?.name || "—"}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
                          {s.quantity} <span style={{ fontSize: 10, color: "var(--fg-subtle)", fontWeight: 400 }}>{s.unit}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--accent-soft-fg)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmtCurrency(s.totalValue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} label="items" />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Stock Out Tab ─────────────────────────────────────────────────────────────

function StockOutTab({ siteId, datePreset, customFrom, customTo, navigate, path }) {
  const [data, setData] = useState({ records: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ stockId: "", quantity: "", notes: "", date: new Date().toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (datePreset === "custom" && customFrom) { params.dateFrom = customFrom; if (customTo) params.dateTo = customTo; }
      else if (datePreset === "today") { const t = new Date(); params.dateFrom = t.toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      else if (datePreset === "week") { const t = new Date(); const s = new Date(t); s.setDate(t.getDate()-7); params.dateFrom = s.toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      else if (datePreset === "month") { const t = new Date(); params.dateFrom = new Date(t.getFullYear(), t.getMonth(), 1).toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      setData(await siteService.getStockOuts(siteId, params));
    } catch { showToast("Failed to load stock out records", "error"); }
    finally { setLoading(false); }
  }, [siteId, page, datePreset, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [datePreset, customFrom, customTo]);

  const resetForm = () => setForm({ stockId: "", quantity: "", notes: "", date: new Date().toISOString().slice(0, 10) });

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!form.quantity || Number(form.quantity) <= 0) return showToast("Enter a valid quantity", "error");
    setSubmitting(true);
    try {
      await siteService.updateStockOut(siteId, editTarget.id, {
        quantity: Number(form.quantity),
        notes: form.notes || undefined,
        date: form.date,
      });
      showToast("Record updated");
      setEditTarget(null);
      resetForm();
      load();
    } catch (err) { showToast(err.response?.data?.message || "Failed to update", "error"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this stock out record? The quantity will be restored.")) return;
    try {
      await siteService.deleteStockOut(siteId, id);
      showToast("Record deleted — quantity restored");
      load();
    } catch (err) { showToast(err.response?.data?.message || "Failed to delete", "error"); }
  };

  const handleReturn = async (id) => {
    if (!window.confirm("Mark this equipment as returned? It will become available again.")) return;
    try {
      await siteService.returnStockOut(siteId, id);
      showToast("Equipment marked as returned");
      load();
    } catch (err) { showToast(err.response?.data?.message || "Failed to mark as returned", "error"); }
  };

  const openEdit = (record) => {
    setEditTarget(record);
    setForm({ stockId: record.stockId, quantity: record.quantity, notes: record.notes || "", date: new Date(record.date).toISOString().slice(0, 10) });
  };

  const totalQtyOut = data.records.reduce((s, r) => s + r.quantity, 0);

  const [exporting, setExporting] = useState(false);
  const exportExcelFile = async () => {
    setExporting(true);
    try {
      const params = { page: 1, limit: 100000 };
      if (datePreset === "custom" && customFrom) { params.dateFrom = customFrom; if (customTo) params.dateTo = customTo; }
      else if (datePreset === "today") { const t = new Date(); params.dateFrom = t.toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      else if (datePreset === "week") { const t = new Date(); const s = new Date(t); s.setDate(t.getDate()-7); params.dateFrom = s.toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      else if (datePreset === "month") { const t = new Date(); params.dateFrom = new Date(t.getFullYear(), t.getMonth(), 1).toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      const full = await siteService.getStockOuts(siteId, params);
      const headers = ["Date", "Item", "SKU", "Qty Out", "Unit", "Status", "Notes", "Recorded By"];
      const rows = full.records.map(r => [
        fmtDate(r.date), r.stock?.itemName || "", r.stock?.sku || "", r.quantity, r.unit,
        r.stock?.stockType === "EQUIPMENT" ? (r.status === "RETURNED" ? "Returned" : "Checked out") : "",
        r.notes || "", r.recordedByName || r.recordedByType || "",
      ]);
      exportToExcel(`site-stock-out-${new Date().toISOString().slice(0, 10)}`, headers, rows, "Stock Out");
    } catch { showToast("Failed to export stock out records", "error"); }
    finally { setExporting(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Toast toast={toast} />

      <div className="kpi-grid kpi-grid--3">
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><PackageMinus size={12} /></span>Records{datePreset ? " (filtered)" : ""}</div>
          <div className="kpi__value">{data.total}</div>
          <div className="kpi__foot"><span>stock out entries</span></div>
          <Sparkline data={genSpark(3, 14, 0.2)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="danger"><PackageMinus size={12} /></span>Total Qty Out{datePreset ? " (filtered)" : ""}</div>
          <div className="kpi__value" style={{ color: "var(--danger)" }}>{totalQtyOut.toLocaleString()}</div>
          <div className="kpi__foot"><span>units dispatched</span>{totalQtyOut > 0 && <span className="kpi__delta kpi__delta--down">–{totalQtyOut}</span>}</div>
          <Sparkline data={genSpark(7, 14, 0)} color="var(--danger)" />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><PackageMinus size={12} /></span>Avg Qty / Record</div>
          <div className="kpi__value">{data.records.length > 0 ? (totalQtyOut / data.records.length).toFixed(1) : 0}</div>
          <div className="kpi__foot"><span>per dispatch entry</span></div>
          <Sparkline data={genSpark(2, 14, 0.15)} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="stoq-btn" onClick={exportExcelFile} disabled={exporting || data.total === 0}>
          {exporting ? <RefreshCw size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Download size={13} />} Export
        </button>
        <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path("/sites/" + siteId + "/stock-out/add"))}>
          <PackageMinus size={13} /> Record Stock Out
        </button>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="stoq-modal-backdrop">
          <div className="stoq-modal" style={{ maxWidth: 440 }}>
            <div className="stoq-modal__head">
              <div className="stoq-modal__title">Edit Stock Out — {editTarget.stock?.itemName}</div>
              <button className="icon-btn" onClick={() => { setEditTarget(null); resetForm(); }}><X size={14} /></button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="stoq-modal__body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="stoq-field">
                  <label className="stoq-field__label">Quantity *</label>
                  <input type="number" min="0.01" step="0.01" className="stoq-input" value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="stoq-field">
                  <label className="stoq-field__label">Date</label>
                  <input type="date" className="stoq-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="stoq-field">
                  <label className="stoq-field__label">Notes</label>
                  <textarea className="stoq-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ height: "auto", padding: "6px 10px", resize: "none" }} />
                </div>
              </div>
              <div className="stoq-modal__foot">
                <button type="button" className="stoq-btn" onClick={() => { setEditTarget(null); resetForm(); }}>Cancel</button>
                <button type="submit" className="stoq-btn stoq-btn--primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="stoq-panel">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", color: "var(--fg-subtle)" }} />
          </div>
        ) : data.records.length === 0 ? (
          <div className="stoq-empty">
            <PackageMinus size={24} className="stoq-empty__icon" />
            <div className="stoq-empty__title">No stock out records{datePreset ? " in this period" : " yet"}</div>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="stoq-tbl">
                <thead>
                  <tr>
                    <th className="no-sort">Date</th>
                    <th className="no-sort">Item</th>
                    <th className="no-sort num-cell">Qty Out</th>
                    <th className="no-sort">Status</th>
                    <th className="no-sort">Notes</th>
                    <th className="no-sort">Recorded By</th>
                    <th className="no-sort col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map(r => {
                    const isEquipment = r.stock?.stockType === "EQUIPMENT";
                    const isReturned = r.status === "RETURNED";
                    return (
                    <tr key={r.id}>
                      <td style={{ color: "var(--fg-muted)" }}>{fmtDate(r.date)}</td>
                      <td>
                        <span className="cell-stack__main">{r.stock?.itemName || "—"}</span>
                        <span className="cell-stack__sub" style={{ fontFamily: "var(--font-mono)" }}>{r.stock?.sku}</span>
                      </td>
                      <td className="num-cell">
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--danger)" }}>
                          {r.quantity} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--fg-subtle)" }}>{r.unit}</span>
                        </span>
                      </td>
                      <td>
                        {isEquipment ? (
                          <span className={`stoq-badge ${isReturned ? "stoq-badge--success" : "stoq-badge--warning"}`}>
                            {isReturned ? "Returned" : "Checked out"}
                          </span>
                        ) : (
                          <span style={{ color: "var(--fg-subtle)", fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={{ color: "var(--fg-muted)" }}>{r.notes || "—"}</td>
                      <td style={{ color: "var(--fg-subtle)", fontSize: 11 }}>{r.recordedByName || r.recordedByType}</td>
                      <td style={{ display: "flex", gap: 4 }}>
                        {isEquipment && !isReturned && (
                          <button className="stoq-btn stoq-btn--sm" style={{ fontSize: 10 }} onClick={() => handleReturn(r.id)}>
                            Mark Returned
                          </button>
                        )}
                        {!isReturned && (
                          <>
                            <button className="icon-btn" onClick={() => openEdit(r)}><Edit2 size={12} /></button>
                            <button className="icon-btn" style={{ color: "var(--danger)" }} onClick={() => handleDelete(r.id)}><Trash2 size={13} /></button>
                          </>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="records" />
          </>
        )}
      </div>
    </div>
  );
}

// ── Migrations Tab ───────────────────────────────────────────────────────────

const MIGRATION_STATUS_CFG = {
  IN_TRANSIT: { label: "In Transit", cls: "stoq-badge--warning" },
  RECEIVED:   { label: "Received",   cls: "stoq-badge--success" },
  CANCELLED:  { label: "Cancelled",  cls: "" },
  REJECTED:   { label: "Rejected",   cls: "stoq-badge--danger" },
};

function MigrationsTab({ siteId, datePreset, customFrom, customTo, navigate, path }) {
  const [data, setData] = useState({ migrations: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [acting, setActing] = useState(null);
  const [exporting, setExporting] = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { siteId, page, limit: 15 };
      if (datePreset === "custom" && customFrom) { params.dateFrom = customFrom; if (customTo) params.dateTo = customTo; }
      else if (datePreset === "today") { const t = new Date(); params.dateFrom = t.toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      else if (datePreset === "week") { const t = new Date(); const s = new Date(t); s.setDate(t.getDate()-7); params.dateFrom = s.toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      else if (datePreset === "month") { const t = new Date(); params.dateFrom = new Date(t.getFullYear(), t.getMonth(), 1).toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      setData(await stockMigrationService.getAll(params));
    } catch { showToast("Failed to load migrations", "error"); }
    finally { setLoading(false); }
  }, [siteId, page, datePreset, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [datePreset, customFrom, customTo]);

  const handleReceive = async (id) => {
    if (!window.confirm("Confirm this stock has arrived and been received at this site?")) return;
    setActing(id);
    try { await stockMigrationService.receive(id); showToast("Migration received"); load(); }
    catch (err) { showToast(err.response?.data?.message || "Failed to confirm receipt", "error"); }
    finally { setActing(null); }
  };

  const handleCancel = async (id) => {
    const reason = window.prompt("Reason for cancelling (optional):") ?? "";
    setActing(id);
    try { await stockMigrationService.cancel(id, reason || undefined); showToast("Migration cancelled — quantity restored"); load(); }
    catch (err) { showToast(err.response?.data?.message || "Failed to cancel", "error"); }
    finally { setActing(null); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Reason for rejecting this incoming migration:");
    if (!reason || !reason.trim()) { showToast("A reason is required to reject", "error"); return; }
    setActing(id);
    try { await stockMigrationService.reject(id, reason); showToast("Migration rejected — quantity restored at source"); load(); }
    catch (err) { showToast(err.response?.data?.message || "Failed to reject", "error"); }
    finally { setActing(null); }
  };

  const exportExcelFile = async () => {
    setExporting(true);
    try {
      const params = { siteId, page: 1, limit: 100000 };
      if (datePreset === "custom" && customFrom) { params.dateFrom = customFrom; if (customTo) params.dateTo = customTo; }
      else if (datePreset === "today") { const t = new Date(); params.dateFrom = t.toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      else if (datePreset === "week") { const t = new Date(); const s = new Date(t); s.setDate(t.getDate()-7); params.dateFrom = s.toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      else if (datePreset === "month") { const t = new Date(); params.dateFrom = new Date(t.getFullYear(), t.getMonth(), 1).toISOString().slice(0, 10); params.dateTo = t.toISOString().slice(0, 10); }
      const full = await stockMigrationService.getAll(params);
      const headers = ["Date", "Item", "From Site", "To Site", "Qty", "Unit", "Mode", "Status", "Initiated By", "Received By"];
      const rows = full.migrations.map(m => [
        fmtDate(m.dispatchedAt), m.stock?.itemName || "", m.sourceSite?.name || "", m.destinationSite?.name || "",
        m.quantity, m.unit, m.instant ? "Instant" : "Two-phase",
        MIGRATION_STATUS_CFG[m.status]?.label || m.status, m.initiatedByName || "", m.receivedByName || "",
      ]);
      exportToExcel(`site-stock-migrations-${new Date().toISOString().slice(0, 10)}`, headers, rows, "Migrations");
    } catch { showToast("Failed to export migrations", "error"); }
    finally { setExporting(false); }
  };

  const inCount  = data.migrations.filter(m => m.destinationSiteId === siteId).length;
  const outCount = data.migrations.filter(m => m.sourceSiteId === siteId).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Toast toast={toast} />

      <div className="kpi-grid kpi-grid--3">
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><ArrowLeftRight size={12} /></span>Total{datePreset ? " (filtered)" : ""}</div>
          <div className="kpi__value">{data.total}</div>
          <div className="kpi__foot"><span>migration records</span></div>
          <Sparkline data={genSpark(4, 14, 0.2)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><ArrowLeftRight size={12} /></span>Incoming (this page)</div>
          <div className="kpi__value" style={{ color: "var(--success)" }}>{inCount}</div>
          <div className="kpi__foot"><span>arriving at this site</span></div>
          <Sparkline data={genSpark(3, 14, 0.15)} color="var(--success)" />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><ArrowLeftRight size={12} /></span>Outgoing (this page)</div>
          <div className="kpi__value" style={{ color: "var(--warning, oklch(0.6 0.15 85))" }}>{outCount}</div>
          <div className="kpi__foot"><span>leaving this site</span></div>
          <Sparkline data={genSpark(5, 14, 0.1)} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="stoq-btn" onClick={exportExcelFile} disabled={exporting || data.total === 0}>
          {exporting ? <RefreshCw size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Download size={13} />} Export
        </button>
        <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path("/sites/" + siteId + "/migrate-stock"))}>
          <ArrowLeftRight size={13} /> Migrate Stock
        </button>
      </div>

      <div className="stoq-panel">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", color: "var(--fg-subtle)" }} />
          </div>
        ) : data.migrations.length === 0 ? (
          <div className="stoq-empty">
            <ArrowLeftRight size={24} className="stoq-empty__icon" />
            <div className="stoq-empty__title">No migrations{datePreset ? " in this period" : " yet"}</div>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="stoq-tbl">
                <thead>
                  <tr>
                    <th className="no-sort">Date</th>
                    <th className="no-sort">Item</th>
                    <th className="no-sort">Direction</th>
                    <th className="no-sort num-cell">Qty</th>
                    <th className="no-sort">Mode</th>
                    <th className="no-sort">Status</th>
                    <th className="no-sort col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.migrations.map(m => {
                    const isIncoming = m.destinationSiteId === siteId;
                    const statusCfg = MIGRATION_STATUS_CFG[m.status] || { label: m.status, cls: "" };
                    return (
                      <tr key={m.id}>
                        <td style={{ color: "var(--fg-muted)" }}>{fmtDate(m.dispatchedAt)}</td>
                        <td>
                          <span className="cell-stack__main">{m.stock?.itemName || "—"}</span>
                          <span className="cell-stack__sub" style={{ fontFamily: "var(--font-mono)" }}>{m.stock?.sku}</span>
                        </td>
                        <td>
                          {isIncoming
                            ? <span style={{ fontSize: 11, color: "var(--success)" }}>From {m.sourceSite?.name || "—"}</span>
                            : <span style={{ fontSize: 11, color: "var(--warning, oklch(0.6 0.15 85))" }}>To {m.destinationSite?.name || "—"}</span>}
                        </td>
                        <td className="num-cell">
                          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>
                            {m.quantity} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--fg-subtle)" }}>{m.unit}</span>
                          </span>
                        </td>
                        <td><span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{m.instant ? "Instant" : "Two-phase"}</span></td>
                        <td><span className={`stoq-badge ${statusCfg.cls}`}>{statusCfg.label}</span></td>
                        <td style={{ display: "flex", gap: 4 }}>
                          {m.status === "IN_TRANSIT" && isIncoming && (
                            <>
                              <button className="stoq-btn stoq-btn--sm" style={{ fontSize: 10 }} disabled={acting === m.id} onClick={() => handleReceive(m.id)}>
                                Confirm Receipt
                              </button>
                              <button className="icon-btn" style={{ color: "var(--danger)" }} disabled={acting === m.id} onClick={() => handleReject(m.id)} title="Reject">
                                <XCircle size={13} />
                              </button>
                            </>
                          )}
                          {m.status === "IN_TRANSIT" && !isIncoming && (
                            <button className="stoq-btn stoq-btn--sm" style={{ fontSize: 10, color: "var(--danger)" }} disabled={acting === m.id} onClick={() => handleCancel(m.id)}>
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="migrations" />
          </>
        )}
      </div>
    </div>
  );
}

// ── Info Tab ─────────────────────────────────────────────────────────────────

function InfoTab({ site }) {
  const budget = Number(site.budget || 0);
  const expenses = site.totalExpenses || 0;
  const utilPct = budget > 0 ? Math.min(Math.round((expenses / budget) * 100), 100) : 0;

  const remaining = budget - expenses;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="kpi-grid kpi-grid--4">
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Package size={12} /></span>Stock Items</div>
          <div className="kpi__value">{site._count?.stocks ?? 0}</div>
          <div className="kpi__foot"><span>items on this site</span></div>
          <Sparkline data={genSpark(1, 14, 0.4)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Users size={12} /></span>Workers Recorded</div>
          <div className="kpi__value">{(site.totalWorkersRecorded ?? 0).toLocaleString()}</div>
          <div className="kpi__foot"><span>total entries</span></div>
          <Sparkline data={genSpark(3, 14, 0.2)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="warning"><DollarSign size={12} /></span>Total Expenses</div>
          <div className="kpi__value" style={{ fontSize: 18, color: "var(--danger)" }}>{fmtCurrency(site.totalExpenses)}</div>
          <div className="kpi__foot"><span>budget used: {utilPct}%</span>{utilPct >= 100 && <span className="kpi__delta kpi__delta--down">Over</span>}</div>
          <Sparkline data={genSpark(7, 14, 0)} color="var(--warning)" />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><DollarSign size={12} /></span>Budget Remaining</div>
          <div className="kpi__value" style={{ fontSize: 18, color: remaining < 0 ? "var(--danger)" : "var(--success)" }}>{fmtCurrency(remaining)}</div>
          <div className="kpi__foot">
            <span>of {fmtCurrency(budget)} total</span>
            {remaining < 0 && <span className="kpi__delta kpi__delta--down">Over budget</span>}
            {remaining >= 0 && budget > 0 && <span className="kpi__delta kpi__delta--up">{Math.round((remaining / budget) * 100)}% left</span>}
          </div>
          <Sparkline data={genSpark(5, 14, -0.3)} color={remaining < 0 ? "var(--danger)" : "var(--accent)"} />
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-cell">
          <div className="detail-cell__label"><MapPin size={11} /> Location</div>
          <div className="detail-cell__value">{site.location}</div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell__label"><User size={11} /> Manager</div>
          <div className="detail-cell__value">{site.managerName || "Unassigned"}</div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell__label"><Activity size={11} /> Status</div>
          <div className="detail-cell__value">
            <span className={STATUS_BADGE[site.status] || "stoq-badge"}>{site.status}</span>
          </div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell__label"><DollarSign size={11} /> Budget</div>
          <div className="detail-cell__value">{fmtCurrency(budget)}</div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell__label"><Calendar size={11} /> Start</div>
          <div className="detail-cell__value">{fmtDate(site.startDate)}</div>
        </div>
        <div className="detail-cell">
          <div className="detail-cell__label"><Calendar size={11} /> End</div>
          <div className="detail-cell__value">{fmtDate(site.endDate)}</div>
        </div>
      </div>

      <div className="stoq-panel">
        <div className="stoq-panel__head">
          <span className="stoq-panel__title">Budget Utilisation</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: utilPct >= 100 ? "var(--danger)" : "var(--accent-soft-fg)" }}>{utilPct}%</span>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <div className="progress-bar" data-tone={utilPct >= 100 ? "danger" : undefined} style={{ height: 8 }}>
            <span style={{ width: `${utilPct}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--fg-subtle)" }}>
            <span>Spent: {fmtCurrency(expenses)}</span>
            <span>Budget: {fmtCurrency(budget)}</span>
          </div>
        </div>
      </div>

      {site.description && (
        <div className="stoq-panel">
          <div className="stoq-panel__head"><span className="stoq-panel__title">Description</span></div>
          <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.6 }}>{site.description}</div>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function SiteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { path, isAdmin } = useRole();
  const siteListPath = isAdmin ? path('/site-management') : '/sites';
  const [searchParams, setSearchParams] = useSearchParams();
  const [site, setSite] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "info");
  const [loading, setLoading] = useState(true);
  const [siteReceipt, setSiteReceipt] = useState(null);
  const [myAccess, setMyAccess] = useState(null);

  const datePreset = searchParams.get("date") || "";
  const customFrom = searchParams.get("from") || "";
  const customTo   = searchParams.get("to")   || "";

  const setParam = (key, val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set(key, val); else next.delete(key);
      return next;
    }, { replace: true });
  };

  const handlePreset = (val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set("date", val); else next.delete("date");
      next.delete("from"); next.delete("to");
      return next;
    }, { replace: true });
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    siteService.getOne(id).then(setSite).catch(() => navigate(siteListPath)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isAdmin && id) {
      siteService.getMyAccess(id).then(setMyAccess).catch(() => setMyAccess(null));
    }
  }, [id, isAdmin]);

  // Real-time: react to access changes made by admin in PermissionManagement
  useSocketEvent("siteAccessUpdated", ({ siteId }) => {
    if (!isAdmin && siteId === id) {
      siteService.getMyAccess(id).then(setMyAccess).catch(() => setMyAccess(null));
    }
  });
  useSocketEvent("siteAccessRemoved", ({ siteId }) => {
    if (!isAdmin && siteId === id) {
      setMyAccess(null);
      navigate(siteListPath);
    }
  });
  useSocketEvent("siteAccessAssigned", ({ siteId }) => {
    if (!isAdmin && siteId === id) {
      siteService.getMyAccess(id).then(setMyAccess).catch(() => setMyAccess(null));
    }
  });

  const canSeeTab = (tabId) => {
    if (isAdmin) return true;
    if (tabId === "info") return true;
    if (!myAccess) return false;
    const map = {
      workers:  myAccess.canManageWorkers,
      expenses: myAccess.canManageExpenses,
      stock:    myAccess.canManageStock,
      stockout: myAccess.canManageStockOut,
      migrations: myAccess.canManageStockOut,
    };
    return !!map[tabId];
  };

  const visibleTabs = ALL_TABS.filter(t => canSeeTab(t.id));

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      handleTab("info");
    }
  }, [visibleTabs.map(t => t.id).join(","), activeTab]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 10, color: "var(--fg-subtle)" }}>
      <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!site) return null;

  const buildSiteReceipt = () => ({
    id:          site.id,
    type:        'PAYMENT',
    title:       'SITE SUMMARY REPORT',
    reference:   `SITE-${site.id.slice(-8).toUpperCase()}`,
    issuedBy:    site.managerName || '',
    issuedTo:    site.location,
    status:      site.status,
    createdAt:   site.startDate || site.createdAt,
    completedAt: site.endDate || null,
    items: [
      { name: 'Budget',           quantity: 1, unitCost: Number(site.budget || 0),       total: Number(site.budget || 0) },
      { name: 'Total Expenses',   quantity: 1, unitCost: Number(site.totalExpenses || 0), total: Number(site.totalExpenses || 0) },
      { name: 'Budget Remaining', quantity: 1, unitCost: Number(site.budget || 0) - Number(site.totalExpenses || 0), total: Number(site.budget || 0) - Number(site.totalExpenses || 0) },
    ],
    totalAmount: Number(site.totalExpenses || 0),
    notes:       site.description || null,
  });

  const showDateFilter = ["workers", "expenses", "stockout", "migrations"].includes(activeTab);

  return (
    <div style={{ padding: "20px 24px 40px" }}>
      {siteReceipt && <SupplierReceiptModal data={siteReceipt} onClose={() => setSiteReceipt(null)} />}
      <div className="page-head">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(siteListPath)}><ArrowLeft size={14} /></button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--bg-sunk)", border: "1px solid var(--border)", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
              {site.image
                ? <img src={`http://localhost:3000${site.image}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                : <Landmark size={20} style={{ color: "var(--fg-subtle)" }} />}
            </div>
            <div>
              <div className="stoq-crumbs" style={{ marginBottom: 4 }}>
                <span>Sites</span><span className="stoq-crumbs__sep">/</span>
                <span className="stoq-crumbs__current">{site.name}</span>
              </div>
              <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {site.name}
                <span className={STATUS_BADGE[site.status] || "stoq-badge"}>{site.status}</span>
              </h1>
              <div className="page-head__sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={11} /> {site.location}
              </div>
            </div>
          </div>
        </div>
        <div className="page-head__actions">
          {canSeeTab("workers") && (
            <button className="stoq-btn" onClick={() => navigate(path(`/sites/${id}/workers/add`))}>
              <Users size={13} /> Record Workers
            </button>
          )}
          {isAdmin && (
            <button className="stoq-btn" onClick={() => setSiteReceipt(buildSiteReceipt())}>
              <Printer size={13} /> Print Report
            </button>
          )}
          {(isAdmin || myAccess?.canManageInfo) && (
            <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path(`/sites/edit/${id}`))}>
              <Edit2 size={13} /> Edit Site
            </button>
          )}
        </div>
      </div>

      {showDateFilter && (
        <DateFilterBar
          preset={datePreset}
          customFrom={customFrom}
          customTo={customTo}
          onPreset={handlePreset}
          onCustomFrom={v => setParam("from", v)}
          onCustomTo={v => setParam("to", v)}
        />
      )}

      <div className="stoq-tabs">
        {visibleTabs.map(tab => (
          <button key={tab.id} className="stoq-tab" data-active={activeTab === tab.id ? "true" : "false"} onClick={() => handleTab(tab.id)}>
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "info"     && <InfoTab site={site} />}
      {activeTab === "workers"  && <WorkersTab siteId={id} datePreset={datePreset} customFrom={customFrom} customTo={customTo} navigate={navigate} path={path} />}
      {activeTab === "expenses" && <ExpensesTab siteId={id} siteName={site.name} datePreset={datePreset} customFrom={customFrom} customTo={customTo} />}
      {activeTab === "stock"    && <StockTab siteId={id} navigate={navigate} path={path} />}
      {activeTab === "stockout" && <StockOutTab siteId={id} datePreset={datePreset} customFrom={customFrom} customTo={customTo} navigate={navigate} path={path} />}
      {activeTab === "migrations" && <MigrationsTab siteId={id} datePreset={datePreset} customFrom={customFrom} customTo={customTo} navigate={navigate} path={path} />}
    </div>
  );
}
