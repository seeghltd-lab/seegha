import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, Save, Mail, User, Phone, MapPin, Map,
  AlertCircle, CheckCircle, Globe, CreditCard, Star, FileText,
  RefreshCw, ShieldCheck,
} from 'lucide-react';
import supplierService from '../../../services/supplierService';
import { useRole } from '../../../hooks/useRole';
import { loadDraft, clearDraft, useFormDraft } from '../../../hooks/useFormDraft';

const emptyForm = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  city: '',
  address: '',
  country: 'Rwanda',
  paymentTerms: '',
  rating: 0,
  status: 'ACTIVE',
  notes: '',
};

// --- Reusable field wrapper ---

function Field({ label, required, error, children }) {
  return (
    <div className="stoq-field">
      <label className="stoq-field__label">
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: 11, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </div>
  );
}

// --- Input with leading icon ---

function IconInput({ icon: Icon, error, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={13} style={{
        position: 'absolute', left: 10, top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--fg-subtle)', pointerEvents: 'none',
      }} />
      <input
        className="stoq-input"
        style={{ paddingLeft: 30, ...(error ? { borderColor: 'var(--danger)' } : {}) }}
        {...props}
      />
    </div>
  );
}

// --- Star rating picker ---

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(i === value ? 0 : i)}
            style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', lineHeight: 1 }}
          >
            <Star
              size={18}
              style={{
                color: i <= display ? 'var(--warning)' : 'var(--border-strong)',
                fill: i <= display ? 'var(--warning)' : 'var(--border-strong)',
                transition: 'color 0.1s, fill 0.1s',
              }}
            />
          </button>
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
        {value > 0 ? `${value}.0 / 5.0` : 'Not rated'}
      </span>
    </div>
  );
}

// --- Section header ---

function SectionHead({ icon: Icon, title, sub }) {
  return (
    <div className="stoq-panel__head">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="kpi__icon"><Icon size={13} /></span>
        <span className="stoq-panel__title">{title}</span>
        {sub && <span className="stoq-panel__sub">{sub}</span>}
      </div>
    </div>
  );
}

// --- Main component ---

