import React, { useRef } from 'react';
import { QRCode } from 'react-qr-code';
import { X, Printer } from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function genTxnId(id = '') {
  const c = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().padEnd(20, '0');
  return `${c.slice(0,4)}-${c.slice(4,8)}-${c.slice(8,12)}-${c.slice(12,16)}`;
}

function fmtMoney(n) {
  return `RWF ${parseFloat(n || 0).toLocaleString('en-RW', { minimumFractionDigits: 0 })}`;
}

function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDuration(ms) {
  if (!ms || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

/* ── Torn-paper clip-path ─────────────────────────────────────────────────── */
const TORN_PATH = `polygon(
  0% 0.4%, 2% 0%, 4% 0.6%, 6% 0.1%, 8% 0.5%,
  10% 0%, 12% 0.4%, 14% 0%, 16% 0.6%, 18% 0.2%,
  20% 0%, 22% 0.5%, 24% 0.1%, 26% 0.6%, 28% 0%,
  30% 0.4%, 32% 0%, 34% 0.5%, 36% 0.1%, 38% 0.6%,
  40% 0%, 42% 0.4%, 44% 0%, 46% 0.6%, 48% 0.2%,
  50% 0%, 52% 0.5%, 54% 0.1%, 56% 0.6%, 58% 0%,
  60% 0.4%, 62% 0%, 64% 0.5%, 66% 0.1%, 68% 0.6%,
  70% 0%, 72% 0.4%, 74% 0%, 76% 0.6%, 78% 0.2%,
  80% 0%, 82% 0.5%, 84% 0.1%, 86% 0.6%, 88% 0%,
  90% 0.4%, 92% 0%, 94% 0.5%, 96% 0.1%, 98% 0.6%, 100% 0%,
  100% 99.6%, 98% 100%, 96% 99.4%, 94% 100%, 92% 99.6%,
  90% 100%, 88% 99.5%, 86% 100%, 84% 99.4%, 82% 100%,
  80% 99.6%, 78% 100%, 76% 99.5%, 74% 100%, 72% 99.4%,
  70% 100%, 68% 99.6%, 66% 100%, 64% 99.5%, 62% 100%,
  60% 99.4%, 58% 100%, 56% 99.6%, 54% 100%, 52% 99.5%,
  50% 100%, 48% 99.4%, 46% 100%, 44% 99.6%, 42% 100%,
  40% 99.5%, 38% 100%, 36% 99.4%, 34% 100%, 32% 99.6%,
  30% 100%, 28% 99.5%, 26% 100%, 24% 99.4%, 22% 100%,
  20% 99.6%, 18% 100%, 16% 99.5%, 14% 100%, 12% 99.4%,
  10% 100%, 8% 99.6%, 6% 100%, 4% 99.5%, 2% 100%, 0% 99.6%
)`;

/* ── Sub-components ───────────────────────────────────────────────────────── */
const Sep = ({ double, solid }) => (
  <div style={{
    borderTop: double ? '2px solid #1a1a1a' : solid ? '1px solid #333' : '1px dashed #555',
    margin: '7px 0',
  }} />
);

const KV = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, lineHeight: 1.55, textTransform: 'uppercase', fontFamily: 'Courier New, monospace' }}>
    <span style={{ color: '#1a1a1a' }}>{label}</span>
    <span style={{ color: '#1a1a1a', fontWeight: bold ? 700 : 400, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
  </div>
);

/* ──────────────────────────────────────────────────────────────────────────
   Props:
     data: {
       id: string,                  // entity ID (used for QR + txnId)
       type: 'REQUISITION'|'PAYMENT', // receipt type label
       title: string,               // e.g. "REQUISITION RECEIPT"
       reference: string,           // e.g. "REQ-ABC12345"
       issuedBy: string,            // who created/issued
       issuedTo?: string,           // who received (requester / supplier)
       createdAt: string,           // ISO date
       completedAt?: string,        // ISO date (for duration calc)
       items: [{
         name: string,
         sku?: string,
         quantity: number,
         unit?: string,
         unitCost?: number,
         total?: number,
       }],
       totalAmount: number,
       paymentType?: string,        // 'CREDIT'|'DEBIT' for payment receipts
       notes?: string,
       supplierName?: string,
       status?: string,
     }
     onClose: () => void
────────────────────────────────────────────────────────────────────────── */
export default function ReceiptModal({ data, onClose }) {
  const printRef = useRef();
  if (!data) return null;

  const txnId   = genTxnId(data.id);
  const now     = new Date();
  const created = data.createdAt ? new Date(data.createdAt) : now;
  const completed = data.completedAt ? new Date(data.completedAt) : null;
  const duration = completed ? fmtDuration(completed - created) : null;

  const totalAmount = data.totalAmount ?? data.items?.reduce((s, i) => s + (i.total ?? (i.quantity * (i.unitCost ?? 0))), 0) ?? 0;

  const qrRef = useRef();

  const handlePrint = () => {
    // Grab the real rendered QR SVG from the DOM
    const qrSvgEl = qrRef.current?.querySelector('svg');
    const qrSvgHtml = qrSvgEl
      ? qrSvgEl.outerHTML
      : `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect x="1" y="1" width="78" height="78" fill="none" stroke="#000" stroke-width="1"/><text x="40" y="44" font-size="7" text-anchor="middle" fill="#555">QR N/A</text></svg>`;

    const itemsHtml = (data.items ?? []).map(item => `
      <div class="item">
        <div class="item-name">${item.name ?? ''}</div>
        ${item.sku ? `<div class="item-sku">${item.sku}</div>` : ''}
        <div class="item-row">
          <span>${item.unitCost != null
            ? `${fmtMoney(item.unitCost)} x ${item.quantity}${item.unit ? ' ' + item.unit : ''}`
            : `QTY: ${item.quantity}${item.unit ? ' ' + item.unit : ''}`
          }</span>
          ${item.unitCost != null
            ? `<span class="bold">${fmtMoney(item.total ?? item.quantity * item.unitCost)}</span>`
            : ''}
        </div>
      </div>`).join('');

    const win = window.open('', '_blank', 'width=1980,height=800');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.reference ?? 'Receipt'}</title>
  <style>
    @page { size: 80mm auto; margin: 6mm 4mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      color: #000;
      background: #fff;
      width: 72mm;
      max-width: 72mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold   { font-weight: 700; }
    .upper  { text-transform: uppercase; }
    .small  { font-size: 7pt; }
    .stamp {
      width: 52px; height: 52px;
      border: 2px solid #000; border-radius: 50%;
      margin: 4px auto 12px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      position: relative;
    }
    .stamp-inner {
      position: absolute; inset: 3px;
      border: 1px solid #000; border-radius: 50%;
    }
    .stamp-check { font-size: 16px; font-weight: 700; line-height: 1; }
    .stamp-top   { font-size: 5pt; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
    .stamp-bot   { font-size: 4pt; letter-spacing: 0.2em; text-transform: uppercase; }
    .company    { font-size: 10pt; font-weight: 700; text-align: center; letter-spacing: 0.05em; text-transform: uppercase; }
    .subtitle   { font-size: 7.5pt; text-align: center; line-height: 1.5; text-transform: uppercase; color: #222; margin-bottom: 2px; }
    .sep-dbl  { border-top: 2px solid #000; margin: 5px 0; }
    .sep      { border-top: 1px dashed #444; margin: 5px 0; }
    .sep-sol  { border-top: 1px solid #333; margin: 5px 0; }
    .kv { display:flex; justify-content:space-between; font-size:7.5pt; line-height:1.5; text-transform:uppercase; }
    .kv .v { text-align:right; max-width:55%; font-weight:400; }
    .kv .v.bold { font-weight:700; }
    .date-line { font-size: 7pt; line-height: 1.6; text-transform: uppercase; }
    .item { margin-bottom: 5px; }
    .item-name { font-size: 8pt; font-weight: 700; text-transform: uppercase; }
    .item-sku  { font-size: 7pt; color: #333; text-transform: uppercase; }
    .item-row  { display:flex; justify-content:space-between; font-size:7.5pt; }
    .total-row { display:flex; justify-content:space-between; font-size:8pt; line-height:1.7; text-transform:uppercase; }
    .total-row.grand { font-size:9.5pt; font-weight:700; }
    .notes { font-size:7pt; line-height:1.6; text-transform:uppercase; word-break:break-word; }
    .section-title { text-align:center; font-size:7.5pt; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; margin:4px 0 3px; }
    .txn-code { font-size:7pt; letter-spacing:0.05em; word-break:break-all; text-align:center; margin:2px 0; }
    .footer-main { text-align:center; font-size:8pt; font-weight:700; }
    .footer-sub  { text-align:center; font-size:6.5pt; letter-spacing:0.1em; text-transform:uppercase; color:#444; margin-top:3px; }
    .qr-wrap { text-align:center; margin: 8px 0 3px; }
    .qr-label { text-align:center; font-size:6pt; letter-spacing:0.08em; text-transform:uppercase; color:#555; }
    @media print {
      body { width: 72mm; max-width: 72mm; }
    }
  </style>
</head>
<body>

  <div class="stamp">
    <div class="stamp-inner"></div>
    <div class="stamp-top">SEEGH</div>
    <div class="stamp-check">&#10003;</div>
    <div class="stamp-bot">VERIFIED</div>
  </div>

  <div class="company">SEEGH LTD</div>
  <div style="height:3px"></div>
  <div class="subtitle">
    ${data.title ?? 'TRANSACTION RECEIPT'}<br>
    ${data.type === 'REQUISITION' ? 'REQUISITION DOCUMENT' : 'PAYMENT DOCUMENT'}
  </div>

  <div class="sep-dbl"></div>

  <div class="kv"><span>REFERENCE</span><span class="v bold">${data.reference ?? ''}</span></div>
  ${data.issuedTo  ? `<div class="kv"><span>${data.type === 'REQUISITION' ? 'REQUESTER' : 'SUPPLIER'}</span><span class="v">${data.issuedTo}</span></div>` : ''}
  ${data.issuedBy  ? `<div class="kv"><span>ISSUED BY</span><span class="v">${data.issuedBy}</span></div>` : ''}
  ${data.status    ? `<div class="kv"><span>STATUS</span><span class="v">${data.status.replace(/_/g,' ')}</span></div>` : ''}
  ${data.supplierName ? `<div class="kv"><span>SUPPLIER</span><span class="v">${data.supplierName}</span></div>` : ''}
  ${data.paymentType  ? `<div class="kv"><span>TYPE</span><span class="v bold">${data.paymentType}</span></div>` : ''}

  <div class="sep"></div>

  <div class="date-line">DATE: ${fmtDateTime(data.createdAt)}</div>
  ${completed ? `<div class="date-line">COMPLETED: ${fmtDateTime(data.completedAt)}</div>` : ''}
  ${duration  ? `<div class="date-line">TIME TAKEN: ${duration}</div>` : ''}

  <div class="sep"></div>

  ${itemsHtml}

  <div class="sep"></div>

  <div class="total-row"><span>TOTAL ITEMS</span><span class="bold">${(data.items ?? []).length}</span></div>
  <div class="total-row grand"><span>TOTAL AMOUNT</span><span>${fmtMoney(totalAmount)}</span></div>

  ${data.notes ? `<div class="sep"></div><div class="notes">NOTES: ${data.notes}</div>` : ''}

  <div class="sep"></div>

  <div class="section-title">TRANSACTION INFORMATION</div>
  <div class="date-line">DATE: ${fmtDateTime(data.createdAt)}</div>
  <div class="date-line">RECEIPT ID: ${data.reference ?? ''}</div>
  <div style="height:3px"></div>
  <div class="date-line center">Transaction ID:</div>
  <div class="txn-code">${txnId}</div>

  <div class="sep-dbl"></div>

  <div class="footer-main">End of Receipt</div>
  <div class="footer-sub">Powered by SEEGH LTD</div>

  <div class="qr-wrap">
    ${qrSvgHtml}
  </div>
  <div class="qr-label">Scan to verify transaction</div>

</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  /* ── Inline styles (thermal-paper look) ── */
  const paper = {
    width: 320,
    background: '#fefdf8',
    backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.012) 3px,rgba(0,0,0,0.012) 4px)',
    boxShadow: '0 2px 4px rgba(0,0,0,.08),0 8px 24px rgba(0,0,0,.12),0 20px 48px rgba(0,0,0,.08),inset 0 0 0 1px rgba(0,0,0,.04)',
    padding: '20px 18px 28px',
    clipPath: TORN_PATH,
    fontFamily: 'Courier New, Courier, monospace',
    color: '#1a1a1a',
    fontSize: 9,
    lineHeight: 1.55,
    textTransform: 'uppercase',
  };

  return (
    <>
      {/* Print styles injected globally */}
      <style>{`
        .receipt-modal-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.65);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px; }
        .receipt-modal-inner  { position:relative;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;align-items:center;gap:12px; }
        .receipt-modal-actions { display:flex;gap:8px;padding:0 4px; }
      `}</style>

      <div className="receipt-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="receipt-modal-inner">

          {/* Action buttons */}
          <div className="receipt-modal-actions">
            <button onClick={handlePrint} style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:6,border:'none',background:'#1a1a1a',color:'#fefdf8',fontSize:12,cursor:'pointer',fontFamily:'Courier New,monospace',letterSpacing:'0.05em' }}>
              <Printer size={13} /> PRINT
            </button>
            <button onClick={onClose} style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,.25)',background:'transparent',color:'#fff',fontSize:12,cursor:'pointer' }}>
              <X size={13} /> Close
            </button>
          </div>

          {/* The receipt paper */}
          <div ref={printRef} style={paper}>

            {/* Circular stamp */}
            <div style={{ width:64,height:64,border:'2.5px solid #1a1a1a',borderRadius:'50%',margin:'4px auto 16px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative' }}>
              <div style={{ position:'absolute',inset:4,border:'1px solid #1a1a1a',borderRadius:'50%' }} />
              <div style={{ fontSize:5.5,fontWeight:700,letterSpacing:'0.25em',textTransform:'uppercase' }}>SEEGH</div>
              <div style={{ fontSize:18,lineHeight:1,fontWeight:700 }}>✓</div>
              <div style={{ fontSize:5,letterSpacing:'0.2em',textTransform:'uppercase' }}>VERIFIED</div>
            </div>

            {/* Header */}
            <div style={{ fontSize:11,fontWeight:700,textAlign:'center',letterSpacing:'0.05em' }}>SEEGH LTD</div>
            <div style={{ height:4 }} />
            <div style={{ fontSize:8.5,textAlign:'center',lineHeight:1.6,color:'#2a2a2a',textTransform:'uppercase' }}>
              {data.title || 'TRANSACTION RECEIPT'}<br />
              {data.type === 'REQUISITION' ? 'REQUISITION DOCUMENT' : 'PAYMENT DOCUMENT'}
            </div>

            <Sep double />

            {/* Reference / entity info */}
            <KV label="REFERENCE" value={data.reference} bold />
            {data.issuedTo  && <KV label={data.type === 'REQUISITION' ? 'REQUESTER' : 'SUPPLIER'} value={data.issuedTo} />}
            {data.issuedBy  && <KV label="ISSUED BY"   value={data.issuedBy} />}
            {data.status    && <KV label="STATUS"      value={data.status.replace(/_/g,' ')} />}
            {data.supplierName && <KV label="SUPPLIER" value={data.supplierName} />}
            {data.paymentType  && <KV label="TYPE"     value={data.paymentType} bold />}

            <Sep />

            {/* Date / time */}
            <div style={{ fontSize:8,lineHeight:1.6,textTransform:'uppercase' }}>DATE: {fmtDateTime(data.createdAt)}</div>
            {completed && <div style={{ fontSize:8,lineHeight:1.6,textTransform:'uppercase' }}>COMPLETED: {fmtDateTime(data.completedAt)}</div>}
            {duration  && <div style={{ fontSize:8,lineHeight:1.6,textTransform:'uppercase' }}>TIME TAKEN: {duration}</div>}

            <Sep />

            {/* Items */}
            {(data.items ?? []).map((item, i) => (
              <div key={i} style={{ marginBottom:6 }}>
                <div style={{ fontSize:9,fontWeight:700,textTransform:'uppercase' }}>{item.name}</div>
                {item.sku && <div style={{ fontSize:8,color:'#333',textTransform:'uppercase' }}>{item.sku}</div>}
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:8.5 }}>
                  <span style={{ fontWeight:400,fontSize:8 }}>
                    {item.unitCost != null ? `${fmtMoney(item.unitCost)} x ${item.quantity}${item.unit ? ' '+item.unit : ''}` : `QTY: ${item.quantity}${item.unit ? ' '+item.unit : ''}`}
                  </span>
                  {item.unitCost != null && (
                    <span style={{ fontWeight:700 }}>{fmtMoney(item.total ?? item.quantity * item.unitCost)}</span>
                  )}
                </div>
              </div>
            ))}

            <Sep />

            {/* Totals */}
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:9,lineHeight:1.7,textTransform:'uppercase' }}>
              <span>TOTAL ITEMS</span><span style={{ fontWeight:700 }}>{(data.items ?? []).length}</span>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,fontWeight:700,lineHeight:1.7,textTransform:'uppercase' }}>
              <span>TOTAL AMOUNT</span><span>{fmtMoney(totalAmount)}</span>
            </div>

            {data.notes && (
              <>
                <Sep />
                <div style={{ fontSize:8,lineHeight:1.6,textTransform:'uppercase',wordBreak:'break-word' }}>NOTES: {data.notes}</div>
              </>
            )}

            <Sep />

            {/* SDC-style section */}
            <div style={{ textAlign:'center',fontSize:8.5,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',margin:'4px 0 3px' }}>TRANSACTION INFORMATION</div>

            <div style={{ fontSize:8,lineHeight:1.6,textTransform:'uppercase',wordBreak:'break-all' }}>
              DATE: {fmtDateTime(data.createdAt)}
            </div>
            <div style={{ fontSize:8,lineHeight:1.6,textTransform:'uppercase' }}>
              RECEIPT ID: {data.reference}
            </div>

            <div style={{ height:4 }} />
            <div style={{ fontSize:8,textAlign:'center',textTransform:'uppercase' }}>Transaction ID:</div>
            <div style={{ fontSize:8,letterSpacing:'0.05em',wordBreak:'break-all',textAlign:'center',color:'#1a1a1a',margin:'2px 0' }}>{txnId}</div>

            <Sep double />

            <div style={{ textAlign:'center',fontSize:8.5,fontWeight:700,color:'#1a1a1a' }}>End of Receipt</div>
            <div style={{ textAlign:'center',fontSize:8,letterSpacing:'0.1em',textTransform:'uppercase',color:'#444',marginTop:4 }}>Powered by SEEGH LTD</div>

            {/* QR Code */}
            <div ref={qrRef} style={{ width:80,height:80,margin:'10px auto 4px',background:'#fefdf8',padding:4 }}>
              <QRCode
                value={txnId}
                size={72}
                bgColor="#fefdf8"
                fgColor="#1a1a1a"
                level="M"
              />
            </div>
            <div style={{ textAlign:'center',fontSize:7,letterSpacing:'0.08em',textTransform:'uppercase',color:'#555' }}>Scan to verify transaction</div>

          </div>
        </div>
      </div>
    </>
  );
}

/* ── Factory helpers for callers ────────────────────────────────────────── */

/**
 * Build receipt data from a requisition object
 */
export function buildRequisitionReceipt(requisition) {
  const items = (requisition.items ?? []).map(i => ({
    name: i.itemName,
    sku:  i.stock?.sku ?? '',
    quantity: i.quantity,
    unit: i.unit,
    unitCost: i.costPrice ?? null,
    total: i.costPrice != null ? i.quantity * i.costPrice : null,
  }));

  const totalAmount = items.reduce((s, i) => s + (i.total ?? 0), 0);

  // Determine completedAt from logs or updatedAt
  const lastLog = (requisition.items ?? [])
    .flatMap(i => i.receivingLogs ?? [])
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))[0];

  const completedAt =
    requisition.status === 'FULLY_RECEIVED' ? (lastLog?.receivedAt ?? requisition.updatedAt) :
    requisition.status === 'APPROVED'       ? requisition.updatedAt :
    null;

  return {
    id:          requisition.id,
    type:        'REQUISITION',
    title:       'REQUISITION RECEIPT',
    reference:   `REQ-${requisition.id.slice(-8).toUpperCase()}`,
    issuedTo:    requisition.employee ? `${requisition.employee.firstName} ${requisition.employee.lastName}` : '—',
    issuedBy:    requisition.approvedByName ?? '—',
    status:      requisition.status,
    supplierName: requisition.supplier?.name ?? null,
    createdAt:   requisition.createdAt,
    completedAt,
    items,
    totalAmount,
    notes:       requisition.notes ?? null,
  };
}

