import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ArrowLeftRight, ChevronDown, Search, Check, X,
  LogOut, LogIn, Info, AlertTriangle, PackageX, RefreshCw,
} from 'lucide-react';
import siteService from '../../../services/siteService';
import stockService from '../../../services/stockService';
import stockMigrationService from '../../../services/stockMigrationService';
import { useRole } from '../../../hooks/useRole';
import { loadDraft, clearDraft, useFormDraft } from '../../../hooks/useFormDraft';

const fmtQty = (n) => Number(n ?? 0).toLocaleString();
const initials = (name) => (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const getAvailable = (stock) => stock.stockType === 'EQUIPMENT' ? stock.quantity - stock.quantityOut : stock.quantity;

/* ── Buttons ──────────────────────────────────────────────────────────── */
const BTN = 'inline-flex items-center gap-1.5 cursor-pointer text-[12.5px] font-medium px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-800 shadow-sm transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-300 hover:bg-slate-50 active:translate-y-px [&>svg]:w-3.5 [&>svg]:h-3.5';
const BTN_PRIMARY = 'bg-blue-600 border-blue-600 text-white shadow-[0_1px_2px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:border-blue-700';
const BTN_GHOST = 'bg-transparent border-transparent shadow-none text-slate-500 hover:bg-slate-100 hover:text-slate-900';
const BTN_ICON = 'p-1.5 [&>svg]:w-[15px] [&>svg]:h-[15px]';

function Btn({ primary, ghost, icon, sm, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`${BTN} ${primary ? BTN_PRIMARY : ''} ${ghost ? BTN_GHOST : ''} ${icon ? BTN_ICON : ''} ${sm ? 'px-2.5 py-1 text-xs gap-1' : ''} ${className}`}
      {...props}
    />
  );
}

/* ── Checkbox ─────────────────────────────────────────────────────────── */
function Cbx({ state }) {
  const on = state === 'on' || state === 'partial';
  return (
    <span className={`w-[17px] h-[17px] rounded-[5px] border-[1.5px] flex-none grid place-items-center text-white transition-colors ${on ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
      {state === 'on' && <Check className="w-3 h-3" />}
      {state === 'partial' && <span className="w-2 h-0.5 bg-white rounded-sm" />}
    </span>
  );
}

function Avatar({ name, tone = 'blue' }) {
  const grad = tone === 'green' ? 'from-green-600 to-green-800' : tone === 'gray' ? 'from-slate-300 to-slate-400' : 'from-blue-500 to-blue-700';
  return (
    <span className={`w-8 h-8 rounded-lg flex-none bg-gradient-to-br ${grad} text-white grid place-items-center font-semibold text-xs tracking-tight`}>
      {initials(name)}
    </span>
  );
}

/* ── Site picker (native select, styled) ─────────────────────────────── */
function SitePicker({ value, onChange, exclude, sites }) {
  return (
    <div className="relative flex items-center">
      <select
        className="appearance-none w-full cursor-pointer text-[14.5px] font-semibold tracking-tight text-slate-900 pl-3 pr-9 py-2 border border-slate-200 rounded-lg bg-slate-50 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— Select site —</option>
        {sites.map(s => (
          <option key={s.id} value={s.id} disabled={s.id === exclude}>
            {s.name}{s.id === exclude ? '  (already selected)' : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 w-[15px] h-[15px] text-slate-400 pointer-events-none" />
    </div>
  );
}

/* ── Roster rows ──────────────────────────────────────────────────────── */
function SourceRow({ stock, selected, qty, onToggle, onQtyChange }) {
  const available = getAvailable(stock);
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50 ${selected ? 'bg-blue-50 hover:bg-blue-100/60' : ''}`}
      onClick={onToggle}
    >
      <Cbx state={selected ? 'on' : 'off'} />
      <Avatar name={stock.itemName} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-slate-900 truncate">{stock.itemName}</div>
        <div className="font-mono text-[11px] text-slate-500 mt-0.5">{stock.sku}{stock.stockType === 'EQUIPMENT' ? ' · equipment' : ''}</div>
      </div>
      <div onClick={e => e.stopPropagation()} className="flex flex-col items-end ml-auto">
        <input
          type="number" min="0.01" step="0.01" max={available} value={qty}
          onChange={e => onQtyChange(e.target.value)}
          onFocus={() => !selected && onToggle()}
          className={`w-16 flex-none font-mono text-xs text-right px-1.5 py-1 rounded-md outline-none transition-colors focus:border-blue-500 focus:ring-3 focus:ring-blue-100 ${selected ? 'bg-white border border-slate-200' : 'bg-transparent border border-transparent text-slate-400'}`}
        />
        <span className="text-[10.5px] text-slate-400 mt-0.5">of {fmtQty(available)} {stock.unit}</span>
      </div>
    </div>
  );
}

