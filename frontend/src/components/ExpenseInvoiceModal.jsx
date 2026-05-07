import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';

const fmtMoney = (n) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(n ?? 0));

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const fmtDateShort = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB') : '—';

export default function ExpenseInvoiceModal({ expense, siteName, onClose }) {
  const docRef = useRef();
  if (!expense) return null;

  const refNo   = expense.reference || `EXP-${expense.id.slice(-8).toUpperCase()}`;
  const amount  = Number(expense.amount ?? 0);
  const expDate = fmtDate(expense.date || expense.createdAt);
  const today   = fmtDate(new Date());

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=1980,height=900');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Expense Note – ${refNo}</title>
  <style>
    @page { size: A4; margin: 20mm 24mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #222;
      background: #fff;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header { font-size: 18pt; font-weight: 700; margin-bottom: 3px; }
    .subheader { font-size: 9pt; color: #666; margin-bottom: 20px; }
    .divider { border: none; border-top: 1.5px solid #333; margin: 12px 0; }
    .to-block { margin-bottom: 18px; }
    .to-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 4px; }
    .to-name { font-size: 11pt; font-weight: 700; }
    .to-detail { font-size: 10pt; color: #555; }
    .subject { background: #f5f5f8; border-left: 3px solid #333; padding: 10px 12px; margin-bottom: 20px; }
    .subject-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #666; }
    .subject-text { font-size: 11pt; font-weight: 600; margin-top: 2px; }
    .body-text { text-align: justify; margin-bottom: 12px; font-size: 10.5pt; line-height: 1.7; }
    .detail-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
    .detail-table thead { background: #333; color: #fff; }
    .detail-table th { padding: 8px 10px; text-align: left; font-weight: 700; font-size: 9pt; text-transform: uppercase; }
    .detail-table td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
    .detail-table tbody tr:last-child td { border-bottom: 1.5px solid #333; }
    .amount-right { text-align: right; font-weight: 600; }
    .closing { margin-top: 20px; margin-bottom: 12px; font-size: 10.5pt; }
    .sigs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; }
    .sig-block { text-align: center; }
    .sig-space { height: 40px; }
    .sig-line { border-top: 1px solid #333; padding-top: 4px; font-size: 9pt; font-weight: 600; }
    .sig-role { font-size: 8pt; color: #666; margin-top: 2px; }
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 8pt; color: #999; text-align: center; }
    .print-hide { display: none !important; }
  </style>
</head>
<body>
  ${docRef.current.innerHTML}
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  return (
    <>
      <style>{`
        .ltr-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;overflow-y:auto;padding:24px 16px 60px;justify-content:center; }
        .ltr-wrap { width: 100%; max-width: 760px; display: flex; flex-direction: column; }
        .ltr-toolbar { background: #1c1c2e; border-radius: 10px 10px 0 0; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center; }
        .ltr-toolbar__title { font-size: 13px; font-weight: 600; color: #fff; font-family: sans-serif; }
        .ltr-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 6px; border: none; background: #fff; color: #1c1c2e; font-size: 12px; font-weight: 600; cursor: pointer; font-family: sans-serif; }
        .ltr-btn--ghost { background: transparent; color: rgba(255,255,255,.8); border: 1px solid rgba(255,255,255,.3); }
        .ltr-paper { background: #fff; border-radius: 0 0 10px 10px; padding: 50px 56px 56px; box-shadow: 0 8px 40px rgba(0,0,0,.2); }
      `}</style>

      <div className="ltr-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="ltr-wrap">

          {/* Toolbar */}
          <div className="ltr-toolbar">
            <span className="ltr-toolbar__title">Expense Note — {refNo}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ltr-btn" onClick={handlePrint}><Printer size={14} /> Print / Save PDF</button>
              <button className="ltr-btn ltr-btn--ghost" onClick={onClose}><X size={14} /> Close</button>
            </div>
          </div>

          {/* Letter */}
          <div className="ltr-paper" ref={docRef}>

            {/* Letterhead */}
            <div className="header">SEEGH LTD</div>
            <div className="subheader">Finance & Operations Division</div>
            <div className="divider" />

            {/* Recipient */}
            <div className="to-block">
              <div className="to-label">To:</div>
              <div className="to-name">The Site Manager</div>
              <div className="to-detail">{siteName || 'Site'}</div>
            </div>

            {/* Subject */}
            <div className="subject">
              <div className="subject-label">Subject: Expense Note</div>
              <div className="subject-text">{expense.description}</div>
            </div>

            {/* Body */}
            <p className="body-text">
              We hereby acknowledge receipt of the expense detailed below for <strong>{siteName || 'the site'}</strong>,
              recorded under category <strong>{expense.category || 'General'}</strong> by <strong>{expense.recordedBy || 'Staff'}</strong>.
              This document serves as an official record for your files and audit purposes.
            </p>

            {/* Expense Details */}
            <table className="detail-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>No.</th>
                  <th style={{ width: '45%' }}>Description</th>
                  <th style={{ width: '20%' }}>Category</th>
                  <th style={{ width: '15%' }}>Date</th>
                  <th style={{ width: '15%' }}>Amount (RWF)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>01</td>
                  <td><strong>{expense.description}</strong></td>
                  <td>{expense.category || '—'}</td>
                  <td>{expDate}</td>
                  <td className="amount-right"><strong>{fmtMoney(amount)}</strong></td>
                </tr>
              </tbody>
            </table>

            {/* Notes */}
            {expense.notes && (
              <p className="body-text">
                <strong>Remarks:</strong> {expense.notes}
              </p>
            )}

            {/* Closing paragraph */}
            <p className="closing">
              Please acknowledge receipt of this document. Should you require any clarification, contact the Finance office.
            </p>

            <p className="closing">Yours faithfully,</p>

            {/* Signatures */}
            <div className="sigs">
              <div className="sig-block">
                <div className="sig-space" />
                <div className="sig-line">{expense.recordedBy || 'Staff'}</div>
                <div className="sig-role">Prepared By</div>
              </div>
              <div className="sig-block">
                <div className="sig-space" />
                <div className="sig-line">___________________</div>
                <div className="sig-role">Approved By / Manager</div>
              </div>
              <div className="sig-block">
                <div className="sig-space" />
                <div className="sig-line">___________________</div>
                <div className="sig-role">Received &amp; Acknowledged</div>
              </div>
            </div>

            {/* Footer */}
            <div className="footer">
              <div>SEEGH LTD — Confidential</div>
              <div>Reference: {refNo} | Generated: {fmtDateShort(new Date())}</div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
