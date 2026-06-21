/* ============================================================
   Payment History — interactive prototype
   ============================================================ */
const { useState, useMemo, useRef, useEffect } = React;

/* ---------- Fixed "today" so demo logic is deterministic ---------- */
const TODAY = new Date('2026-06-02T09:30:00');

/* ---------- Helpers ---------- */
const fmtMoney = (n) => Math.round(n).toLocaleString('en-US');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d) => `${d.getDate().toString().padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const fmtDateShort = (d) => `${d.getDate().toString().padStart(2,'0')} ${MONTHS[d.getMonth()]}`;
const dayDiff = (a, b) => Math.round((a - b) / 86400000);
function timeAgo(d) {
  const days = dayDiff(TODAY, d);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const m = Math.floor(days / 30);
  return m === 1 ? '1 month ago' : `${m} months ago`;
}
const iso = (d) => d.toISOString().slice(0,10);

/* ---------- Icons (stroke, currentColor) ---------- */
const Ic = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  print: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  receipt: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>,
  bank: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 8l10-5 10 5"/></svg>,
  cash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>,
  mobile: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 18h.01"/></svg>,
  card: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M7 16l4-4 3 3 5-6"/></svg>,
  trend: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>,
  layers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  wa: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.07 4.49.71.3 1.26.49 1.69.62.71.23 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12 2a10 10 0 0 0-8.6 15.06L2 22l5.07-1.33A10 10 0 1 0 12 2z"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>,
  dots: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  hash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>,
};

const METHODS = {
  BANK_TRANSFER: { label: 'Bank Transfer', icon: Ic.bank },
  MOBILE_MONEY:  { label: 'Mobile Money',  icon: Ic.mobile },
  CASH:          { label: 'Cash',          icon: Ic.cash },
  CARD:          { label: 'Card',          icon: Ic.card },
};

/* ---------- Seed data ---------- */
const STUDENT = {
  name: 'Aline Uwase', initials: 'AU', code: 'STU-2026-0184',
  level: 'B1', department: 'General German',
  joined: new Date('2026-02-15'),
  guardian: 'Jean-Paul Uwase', relation: 'Father', phone: '+250 788 412 905',
};
const FEE = {
  name: 'B1 Term Fee — Spring 2026',
  status: 'ACTIVE',
  total: 450000,
  start: new Date('2026-02-01'),
  end: new Date('2026-05-31'),
};
const SEED_PAYMENTS = [
  { id: 'pay_3', date: new Date('2026-04-30'), amount: 50000,  method: 'CASH',          notes: 'Top-up before exam registration', receipt: false, by: 'Eric Niyonzima',  byType: 'STAFF' },
  { id: 'pay_2', date: new Date('2026-03-25'), amount: 100000, method: 'MOBILE_MONEY',  notes: 'MoMo Ref 8842-1190',               receipt: true,  by: 'Eric Niyonzima',  byType: 'STAFF' },
  { id: 'pay_1', date: new Date('2026-02-20'), amount: 150000, method: 'BANK_TRANSFER', notes: 'Initial installment',              receipt: true,  by: 'Marie Keza',      byType: 'ADMIN' },
];

/* =====================================================================
   Small shared components
   ===================================================================== */
function Badge({ tone, dot, lg, children }) {
  return <span className={`badge ${tone}${lg ? ' lg' : ''}`}>{dot && <span className="bd"></span>}{children}</span>;
}

/* =====================================================================
   Student card
   ===================================================================== */
function StudentCard({ onToast }) {
  const copyPhone = () => {
    navigator.clipboard?.writeText(STUDENT.phone).catch(()=>{});
    onToast('Guardian number copied to clipboard');
  };
  return (
    <div className="card">
      <div className="card-h"><span className="ttl-ic">{Ic.user}</span><span className="ttl">Student</span>
        <span style={{marginLeft:'auto'}}><Badge tone="green" dot>Enrolled</Badge></span>
      </div>
      <div className="card-b">
        <div className="stu-top">
          <div className="stu-av">{STUDENT.initials}</div>
          <div className="stu-id">
            <div className="nm">{STUDENT.name}</div>
            <div className="meta"><span className="num">{STUDENT.code}</span></div>
          </div>
        </div>
        <div className="chips">
          <span className="chip level"><span className="dot"></span>Level {STUDENT.level}</span>
          <span className="chip">{STUDENT.department}</span>
        </div>
        <dl className="kv">
          <dt>Joined</dt><dd className="num">{fmtDate(STUDENT.joined)}</dd>
          <dt>Enrolled for</dt><dd className="num">{Math.round(dayDiff(TODAY, STUDENT.joined)/7)} weeks</dd>
        </dl>
        <div className="contact">
          <div className="contact-lbl">Parent / Guardian</div>
          <div className="contact-row">
            <div className="ci">{Ic.phone}</div>
            <div className="contact-info">
              <div className="who">{STUDENT.guardian} <span style={{color:'var(--faint)',fontWeight:400}}>· {STUDENT.relation}</span></div>
              <div className="ph num">{STUDENT.phone}</div>
            </div>
            <div className="contact-acts">
              <a className="btn icon sm" href={`tel:${STUDENT.phone.replace(/\s/g,'')}`} title="Call guardian">{Ic.phone}</a>
              <button className="btn icon sm" onClick={copyPhone} title="Copy number">{Ic.copy}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   Fee & timeline card
   ===================================================================== */
function FeeCard({ remaining, lastPayment }) {
  const overdue = dayDiff(TODAY, FEE.end);
  const isOverdue = overdue > 0 && remaining > 0;
  const untilDeadline = -overdue;
  return (
    <div className="card">
      <div className="card-h"><span className="ttl-ic">{Ic.layers}</span><span className="ttl">Fee &amp; Timeline</span></div>
      <div className="card-b">
        <div className="fee-name">{FEE.name}</div>
        <div className="fee-period">{Ic.cal}<span className="num">{fmtDateShort(FEE.start)} – {fmtDate(FEE.end)}</span></div>
        <div className="timeline">
          <div className="tl-row">
            <span className="lbl">{Ic.layers} Fee status</span>
            <span className="val"><Badge tone={FEE.status==='ACTIVE'?'green':'gray'} dot>{FEE.status}</Badge></span>
          </div>
          <div className="tl-row">
            <span className="lbl">{Ic.clock} {isOverdue ? 'Overdue by' : 'Deadline in'}</span>
            <span className="val">
              {isOverdue
                ? <Badge tone="red" dot>{overdue} day{overdue!==1?'s':''} overdue</Badge>
                : <Badge tone={untilDeadline>14?'green':'amber'} dot>{untilDeadline} days left</Badge>}
            </span>
          </div>
          <div className="tl-row">
            <span className="lbl">{Ic.clock} Last payment</span>
            <span className="val num">{lastPayment ? timeAgo(lastPayment) : '—'}</span>
          </div>
          <div className="tl-row">
            <span className="lbl">{Ic.cal} Deadline</span>
            <span className="val num">{fmtDate(FEE.end)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   Balance summary band
   ===================================================================== */
function BalanceBand({ total, paid, remaining }) {
  const pct = Math.min(100, Math.round((paid/total)*100));
  const overdue = dayDiff(TODAY, FEE.end);
  const isOverdue = overdue > 0 && remaining > 0;
  const settled = remaining <= 0;
  return (
    <div className="balance">
      <div className="balance-grid">
        <div className="bcell">
          <div className="bl">Total Fee</div>
          <div className="bv"><span className="cur">RWF</span>{fmtMoney(total)}</div>
          <div className="bsub">Assigned {fmtDateShort(FEE.start)}</div>
        </div>
        <div className="bcell accent">
          <div className="bl">Total Paid</div>
          <div className="bv"><span className="cur">RWF</span>{fmtMoney(paid)}</div>
          <div className="bsub">{pct}% of balance cleared</div>
        </div>
        <div className={`bcell ${remaining>0?'danger':''}`}>
          <div className="bl">Remaining</div>
          <div className="bv"><span className="cur">RWF</span>{fmtMoney(Math.max(0,remaining))}</div>
          <div className="bsub">{settled ? 'Fully settled' : `Across ${remaining>0?'1 outstanding balance':''}`}</div>
        </div>
        <div className="bcell status">
          <div className="bl">Payment Status</div>
          {settled
            ? <Badge tone="green" dot lg>FULLY PAID</Badge>
            : isOverdue
              ? <Badge tone="red" dot lg>OVERDUE · {overdue}d</Badge>
              : <Badge tone="amber" dot lg>PARTIALLY PAID</Badge>}
          <div className="bsub">{settled ? 'No action needed' : isOverdue ? 'Follow-up recommended' : 'On track'}</div>
        </div>
      </div>
      <div className="progress-wrap">
        <div className="progress-meta"><span>Collection progress</span><span><b>{pct}%</b> · RWF {fmtMoney(paid)} / {fmtMoney(total)}</span></div>
        <div className="progress"><div className="fill" style={{width: pct+'%'}}></div></div>
      </div>
    </div>
  );
}

/* =====================================================================
   Computed stats strip
   ===================================================================== */
function StatsStrip({ payments }) {
  const stats = useMemo(() => {
    if (!payments.length) return null;
    const sorted = [...payments].sort((a,b)=>a.date-b.date);
    const amounts = sorted.map(p=>p.amount);
    const avg = amounts.reduce((s,a)=>s+a,0)/amounts.length;
    const largest = Math.max(...amounts);
    let gaps = [];
    for (let i=1;i<sorted.length;i++) gaps.push(dayDiff(sorted[i].date, sorted[i-1].date));
    const avgGap = gaps.length ? Math.round(gaps.reduce((s,g)=>s+g,0)/gaps.length) : null;
    return { count: payments.length, avg, largest, avgGap, first: sorted[0].date, last: sorted[sorted.length-1].date };
  }, [payments]);
  if (!stats) return null;
  const Cell = ({ icon, label, children }) => (
    <div className="stat"><div className="sl">{icon}{label}</div><div className="sv">{children}</div></div>
  );
  return (
    <div className="stats">
      <Cell icon={Ic.hash} label="Payments">{stats.count}</Cell>
      <Cell icon={Ic.chart} label="Avg payment"><span className="cur" style={{fontSize:'10px',color:'var(--faint)'}}>RWF </span>{fmtMoney(stats.avg)}</Cell>
      <Cell icon={Ic.trend} label="Largest"><span className="cur" style={{fontSize:'10px',color:'var(--faint)'}}>RWF </span>{fmtMoney(stats.largest)}</Cell>
      <Cell icon={Ic.clock} label="Avg interval">{stats.avgGap!=null ? <>{stats.avgGap}<small> days</small></> : '—'}</Cell>
      <Cell icon={Ic.cal} label="First payment">{fmtDateShort(stats.first)}</Cell>
      <Cell icon={Ic.cal} label="Last payment">{fmtDateShort(stats.last)}</Cell>
    </div>
  );
}

/* =====================================================================
   Payments table
   ===================================================================== */
function PaymentsTable({ payments, total, onRecord }) {
  const sorted = [...payments].sort((a,b)=>b.date-a.date);
  return (
    <div className="card tablecard">
      <div className="table-h">
        <span className="ttl">Payment History</span>
        <span className="count">{payments.length} payment{payments.length!==1?'s':''}</span>
        <div className="right">
          <button className="btn sm primary" onClick={onRecord}>{Ic.plus} Record payment</button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="pay">
          <thead>
            <tr>
              <th style={{width:'34px'}}>#</th>
              <th>Date</th>
              <th className="r">Amount</th>
              <th>Method</th>
              <th>Recorded by</th>
              <th>Notes</th>
              <th style={{width:'56px'}}>Receipt</th>
              <th style={{width:'40px'}}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const pct = Math.round((p.amount/total)*100);
              const m = METHODS[p.method];
              return (
                <tr key={p.id}>
                  <td><span className="seq">{String(sorted.length - i).padStart(2,'0')}</span></td>
                  <td className="cell-date">
                    <div className="d">{fmtDate(p.date)}</div>
                    <div className="ago">{timeAgo(p.date)}</div>
                  </td>
                  <td className="r">
                    <span className="cell-amt">{fmtMoney(p.amount)}</span>
                    <span className="pct-pill">{pct}%</span>
                  </td>
                  <td>
                    <span className="method"><span className="mic">{m.icon}</span>{m.label}</span>
                  </td>
                  <td>
                    <div className="recby"><span className="rn">{p.by}</span><span className="rt">{p.byType}</span></div>
                  </td>
                  <td className="notes-cell">{p.notes ? p.notes : <span className="empty">—</span>}</td>
                  <td>
                    {p.receipt ? (
                      <span className="receipt">
                        <span className="receipt-thumb">{Ic.receipt}</span>
                        <span className="receipt-pop">
                          <span className="scan"></span>
                          <span className="cap"><span>{m.label}</span><a href="#" onClick={e=>e.preventDefault()}>Open</a></span>
                        </span>
                      </span>
                    ) : <span className="receipt-thumb none" title="No receipt">{Ic.receipt}</span>}
                  </td>
                  <td><button className="btn icon ghost sm row-act" title="More">{Ic.dots}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =====================================================================
   Record payment modal
   ===================================================================== */
function RecordModal({ remaining, onClose, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(iso(TODAY));
  const [method, setMethod] = useState('MOBILE_MONEY');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const amt = parseInt(amount.replace(/\D/g,''),10) || 0;
  const valid = amt > 0 && date;

  const submit = () => {
    if (!valid) return;
    onSubmit({ amount: amt, date: new Date(date+'T12:00:00'), method, notes: notes.trim(), receipt: !!file });
  };
  return (
    <div className="scrim" onMouseDown={(e)=> e.target===e.currentTarget && onClose()}>
      <div className="modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic">{Ic.plus}</div>
          <div><div className="mt">Record a payment</div><div className="ms">{STUDENT.name} · {FEE.name}</div></div>
          <button className="btn icon ghost x" onClick={onClose}>{Ic.x}</button>
        </div>
        <div className="modal-b">
          <div className="field">
            <label>Amount <span className="hint">· remaining RWF {fmtMoney(Math.max(0,remaining))}</span></label>
            <div className="input-money">
              <span className="pre">RWF</span>
              <input className="input" inputMode="numeric" placeholder="0"
                value={amount ? Number(amount.replace(/\D/g,'')).toLocaleString('en-US') : ''}
                onChange={e=>setAmount(e.target.value)} autoFocus />
            </div>
            <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
              {[remaining, Math.round(remaining/2), 50000].filter(v=>v>0).map((v,i)=>(
                <button key={i} className="btn sm" onClick={()=>setAmount(String(v))}>RWF {fmtMoney(v)}</button>
              ))}
            </div>
          </div>
          <div className="field-2">
            <div className="field"><label>Payment date</label><input type="date" className="input mono" value={date} onChange={e=>setDate(e.target.value)} max={iso(TODAY)} /></div>
            <div className="field"><label>Recorded by</label><input className="input" value="Marie Keza (Admin)" disabled /></div>
          </div>
          <div className="field">
            <label>Payment method</label>
            <div className="method-pick">
              {Object.entries(METHODS).map(([k,m])=>(
                <div key={k} className={`method-opt ${method===k?'on':''}`} onClick={()=>setMethod(k)}>{m.icon}{m.label}</div>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Notes <span className="hint">· optional</span></label>
            <textarea className="textarea" placeholder="Reference number, context…" value={notes} onChange={e=>setNotes(e.target.value)}></textarea>
          </div>
          <div className="field">
            <label>Receipt <span className="hint">· optional</span></label>
            <div className={`dropzone ${file?'filled':''}`} onClick={()=>fileRef.current?.click()}>
              {file ? <><div style={{display:'grid',placeItems:'center'}}>{Ic.check}</div><div className="dz-t">{file}</div><div className="dz-s">Click to replace</div></>
                    : <><div style={{display:'grid',placeItems:'center'}}>{Ic.upload}</div><div className="dz-t">Upload receipt</div><div className="dz-s">PNG, JPG or PDF up to 10MB</div></>}
            </div>
            <input ref={fileRef} type="file" hidden onChange={e=> e.target.files[0] && setFile(e.target.files[0].name)} />
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className={`btn primary ${!valid?'':''}`} disabled={!valid} style={{opacity: valid?1:.5, cursor: valid?'pointer':'not-allowed'}} onClick={submit}>{Ic.check} Save payment</button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   Reminder modal
   ===================================================================== */
function ReminderModal({ remaining, onClose, onSend }) {
  const [chans, setChans] = useState({ wa: true, em: false });
  const overdue = dayDiff(TODAY, FEE.end);
  const toggle = (k) => setChans(c => ({...c, [k]: !c[k]}));
  const any = chans.wa || chans.em;
  const chanLabel = [chans.wa && 'WhatsApp', chans.em && 'Email'].filter(Boolean).join(' & ');
  return (
    <div className="scrim" onMouseDown={(e)=> e.target===e.currentTarget && onClose()}>
      <div className="modal wide" onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic">{Ic.bell}</div>
          <div><div className="mt">Send payment reminder</div><div className="ms">To {STUDENT.guardian} · {STUDENT.phone}</div></div>
          <button className="btn icon ghost x" onClick={onClose}>{Ic.x}</button>
        </div>
        <div className="modal-b">
          <div className="reminder-ch">
            <div className={`rmd-opt ${chans.wa?'on':''}`} onClick={()=>toggle('wa')}>
              <div className="ric wa">{Ic.wa}</div>
              <div className="rinfo"><div className="rt">WhatsApp</div><div className="rs">{STUDENT.phone}</div></div>
              <div className="rcheck">{Ic.check}</div>
            </div>
            <div className={`rmd-opt ${chans.em?'on':''}`} onClick={()=>toggle('em')}>
              <div className="ric em">{Ic.mail}</div>
              <div className="rinfo"><div className="rt">Email</div><div className="rs">guardian on file · j.uwase@email.com</div></div>
              <div className="rcheck">{Ic.check}</div>
            </div>
          </div>
          <div className="preview-msg">
            <div className="pm-h">Message preview</div>
            Dear {STUDENT.guardian}, this is a reminder that <b>{STUDENT.name}</b> ({STUDENT.level}) has an outstanding balance of <b className="num">RWF {fmtMoney(Math.max(0,remaining))}</b> on {FEE.name}{overdue>0 ? <>, now <b style={{color:'var(--red-700)'}}>{overdue} days overdue</b></> : ''}. Kindly arrange payment at your earliest convenience. — Deutschhaus Kigali Finance Office.
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!any} style={{opacity:any?1:.5, cursor:any?'pointer':'not-allowed'}} onClick={()=>onSend(chanLabel)}>{Ic.bell} Send via {chanLabel||'…'}</button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   Toasts
   ===================================================================== */
function Toasts({ items }) {
  return (
    <div className="toast-wrap">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.ok?'ok':''}`}>
          <span className="ti">{t.ok ? Ic.check : Ic.copy}</span>{t.msg}
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   App
   ===================================================================== */
