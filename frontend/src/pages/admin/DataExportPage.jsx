import { useState, useRef, Fragment } from 'react';
import dataExportService from '../../services/dataExportService';

// ─── Constants ────────────────────────────────────────

const EXPORT_GROUPS = [
  { id: 'stockMovements', label: 'Stock Movements',      desc: 'Stock History, Migrations, Stock Outs',           warn: 'Can be very large' },
  { id: 'requisitions',  label: 'Requisitions',          desc: 'Requisitions, Items, Receiving Logs, Payments',   warn: null },
  { id: 'siteOps',       label: 'Site Operations',       desc: 'Worker Records, Site Expenses',                   warn: null },
  { id: 'employees',     label: 'Employees & Access',    desc: 'Employee accounts, permissions, site access',     warn: 'Contains hashed passwords' },
  { id: 'admins',        label: 'Admin Accounts',        desc: 'Admin login accounts',                            warn: 'Sensitive — hashed passwords' },
  { id: 'settings',      label: 'Site Settings',         desc: 'System configuration key-value pairs',            warn: null },
  { id: 'activityLogs',  label: 'Activity Logs',         desc: 'Full audit trail of all system actions',          warn: 'Can be very large' },
  { id: 'notifications', label: 'Notifications',         desc: 'System notification records',                     warn: null },
];

const DELETED_FILTERS = [
  { id: 'all',          label: 'All records',   desc: 'Active and soft-deleted records' },
  { id: 'only_active',  label: 'Active only',   desc: 'Exclude soft-deleted stocks and employees' },
  { id: 'only_deleted', label: 'Deleted only',  desc: 'Only soft-deleted stocks and employees' },
];

const FORMAT_OPTIONS = [
  { id: 'json',  label: 'JSON — Full Backup',   desc: 'Complete re-importable backup',           mono: '{ }', iconBg: 'var(--accent-soft)',  iconColor: 'var(--accent-soft-fg)' },
  { id: 'excel', label: 'Excel — Spreadsheet',  desc: 'One sheet per entity, human-readable',   mono: '⊞',   iconBg: 'var(--success-soft)', iconColor: 'var(--success)' },
  { id: 'pdf',   label: 'PDF — Summary Report', desc: 'KPI overview, stock list, supplier list', mono: 'PDF', iconBg: 'var(--danger-soft)',  iconColor: 'var(--danger)' },
];

const GROUP_LABELS = {
  admins:         'Admin Accounts',
  employees:      'Employees & Access',
  stockMovements: 'Stock Movements',
  requisitions:   'Requisitions',
  siteOps:        'Site Operations',
  settings:       'Site Settings',
  activityLogs:   'Activity Logs',
  notifications:  'Notifications',
};

const CONFLICT_STRATEGIES = [
  { id: 'SKIP',              label: 'Skip existing',      badge: 'Recommended',        badgeBg: 'var(--success-soft)',   badgeColor: 'var(--success)',        desc: 'Import only new records. Existing records stay untouched.' },
  { id: 'OVERWRITE',         label: 'Overwrite existing', badge: 'Updates master data', badgeBg: 'var(--accent-soft)',    badgeColor: 'var(--accent-soft-fg)', desc: 'Update existing categories, suppliers, stocks, employees with backup values.' },
  { id: 'RESTORE_DELETED',   label: 'Restore deleted',    badge: 'Un-deletes records',  badgeBg: 'oklch(0.95 0.04 290)', badgeColor: 'oklch(0.45 0.18 290)',  desc: "Create records that don't exist and restore soft-deleted stocks and employees." },
  { id: 'ABORT_ON_CONFLICT', label: 'Abort on conflict',  badge: 'Strictest',           badgeBg: 'var(--warning-soft)',   badgeColor: 'var(--warning)',        desc: 'Stop immediately if any record already exists. Safe for clean-slate restore.' },
];

// ─── Micro helpers ────────────────────────────────────

function sv(n, curr) {
  const done = curr > n, active = curr === n;
  return {
    bg:         done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--bg-sunk)',
    color:      (done || active) ? '#fff' : 'var(--fg-subtle)',
    text:       done ? '✓' : String(n),
    ring:       active ? '0 0 0 3px var(--accent-soft)' : 'none',
    labelColor: active ? 'var(--accent)' : done ? 'var(--success)' : 'var(--fg-subtle)',
  };
}