export default function AddEditSupplier() {
  const navigate = useNavigate();
  const { path } = useRole();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const draftKey = isEdit ? `edit-supplier-${id}` : 'add-supplier';

  const draft = isEdit ? null : loadDraft(draftKey);
  const [form, setForm] = useState(draft ?? emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [code, setCode] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setVal = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useFormDraft(draftKey, form, !loading);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    supplierService.getOne(id)
      .then(sup => {
        setCode(sup.code);
        const editDraft = loadDraft(draftKey);
        setForm(editDraft ?? {
          name: sup.name || '',
          contactPerson: sup.contactPerson || '',
          email: sup.email || '',
          phone: sup.phone || '',
          city: sup.city || '',
          address: sup.address || '',
          country: sup.country || 'Rwanda',
          paymentTerms: sup.paymentTerms || '',
          rating: sup.rating || 0,
          status: sup.status || 'ACTIVE',
          notes: sup.notes || '',
        });
      })
      .catch(() => showToast('Failed to load supplier', 'error'))
      .finally(() => setLoading(false));
  }, [id, isEdit, draftKey]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Supplier name is required';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        rating: Number(form.rating),
      };
      if (isEdit) {
        await supplierService.update(id, payload);
        showToast('Supplier updated successfully');
      } else {
        await supplierService.create(payload);
        showToast('Supplier created successfully');
      }
      clearDraft(draftKey);
      setTimeout(() => navigate(path('/suppliers')), 900);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save supplier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 12 }}>Loading supplier...</span>
    </div>
  );

  return (
    <div style={{ padding: '20px 24px 40px' }}>

      {/* Toast */}
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
          {toast.message}
        </div>
      )}

      {/* Page head */}
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(path('/suppliers'))}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1>{isEdit ? 'Edit Supplier' : 'New Supplier'}</h1>
            <div className="page-head__sub">
              {isEdit
                ? <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>{code}</span>
                : 'Fill in the details below to register a new supplier'}
            </div>
          </div>
        </div>
        <div className="page-head__actions">
          <button type="button" className="stoq-btn" onClick={() => navigate(path('/suppliers'))}>
            Cancel
          </button>
          <button
            type="button"
            className="stoq-btn stoq-btn--primary"
            disabled={submitting}
            onClick={handleSubmit}
            style={{ opacity: submitting ? 0.6 : 1 }}
          >
            {submitting
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              : <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Supplier'}</>
            }
          </button>
        </div>
      </div>

      {/* Two-column layout: main form + sidebar */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, alignItems: 'start' }}>

        {/* -- LEFT COLUMN -- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Identity */}
          <div className="stoq-panel">
            <SectionHead icon={Building2} title="Identity" sub="Basic supplier information" />
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Supplier Name" required error={errors.name}>
                  <IconInput icon={Building2} value={form.name} onChange={set('name')}
                    placeholder="e.g. Example Supplies Ltd" error={errors.name} />
                </Field>
              </div>
              <Field label="Contact Person">
                <IconInput icon={User} value={form.contactPerson} onChange={set('contactPerson')}
                  placeholder="e.g. John Doe" />
              </Field>
              <Field label="Payment Terms">
                <IconInput icon={CreditCard} value={form.paymentTerms} onChange={set('paymentTerms')}
                  placeholder="e.g. Net 30, COD" />
              </Field>
            </div>
          </div>

          {/* Contact */}
          <div className="stoq-panel">
            <SectionHead icon={Phone} title="Contact Information" />
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Email Address" error={errors.email}>
                <IconInput icon={Mail} type="email" value={form.email} onChange={set('email')}
                  placeholder="contact@example.com" error={errors.email} />
              </Field>
              <Field label="Phone Number">
                <IconInput icon={Phone} value={form.phone} onChange={set('phone')}
                  placeholder="+250 788 123 456" />
              </Field>
              <Field label="City">
                <IconInput icon={Map} value={form.city} onChange={set('city')}
                  placeholder="e.g. Kigali" />
              </Field>
              <Field label="Country">
                <IconInput icon={Globe} value={form.country} onChange={set('country')}
                  placeholder="e.g. Rwanda" />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Street Address">
                  <IconInput icon={MapPin} value={form.address} onChange={set('address')}
                    placeholder="e.g. KG 123 St, Kigali" />
                </Field>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="stoq-panel">
            <SectionHead icon={FileText} title="Notes" sub="Internal remarks about this supplier" />
            <div style={{ padding: 16 }}>
              <textarea
                className="stoq-input"
                value={form.notes}
                onChange={set('notes')}
                rows={4}
                placeholder="Any internal notes, special conditions, or remarks about this supplier..."
                style={{ height: 'auto', padding: '8px 10px', resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>
          </div>

        </div>

        {/* -- RIGHT COLUMN (sidebar) -- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Status */}
          <div className="stoq-panel">
            <SectionHead icon={ShieldCheck} title="Status" />
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { val: 'ACTIVE', label: 'Active', sub: 'Supplier is operational', badge: 'stoq-badge--success' },
                { val: 'INACTIVE', label: 'Inactive', sub: 'Temporarily not in use', badge: '' },
                { val: 'SUSPENDED', label: 'Suspended', sub: 'Blocked from new orders', badge: 'stoq-badge--danger' },
              ].map(({ val, label, sub, badge }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setVal('status', val)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 'var(--r-sm)',
                    border: `1px solid ${form.status === val ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.status === val ? 'var(--accent-soft)' : 'var(--panel)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: form.status === val ? 'var(--accent)' : 'var(--border-strong)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: form.status === val ? 'var(--accent-soft-fg)' : 'var(--fg)' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{sub}</div>
                  </div>
                  {form.status === val && (
                    <span className={`stoq-badge ${badge}`} style={{ flexShrink: 0 }}>{label}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="stoq-panel">
            <SectionHead icon={Star} title="Rating" sub="Supplier performance score" />
            <div style={{ padding: 16 }}>
              <StarPicker value={form.rating} onChange={(v) => setVal('rating', v)} />
              <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 10, lineHeight: 1.5 }}>
                Rate this supplier's reliability, quality, and delivery performance.
              </p>
            </div>
          </div>

          {/* Summary card (edit mode) */}
          {isEdit && (
            <div className="stoq-panel" style={{ background: 'var(--bg-sunk)', border: '1px solid var(--border)' }}>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 10 }}>
                  Supplier Code
                </div>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: '0.06em' }}>
                  {code}
                </code>
                <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6, lineHeight: 1.5 }}>
                  Auto-generated code. Cannot be changed.
                </p>
              </div>
            </div>
          )}

        </div>
      </form>
    </div>
  );
}

