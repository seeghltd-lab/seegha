import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, Save, MapPin, User, Calendar, DollarSign, AlignLeft, ArrowLeft, Landmark, CheckCircle, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import siteService from '../../../services/siteService';
import { useRole } from '../../../hooks/useRole';

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

export default function AddEditSite() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { path, isAdmin } = useRole();
  const siteListPath = isAdmin ? path('/site-management') : '/sites';
  const isEdit = Boolean(id);
  const fileRef = useRef(null);

  const [form, setForm] = useState({ name: '', location: '', managerName: '', status: 'ACTIVE', description: '', budget: '', startDate: '', endDate: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!isEdit) return;
    siteService.getOne(id).then(site => {
      setForm({ name: site.name, location: site.location, managerName: site.managerName || '', status: site.status, description: site.description || '', budget: site.budget, startDate: site.startDate ? new Date(site.startDate).toISOString().split('T')[0] : '', endDate: site.endDate ? new Date(site.endDate).toISOString().split('T')[0] : '' });
      if (site.image) setImagePreview(`http://localhost:3000${site.image}`);
    }).catch(() => navigate(siteListPath)).finally(() => setLoading(false));
  }, [id]);

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
      if (isEdit) await siteService.update(id, fd);
      else await siteService.create(fd);
      showToast(isEdit ? 'Site updated' : 'Site created');
      setTimeout(() => navigate(siteListPath), 900);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save site', 'error');
    } finally { setSubmitting(false); }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
          {toast.msg}
        </div>
      )}

      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(siteListPath)}><ArrowLeft size={14} /></button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Landmark size={16} style={{ color: 'var(--accent-soft-fg)' }} />
              {isEdit ? 'Edit Site' : 'New Site'}
            </h1>
            <div className="page-head__sub">{isEdit ? 'Update site configuration' : 'Register a new project location'}</div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={() => navigate(siteListPath)}>Cancel</button>
          <button className="stoq-btn stoq-btn--primary" disabled={submitting} onClick={handleSubmit}
            style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Savingâ€¦</> : <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Site'}</>}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Basic info */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><Landmark size={13} /></span>
                Basic Information
              </span>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
            </div>
          </div>

          {/* Financial & Timeline */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><DollarSign size={13} /></span>
                Financial & Timeline
              </span>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Budget (RWF)" required error={errors.budget}>
                <IconInput icon={DollarSign} type="number" value={form.budget} onChange={set('budget')} placeholder="0" error={errors.budget} />
              </Field>
              <Field label="Start Date">
                <IconInput icon={Calendar} type="date" value={form.startDate} onChange={set('startDate')} />
              </Field>
              <Field label="End Date">
                <IconInput icon={Calendar} type="date" value={form.endDate} onChange={set('endDate')} />
              </Field>
            </div>
          </div>

          {/* Description */}
          <div className="stoq-panel">
            <div className="stoq-panel__head"><span className="stoq-panel__title">Description</span></div>
            <div style={{ padding: 16 }}>
              <textarea className="stoq-input" value={form.description} onChange={set('description')} rows={4}
                placeholder="Scope, construction highlights, or notes about this siteâ€¦"
                style={{ height: 'auto', padding: '8px 10px', resize: 'vertical', lineHeight: 1.6 }} />
            </div>
          </div>
        </div>

        {/* Sidebar â€” image */}
        <div className="stoq-panel">
          <div className="stoq-panel__head"><span className="stoq-panel__title">Site Image</span></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--r-md)', background: 'var(--bg-sunk)', border: '2px dashed var(--border)', display: 'grid', placeItems: 'center', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview
                ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ textAlign: 'center', color: 'var(--fg-subtle)' }}>
                    <Upload size={24} style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 11 }}>Click to upload</div>
                  </div>}
            </div>
            <button type="button" className="stoq-btn stoq-btn--sm" onClick={() => fileRef.current?.click()}>
              {imagePreview ? 'Change Image' : 'Select Image'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', textAlign: 'center', lineHeight: 1.5 }}>JPG or PNG, max 5MB</p>
            <input type="file" ref={fileRef} accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </div>
        </div>
      </form>
    </div>
  );
}