function Dot({ checked }) {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
      border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
      background: checked ? 'var(--accent)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {checked && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
    </div>
  );
}

function Checkbox({ checked }) {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: 3, flexShrink: 0, marginTop: 1,
      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
      background: checked ? 'var(--accent)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {checked && (
        <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
          <path d="M1 3.5l2.5 2.5 3.5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function ResultRow({ r }) {
  const [open, setOpen] = useState(false);
  const hasWarnings = r.warnings?.length > 0;
  const dotColor = r.failed > 0 ? 'var(--danger)' : hasWarnings ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden', marginBottom: 4 }}>
      <button
        onClick={() => hasWarnings && setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'none', border: 'none', cursor: hasWarnings ? 'pointer' : 'default', textAlign: 'left' }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{r.entity}</span>
        <span style={{ fontSize: 11, color: 'var(--fg-subtle)', display: 'flex', gap: 10, fontVariantNumeric: 'tabular-nums' }}>
          {r.created > 0 && <span style={{ color: 'var(--success)' }}>+{r.created} created</span>}
          {r.updated > 0 && <span style={{ color: 'var(--accent)' }}>↑{r.updated} updated</span>}
          {r.skipped > 0 && <span style={{ color: 'var(--warning)' }}>{r.skipped} skipped</span>}
          {r.failed  > 0 && <span style={{ color: 'var(--danger)' }}>{r.failed} failed</span>}
          {!r.created && !r.updated && !r.skipped && !r.failed && <span>no changes</span>}
        </span>
        {hasWarnings && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: 'var(--fg-subtle)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {open && hasWarnings && (
        <div style={{ padding: '8px 14px 10px', borderTop: '1px solid var(--border)', background: 'var(--warning-soft)' }}>
          {r.warnings.map((w, i) => (
            <p key={i} style={{ fontSize: 11, color: 'var(--warning)', lineHeight: 1.5 }}>{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────

export default function DataExportPage() {
  const [tab, setTab] = useState('export');

  // Export state
  const [exportStep, setExportStep]       = useState(1);
  const [exportDone, setExportDone]       = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError]     = useState('');
  const [groups, setGroups]               = useState([]);
  const [format, setFormat]               = useState('json');
  const [deletedFilter, setDeletedFilter] = useState('all');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');

  // Import state
  const [importStep, setImportStep]           = useState(1);
  const [importDone, setImportDone]           = useState(false);
  const [importLoading, setImportLoading]     = useState(false);
  const [importError, setImportError]         = useState('');
  const [conflictStrategy, setConflictStrategy] = useState('SKIP');
  const [file, setFile]                       = useState(null);
  const [drag, setDrag]                       = useState(false);
  const [preview, setPreview]                 = useState(null);
  const [previewLoading, setPreviewLoading]   = useState(false);
  const [previewError, setPreviewError]       = useState('');
  const [previewStrategy, setPreviewStrategy] = useState(null);
  const [results, setResults]                 = useState(null);
  const [importGroups, setImportGroups]       = useState(null);
  const fileInputRef = useRef(null);

  const CSV_EXTS = ['csv', 'xlsx', 'xls'];
  const fileType = file ? (CSV_EXTS.includes(file.name.split('.').pop()?.toLowerCase()) ? 'csv' : 'json') : null;

  // History / rollback state
  const [history, setHistory]                 = useState(null);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [rollbackTarget, setRollbackTarget]   = useState(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackError, setRollbackError]     = useState('');

  // ─── Export logic ──────────────────────────────────

  const runExport = async () => {
    setExportLoading(true); setExportError('');
    try {
      await dataExportService.exportData({ format, groups, deletedFilter, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
      setExportDone(true);
    } catch (err) {
      setExportError(err?.response?.data?.message ?? 'Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const resetExport = () => {
    setExportDone(false); setExportStep(1); setExportError('');
    setGroups([]); setFormat('json'); setDeletedFilter('all'); setDateFrom(''); setDateTo('');
  };

  // ─── Import logic ──────────────────────────────────

  const loadPreview = async (f, strategy, grps = null) => {
    setPreview(null); setPreviewError(''); setPreviewLoading(true);
    try {
      const data = await dataExportService.importPreview(f, strategy, grps);
      setPreview(data); setPreviewStrategy(strategy);
      if (data.detectedGroups?.length > 0) setImportGroups(data.detectedGroups);
    } catch (err) {
      setPreviewError(err?.response?.data?.message ?? 'Could not read file. Make sure it is a valid amza_project backup.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadCsvPreview = async (f) => {
    setPreview(null); setPreviewError(''); setPreviewLoading(true);
    try {
      const data = await dataExportService.previewStockCsv(f);
      setPreview({ _type: 'csv', ...data });
    } catch (err) {
      setPreviewError(err?.response?.data?.message ?? 'Could not read file. Check that columns include sku and itemName.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['json', 'csv', 'xlsx', 'xls'].includes(ext)) {
      setPreviewError('Unsupported file type. Upload a .json backup or a .csv / .xlsx stock file.');
      return;
    }
    setFile(f); setPreview(null); setPreviewStrategy(null); setResults(null); setImportError(''); setPreviewError('');
    if (['csv', 'xlsx', 'xls'].includes(ext)) {
      loadCsvPreview(f);
    } else {
      loadPreview(f, conflictStrategy);
    }
  };

  const runImport = async () => {
    if (!file) return;
    setImportLoading(true); setImportError('');
    try {
      if (fileType === 'csv') {
        const data = await dataExportService.importStockCsv(file);
        setResults({ summary: { created: data.created, updated: 0, skipped: data.skipped, failed: data.failed, total: data.total }, results: [data] });
      } else {
        const allGroups = preview?.detectedGroups ?? [];
        const grps = importGroups && importGroups.length < allGroups.length ? importGroups : undefined;
        const data = await dataExportService.importData(file, { conflictStrategy, groups: grps });
        setResults(data);
      }
      setImportDone(true);
      loadHistory();
    } catch (err) {
      const conflicts = err?.response?.data?.conflicts;
      setImportError(conflicts?.length ? `Import aborted — conflicts in: ${conflicts.join(', ')}` : (err?.response?.data?.message ?? 'Import failed.'));
    } finally {
      setImportLoading(false);
    }
  };

  const toggleImportGroup = (g) => {
    setImportGroups(prev => {
      const current = prev ?? (preview?.detectedGroups ?? []);
      return current.includes(g) ? current.filter(x => x !== g) : [...current, g];
    });
  };

  const resetImport = () => {
    setImportDone(false); setImportStep(1); setImportError('');
    setFile(null); setPreview(null); setPreviewError(''); setPreviewStrategy(null); setResults(null);
    setConflictStrategy('SKIP'); setImportGroups(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadCsvTemplate = () => {
    const csv = 'sku,itemName,unit,quantity,unitCost,reorderLevel,stockType,warehouseLocation,categoryName,siteName\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'amza_stock_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const loadHistory = async () => {
    if (historyLoading) return;
    setHistoryLoading(true);
    try { setHistory(await dataExportService.getImportHistory()); }
    catch { /* silent */ }
    finally { setHistoryLoading(false); }
  };

  const confirmRollback = async () => {
    if (!rollbackTarget) return;
    setRollbackLoading(true); setRollbackError('');
    try {
      await dataExportService.rollbackImport(rollbackTarget.id);
      setRollbackTarget(null);
      loadHistory();
    } catch (err) {
      setRollbackError(err?.response?.data?.message ?? 'Rollback failed.');
    } finally {
      setRollbackLoading(false);
    }
  };

  // ─── Navigation ────────────────────────────────────

  const isExport = tab === 'export';
  const curStep  = isExport ? exportStep : importStep;
  const isDone   = isExport ? exportDone : importDone;

  const handleBack = () => {
    if (isExport) setExportStep(s => Math.max(1, s - 1));
    else          setImportStep(s => Math.max(1, s - 1));
  };

  const handleNext = async () => {
    if (isExport) {
      if (exportStep === 3) { await runExport(); return; }
      setExportStep(s => s + 1); return;
    }
    if (importStep === 3) { await runImport(); return; }
    if (importStep === 2 && file && fileType === 'json' && (!preview || previewStrategy !== conflictStrategy)) {
      loadPreview(file, conflictStrategy);
    }
    setImportStep(s => s + 1);
  };

  const nextDisabled =
    (isExport  && exportLoading) ||
    (!isExport && importLoading) ||
    (!isExport && importStep === 2 && !file) ||
    (!isExport && importStep === 3 && (previewLoading || !!previewError)) ||
    (!isExport && importStep === 3 && fileType !== 'csv' && importGroups !== null && importGroups.length === 0);

  const nextLabel =
    exportLoading ? 'Exporting…' :
    importLoading ? 'Importing…' :
    curStep === 3 ? (isExport ? 'Export Now' : 'Import Now') :
    'Continue';

  // ─── Derived ───────────────────────────────────────

  const selGroups       = EXPORT_GROUPS.filter(g => groups.includes(g.id));
  const selFormat       = FORMAT_OPTIONS.find(f => f.id === format) ?? FORMAT_OPTIONS[0];
  const selFilter       = DELETED_FILTERS.find(f => f.id === deletedFilter) ?? DELETED_FILTERS[0];
  const selStrat        = CONFLICT_STRATEGIES.find(cs => cs.id === conflictStrategy) ?? CONFLICT_STRATEGIES[0];
  const sensitiveGroups = selGroups.filter(g => g.warn?.includes('password') || g.warn?.includes('Sensitive'));
  const largeGroups     = selGroups.filter(g => g.warn?.includes('large'));

  // ─── Step wizard ───────────────────────────────────

  const EXPORT_LABELS = ['Select Data', 'Format & Range', 'Review'];
  const IMPORT_LABELS = ['Strategy', 'Upload File', 'Preview'];

  const renderWizard = (curr, labels) => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, padding: '0 4px' }}>
      {[1, 2, 3].map((n, i) => {
        const s = sv(n, curr);
        return (
          <Fragment key={n}>
            {i > 0 && <div style={{ flex: 1, height: 1, margin: '0 10px', marginBottom: 15, background: curr > i ? 'var(--success)' : 'var(--border)' }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: s.bg, color: s.color, boxShadow: s.ring, transition: 'all 0.25s' }}>
                {s.text}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: s.labelColor }}>
                {labels[i]}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );

  // ─── Export step 1 ─────────────────────────────────

  const renderExportStep1 = () => (
    <div>
      <div className="stoq-panel" style={{ marginBottom: 10 }}>
        <div className="stoq-panel__head">
          <span className="stoq-panel__title">Data Groups</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="stoq-badge stoq-badge--accent" style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 500 }}>{groups.length}/8 selected</span>
            <button className="stoq-btn stoq-btn--sm" onClick={() => setGroups(EXPORT_GROUPS.map(g => g.id))}>All</button>
            <button className="stoq-btn stoq-btn--sm" onClick={() => setGroups([])}>None</button>
          </div>
        </div>
        {/* Core Inventory — always included */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 14px', background: 'var(--bg-sunk)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--success)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <svg width="8" height="7" viewBox="0 0 8 7" fill="none"><path d="M1 3.5l2.5 2.5 3.5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>Core Inventory</span>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)', marginLeft: 6 }}>always included</span>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>Worker Categories, Categories, Units, Suppliers, Sites, Stocks, Stock Suppliers</div>
          </div>
        </div>
        {EXPORT_GROUPS.map(g => {
          const c = groups.includes(g.id);
          return (
            <div
              key={g.id}
              onClick={() => setGroups(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: c ? 'var(--accent-soft)' : 'transparent', transition: 'background 0.1s' }}
            >
              <Checkbox checked={c} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{g.label}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{g.desc}</div>
              </div>
              {g.warn && (
                <span className="stoq-badge stoq-badge--warning" style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 500 }}>{g.warn}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="stoq-panel">
        <div className="stoq-panel__head">
          <span className="stoq-panel__title">Record Filter</span>
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Applies to stocks and employees</span>
        </div>
        <div style={{ padding: 14 }}>
          {DELETED_FILTERS.map(f => {
            const sel = deletedFilter === f.id;
            return (
              <div key={f.id} onClick={() => setDeletedFilter(f.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 'var(--r-sm)', cursor: 'pointer', border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'var(--accent-soft)' : 'transparent', marginBottom: 6 }}>
                <div style={{ marginTop: 1 }}><Dot checked={sel} /></div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── Export step 2 ─────────────────────────────────

  const renderExportStep2 = () => (
    <div>
      <div className="stoq-panel" style={{ marginBottom: 10 }}>
        <div className="stoq-panel__head"><span className="stoq-panel__title">Export Format</span></div>
        <div style={{ padding: 14 }}>
          {FORMAT_OPTIONS.map(opt => {
            const sel = format === opt.id;
            return (
              <div key={opt.id} onClick={() => setFormat(opt.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 'var(--r-sm)', cursor: 'pointer', border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'var(--accent-soft)' : 'transparent', marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, flexShrink: 0, background: opt.iconBg, color: opt.iconColor }}>
                  {opt.mono}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{opt.desc}</div>
                </div>
                <div style={{ marginTop: 2 }}><Dot checked={sel} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="stoq-panel">
        <div className="stoq-panel__head">
          <span className="stoq-panel__title">Date Range</span>
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>optional — applies to Stock Movements, Requisitions, Activity Logs</span>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 5 }}>From</div>
              <input type="date" className="stoq-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 5 }}>To</div>
              <input type="date" className="stoq-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Export step 3 (review) ────────────────────────

  const renderExportStep3 = () => (
    <div className="stoq-panel">
      <div className="stoq-panel__head"><span className="stoq-panel__title">Review Export</span></div>
      <div style={{ display: 'grid', gap: 1, background: 'var(--border)' }}>
        <div style={{ background: 'var(--bg)', padding: '12px 16px', display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 3 }}>Data Groups</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
              {groups.length === 0 ? 'Core Inventory only' : `Core Inventory + ${groups.length} more (${selGroups.map(g => g.label).join(', ')})`}
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--bg)', padding: '12px 16px', display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 3 }}>Format</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{selFormat.label}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 3 }}>Records</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{selFilter.label}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 3 }}>Date Range</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
              {(dateFrom || dateTo) ? `${dateFrom || '—'} → ${dateTo || '—'}` : 'All dates'}
            </div>
          </div>
        </div>
      </div>
      {sensitiveGroups.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--warning-soft)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1, color: 'var(--warning)' }}><path d="M7 1.5L13.1 12H.9L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M7 6v2.5M7 10v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <p style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 500, lineHeight: 1.5 }}>
            Includes sensitive data: {sensitiveGroups.map(g => g.label).join(', ')}. Export will contain hashed passwords.
          </p>
        </div>
      )}
      {largeGroups.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-sunk)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1, color: 'var(--fg-subtle)' }}><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" /><path d="M7 4.5v3M7 8.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <p style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 500, lineHeight: 1.5 }}>
            {largeGroups.map(g => g.label).join(', ')} can produce very large files.
          </p>
        </div>
      )}
      {exportError && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12 }}>
          {exportError}
        </div>
      )}
    </div>
  );

  // ─── Export done ───────────────────────────────────

  const renderExportDone = () => (
    <div className="stoq-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)', marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="var(--success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>Export complete</div>
      <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 20 }}>
        {groups.length + 1} data group{groups.length + 1 !== 1 ? 's' : ''} exported as {selFormat.label}
      </div>
      <button className="stoq-btn" onClick={resetExport}>New export</button>
    </div>
  );

  // ─── Import step 1 (strategy) ──────────────────────

  const renderImportStep1 = () => (
    <div className="stoq-panel">
      <div className="stoq-panel__head">
        <span className="stoq-panel__title">Import Strategy</span>
        <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>What happens when a record already exists?</span>
      </div>
      <div style={{ padding: 14 }}>
        {CONFLICT_STRATEGIES.map(strat => {
          const sel = conflictStrategy === strat.id;
          return (
            <div key={strat.id} onClick={() => setConflictStrategy(strat.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 'var(--r-sm)', cursor: 'pointer', border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'var(--accent-soft)' : 'transparent', marginBottom: 6 }}>
              <div style={{ marginTop: 3 }}><Dot checked={sel} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{strat.label}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 7px', borderRadius: 4, fontSize: 10, fontWeight: 500, background: strat.badgeBg, color: strat.badgeColor, whiteSpace: 'nowrap' }}>
                    {strat.badge}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1.5 }}>{strat.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Import step 2 (upload) ────────────────────────

  const renderImportStep2 = () => (
    <div className="stoq-panel">
      <div className="stoq-panel__head">
        <span className="stoq-panel__title">Upload File</span>
        <button className="stoq-btn stoq-btn--sm" onClick={downloadCsvTemplate}>CSV Template</button>
      </div>
      <div style={{ padding: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 14, lineHeight: 1.6 }}>
          Upload a <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-sunk)', padding: '1px 4px', borderRadius: 3 }}>.json</code> backup to restore system data, or a <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-sunk)', padding: '1px 4px', borderRadius: 3 }}>.csv</code> / <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-sunk)', padding: '1px 4px', borderRadius: 3 }}>.xlsx</code> file to bulk-import stock items.
        </p>
        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            style={{ borderRadius: 'var(--r-md)', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', border: drag ? '2px dashed var(--accent)' : '2px dashed var(--border)', background: drag ? 'var(--accent-soft)' : 'var(--bg-sunk)' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--accent-soft)', color: 'var(--accent)', marginBottom: 12 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 13V5M7 8l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 14a4 4 0 00-4-4H3a4 4 0 000 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Drop file here or click to browse</div>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>.json backup &nbsp;·&nbsp; .csv / .xlsx stock file</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-sunk)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--success)' }}>
              {file.name.split('.').pop()?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{(file.size / 1024).toFixed(1)} KB · {fileType === 'csv' ? 'Stock spreadsheet' : 'JSON backup'}</div>
            </div>
            <button className="stoq-btn stoq-btn--sm" onClick={() => { setFile(null); setPreview(null); setPreviewError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Remove</button>
          </div>
        )}
        {previewError && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12 }}>
            {previewError}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".json,.csv,.xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} style={{ display: 'none' }} />
      </div>
    </div>
  );

  // ─── Import step 3 (preview) ───────────────────────

  const renderImportStep3 = () => {
    if (preview?._type === 'csv') {
      const STATUS_STYLE = {
        new:     { bg: 'var(--success-soft)', color: 'var(--success)',  label: 'New' },
        exists:  { bg: 'var(--warning-soft)', color: 'var(--warning)',  label: 'Exists' },
        invalid: { bg: 'var(--danger-soft)',  color: 'var(--danger)',   label: 'Invalid' },
      };
      return (
        <div className="stoq-panel">
          <div className="stoq-panel__head">
            <span className="stoq-panel__title">Stock Import Preview</span>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{file?.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
            {[
              { label: 'Total rows',    value: preview.total,        color: 'var(--fg)' },
              { label: 'Will create',   value: preview.newCount,     color: 'var(--success)' },
              { label: 'Already exists',value: preview.existsCount,  color: 'var(--warning)' },
              { label: 'Invalid',       value: preview.invalidCount, color: 'var(--danger)' },
            ].map((k, i) => (
              <div key={i} style={{ flex: 1, padding: '12px 14px', borderRight: i < 3 ? '1px solid var(--border)' : 'none', background: 'var(--bg-sunk)' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontFamily: 'var(--font-mono)' }}>{k.value}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{k.label}</div>
              </div>
            ))}
          </div>
          {previewLoading && <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: 'var(--fg-subtle)' }}>Analysing file…</div>}
          {!previewLoading && preview.rows?.length > 0 && (
            <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sunk)' }}>
                    {['SKU', 'Item Name', 'Unit', 'Category', 'Qty', 'Type', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Qty' ? 'right' : 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', padding: '9px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => {
                    const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.new;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: r.status === 'exists' ? 0.6 : 1 }}>
                        <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg)', whiteSpace: 'nowrap' }}>{r.sku || '—'}</td>
                        <td style={{ padding: '8px 14px', fontSize: 12, color: 'var(--fg)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.itemName || '—'}</td>
                        <td style={{ padding: '8px 14px', fontSize: 11, color: 'var(--fg-subtle)' }}>{r.unit || '—'}</td>
                        <td style={{ padding: '8px 14px', fontSize: 11, color: 'var(--fg-subtle)' }}>{r.categoryName || '—'}</td>
                        <td style={{ padding: '8px 14px', fontSize: 11, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{r.quantity}</td>
                        <td style={{ padding: '8px 14px', fontSize: 11, color: 'var(--fg-subtle)' }}>{r.stockType || 'MATERIAL'}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--r-sm)', background: s.bg, color: s.color, fontSize: 10, fontWeight: 700 }}>
                            {r.reason ?? s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {importError && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12 }}>
              {importError}
            </div>
          )}
        </div>
      );
    }

    const entityKeys = preview ? Object.keys(preview.wouldCreate ?? {}) : [];
    const detectedGroups = preview?.detectedGroups ?? [];
    const activeGroups = importGroups ?? detectedGroups;

    return (
      <div className="stoq-panel">
        <div className="stoq-panel__head">
          <span className="stoq-panel__title">Import Preview</span>
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>"{selStrat.label}"</span>
        </div>

        {/* Group filter chips */}
        {!previewLoading && !previewError && preview && detectedGroups.length > 0 && (
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-sunk)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>Import Groups</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {detectedGroups.map(g => {
                const active = activeGroups.includes(g);
                return (
                  <button key={g} onClick={() => toggleImportGroup(g)} style={{ border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-soft)' : 'transparent', color: active ? 'var(--accent)' : 'var(--fg-subtle)', borderRadius: 'var(--r-sm)', padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    {GROUP_LABELS[g] ?? g}
                  </button>
                );
              })}
            </div>
            {activeGroups.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 6 }}>Select at least one group to import.</p>
            )}
          </div>
        )}

        {previewLoading && <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: 'var(--fg-subtle)' }}>Analysing file…</div>}
        {!previewLoading && previewError && <div style={{ padding: '16px', color: 'var(--danger)', fontSize: 12 }}>{previewError}</div>}
        {!previewLoading && !previewError && preview && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sunk)' }}>
                  <th style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', padding: '9px 14px' }}>Entity</th>
                  <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--success)', textTransform: 'uppercase', padding: '9px 14px' }}>Create</th>
                  <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase', padding: '9px 14px' }}>Update</th>
                  <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--warning)', textTransform: 'uppercase', padding: '9px 14px' }}>Skip</th>
                </tr>
              </thead>
              <tbody>
                {entityKeys.map(key => {
                  const c = preview.wouldCreate?.[key] ?? 0;
                  const u = preview.wouldUpdate?.[key] ?? 0;
                  const s = preview.wouldSkip?.[key] ?? 0;
                  if (c === 0 && u === 0 && s === 0) return null;
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, textAlign: 'right', fontFamily: 'var(--font-mono)', color: c > 0 ? 'var(--success)' : 'var(--border)' }}>{c > 0 ? `+${c}` : '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, textAlign: 'right', fontFamily: 'var(--font-mono)', color: u > 0 ? 'var(--accent)' : 'var(--border)' }}>{u > 0 ? `↑${u}` : '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, textAlign: 'right', fontFamily: 'var(--font-mono)', color: s > 0 ? 'var(--warning)' : 'var(--border)' }}>{s > 0 ? s : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-sunk)' }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, marginTop: 1, color: 'var(--fg-subtle)' }}><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" /><path d="M6.5 4.5v3M6.5 8.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <p style={{ fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1.5 }}>Audit records (stock history, activity logs) are never overwritten regardless of strategy.</p>
        </div>
        {importError && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12 }}>
            {importError}
          </div>
        )}
      </div>
    );
  };

  // ─── Import done ───────────────────────────────────

  const renderImportDone = () => (
    <div>
      <div className="stoq-panel" style={{ padding: '48px 24px', textAlign: 'center', marginBottom: results ? 10 : 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)', marginBottom: 16 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="var(--success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>Import complete</div>
        <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 20 }}>
          {fileType === 'csv' ? `Stock items imported from ${file?.name}` : `Data restored using "${selStrat.label}"`}
        </div>
        <button className="stoq-btn" onClick={resetImport}>Import another file</button>
      </div>
      {results && (
        <div className="stoq-panel" style={{ overflow: 'hidden' }}>
          <div className="stoq-panel__head">
            <span className="stoq-panel__title">Results</span>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
              {[
                results.summary.created > 0 && `${results.summary.created} created`,
                results.summary.updated > 0 && `${results.summary.updated} updated`,
                results.summary.skipped > 0 && `${results.summary.skipped} skipped`,
                results.summary.failed  > 0 && `${results.summary.failed} failed`,
              ].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div style={{ padding: 14 }}>
            {results.results.map((r, i) => <ResultRow key={i} r={r} />)}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Render ────────────────────────────────────────

  return (
    <div style={{ padding: '24px 24px 60px' }}>
      {/* Page head */}
      <div className="page-head">
        <div>
          <h1>Data Export &amp; Import</h1>
          <div className="page-head__sub">Export system data for backup or reporting. Import a JSON backup to restore data.</div>
        </div>
        <div className="page-head__actions">
          <div className="stoq-segment">
            <button data-active={String(tab === 'export')} onClick={() => setTab('export')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.5v7M3.5 6.5l2.5 2 2.5-2M1.5 10.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Export
            </button>
            <button data-active={String(tab === 'import')} onClick={() => { setTab('import'); if (!history) loadHistory(); }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 8.5v-7M3.5 5.5l2.5-2 2.5 2M1.5 10.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Step wizard */}
      {!isDone && renderWizard(curStep, isExport ? EXPORT_LABELS : IMPORT_LABELS)}

      {/* Tab content */}
      {isExport ? (
        exportDone    ? renderExportDone()  :
        exportStep === 1 ? renderExportStep1() :
        exportStep === 2 ? renderExportStep2() :
                           renderExportStep3()
      ) : (
        importDone    ? renderImportDone()  :
        importStep === 1 ? renderImportStep1() :
        importStep === 2 ? renderImportStep2() :
                           renderImportStep3()
      )}

      {/* Nav footer */}
      {!isDone && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <button className="stoq-btn" onClick={handleBack} style={{ visibility: curStep > 1 ? 'visible' : 'hidden' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
          <button className="stoq-btn stoq-btn--primary" onClick={handleNext} disabled={nextDisabled}>
            {nextLabel}
            {curStep < 3 && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </button>
        </div>
      )}

      {/* ── Import History ── */}
      {!isExport && (
        <div className="stoq-panel" style={{ marginTop: 24 }}>
          <div className="stoq-panel__head">
            <span className="stoq-panel__title">Import History</span>
            <button className="stoq-btn stoq-btn--sm" onClick={loadHistory} disabled={historyLoading}>
              {historyLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {historyLoading && <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--fg-subtle)' }}>Loading…</div>}
          {history && history.length === 0 && <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--fg-subtle)' }}>No imports recorded yet.</div>}
          {history && history.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sunk)' }}>
                    {['Date', 'File', 'Strategy', 'Created', 'Updated', 'Skipped', 'Status', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(snap => (
                    <tr key={snap.id} style={{ borderBottom: '1px solid var(--border)', opacity: snap.status === 'rolled_back' ? 0.55 : 1 }}>
                      <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>{new Date(snap.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--fg)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={snap.fileName}>{snap.fileName}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--fg-subtle)' }}>{snap.strategy}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 600 }}>{snap.summary?.created > 0 ? `+${snap.summary.created}` : '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{snap.summary?.updated > 0 ? `↑${snap.summary.updated}` : '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}>{snap.summary?.skipped > 0 ? snap.summary.skipped : '—'}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--r-sm)', fontSize: 10, fontWeight: 700, background: snap.status === 'rolled_back' ? 'var(--bg-sunk)' : 'var(--success-soft)', color: snap.status === 'rolled_back' ? 'var(--fg-subtle)' : 'var(--success)' }}>
                          {snap.status === 'rolled_back' ? 'Rolled back' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        {snap.status === 'active' && snap.summary?.created > 0 && (
                          <button className="stoq-btn stoq-btn--sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => { setRollbackTarget(snap); setRollbackError(''); }}>
                            Rollback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Rollback confirmation dialog ── */}
      {rollbackTarget && (
        <div className="stoq-modal-backdrop" onClick={() => !rollbackLoading && setRollbackTarget(null)}>
          <div className="stoq-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg)', marginBottom: 8 }}>Rollback this import?</div>
            <p style={{ fontSize: 12, color: 'var(--fg-subtle)', lineHeight: 1.6, marginBottom: 12 }}>
              This will permanently delete the <strong style={{ color: 'var(--danger)' }}>{rollbackTarget.summary?.created} records</strong> created by the import of <strong>"{rollbackTarget.fileName}"</strong> on {new Date(rollbackTarget.createdAt).toLocaleString()}.
              Records that were <em>updated</em> (not created) are not reverted.
            </p>
            {rollbackError && (
              <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12 }}>{rollbackError}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="stoq-btn stoq-btn--sm" onClick={() => setRollbackTarget(null)} disabled={rollbackLoading}>Cancel</button>
              <button className="stoq-btn stoq-btn--sm" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }} onClick={confirmRollback} disabled={rollbackLoading}>
                {rollbackLoading ? 'Rolling back…' : 'Yes, rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