function App() {
  const [payments, setPayments] = useState(SEED_PAYMENTS);
  const [modal, setModal] = useState(null); // 'record' | 'reminder'
  const [toasts, setToasts] = useState([]);

  const paid = useMemo(()=> payments.reduce((s,p)=>s+p.amount,0), [payments]);
  const remaining = FEE.total - paid;
  const lastPayment = useMemo(()=> payments.length ? new Date(Math.max(...payments.map(p=>p.date))) : null, [payments]);

  const toast = (msg, ok=false) => {
    const id = Date.now()+Math.random();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(()=> setToasts(t => t.filter(x=>x.id!==id)), 2600);
  };

  const addPayment = (p) => {
    setPayments(list => [{ id: 'pay_'+Date.now(), ...p, by: 'Marie Keza', byType: 'ADMIN' }, ...list]);
    setModal(null);
    toast(`Payment of RWF ${fmtMoney(p.amount)} recorded`, true);
  };
  const sendReminder = (chan) => { setModal(null); toast(`Reminder sent via ${chan}`, true); };

  return (
    <div className="app">
      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">D</div>
            <div className="brand-name">Deutschhaus <span>Kigali</span></div>
          </div>
          <div className="topbar-sep"></div>
          <nav className="crumbs">
            <a href="#">Students</a><span className="sep">/</span>
            <a href="#">{STUDENT.name}</a><span className="sep">/</span>
            <a href="#">Fees</a><span className="sep">/</span>
            <span className="cur">{FEE.name}</span>
          </nav>
          <div className="topbar-spacer"></div>
          <div className="topbar-user"><span>Marie Keza</span><span className="av">MK</span></div>
        </div>
      </div>

      {/* Page */}
      <div className="page">
        <div className="pagehead">
          <div className="title-wrap">
            <div className="eyebrow">Payment History</div>
            <h1 className="page-title">{STUDENT.name}
              {remaining>0 && dayDiff(TODAY,FEE.end)>0
                ? <Badge tone="red" dot>{dayDiff(TODAY,FEE.end)} days overdue</Badge>
                : remaining<=0 ? <Badge tone="green" dot>Settled</Badge> : null}
            </h1>
            <div className="page-sub">{FEE.name} · <span className="num">RWF {fmtMoney(paid)}</span> of <span className="num">RWF {fmtMoney(FEE.total)}</span> collected</div>
          </div>
          <div className="head-actions">
            <button className="btn" onClick={()=>window.print()}>{Ic.print} Export PDF</button>
            <button className="btn" onClick={()=>setModal('reminder')}>{Ic.bell} Send reminder</button>
            <button className="btn primary" onClick={()=>setModal('record')}>{Ic.plus} Record payment</button>
          </div>
        </div>

        <div className="grid">
          <aside className="rail">
            <StudentCard onToast={(m)=>toast(m)} />
            <FeeCard remaining={remaining} lastPayment={lastPayment} />
          </aside>
          <main>
            <BalanceBand total={FEE.total} paid={paid} remaining={remaining} />
            <StatsStrip payments={payments} />
            <PaymentsTable payments={payments} total={FEE.total} onRecord={()=>setModal('record')} />
          </main>
        </div>
      </div>

      {modal==='record' && <RecordModal remaining={remaining} onClose={()=>setModal(null)} onSubmit={addPayment} />}
      {modal==='reminder' && <ReminderModal remaining={remaining} onClose={()=>setModal(null)} onSend={sendReminder} />}
      <Toasts items={toasts} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
