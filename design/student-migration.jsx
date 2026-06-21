/* ============================================================
   Student Migration History — one student's class journey
   ============================================================ */
const { useState, useMemo } = React;

const TODAY = new Date('2026-06-05T10:00:00');

const Ic = {
  promotion: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  transfer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M2 12h13M19 5l3 3-3 3M22 8H9"/></svg>,
  merge: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M12 11v10M8 8l4 3 4-3"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L6 22l2-7L2 9h7z"/></svg>,
  arrowR: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  print: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  route: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  layers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  trend: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>,
  receipt: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>,
};

const initials = (n) => n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d) => `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const dayDiff = (a,b) => Math.round((a-b)/86400000);
function timeAgo(d) {
  const days = dayDiff(TODAY, d);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const m = Math.round(days/30);
  return m === 1 ? '1 month ago' : `${m} months ago`;
}

const TYPE = {
  PROMOTION: { label: 'Promotion', tone: 'violet', icon: Ic.promotion },
  TRANSFER:  { label: 'Transfer',  tone: 'blue',   icon: Ic.transfer },
  MERGE:     { label: 'Merge',     tone: 'teal',   icon: Ic.merge },
};

/* ---------- One student ---------- */
const STUDENT = {
  name: 'Aline Uwase', initials: 'AU', code: 'STU-2026-0184',
  level: 'B2', department: 'General German', status: 'Enrolled',
  joined: new Date('2025-09-08'),
  currentClass: 'B2-A',
};

/* enrollment + migration events, newest first */
const ENROLL = { when: new Date('2025-09-08'), class: 'A2-B', level: 'A2', note: 'Initial placement after the A2 entry assessment.' };

const EVENTS = [
  { id: 'e4', when: new Date('2026-06-02T09:24:00'), type: 'PROMOTION', current: true,
    from: { code: 'B1-A', level: 'B1' }, to: { code: 'B2-A', level: 'B2' },
    by: { name: 'Marie Keza', role: 'ADMIN' }, classmates: 8,
    note: 'End-of-term promotion to B2 after passing the B1 final assessment with distinction.' },
  { id: 'e3', when: new Date('2026-02-18T13:30:00'), type: 'TRANSFER',
    from: { code: 'B1-B', level: 'B1' }, to: { code: 'B1-A', level: 'B1' },
    by: { name: 'Eric Niyonzima', role: 'STAFF' }, classmates: 11,
    note: 'Moved from the evening to the morning B1 cohort at the guardian’s request.' },
  { id: 'e2', when: new Date('2025-12-15T10:05:00'), type: 'PROMOTION',
    from: { code: 'A2-B', level: 'A2' }, to: { code: 'B1-B', level: 'B1' },
    by: { name: 'Marie Keza', role: 'ADMIN' }, classmates: 4,
    note: 'Promoted to B1 following winter-session results.' },
];

const LEVELS = ['A1','A2','B1','B2','C1'];

/* =====================================================================
   Components
   ===================================================================== */
function StudentCard() {
  const enrolledDays = dayDiff(TODAY, STUDENT.joined);
  return (
    <div className="card">
      <div className="card-h"><span className="ttl-ic">{Ic.user}</span><span className="ttl">Student</span>
        <span style={{marginLeft:'auto'}}><span className="badge green"><span className="bd"></span>{STUDENT.status}</span></span>
      </div>
      <div className="card-b">
        <div className="stu-top">
          <div className="stu-av">{STUDENT.initials}</div>
          <div className="stu-id"><div className="nm">{STUDENT.name}</div><div className="meta"><span className="num">{STUDENT.code}</span></div></div>
        </div>
        <div className="chips">
          <span className="chip level"><span className="dot"></span>Level {STUDENT.level}</span>
          <span className="chip">{STUDENT.currentClass}</span>
          <span className="chip">{STUDENT.department}</span>
        </div>
        <dl className="kv">
          <dt>Enrolled</dt><dd className="num">{fmtDate(STUDENT.joined)}</dd>
          <dt>Time at school</dt><dd className="num">{Math.round(enrolledDays/30)} months</dd>
          <dt>Current class</dt><dd className="num">{STUDENT.currentClass}</dd>
        </dl>
      </div>
    </div>
  );
}

function JourneySummary() {
  const moves = EVENTS.length;
  const promotions = EVENTS.filter(e=>e.type==='PROMOTION').length;
  const startLevel = ENROLL.level;
  const startIdx = LEVELS.indexOf(startLevel);
  const curIdx = LEVELS.indexOf(STUDENT.level);
  const lastMove = EVENTS[0].when;
  return (
    <div className="card">
      <div className="card-h"><span className="ttl-ic">{Ic.route}</span><span className="ttl">Journey</span></div>
      <div className="card-b">
        <div className="jsum">
          <div className="jsum-row"><span className="l">{Ic.layers} Total moves</span><span className="v num">{moves}</span></div>
          <div className="jsum-row"><span className="l">{Ic.trend} Promotions</span><span className="v num">{promotions}</span></div>
          <div className="jsum-row"><span className="l">{Ic.clock} Last move</span><span className="v">{timeAgo(lastMove)}</span></div>
        </div>
        <div className="level-track">
          <div className="lt-meta"><span>Level progress</span><span><b>{startLevel} → {STUDENT.level}</b></span></div>
          <div className="lt-steps">
            {LEVELS.map((lv,i)=>(
              <div key={lv} className={`lt-step ${i<curIdx?'done':''} ${i===curIdx?'cur':''}`}></div>
            ))}
          </div>
          <div className="lt-labels">
            {LEVELS.map((lv,i)=>(
              <span key={lv} className={`${i<curIdx?'done':''} ${i===curIdx?'cur':''}`}>{lv}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ ev, onToast }) {
  const t = TYPE[ev.type];
  return (
    <div className={`tl-item ${ev.current?'current':''}`}>
      <div className={`tl-node ${ev.type.toLowerCase()} ${ev.current?'current':''}`}>{ev.current ? Ic.star : t.icon}</div>
      <div className={`tl-box ${ev.current?'current':''}`}>
        <div className="tl-box-h">
          <div className="tl-route">
            <div className="rp from"><span className="c">{ev.from.code}</span><span className="l">{ev.from.level}</span></div>
            <span className="r-arrow">{Ic.arrowR}</span>
            <div className="rp to"><span className="c">{ev.to.code}</span><span className="l">{ev.to.level}</span></div>
          </div>
          <div className="sp"></div>
          <span className={`badge ${t.tone}`}><span className="bd"></span>{t.label}</span>
          {ev.current && <span className="badge green">Current</span>}
          <div className="tl-when"><div className="d">{fmtDate(ev.when)}</div><div className="ago">{timeAgo(ev.when)}</div></div>
        </div>
        <div className="tl-box-b">
          <div className="tl-note">{Ic.info}<div>{ev.note}</div></div>
          <div className="tl-foot">
            <div className="tl-by"><span className="av">{initials(ev.by.name)}</span><div className="who"><span className="n">{ev.by.name}</span> <span className="r">{ev.by.role}</span></div></div>
            <div className="tl-stat">{Ic.user}<span>moved with <b>{ev.classmates}</b> classmate{ev.classmates!==1?'s':''}</span></div>
            <button className="btn sm ghost tl-receipt" onClick={()=>onToast('Migration receipt opened')}>{Ic.receipt} Receipt</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [toasts, setToasts] = useState([]);
  const toast = (msg) => { const id=Date.now()+Math.random(); setToasts(t=>[...t,{id,msg}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2600); };

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand"><div className="brand-mark">D</div><div className="brand-name">Deutschhaus <span>Kigali</span></div></div>
          <div className="topbar-sep"></div>
          <nav className="crumbs">
            <a href="#">Students</a><span className="sep">/</span>
            <a href="#">{STUDENT.name}</a><span className="sep">/</span>
            <span className="cur">Migration History</span>
          </nav>
          <div className="topbar-spacer"></div>
          <div className="topbar-user"><span>Marie Keza</span><span className="av">MK</span></div>
        </div>
      </div>

      <div className="page">
        <div className="pagehead">
          <div>
            <div className="eyebrow">Student Record</div>
            <h1 className="page-title">{STUDENT.name}’s Migration History</h1>
            <div className="page-sub">Every class this student has moved through — from enrollment in <span className="num">{ENROLL.level}</span> to <span className="num">{STUDENT.level}</span> today.</div>
          </div>
          <div className="head-actions">
            <a className="btn" href="Migration History.html">{Ic.back} All migrations</a>
            <button className="btn" onClick={()=>window.print()}>{Ic.print} Export PDF</button>
            <a className="btn primary" href="Class Migration.html">{Ic.plus} New migration</a>
          </div>
        </div>

        <div className="grid">
          <aside className="rail">
            <StudentCard />
            <JourneySummary />
          </aside>

          <main className="card">
            <div className="tl-card-h">
              <span className="ttl">Class Journey</span>
              <span className="count">{EVENTS.length} moves</span>
              <div className="right"><button className="btn sm" onClick={()=>window.print()}>{Ic.print} Export</button></div>
            </div>
            <div className="timeline">
              {EVENTS.map(ev => <TimelineItem key={ev.id} ev={ev} onToast={toast} />)}

              {/* Enrollment origin */}
              <div className="tl-item">
                <div className="tl-node enroll">{Ic.star}</div>
                <div className="tl-enroll-box">
                  <div>
                    <div className="eb-t">Enrolled in {ENROLL.class}</div>
                    <div className="eb-s">{ENROLL.note}</div>
                  </div>
                  <div className="eb-when"><div className="d">{fmtDate(ENROLL.when)}</div><div className="ago">{timeAgo(ENROLL.when)}</div></div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <div className="toast-wrap">
        {toasts.map(t => <div key={t.id} className="toast ok"><span className="ti">{Ic.info}</span>{t.msg}</div>)}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
