import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Save, MapPin, User, Calendar, DollarSign, AlignLeft, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import siteService from '../../../services/siteService';

function Field({ label, required, error, children }) {
  return (
    <div className="stoq-field">
      <label className="stoq-field__label">
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: 11, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </div>
  );
}

function IconInput({ icon: Icon, error, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
      <input className="stoq-input" style={{ paddingLeft: 30, ...(error ? { borderColor: 'var(--danger)' } : {}) }} {...props} />
    </div>
  );
}

export default function AddEditSiteModal({ site, onClose, onRefresh }) {
  const isEdit = Boolean(site);
  const fileRef = useRef(null);

  const [form, setForm] = useState({ name: '', location: '', managerName: '', status: 'ACTIVE', description: '', budget: '', startDate: '', endDate: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (site) {
      setForm({ name: site.name, location: site.location, managerName: site.managerName || '', status: site.status, description: site.description || '', budget: site.budget, startDate: site.startDate ? new Date(site.startDate).toISOString().split('T')[0] : '', endDate: site.endDate ? new Date(site.endDate).toISOString().split('T')[0] : '' });
      if (site.image) setImagePreview(`http://localhost:3000${site.image}`);
    }
  }, [site]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.location.trim()) errs.location = 'Location is required';
    if (form.budget === '' || parseFloat(form.budget) < 0) errs.budget = 'Valid budget required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v); });
      if (imageFile) fd.append('image', imageFile);
      if (isEdit) await siteService.update(site.id, fd);
      else await siteService.create(fd);
      onRefresh();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save site');
    } finally { setSubmitting(false); }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  return (
    <div className="stoq-modal-backdrop">
      <div className="stoq-modal stoq-modal--wide" style={{ maxHeight: 'calc(100vh - 80px)' }}>
        <div className="stoq-modal__head">
          <div>
            <div className="stoq-modal__title">{isEdit ? 'Edit Site' : 'New Site'}</div>
            <div className="stoq-modal__sub">{isEdit ? 'Update site configuration' : 'Register a new project location'}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit} className="stoq-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Image upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', background: 'var(--bg-sunk)', borderRadius: 'var(--r-md)', border: '1px dashed var(--border)' }}>
            <div style={{ width: 80, height: 60, borderRadius: 'var(--r-sm)', background: 'var(--panel)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => fileRef.current?.click()}>
              {imagePreview
                ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Upload size={18} style={{ color: 'var(--fg-subtle)' }} />}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>Site Image</div>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>JPG, PNG under 5MB</div>
              <button type="button" className="stoq-btn stoq-btn--sm" style={{ marginTop: 6 }} onClick={() => fileRef.current?.click()}>Select File</button>
            </div>
            <input type="file" ref={fileRef} accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </div>

          {/* Fields grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Site Name" required error={errors.name}>
              <IconInput icon={AlignLeft} value={form.name} onChange={set('name')} placeholder="e.g. Kicukiro HQ" error={errors.name} />
            </Field>
            <Field label="Location" required error={errors.location}>
              <IconInput icon={MapPin} value={form.location} onChange={set('location')} placeholder="e.g. Kigali, Rwanda" error={errors.location} />
            </Field>
            <Field label="Site Manager">
              <IconInput icon={User} value={form.managerName} onChange={set('managerName')} placeholder="e.g. John Doe" />
            </Field>
            <Field label="Status">
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                <select className="stoq-select" value={form.status} onChange={set('status')} style={{ width: '100%', paddingLeft: 30 }}>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </Field>
            <Field label="Budget (RWF)" required error={errors.budget}>
              <IconInput icon={DollarSign} type="number" value={form.budget} onChange={set('budget')} placeholder="0" error={errors.budget} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Start Date">
                <input type="date" className="stoq-input" value={form.startDate} onChange={set('startDate')} />
              </Field>
              <Field label="End Date">
                <input type="date" className="stoq-input" value={form.endDate} onChange={set('endDate')} />
              </Field>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Description">
                <textarea className="stoq-input" value={form.description} onChange={set('description')} rows={3}
                  placeholder="Scope, highlights, or notes…"
                  style={{ height: 'auto', padding: '8px 10px', resize: 'none', lineHeight: 1.6 }} />
              </Field>
            </div>
          </div>
        </form>

        <div className="stoq-modal__foot">
          <button className="stoq-btn" onClick={onClose}>Cancel</button>
          <button className="stoq-btn stoq-btn--primary" disabled={submitting} onClick={handleSubmit}
            style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Site'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
