/* ============================================================
   Class Migration — interactive prototype
   ============================================================ */
const { useState, useMemo, useRef } = React;

/* ---------- Icons ---------- */
const Ic = {
  migrate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M2 12h13M19 5l3 3-3 3M22 8H9"/></svg>,
  arrowR: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  arrowL: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>,
  chevDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  out: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  in: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>,
  empty: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
};

const initials = (n) => n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
let _sid = 1;
const S = (name) => ({ id: 's'+(_sid++), name, code: 'STU-2026-'+String(100+_sid).padStart(4,'0') });

/* ---------- Class data ---------- */
const CLASSES = [
  { id: 'b1a', code: 'B1-A', name: 'B1 · General German', level: 'B1', term: 'Spring 2026', schedule: 'Mon–Thu · Morning',
    students: ['Aline Uwase','Eric Mugisha','Chantal Iradukunda','Kevin Habimana','Diane Mukamana','Patrick Niyonshuti','Sandrine Ingabire','Olivier Bizimana','Grace Umutoni','Yves Ndayisaba','Clarisse Mukandayisenga','Fabrice Hakizimana'].map(S) },
  { id: 'b1b', code: 'B1-B', name: 'B1 · General German', level: 'B1', term: 'Spring 2026', schedule: 'Mon–Thu · Evening',
    students: ['Josiane Uwimana','Thierry Gatete','Marie Cyusa','Alexis Rugema'].map(S) },
  { id: 'b2a', code: 'B2-A', name: 'B2 · General German', level: 'B2', term: 'Summer 2026', schedule: 'Mon–Thu · Morning',
    students: ['Sonia Mutesi','Brian Kalisa','Nadege Uwase'].map(S) },
  { id: 'a2',  code: 'A2-A', name: 'A2 · Foundations', level: 'A2', term: 'Spring 2026', schedule: 'Tue–Fri · Morning',
    students: ['Liliane Keza','Emmanuel Twagirayezu','Aimée Niyontwali','Dieudonné Karangwa','Christine Mukasine'].map(S) },
  { id: 'b2eve', code: 'B2-B', name: 'B2 · Exam Prep', level: 'B2', term: 'Summer 2026', schedule: 'Sat · Intensive',
    students: ['Pacifique Habineza'].map(S) },
];

const TERMS = { 'Spring 2026': 'amber', 'Summer 2026': 'green' };

/* ---------- Shared bits ---------- */
function Cbx({ state }) { // state: 'on' | 'off' | 'partial'
  return <span className={`cbx ${state==='on'?'on':state==='partial'?'partial':''}`}>{state==='on' && Ic.check}</span>;
}
function Avatar({ name, cls }) { return <span className={`s-av ${cls||''}`}>{initials(name)}</span>; }

/* ---------- Class picker (native select, styled) ---------- */
function ClassPicker({ value, onChange, exclude, role }) {
  return (
    <div className="class-select-wrap">
      <select className="class-select" value={value} onChange={e=>onChange(e.target.value)}>
        {CLASSES.map(c => (
          <option key={c.id} value={c.id} disabled={c.id===exclude}>
            {c.code} — {c.name}{c.id===exclude?'  (already selected)':''}
          </option>
        ))}
      </select>
      <span className="caret">{Ic.chevDown}</span>
    </div>
  );
}

/* ---------- Roster row ---------- */
function Row({ s, variant, selected, onToggle, onUndo }) {
  if (variant === 'incoming') {
    return (
      <div className="srow incoming">
        <Avatar name={s.name} />
        <div className="s-info"><div className="s-name">{s.name}</div><div className="s-code">{s.code}</div></div>
        <span className="badge green s-tag"><span className="bd"></span>Incoming</span>
        <button className="btn icon ghost sm s-undo" title="Move back" onClick={onUndo}>{Ic.x}</button>
      </div>
    );
  }
  if (variant === 'locked') {
    return (
      <div className="srow locked">
        <Avatar name={s.name} cls="" />
        <div className="s-info"><div className="s-name">{s.name}</div><div className="s-code">{s.code}</div></div>
        <span className="badge gray s-tag">Enrolled</span>
      </div>
    );
  }
  return (
    <div className={`srow ${selected?'sel':''}`} onClick={onToggle}>
      <Cbx state={selected?'on':'off'} />
      <Avatar name={s.name} />
      <div className="s-info"><div className="s-name">{s.name}</div><div className="s-code">{s.code}</div></div>
    </div>
  );
}