/**
 * Build receipt data from a group of stock items received on one date
 */
export function buildGroupReceipt(supplierName, date, items) {
  const receiptItems = items.map(s => ({
    name:     s.itemName,
    sku:      s.sku ?? '',
    quantity: s.quantity,
    unit:     s.unit ?? '',
    unitCost: parseFloat(s.unitCost ?? 0),
    total:    parseFloat(s.totalValue ?? (s.quantity * (s.unitCost ?? 0))),
    site:     s.site?.name ?? '',
  }));
  const totalAmount = receiptItems.reduce((s, i) => s + (i.total ?? 0), 0);
  const refId = `GRP-${Date.now().toString(36).toUpperCase().slice(-8)}`;
  return {
    id:          refId,
    type:        'PAYMENT',
    title:       'STOCK RECEIPT',
    reference:   refId,
    issuedTo:    supplierName,
    issuedBy:    '—',
    supplierName,
    createdAt:   date,
    completedAt: null,
    items:       receiptItems,
    totalAmount,
    notes:       null,
  };
}

/* ── Supplier Document Receipt Modal ─────────────────────────────────────── */

export function SupplierReceiptModal({ data, supplier, onClose }) {
  if (!data) return null;

  const items = data.items ?? [];
  const totalAmount = data.totalAmount ?? items.reduce((s, i) => s + (i.total ?? ((i.unitCost ?? 0) * i.quantity)), 0);
  const hasSite = items.some(i => i.site);
  const hasUnitCost = items.some(i => i.unitCost != null && i.unitCost > 0);

  const supplierBlock = supplier ? `
    <div class="sup-block">
      <div class="sup-col">
        <div class="sup-label">Supplier</div>
        <div class="sup-name">${supplier.name || ''}</div>
        ${supplier.code ? `<div class="sup-detail mono">${supplier.code}</div>` : ''}
        ${supplier.address ? `<div class="sup-detail">${supplier.address}</div>` : ''}
        ${(supplier.city || supplier.country) ? `<div class="sup-detail">${[supplier.city, supplier.country].filter(Boolean).join(', ')}</div>` : ''}
      </div>
      <div class="sup-col">
        ${supplier.contactPerson ? `<div class="sup-detail"><b>Contact:</b> ${supplier.contactPerson}</div>` : ''}
        ${supplier.email ? `<div class="sup-detail"><b>Email:</b> ${supplier.email}</div>` : ''}
        ${supplier.phone ? `<div class="sup-detail"><b>Phone:</b> ${supplier.phone}</div>` : ''}
        ${supplier.paymentTerms ? `<div class="sup-detail"><b>Terms:</b> ${supplier.paymentTerms}</div>` : ''}
      </div>
    </div>` : '';

  const handlePrint = () => {
    const rowsHtml = items.map((item, idx) => `
      <tr${idx % 2 !== 0 ? ' class="alt"' : ''}>
        <td style="color:#bbb;font-size:8.5pt;text-align:center">${idx + 1}</td>
        <td class="mono" style="font-size:9pt;color:#555">${item.sku || '—'}</td>
        <td style="font-weight:500">${item.name || ''}</td>
        <td class="r">${item.quantity}</td>
        <td style="color:#666;font-size:9pt">${item.unit || '—'}</td>
        ${hasUnitCost ? `<td class="r">${item.unitCost != null ? fmtMoney(item.unitCost) : '—'}</td>` : ''}
        ${hasUnitCost ? `<td class="r" style="font-weight:700">${fmtMoney(item.total ?? (item.unitCost != null ? item.quantity * item.unitCost : 0))}</td>` : ''}
        ${hasSite ? `<td style="font-size:9pt;color:#666">${item.site || '—'}</td>` : ''}
      </tr>`).join('');

    const win = window.open('', '_blank', 'width=1200,height=900');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.reference || 'Receipt'}</title>
  <style>
    @page { size: A4 landscape; margin: 16mm 20mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; font-size:10pt; color:#111; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .doc-hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; }
    .co-name { font-size:22pt; font-weight:800; letter-spacing:-0.5px; }
    .co-sub { font-size:9pt; color:#666; margin-top:3px; }
    .doc-ttl { text-align:right; }
    .doc-ttl h1 { font-size:15pt; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    .doc-meta { font-size:9.5pt; color:#444; margin-top:6px; line-height:1.8; }
    .doc-meta strong { color:#111; }
    .div2 { border:none; border-top:2px solid #111; margin:12px 0; }
    .sup-block { display:flex; gap:40px; background:#f8f8f8; border:1px solid #e5e5e5; border-radius:4px; padding:14px 18px; margin-bottom:16px; }
    .sup-col { flex:1; }
    .sup-label { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#999; margin-bottom:5px; }
    .sup-name { font-size:13pt; font-weight:700; margin-bottom:3px; }
    .sup-detail { font-size:9.5pt; color:#555; line-height:1.8; }
    .mono { font-family:'Courier New',monospace; }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:#111; color:#fff; }
    th { padding:8px 10px; text-align:left; font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; }
    .r { text-align:right; }
    td { padding:8px 10px; border-bottom:1px solid #eee; font-size:9.5pt; }
    tr.alt { background:#fafafa; }
    .gt { display:flex; justify-content:space-between; align-items:center; padding:12px 10px 0; border-top:2px solid #111; }
    .gt-items { font-size:9pt; color:#888; }
    .gt-right { display:flex; align-items:center; gap:16px; }
    .gt-label { font-size:9pt; font-weight:700; text-transform:uppercase; color:#444; letter-spacing:0.06em; }
    .gt-value { font-size:15pt; font-weight:800; font-family:'Courier New',monospace; }
    .notes { margin-top:14px; padding:10px 14px; background:#fffdf0; border:1px solid #e8e3c0; border-radius:4px; font-size:9pt; color:#444; }
    .doc-ftr { margin-top:20px; padding-top:10px; border-top:1px solid #e0e0e0; display:flex; justify-content:space-between; font-size:7.5pt; color:#bbb; }
  </style>
</head>
<body>
  <div class="doc-hdr">
    <div>
      <div class="co-name">SEEGH LTD</div>
      <div class="co-sub">Stock Management System</div>
    </div>
    <div class="doc-ttl">
      <h1>${data.title || 'STOCK RECEIPT'}</h1>
      <div class="doc-meta">
        Ref: <strong>${data.reference || ''}</strong><br>
        Date: <strong>${fmtDateTime(data.createdAt)}</strong>
        ${data.issuedTo ? `<br>${data.type === 'REQUISITION' ? 'Employee' : 'Supplier'}: <strong>${data.issuedTo}</strong>` : ''}
        ${data.status ? `<br>Status: <strong>${data.status.replace(/_/g, ' ')}</strong>` : ''}
      </div>
    </div>
  </div>
  <div class="div2"></div>
  ${supplierBlock}
  <table>
    <thead>
      <tr>
        <th style="width:36px">#</th>
        <th style="width:110px">SKU</th>
        <th>Item Name</th>
        <th class="r" style="width:70px">Qty</th>
        <th style="width:60px">Unit</th>
        ${hasUnitCost ? `<th class="r" style="width:110px">Unit Cost</th>` : ''}
        ${hasUnitCost ? `<th class="r" style="width:130px">Total</th>` : ''}
        ${hasSite ? `<th style="width:90px">Site</th>` : ''}
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="gt">
    <span class="gt-items">${items.length} item${items.length !== 1 ? 's' : ''}</span>
    <div class="gt-right">
      <span class="gt-label">Grand Total</span>
      <span class="gt-value">${fmtMoney(totalAmount)}</span>
    </div>
  </div>
  ${data.notes ? `<div class="notes"><strong>Notes:</strong> ${data.notes}</div>` : ''}
  <div class="doc-ftr">
    <span>Powered by SEEGH LTD Management System</span>
    <span>Printed: ${new Date().toLocaleString('en-GB')}</span>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  const thStyle = { padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fff', background: '#0f1014', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: 13 };

  return (
    <>
      <style>{`
        .sdoc-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 16px 60px; }
        .sdoc-wrap { width:960px;max-width:95vw;display:flex;flex-direction:column; }
        .sdoc-toolbar { background:#111;border-radius:10px 10px 0 0;padding:10px 18px;display:flex;justify-content:space-between;align-items:center; }
        .sdoc-paper { background:#fff;padding:44px 52px 52px;border-radius:0 0 10px 10px;box-shadow:0 8px 40px rgba(0,0,0,.25); }
      `}</style>

      <div className="sdoc-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="sdoc-wrap">
          <div className="sdoc-toolbar">
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
              {data.title || 'Receipt'} — {data.reference}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#fff', color: '#111', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Printer size={14} /> Print / Save PDF
              </button>
              <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: 'rgba(255,255,255,.8)', fontSize: 12, cursor: 'pointer' }}>
                <X size={14} /> Close
              </button>
            </div>
          </div>

          <div className="sdoc-paper">
            {/* Document header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', color: '#0f1014', lineHeight: 1 }}>SEEGH LTD</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>Stock Management System</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 17, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0f1014' }}>
                  {data.title || 'STOCK RECEIPT'}
                </div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 6, lineHeight: 1.9 }}>
                  Ref: <strong style={{ color: '#111' }}>{data.reference}</strong>
                  <br />Date: <strong style={{ color: '#111' }}>{fmtDateTime(data.createdAt)}</strong>
                  {data.issuedTo && (
                    <><br />{data.type === 'REQUISITION' ? 'Employee' : 'Supplier'}: <strong style={{ color: '#111' }}>{data.issuedTo}</strong></>
                  )}
                  {data.status && (
                    <><br />Status: <strong style={{ color: '#111' }}>{data.status.replace(/_/g, ' ')}</strong></>
                  )}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '2px solid #0f1014', marginBottom: 22 }} />

            {/* Supplier info block */}
            {supplier && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, background: '#f8f8f8', border: '1px solid #e5e5e5', borderRadius: 6, padding: '16px 22px', marginBottom: 26 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#999', marginBottom: 6 }}>Supplier</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f1014', marginBottom: 2 }}>{supplier.name}</div>
                  {supplier.code && <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#777', marginBottom: 4 }}>{supplier.code}</div>}
                  {supplier.address && <div style={{ fontSize: 12, color: '#555' }}>{supplier.address}</div>}
                  {(supplier.city || supplier.country) && (
                    <div style={{ fontSize: 12, color: '#555' }}>{[supplier.city, supplier.country].filter(Boolean).join(', ')}</div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 2 }}>
                  {supplier.contactPerson && <div><strong style={{ color: '#333' }}>Contact:</strong> {supplier.contactPerson}</div>}
                  {supplier.email && <div><strong style={{ color: '#333' }}>Email:</strong> {supplier.email}</div>}
                  {supplier.phone && <div><strong style={{ color: '#333' }}>Phone:</strong> {supplier.phone}</div>}
                  {supplier.paymentTerms && <div><strong style={{ color: '#333' }}>Terms:</strong> {supplier.paymentTerms}</div>}
                </div>
              </div>
            )}

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>#</th>
                  <th style={{ ...thStyle, width: 110 }}>SKU</th>
                  <th style={thStyle}>Item Name</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 72 }}>Qty</th>
                  <th style={{ ...thStyle, width: 64 }}>Unit</th>
                  {hasUnitCost && <th style={{ ...thStyle, textAlign: 'right', width: 130 }}>Unit Cost</th>}
                  {hasUnitCost && <th style={{ ...thStyle, textAlign: 'right', width: 140 }}>Total</th>}
                  {hasSite && <th style={{ ...thStyle, width: 100 }}>Site</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#ccc', fontSize: 11 }}>{idx + 1}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11, color: '#555' }}>{item.sku || '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{item.name}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{item.quantity}</td>
                    <td style={{ ...tdStyle, color: '#666', fontSize: 12 }}>{item.unit || '—'}</td>
                    {hasUnitCost && (
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#444' }}>
                        {item.unitCost != null ? fmtMoney(item.unitCost) : '—'}
                      </td>
                    )}
                    {hasUnitCost && (
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                        {fmtMoney(item.total ?? (item.unitCost != null ? item.quantity * item.unitCost : 0))}
                      </td>
                    )}
                    {hasSite && <td style={{ ...tdStyle, color: '#666', fontSize: 12 }}>{item.site || '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Grand total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 12px 0', borderTop: '2px solid #0f1014', marginTop: 0 }}>
              <span style={{ fontSize: 12, color: '#888' }}>{items.length} item{items.length !== 1 ? 's' : ''} total</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555' }}>Grand Total</span>
                <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: '#0f1014' }}>{fmtMoney(totalAmount)}</span>
              </div>
            </div>

            {/* Notes */}
            {data.notes && (
              <div style={{ marginTop: 20, padding: '12px 16px', background: '#fffdf0', border: '1px solid #e8e3c0', borderRadius: 4, fontSize: 12, color: '#444' }}>
                <strong>Notes:</strong> {data.notes}
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 40, paddingTop: 12, borderTop: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#ccc' }}>
              <span>Powered by SEEGH LTD Management System</span>
              <span>Printed: {new Date().toLocaleString('en-GB')}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Build receipt data from a supplier payment object + supplier name
 */
export function buildPaymentReceipt(payment, supplierName = '') {
  return {
    id:          payment.id,
    type:        'PAYMENT',
    title:       payment.type === 'CREDIT' ? 'CREDIT NOTE' : 'PAYMENT RECEIPT',
    reference:   `PAY-${payment.id.slice(-8).toUpperCase()}`,
    issuedTo:    supplierName,
    issuedBy:    payment.adminName ?? '—',
    paymentType: payment.type,
    supplierName,
    createdAt:   payment.date ?? payment.createdAt,
    completedAt: null,
    items:       payment.stock ? [{
      name:     payment.stock.itemName ?? payment.stock.sku,
      sku:      payment.stock.sku,
      quantity: 1,
      unitCost: null,
      total:    null,
    }] : [],
    totalAmount: parseFloat(payment.amount ?? 0),
    notes:       payment.notes ?? payment.reference ?? null,
  };
}
