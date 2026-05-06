import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Landmark, MapPin, User, Calendar, DollarSign, Activity, Package, Users, Plus, Trash2, X, Save, Edit2, AlertCircle, RefreshCw, CheckCircle, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import siteService from "../../../services/siteService";
import stockService from "../../../services/stockService";
import { useRole } from "../../../hooks/useRole";
import ReceiptModal from "../../../components/ReceiptModal";

const TABS = [
  { id: "info", label: "Info", icon: Landmark },
  { id: "workers", label: "Workers", icon: Users },
  { id: "expenses", label: "Expenses", icon: DollarSign },
  { id: "stock", label: "Stock", icon: Package },
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

function WorkersTab({ siteId, datePreset, customFrom, customTo }) {
  const [data, setData] = useState({ records: [], totalWorkers: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ workerCount: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const PAGE = 10;

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await siteService.getWorkerRecords(siteId)); }
    catch { showToast("Failed to load worker records", "error"); }
    finally { setLoading(false); }
  }, [siteId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [datePreset, customFrom, customTo]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.workerCount || Number(form.workerCount) < 1) return showToast("Enter a valid worker count", "error");
    try {
      setSubmitting(true);
      await siteService.addWorkerRecord(siteId, { workerCount: Number(form.workerCount), date: form.date, notes: form.notes || undefined });
      setForm({ workerCount: "", date: new Date().toISOString().split("T")[0], notes: "" });
      setShowForm(false);
      showToast("Worker record added");
      load();
    } catch (err) { showToast(err.response?.data?.message || "Failed to add record", "error"); }
    finally { setSubmitting(false); }
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Toast toast={toast} />
      <div className="kpi-grid kpi-grid--3">
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Users size={12} /></span>Entries{datePreset ? " (filtered)" : ""}</div>
          <div className="kpi__value">{filtered.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Users size={12} /></span>Workers{datePreset ? " (filtered)" : " Recorded"}</div>
          <div className="kpi__value">{filteredTotal.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="stoq-btn stoq-btn--primary" onClick={() => setShowForm(true)}>
          <Plus size={13} /> Record Workers
        </button>
      </div>

      {showForm && (
        <div className="stoq-panel">
          <div className="stoq-panel__head">
            <span className="stoq-panel__title">Record Daily Workers</span>
            <button className="icon-btn" onClick={() => setShowForm(false)}><X size={14} /></button>
          </div>
          <form onSubmit={handleAdd} style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div className="stoq-field">
              <label className="stoq-field__label">Workers Count *</label>
              <input type="number" min="1" className="stoq-input" value={form.workerCount} onChange={e => setForm({ ...form, workerCount: e.target.value })} placeholder="e.g. 24" />
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label">Date *</label>
              <input type="date" className="stoq-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="stoq-field">
              <label className="stoq-field__label">Notes (optional)</label>
              <input className="stoq-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any remark…" />
            </div>
            <button type="submit" className="stoq-btn stoq-btn--primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
              <Save size={13} /> Save
            </button>
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
    items: [{
      name:     ex.description,
      sku:      ex.category || '',
      quantity: 1,
      unitCost: Number(ex.amount),
      total:    Number(ex.amount),
    }],
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {receiptData && <ReceiptModal data={receiptData} onClose={() => setReceiptData(null)} />}
      <Toast toast={toast} />
      <div className="kpi-grid kpi-grid--3">
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="warning"><DollarSign size={12} /></span>Total Expenses{datePreset ? " (filtered)" : ""}</div>
          <div className="kpi__value" style={{ fontSize: 20, color: "var(--danger)" }}>{fmtCurrency(filteredTotal)}</div>
          <div className="kpi__foot">{filtered.length} entries</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
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

function StockTab({ siteId }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE = 12;

  useEffect(() => {
    stockService.getAll({ siteId, limit: 200 }).then(d => setStocks(d.stocks || [])).catch(() => {}).finally(() => setLoading(false));
  }, [siteId]);

  const totalValue = stocks.reduce((s, x) => s + parseFloat(x.totalValue || 0), 0);
  const totalPages = Math.max(1, Math.ceil(stocks.length / PAGE));
  const paged = stocks.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="stoq-panel">
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", color: "var(--fg-subtle)" }} />
        </div>
      ) : stocks.length === 0 ? (
        <div className="stoq-empty">
          <Package size={24} className="stoq-empty__icon" />
          <div className="stoq-empty__title">No stock assigned to this site</div>
        </div>
      ) : (
        <>
          <div className="stoq-toolbar">
            <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{stocks.length} item{stocks.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {paged.map(s => (
              <div key={s.id} style={{ background: "var(--bg-sunk)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)" }}>{s.sku}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {s.quantity <= 0 && <span className="stoq-badge stoq-badge--danger">Out</span>}
                    {s.quantity > 0 && s.quantity <= (s.reorderLevel || 5) && <span className="stoq-badge stoq-badge--warning">Low</span>}
                  </div>
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
          <Pagination page={page} totalPages={totalPages} total={stocks.length} onPage={setPage} label="items" />
        </>
      )}
    </div>
  );
}

// ── Info Tab ─────────────────────────────────────────────────────────────────

function InfoTab({ site }) {
  const budget = Number(site.budget || 0);
  const expenses = site.totalExpenses || 0;
  const utilPct = budget > 0 ? Math.min(Math.round((expenses / budget) * 100), 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="kpi-grid kpi-grid--4">
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Package size={12} /></span>Stock Items</div>
          <div className="kpi__value">{site._count?.stocks ?? 0}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Users size={12} /></span>Workers Recorded</div>
          <div className="kpi__value">{(site.totalWorkersRecorded ?? 0).toLocaleString()}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="warning"><DollarSign size={12} /></span>Total Expenses</div>
          <div className="kpi__value" style={{ fontSize: 18, color: "var(--danger)" }}>{fmtCurrency(site.totalExpenses)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><DollarSign size={12} /></span>Budget Remaining</div>
          <div className="kpi__value" style={{ fontSize: 18, color: budget - expenses < 0 ? "var(--danger)" : "var(--success)" }}>{fmtCurrency(budget - expenses)}</div>
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

  // Date filter — persisted in URL
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
      { name: 'Budget',            quantity: 1, unitCost: Number(site.budget || 0),        total: Number(site.budget || 0) },
      { name: 'Total Expenses',    quantity: 1, unitCost: Number(site.totalExpenses || 0),  total: Number(site.totalExpenses || 0) },
      { name: 'Budget Remaining',  quantity: 1, unitCost: Number(site.budget || 0) - Number(site.totalExpenses || 0), total: Number(site.budget || 0) - Number(site.totalExpenses || 0) },
    ],
    totalAmount: Number(site.totalExpenses || 0),
    notes:       site.description || null,
  });

  const showDateFilter = activeTab === "workers" || activeTab === "expenses";

  return (
    <div style={{ padding: "20px 24px 40px" }}>
      {siteReceipt && <ReceiptModal data={siteReceipt} onClose={() => setSiteReceipt(null)} />}
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
          <button className="stoq-btn" onClick={() => handleTab("workers")}>
            <Users size={13} /> Record Workers
          </button>
          <button className="stoq-btn" onClick={() => setSiteReceipt(buildSiteReceipt())}>
            <Printer size={13} /> Print Report
          </button>
          <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path(`/sites/edit/${id}`))}>
            <Edit2 size={13} /> Edit Site
          </button>
        </div>
      </div>

      {/* Date filter — shown on workers and expenses tabs */}
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
        {TABS.map(tab => (
          <button key={tab.id} className="stoq-tab" data-active={activeTab === tab.id ? "true" : "false"} onClick={() => handleTab(tab.id)}>
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "info" && <InfoTab site={site} />}
      {activeTab === "workers" && <WorkersTab siteId={id} datePreset={datePreset} customFrom={customFrom} customTo={customTo} />}
      {activeTab === "expenses" && <ExpensesTab siteId={id} siteName={site.name} datePreset={datePreset} customFrom={customFrom} customTo={customTo} />}
      {activeTab === "stock" && <StockTab siteId={id} />}
    </div>
  );
}