function IncomingRow({ item, onUndo }) {
  return (
    <div className="relative flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0 bg-green-50">
      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-green-600" />
      <Avatar name={item.itemName} tone="green" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-slate-900 truncate">{item.itemName}</div>
        <div className="font-mono text-[11px] text-slate-500 mt-0.5">{item.sku}</div>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md bg-green-100 text-green-700 ml-auto whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />{fmtQty(item.quantity)} {item.unit}
      </span>
      <Btn ghost icon sm title="Move back" onClick={onUndo}><X /></Btn>
    </div>
  );
}

function LockedRow({ stock }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0 opacity-85">
      <Avatar name={stock.itemName} tone="gray" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-slate-900 truncate">{stock.itemName}</div>
        <div className="font-mono text-[11px] text-slate-500 mt-0.5">{stock.sku}</div>
      </div>
      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-500 ml-auto whitespace-nowrap">
        {fmtQty(stock.quantity)} {stock.unit} here
      </span>
    </div>
  );
}

function Empty({ title, sub }) {
  return (
    <div className="text-center py-8 px-4">
      <PackageX className="w-6 h-6 text-slate-200 mx-auto mb-2" />
      <div className="text-[12.5px] text-slate-500 font-medium">{title}</div>
      <div className="text-[11.5px] text-slate-300 mt-0.5">{sub}</div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function MigrateStock() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { path } = useRole();
  const draftKey = `migrate-stock-${siteId}`;
  const draft = loadDraft(draftKey);

  const [sites, setSites] = useState([]);
  const [sourceSiteId, setSourceSiteId] = useState(siteId);
  const [targetSiteId, setTargetSiteId] = useState(draft?.targetSiteId ?? '');
  const [sourceStocks, setSourceStocks] = useState([]);
  const [targetStocks, setTargetStocks] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selected, setSelected] = useState({}); // { stockId: qty }
  const [staged, setStaged] = useState(draft?.staged ?? []);
  const [qSrc, setQSrc] = useState('');
  const [qTgt, setQTgt] = useState('');
  const [instant, setInstant] = useState(draft?.instant ?? true);
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);

  useFormDraft(draftKey, { staged, instant, notes, targetSiteId }, !loadingData);

  const toast = (msg, ok = true) => {
    const tid = Date.now() + Math.random();
    setToasts(t => [...t, { id: tid, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== tid)), 2800);
  };

  useEffect(() => {
    siteService.getAll().then(d => setSites(d.sites || d || [])).catch(() => {}).finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    if (!sourceSiteId) { setSourceStocks([]); return; }
    stockService.getAll({ siteId: sourceSiteId, limit: 200 }).then(d => setSourceStocks(d.stocks || [])).catch(() => {});
  }, [sourceSiteId]);

  useEffect(() => {
    if (!targetSiteId) { setTargetStocks([]); return; }
    stockService.getAll({ siteId: targetSiteId, limit: 200 }).then(d => setTargetStocks(d.stocks || [])).catch(() => {});
  }, [targetSiteId]);

  const sourceSite = sites.find(s => s.id === sourceSiteId);
  const targetSite = sites.find(s => s.id === targetSiteId);

  const resetTransfer = () => { setSelected({}); setStaged([]); };
  const changeSource = (id) => { if (id === targetSiteId) return; setSourceSiteId(id); resetTransfer(); };
  const changeTarget = (id) => { if (id === sourceSiteId) return; setTargetSiteId(id); resetTransfer(); };

  const sourceVisible = sourceStocks.filter(s => !staged.some(st => st.stockId === s.id) && getAvailable(s) > 0);
  const fSource = sourceVisible.filter(s => s.itemName.toLowerCase().includes(qSrc.toLowerCase()));
  const allSelected = fSource.length > 0 && fSource.every(s => selected[s.id] != null);
  const someSelected = fSource.some(s => selected[s.id] != null);

  const toggleOne = (stock) => setSelected(prev => {
    const next = { ...prev };
    if (next[stock.id] != null) delete next[stock.id];
    else next[stock.id] = getAvailable(stock);
    return next;
  });
  const toggleAll = () => setSelected(prev => {
    const next = { ...prev };
    if (allSelected) fSource.forEach(s => delete next[s.id]);
    else fSource.forEach(s => { next[s.id] = getAvailable(s); });
    return next;
  });
  const setQty = (stockId, val) => setSelected(prev => ({ ...prev, [stockId]: val }));

  const moveToTarget = () => {
    const ids = Object.keys(selected);
    if (!ids.length) return;
    const additions = ids.map(id => {
      const stock = sourceStocks.find(s => s.id === id);
      const qty = Math.max(0, Math.min(Number(selected[id]) || 0, getAvailable(stock)));
      return { stockId: id, itemName: stock.itemName, sku: stock.sku, unit: stock.unit, quantity: qty, stockType: stock.stockType };
    }).filter(it => it.quantity > 0);
    setStaged(st => [...st, ...additions]);
    setSelected({});
  };
  const undoOne = (stockId) => setStaged(st => st.filter(x => x.stockId !== stockId));

  const stagedFiltered = staged.filter(it => it.itemName.toLowerCase().includes(qTgt.toLowerCase()));
  const targetExistingFiltered = targetStocks.filter(s => s.itemName.toLowerCase().includes(qTgt.toLowerCase()));

  const anyFullyDepleted = staged.some(it => {
    const stock = sourceStocks.find(s => s.id === it.stockId);
    return stock && it.quantity >= getAvailable(stock);
  });

  const commit = async () => {
    setSubmitting(true);
    const results = { ok: [], failed: [] };
    for (const item of staged) {
      try {
        await stockMigrationService.initiate({
          stockId: item.stockId,
          destinationSiteId: targetSiteId,
          quantity: item.quantity,
          notes: notes || undefined,
          instant,
        });
        results.ok.push(item.itemName);
      } catch (err) {
        results.failed.push({ name: item.itemName, msg: err.response?.data?.message || 'Failed' });
      }
    }
    setSubmitting(false);

    if (results.failed.length === 0) {
      clearDraft(draftKey);
      setShowConfirm(false);
      resetTransfer();
      toast(`${results.ok.length} item${results.ok.length !== 1 ? 's' : ''} ${instant ? 'migrated' : 'dispatched'} to ${targetSite?.name}`, true);
      stockService.getAll({ siteId: sourceSiteId, limit: 200 }).then(d => setSourceStocks(d.stocks || [])).catch(() => {});
      stockService.getAll({ siteId: targetSiteId, limit: 200 }).then(d => setTargetStocks(d.stocks || [])).catch(() => {});
    } else if (results.ok.length > 0) {
      setStaged(st => st.filter(it => results.failed.some(f => f.name === it.itemName)));
      setShowConfirm(false);
      toast(`${results.ok.length} succeeded, ${results.failed.length} failed — fix and retry`, false);
    } else {
      toast(results.failed.map(f => `${f.name}: ${f.msg}`).join(' · '), false);
    }
  };

  if (loadingData) return (
    <div className="flex items-center justify-center min-h-[50vh] gap-2.5 text-slate-500">
      <RefreshCw className="w-5 h-5 animate-spin" /> Loading sites…
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 text-[13px] leading-[1.45]">
      <div className="w-full px-6 py-5 pb-24">
        {/* Page head */}
        <div className="flex items-start gap-4 mb-5 flex-wrap">
          <Btn ghost icon onClick={() => navigate(path('/sites/' + siteId) + '?tab=migrations')}><ArrowLeft /></Btn>
          <div>
            <div className="text-[11px] font-semibold tracking-wider uppercase text-blue-600 mb-1">Stock Administration</div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 m-0">Migrate Stock</h1>
            <div className="text-slate-500 mt-1 text-[12.5px]">Move stock from one site to another. Select items on the left, transfer them, then review &amp; confirm.</div>
          </div>
        </div>

        {/* Migration grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_76px_1fr] gap-0 items-stretch">
          {/* SOURCE */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="text-[10.5px] font-bold tracking-wider uppercase text-slate-400 mb-2 flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Migrate from</div>
              <SitePicker value={sourceSiteId} onChange={changeSource} exclude={targetSiteId} sites={sites} />
              {sourceSite && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700">{sourceSite.status}</span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600">{sourceSite.location}</span>
                  <span className="ml-auto text-xs text-slate-500"><b className="font-mono text-slate-900 font-semibold">{sourceVisible.length}</b> item{sourceVisible.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  placeholder="Search stock…" value={qSrc} onChange={e => setQSrc(e.target.value)}
                  className="w-full text-[12.5px] text-slate-800 pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-md bg-white outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                />
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer whitespace-nowrap select-none" onClick={toggleAll}>
                <Cbx state={allSelected ? 'on' : someSelected ? 'partial' : 'off'} />
                {allSelected ? 'Clear' : 'All'}
              </label>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[460px] min-h-[240px]">
              {fSource.length ? fSource.map(s => (
                <SourceRow key={s.id} stock={s} selected={selected[s.id] != null} qty={selected[s.id] ?? getAvailable(s)}
                  onToggle={() => toggleOne(s)} onQtyChange={v => setQty(s.id, v)} />
              )) : (
                <Empty
                  title={qSrc ? 'No matches' : 'No stock available to migrate'}
                  sub={qSrc ? 'Try a different search' : 'Everything has been staged or this site has no stock'}
                />
              )}
            </div>
          </div>

          {/* TRANSFER */}
          <div className="flex flex-row lg:flex-col items-center justify-center gap-4 lg:gap-3 px-0 lg:px-1.5 py-3.5 lg:py-0">
            <span className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-slate-300 lg:[writing-mode:vertical-rl] lg:[text-orientation:mixed]">Transfer</span>
            <div className="flex flex-row lg:flex-col items-center gap-2.5">
              <button type="button"
                className="w-[46px] h-[46px] rounded-full border border-blue-600 bg-blue-600 text-white grid place-items-center cursor-pointer shadow-[0_2px_8px_rgba(37,99,235,0.3)] transition-all enabled:hover:bg-blue-700 enabled:hover:scale-[1.06] enabled:active:scale-95 disabled:bg-white disabled:border-slate-200 disabled:text-slate-300 disabled:shadow-none disabled:cursor-not-allowed [&>svg]:w-5 [&>svg]:h-5"
                disabled={!Object.keys(selected).length} onClick={moveToTarget} title="Move selected to destination"><ArrowRight /></button>
              <button type="button"
                className="w-[38px] h-[38px] rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm grid place-items-center cursor-pointer transition-all enabled:hover:bg-slate-50 enabled:hover:border-slate-300 enabled:hover:text-slate-900 disabled:text-slate-300 disabled:cursor-not-allowed [&>svg]:w-[17px] [&>svg]:h-[17px]"
                disabled={!staged.length} onClick={() => setStaged([])} title="Move all back"><ArrowLeft /></button>
            </div>
            <span className="font-mono text-[11px] font-semibold text-blue-700 min-h-[14px]">{Object.keys(selected).length ? `${Object.keys(selected).length} selected` : staged.length ? `${staged.length} staged` : ''}</span>
          </div>

          {/* TARGET */}
          <div className="bg-white border border-blue-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="text-[10.5px] font-bold tracking-wider uppercase text-blue-600 mb-2 flex items-center gap-1.5"><LogIn className="w-3.5 h-3.5" /> Migrate to</div>
              <SitePicker value={targetSiteId} onChange={changeTarget} exclude={sourceSiteId} sites={sites} />
              {targetSite && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700">{targetSite.status}</span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600">{targetSite.location}</span>
                  <span className="ml-auto text-xs text-slate-500">
                    <b className="font-mono text-slate-900 font-semibold">{targetStocks.length + staged.length}</b> item{(targetStocks.length + staged.length) !== 1 ? 's' : ''}
                    {staged.length ? <span className="text-green-700 font-semibold"> · +{staged.length}</span> : null}
                  </span>
                </div>
              )}
            </div>
            <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  placeholder="Search destination…" value={qTgt} onChange={e => setQTgt(e.target.value)}
                  className="w-full text-[12.5px] text-slate-800 pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-md bg-white outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
                />
              </div>
            </div>
            {!targetSiteId ? (
              <div className="flex-1 grid place-items-center min-h-[240px]"><Empty title="Choose a destination site" sub="Pick where this stock should go" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[460px] min-h-[240px]">
                {stagedFiltered.map(it => <IncomingRow key={it.stockId} item={it} onUndo={() => undoOne(it.stockId)} />)}
                {targetExistingFiltered.map(s => <LockedRow key={s.id} stock={s} />)}
                {(stagedFiltered.length + targetExistingFiltered.length) === 0 && (
                  <Empty title={qTgt ? 'No matches' : 'No stock here yet'} sub={qTgt ? 'Try a different search' : 'Transfer items here to populate it'} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_18px_rgba(0,0,0,0.06)] transition-transform duration-300 ${staged.length ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-full px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[10px] bg-blue-600 text-white grid place-items-center font-mono text-[17px] font-semibold flex-none shadow-sm">{staged.length}</div>
            <div>
              <div className="text-[13px] font-semibold text-slate-900">{staged.length} item{staged.length !== 1 ? 's' : ''} ready to migrate</div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span className="font-mono text-slate-700">{sourceSite?.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="font-mono text-slate-700">{targetSite?.name || '—'}</span>
              </div>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Btn onClick={() => setStaged([])}>Clear</Btn>
            <Btn primary disabled={!targetSiteId} onClick={() => setShowConfirm(true)}><ArrowLeftRight /> Review &amp; migrate</Btn>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm grid place-items-center p-6" onMouseDown={e => e.target === e.currentTarget && setShowConfirm(false)}>
          <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onMouseDown={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-start gap-3">
              <div className="w-[34px] h-[34px] rounded-lg bg-blue-50 text-blue-600 grid place-items-center flex-none [&>svg]:w-[17px] [&>svg]:h-[17px]"><ArrowLeftRight /></div>
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-slate-900">Confirm migration</div>
                <div className="text-xs text-slate-500 mt-0.5">{staged.length} item{staged.length !== 1 ? 's' : ''} will be moved between sites</div>
              </div>
              <Btn ghost icon className="ml-auto" onClick={() => setShowConfirm(false)}><X /></Btn>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-stretch gap-2.5">
                <div className="flex-1 border border-slate-200 rounded-lg p-3 bg-slate-50 min-w-0">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1.5">From</div>
                  <div className="text-[13.5px] font-semibold tracking-tight text-slate-900">{sourceSite?.name}</div>
                  <div className="text-[11.5px] text-slate-500 mt-1"><span className="font-mono text-slate-700">{sourceVisible.length}</span> item type{sourceVisible.length !== 1 ? 's' : ''} remaining</div>
                </div>
                <div className="grid place-items-center text-blue-600 flex-none w-7"><ArrowRight className="w-5 h-5" /></div>
                <div className="flex-1 border border-blue-100 rounded-lg p-3 bg-blue-50 min-w-0">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1.5">To</div>
                  <div className="text-[13.5px] font-semibold tracking-tight text-slate-900">{targetSite?.name}</div>
                  <div className="text-[11.5px] text-slate-500 mt-1"><span className="font-mono text-slate-700">{targetStocks.length + staged.length}</span> item type{(targetStocks.length + staged.length) !== 1 ? 's' : ''} after</div>
                </div>
              </div>

              <div className="mt-3.5 border border-slate-100 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10.5px] font-semibold tracking-wide uppercase text-slate-500 flex justify-between">
                  <span>Migrating</span><span>{staged.length}</span>
                </div>
                <div className="max-h-[168px] overflow-y-auto">
                  {staged.map(it => (
                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 last:border-b-0" key={it.stockId}>
                      <span className="w-[26px] h-[26px] rounded-[7px] flex-none bg-gradient-to-br from-blue-500 to-blue-700 text-white grid place-items-center font-semibold text-[11px]">{initials(it.itemName)}</span>
                      <span className="text-[12.5px] font-medium text-slate-800">{it.itemName}</span>
                      <span className="font-mono text-[10.5px] text-slate-500 ml-auto">{fmtQty(it.quantity)} {it.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[10.5px] font-bold tracking-wider uppercase text-slate-400 mb-2 mt-4">Transfer mode</div>
              <div className="flex gap-2">
                <button type="button"
                  className={`flex-1 text-left p-2.5 rounded-lg border-2 cursor-pointer transition-all ${instant ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
                  onClick={() => setInstant(true)}>
                  <div className={`text-[12.5px] font-semibold ${instant ? 'text-blue-700' : 'text-slate-900'}`}>Send now</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Both sites update immediately</div>
                </button>
                <button type="button"
                  className={`flex-1 text-left p-2.5 rounded-lg border-2 cursor-pointer transition-all ${!instant ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
                  onClick={() => setInstant(false)}>
                  <div className={`text-[12.5px] font-semibold ${!instant ? 'text-blue-700' : 'text-slate-900'}`}>Dispatch — confirm later</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Destination confirms receipt before stock lands</div>
                </button>
              </div>

              <div className="text-[10.5px] font-bold tracking-wider uppercase text-slate-400 mb-2 mt-4">Notes (optional)</div>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for transfer…" rows={2}
                className="w-full text-[12.5px] text-slate-800 px-2.5 py-2 border border-slate-200 rounded-lg bg-white outline-none resize-y min-h-[56px] focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
              />

              <div className="flex gap-2.5 p-3 rounded-lg text-xs leading-snug mt-3.5 bg-blue-50 text-blue-900">
                <Info className="w-[15px] h-[15px] flex-none mt-0.5 text-blue-600" />
                <div>
                  {instant
                    ? <>Stock leaves <b>{sourceSite?.name}</b> and lands at <b>{targetSite?.name}</b> immediately.</>
                    : <>Stock leaves <b>{sourceSite?.name}</b> now, but only counts as arrived once <b>{targetSite?.name}</b> confirms receipt.</>}
                </div>
              </div>
              {anyFullyDepleted && (
                <div className="flex gap-2.5 p-3 rounded-lg text-xs leading-snug mt-3.5 bg-amber-50 text-amber-700">
                  <AlertTriangle className="w-[15px] h-[15px] flex-none mt-0.5" />
                  <div>One or more items will be fully removed from <b>{sourceSite?.name}</b>'s stock after this migration.</div>
                </div>
              )}
            </div>
            <div className="p-3.5 px-4 border-t border-slate-100 flex gap-2 justify-end bg-slate-50">
              <Btn onClick={() => setShowConfirm(false)}>Cancel</Btn>
              <Btn primary disabled={submitting} onClick={commit}>
                {submitting ? <RefreshCw className="animate-spin" /> : <Check />} {submitting ? 'Migrating…' : `Migrate ${staged.length} item${staged.length !== 1 ? 's' : ''}`}
              </Btn>
            </div>
          </div>
        </div>
      )}

djsdjdsj
      {/* Toasts */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 items-center">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 text-white px-3.5 py-2 rounded-lg text-[12.5px] font-medium shadow-2xl ${t.ok ? 'bg-slate-900' : 'bg-red-700'}`}>
            <span className="grid place-items-center [&>svg]:w-[15px] [&>svg]:h-[15px]">{t.ok ? <Check /> : <Info />}</span>{t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
