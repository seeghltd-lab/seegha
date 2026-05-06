import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark, MapPin, User, Calendar, DollarSign, Plus, Activity, Layers, LayoutGrid, List, Eye, Edit2, Trash2, Users, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import siteService from "../../services/siteService";
import Sparkline, { genSpark } from "../../components/Sparkline";
import { useViewMode } from "../../hooks/useViewMode";
import { useRole } from "../../hooks/useRole";

const PAGE_SIZES = { table: 15, cards: 9 };

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`stoq-toast ${toast.type === "error" ? "stoq-toast--error" : "stoq-toast--success"}`}>{toast.msg}</div>;
}

const STATUS_BADGE = { ACTIVE: "stoq-badge--success", PAUSED: "stoq-badge--warning", COMPLETED: "" };

export default function SiteManagement() {
  const navigate = useNavigate();
  const { path, isAdmin } = useRole();
  const [sites, setSites] = useState([]);
  const [stats, setStats] = useState({ totalSites: 0, activeSites: 0, pausedSites: 0, totalBudget: 0, totalWorkers: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", status: "", location: "" });
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode, isSmallScreen] = useViewMode('sites', 'cards', 'cards');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchSites = async () => {
    try { setSites(await siteService.getAll(filters)); }
    catch { showToast("Failed to load sites", "error"); }
  };

  const fetchStats = async () => {
    try { setStats(await siteService.getStats()); } catch {}
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchSites(), fetchStats()]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [filters.status, filters.location]);
  useEffect(() => { setPage(1); }, [filters.search, filters.status, filters.location, viewMode]);

  const handleSearch = (e) => { if (e.key === "Enter") fetchSites(); };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this site from the registry?")) return;
    try { await siteService.remove(id); showToast("Site decommissioned"); loadData(); }
    catch (err) { showToast(err.response?.data?.message || "Failed to delete site", "error"); }
  };

  const fmtCurrency = (val) => new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(val);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const filtered = sites.filter(s => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || (s.managerName || "").toLowerCase().includes(q);
  });
  const pageSize = PAGE_SIZES[viewMode];
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const PaginationBar = () => totalPages <= 1 ? null : (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
      <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Page {page} of {totalPages} · {filtered.length} sites</span>
      <div style={{ display: "flex", gap: 4 }}>
        <button className="stoq-btn stoq-btn--icon" disabled={page <= 1} style={{ opacity: page <= 1 ? 0.4 : 1 }} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
        <button className="stoq-btn stoq-btn--icon" disabled={page >= totalPages} style={{ opacity: page >= totalPages ? 0.4 : 1 }} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
      </div>
    </div>
  );

  return (
    <div>
      <Toast toast={toast} />

      <div className="page-head">
        <div>
          <h1>Sites Management</h1>
          <div className="page-head__sub">{stats.totalSites} registered locations</div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn stoq-btn--primary" onClick={() => navigate(path("/sites/add"))}><Plus size={13} /> Add New Site</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: "var(--gap-card)" }}>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><LayoutGrid size={11} /></span>Total Sites</div>
          <div className="kpi__value">{stats.totalSites}</div>
          <div className="kpi__foot"><span>registered locations</span></div>
          <Sparkline data={genSpark(1, 14, 0.2)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Activity size={11} /></span>Active</div>
          <div className="kpi__value" style={{ color: "var(--success)" }}>{stats.activeSites}</div>
          <div className="kpi__foot"><span>in operation</span></div>
          <Sparkline data={genSpark(3, 14, 0.3)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon" data-tone="warning"><Layers size={11} /></span>Paused</div>
          <div className="kpi__value">{stats.pausedSites}</div>
          <div className="kpi__foot"><span>on hold</span></div>
          <Sparkline data={genSpark(7, 14, 0)} color="var(--warning)" />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><Users size={11} /></span>Total Workers</div>
          <div className="kpi__value">{stats.totalWorkers.toLocaleString()}</div>
          <div className="kpi__foot"><span>across all sites</span></div>
          <Sparkline data={genSpark(5, 14, 0.4)} />
        </div>
        <div className="kpi">
          <div className="kpi__label"><span className="kpi__icon"><DollarSign size={11} /></span>Total Budget</div>
          <div className="kpi__value" style={{ fontSize: 16 }}>RWF {(stats.totalBudget / 1_000_000).toFixed(1)}M</div>
          <div className="kpi__foot"><span>allocated budget</span></div>
          <Sparkline data={genSpark(11, 14, 0.5)} />
        </div>
      </div>

      <div className="stoq-panel">
        <div className="stoq-toolbar">
          <div className="stoq-toolbar__search">
            <input className="stoq-input stoq-input--search" value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={handleSearch} placeholder="Search sites, managers, or locations…" />
          </div>
          <select className="stoq-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={{ width: 140 }}>
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select className="stoq-select" value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })} style={{ width: 170 }}>
            <option value="">All Locations</option>
            <option value="Kigali">Kigali</option>
            <option value="Eastern Province">Eastern Province</option>
            <option value="Northern Province">Northern Province</option>
          </select>
          {!isSmallScreen && (
            <div className="stoq-segment" style={{ marginLeft: "auto" }}>
              <button data-active={viewMode === "table" ? "true" : undefined} onClick={() => setViewMode("table")} title="Table view"><List size={13} /></button>
              <button data-active={viewMode === "cards" ? "true" : undefined} onClick={() => setViewMode("cards")} title="Card view"><LayoutGrid size={13} /></button>
            </div>
          )}
          <button className="stoq-btn stoq-btn--icon" onClick={loadData} title="Refresh"><RefreshCw size={13} /></button>
        </div>

        {/* TABLE VIEW */}
        {viewMode === "table" && (
          <>
            <div className="table-wrap">
              <table className="stoq-tbl">
                <thead>
                  <tr>
                    <th className="no-sort">Site</th>
                    <th className="no-sort">Location</th>
                    <th className="no-sort">Manager</th>
                    <th className="no-sort">Status</th>
                    <th className="no-sort num-cell">Stock</th>
                    <th className="no-sort num-cell">Budget</th>
                    <th className="no-sort">Timeline</th>
                    <th className="no-sort col-actions" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="stoq-empty">
                      <RefreshCw size={16} style={{ animation: "spin 1s linear infinite", color: "var(--fg-subtle)", margin: "0 auto", display: "block" }} />
                    </td></tr>
                  ) : paged.length === 0 ? (
                    <tr><td colSpan={8} className="stoq-empty">No sites found</td></tr>
                  ) : paged.map(site => (
                    <tr key={site.id} onClick={() => navigate(path(`/sites/${site.id}`))} style={{ cursor: "pointer" }}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", overflow: "hidden", background: "var(--bg-sunk)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                            {site.image
                              ? <img src={`http://localhost:3000${site.image}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                              : <Landmark size={13} style={{ color: "var(--fg-subtle)" }} />}
                          </div>
                          <span className="cell-stack__main">{site.name}</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--fg-muted)", fontSize: 11 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={10} style={{ color: "var(--accent-soft-fg)", flexShrink: 0 }} />{site.location}
                        </span>
                      </td>
                      <td style={{ color: "var(--fg-muted)", fontSize: 11 }}>{site.managerName || "—"}</td>
                      <td><span className={`stoq-badge ${STATUS_BADGE[site.status] || ""}`}>{site.status}</span></td>
                      <td className="num-cell">{site._count?.stocks || 0}</td>
                      <td className="num-cell" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{fmtCurrency(site.budget)}</td>
                      <td style={{ fontSize: 10, color: "var(--fg-subtle)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                        {fmtDate(site.startDate)} → {fmtDate(site.endDate)}
                      </td>
                      <td className="col-actions" onClick={e => e.stopPropagation()}>
                        <div className="stoq-btn-group" style={{ justifyContent: "flex-end" }}>
                          <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Workers" onClick={() => navigate(path(`/sites/${site.id}?tab=workers`))}><Users size={13} /></button>
                          <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="View" onClick={() => navigate(path(`/sites/${site.id}`))}><Eye size={13} /></button>
                          <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Edit" onClick={() => navigate(path(`/sites/edit/${site.id}`))}><Edit2 size={13} /></button>
                          <button className="stoq-btn stoq-btn--ghost stoq-btn--icon stoq-btn--sm" title="Delete" style={{ color: "var(--danger)" }} onClick={() => handleDelete(site.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar />
          </>
        )}

        {/* CARDS VIEW */}
        {viewMode === "cards" && (
          <>
            {loading ? (
              <div className="stoq-empty">
                <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", color: "var(--fg-subtle)", margin: "0 auto" }} />
              </div>
            ) : paged.length === 0 ? (
              <div className="stoq-empty">
                <div className="stoq-empty__icon"><Landmark size={32} /></div>
                <div className="stoq-empty__title">No sites found</div>
                <button className="stoq-btn stoq-btn--primary" style={{ marginTop: 12 }} onClick={() => navigate(path("/sites/add"))}>Add First Site</button>
              </div>
            ) : (
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "var(--gap-card)" }}>
                {paged.map(site => (
                  <div key={site.id} style={{ border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: "var(--r-md)", background: "var(--panel)" }}>
                    <div style={{ padding: "16px 18px" }}>
                      {/* Header */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--bg-sunk)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                            {site.image
                              ? <img src={`http://localhost:3000${site.image}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={site.name} />
                              : <Landmark size={20} style={{ color: "var(--fg-subtle)" }} />}
                          </div>
                          <div>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" }}>{site.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--fg-muted)", marginTop: 3 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} style={{ color: "var(--accent-soft-fg)" }} />{site.location}</span>
                              <span style={{ color: "var(--border-strong)" }}>·</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={11} />{site.managerName || "Unassigned"}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`stoq-badge ${STATUS_BADGE[site.status] || ""}`}>{site.status}</span>
                      </div>

                      {/* Stats */}
                      <div className="detail-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 12 }}>
                        <div className="detail-cell">
                          <div className="detail-cell__label">Stock</div>
                          <div className="detail-cell__value" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{site._count?.stocks || 0}</div>
                        </div>
                        <div className="detail-cell">
                          <div className="detail-cell__label">Budget</div>
                          <div className="detail-cell__value" style={{ color: "var(--accent-soft-fg)", fontFamily: "var(--font-mono)", fontSize: 10 }}>{fmtCurrency(site.budget)}</div>
                        </div>
                        <div className="detail-cell">
                          <div className="detail-cell__label">Workers</div>
                          <div className="detail-cell__value" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{site._count?.workerRecords || 0}</div>
                        </div>
                        <div className="detail-cell">
                          <div className="detail-cell__label">Expenses</div>
                          <div className="detail-cell__value" style={{ color: "var(--danger)", fontFamily: "var(--font-display)", fontWeight: 700 }}>{site._count?.expenses || 0}</div>
                        </div>
                      </div>

                      {site.description && (
                        <p style={{ fontSize: 11, color: "var(--fg-subtle)", fontStyle: "italic", marginBottom: 12, lineHeight: 1.5 }}>{site.description}</p>
                      )}

                      {/* Footer */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", display: "flex", alignItems: "center", gap: 5 }}>
                          <Calendar size={10} />
                          {fmtDate(site.startDate)} → {fmtDate(site.endDate)}
                        </span>
                        <div className="stoq-btn-group">
                          <button className="stoq-btn stoq-btn--sm stoq-btn--icon" title="Record Workers" onClick={() => navigate(path(`/sites/${site.id}?tab=workers`))}><Users size={13} /></button>
                          <button className="stoq-btn stoq-btn--sm stoq-btn--icon" title="View" onClick={() => navigate(path(`/sites/${site.id}`))}><Eye size={13} /></button>
                          <button className="stoq-btn stoq-btn--sm" onClick={() => navigate(path(`/sites/edit/${site.id}`))}><Edit2 size={12} /> Edit</button>
                          <button className="stoq-btn stoq-btn--sm stoq-btn--icon" style={{ color: "var(--danger)" }} title="Delete" onClick={() => handleDelete(site.id)}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <PaginationBar />
          </>
        )}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