/* =====================================================================
   App
   ===================================================================== */
function App() {
  // working copy of class rosters (so a committed migration mutates them)
  const [rosters, setRosters] = useState(() => {
    const m = {}; CLASSES.forEach(c => m[c.id] = c.students.map(s=>s.id)); return m;
  });
  const studentMap = useMemo(() => { const m={}; CLASSES.forEach(c=>c.students.forEach(s=>m[s.id]=s)); return m; }, []);

  const [sourceId, setSourceId] = useState('b1a');
  const [targetId, setTargetId] = useState('b2a');
  const [selected, setSelected] = useState(new Set());      // ids selected in source
  const [staged, setStaged] = useState([]);                 // ids moved to target (pending)
  const [qSrc, setQSrc] = useState('');
  const [qTgt, setQTgt] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [toasts, setToasts] = useState([]);

  const sourceCls = CLASSES.find(c=>c.id===sourceId);
  const targetCls = CLASSES.find(c=>c.id===targetId);

  const sourceIds = rosters[sourceId].filter(id => !staged.includes(id));
  const targetExistingIds = rosters[targetId];

  const resetTransfer = () => { setSelected(new Set()); setStaged([]); };
  const changeSource = (id) => { if (id===targetId) return; setSourceId(id); resetTransfer(); };
  const changeTarget = (id) => { if (id===sourceId) return; setTargetId(id); resetTransfer(); };

  const toast = (msg, ok=true) => {
    const id = Date.now()+Math.random();
    setToasts(t=>[...t,{id,msg,ok}]);
    setTimeout(()=> setToasts(t=>t.filter(x=>x.id!==id)), 2800);
  };

  /* filtered source list */
  const fSource = sourceIds.filter(id => studentMap[id].name.toLowerCase().includes(qSrc.toLowerCase()));
  const allSelected = fSource.length>0 && fSource.every(id=>selected.has(id));
  const someSelected = fSource.some(id=>selected.has(id));

  const toggleOne = (id) => setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = () => setSelected(s => {
    const n = new Set(s);
    if (allSelected) fSource.forEach(id=>n.delete(id)); else fSource.forEach(id=>n.add(id));
    return n;
  });

  const moveToTarget = () => {
    if (!selected.size) return;
    setStaged(st => [...st, ...[...selected]]);
    setSelected(new Set());
  };
  const undoOne = (id) => setStaged(st => st.filter(x=>x!==id));

  /* commit */
  const commit = () => {
    setRosters(r => {
      const next = {...r};
      next[sourceId] = r[sourceId].filter(id => !staged.includes(id));
      next[targetId] = [...r[targetId], ...staged];
      return next;
    });
    const n = staged.length;
    setShowConfirm(false);
    resetTransfer();
    toast(`${n} student${n!==1?'s':''} migrated to ${targetCls.code}`, true);
  };

  /* target display: existing + staged(incoming) */
  const stagedFiltered = staged.filter(id => studentMap[id].name.toLowerCase().includes(qTgt.toLowerCase()));
  const targetExistingFiltered = targetExistingIds.filter(id => studentMap[id].name.toLowerCase().includes(qTgt.toLowerCase()));

  const willEmptySource = sourceIds.length>0 && staged.length===sourceIds.length+0 && sourceIds.length === rosters[sourceId].filter(id=>!staged.includes(id)).length;
  const sourceLeftAfter = rosters[sourceId].length - staged.length;
  const levelChange = sourceCls.level !== targetCls.level;

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand"><div className="brand-mark">D</div><div className="brand-name">Deutschhaus <span>Kigali</span></div></div>
          <div className="topbar-sep"></div>
          <nav className="crumbs">
            <a href="#">Classes</a><span className="sep">/</span>
            <a href="#">Administration</a><span className="sep">/</span>
            <span className="cur">Class Migration</span>
          </nav>
          <div className="topbar-spacer"></div>
          <div className="topbar-user"><span>Marie Keza</span><span className="av">MK</span></div>
        </div>
      </div>

      <div className="page">
        <div className="pagehead">
          <div>
            <div className="eyebrow">Class Administration</div>
            <h1 className="page-title">Class Migration</h1>
            <div className="page-sub">Move or promote students from one class into another. Select students on the left, transfer them, then review &amp; confirm.</div>
          </div>
        </div>

        <div className="migrate-grid">
          {/* SOURCE */}
          <div className="panel source">
            <div className="panel-h">
              <div className="panel-role">{Ic.out} Migrate from</div>
              <ClassPicker value={sourceId} onChange={changeSource} exclude={targetId} role="source" />
              <div className="class-meta">
                <span className="chip level">{sourceCls.level}</span>
                <span className="chip">{sourceCls.term}</span>
                <span className="class-count"><b>{sourceIds.length}</b> student{sourceIds.length!==1?'s':''}</span>
              </div>
            </div>
            <div className="panel-tools">
              <div className="search">{Ic.search}<input placeholder="Search students…" value={qSrc} onChange={e=>setQSrc(e.target.value)} /></div>
              <label className="selectall" onClick={toggleAll}>
                <Cbx state={allSelected?'on':someSelected?'partial':'off'} />
                {allSelected ? 'Clear' : 'All'}
              </label>
            </div>
            <div className={`roster ${fSource.length?'':'empty'}`}>
              {fSource.length ? fSource.map(id => (
                <Row key={id} s={studentMap[id]} selected={selected.has(id)} onToggle={()=>toggleOne(id)} />
              )) : (
                <div className="roster-empty">{Ic.empty}<div className="t">{qSrc?'No matches':'No students left to migrate'}</div><div className="s">{qSrc?'Try a different search':'Everyone has been staged'}</div></div>
              )}
            </div>
          </div>

          {/* TRANSFER */}
          <div className="transfer-col">
            <span className="transfer-lbl">Transfer</span>
            <div className="transfer-flow">
              <button className="move-btn" disabled={!selected.size} onClick={moveToTarget} title="Move selected to destination">{Ic.arrowR}</button>
              <button className="move-btn back" disabled={!staged.length} onClick={()=>setStaged([])} title="Move all back">{Ic.arrowL}</button>
            </div>
            <span className="move-count">{selected.size ? `${selected.size} selected` : staged.length ? `${staged.length} staged` : ''}</span>
          </div>

          {/* TARGET */}
          <div className="panel target">
            <div className="panel-h">
              <div className="panel-role">{Ic.in} Migrate to</div>
              <ClassPicker value={targetId} onChange={changeTarget} exclude={sourceId} role="target" />
              <div className="class-meta">
                <span className="chip level">{targetCls.level}</span>
                <span className="chip">{targetCls.term}</span>
                <span className="class-count"><b>{targetExistingIds.length + staged.length}</b> student{(targetExistingIds.length+staged.length)!==1?'s':''}{staged.length?<span style={{color:'var(--green-700)',fontWeight:600}}> · +{staged.length}</span>:null}</span>
              </div>
            </div>
            <div className="panel-tools">
              <div className="search">{Ic.search}<input placeholder="Search destination…" value={qTgt} onChange={e=>setQTgt(e.target.value)} /></div>
            </div>
            <div className={`roster ${(stagedFiltered.length+targetExistingFiltered.length)?'':'empty'}`}>
              {stagedFiltered.map(id => (
                <Row key={id} s={studentMap[id]} variant="incoming" onUndo={()=>undoOne(id)} />
              ))}
              {targetExistingFiltered.map(id => (
                <Row key={id} s={studentMap[id]} variant="locked" />
              ))}
              {(stagedFiltered.length+targetExistingFiltered.length)===0 && (
                <div className="roster-empty">{Ic.empty}<div className="t">{qTgt?'No matches':'Empty class'}</div><div className="s">{qTgt?'Try a different search':'Transfer students here to populate it'}</div></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className={`actionbar ${staged.length?'show':''}`}>
        <div className="actionbar-inner">
          <div className="ab-summary">
            <div className="ab-count">{staged.length}</div>
            <div className="ab-text">
              <div className="t">{staged.length} student{staged.length!==1?'s':''} ready to migrate</div>
              <div className="s"><span className="num">{sourceCls.code}</span> <span className="ab-arrow" style={{display:'inline-grid',verticalAlign:'-3px'}}>{Ic.arrowR}</span> <span className="num">{targetCls.code}</span> · {targetCls.term}</div>
            </div>
          </div>
          <div className="ab-actions">
            <button className="btn" onClick={()=>setStaged([])}>Clear</button>
            <button className="btn primary" onClick={()=>setShowConfirm(true)}>{Ic.migrate} Review &amp; migrate</button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="scrim" onMouseDown={e=>e.target===e.currentTarget && setShowConfirm(false)}>
          <div className="modal" onMouseDown={e=>e.stopPropagation()}>
            <div className="modal-h">
              <div className="mh-ic">{Ic.migrate}</div>
              <div><div className="mt">Confirm migration</div><div className="ms">{staged.length} student{staged.length!==1?'s':''} will be moved between classes</div></div>
              <button className="btn icon ghost x" onClick={()=>setShowConfirm(false)}>{Ic.x}</button>
            </div>
            <div className="modal-b">
              <div className="route">
                <div className="route-card from">
                  <div className="rc-role">From</div>
                  <div className="rc-name">{sourceCls.code} — {sourceCls.level}</div>
                  <div className="rc-meta"><span className="num">{sourceLeftAfter}</span> will remain · {sourceCls.term}</div>
                </div>
                <div className="route-mid">{Ic.arrowR}</div>
                <div className="route-card to">
                  <div className="rc-role">To</div>
                  <div className="rc-name">{targetCls.code} — {targetCls.level}</div>
                  <div className="rc-meta"><span className="num">{targetExistingIds.length + staged.length}</span> total after · {targetCls.term}</div>
                </div>
              </div>

              <div className="preview-list">
                <div className="pl-h"><span>Migrating</span><span>{staged.length}</span></div>
                <div className="pl-scroll">
                  {staged.map(id => (
                    <div className="pl-row" key={id}>
                      <Avatar name={studentMap[id].name} />
                      <span className="nm">{studentMap[id].name}</span>
                      <span className="cd">{studentMap[id].code}</span>
                    </div>
                  ))}
                </div>
              </div>

              {levelChange ? (
                <div className="note info">{Ic.info}<div>Level changes from <b>{sourceCls.level}</b> to <b>{targetCls.level}</b>. This is recorded as a promotion in each student's academic history.</div></div>
              ) : (
                <div className="note info">{Ic.info}<div>Students keep level <b>{sourceCls.level}</b> — this is a transfer between classes of the same level.</div></div>
              )}
              {sourceLeftAfter === 0 && (
                <div className="note warn">{Ic.warn}<div><b>{sourceCls.code}</b> will be left with no students after this migration.</div></div>
              )}
            </div>
            <div className="modal-f">
              <button className="btn" onClick={()=>setShowConfirm(false)}>Cancel</button>
              <button className="btn primary" onClick={commit}>{Ic.check} Migrate {staged.length} student{staged.length!==1?'s':''}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-wrap">
        {toasts.map(t => <div key={t.id} className={`toast ${t.ok?'ok':''}`}><span className="ti">{t.ok?Ic.check:Ic.info}</span>{t.msg}</div>)}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
