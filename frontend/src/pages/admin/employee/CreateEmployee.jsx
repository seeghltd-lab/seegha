import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Phone, Briefcase, Camera, Save,
  AlertCircle, CheckCircle, RefreshCw, ShieldCheck,
  CreditCard, FileText, Paperclip, Upload, X, Eye,
} from 'lucide-react';
import employeeService from '../../../services/employeeService';
import { loadDraft, clearDraft, useFormDraft } from '../../../hooks/useFormDraft';

const DRAFT_KEY = 'create-employee';

// ── Predefined positions ────────────────────────────────────────────────────

const PREDEFINED_POSITIONS = [
  'Project Manager', 'Site Manager', 'Site Supervisor',
  'Civil Engineer', 'Foreman', 'Safety Officer',
  'Quantity Surveyor', 'Procurement Officer',
  'Inventory Manager', 'Finance Officer',
  'Auditor', 'Standard Staff', 'Sales Clerk',
];

// ── Position Combobox ───────────────────────────────────────────────────────

function PositionCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openDropdown = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  };

  const filtered = PREDEFINED_POSITIONS.filter(p =>
    p.toLowerCase().includes(value.toLowerCase())
  );
  const showDropdown = open && filtered.length > 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Briefcase size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          className="stoq-input"
          style={{ paddingLeft: 30 }}
          value={value}
          onChange={e => { onChange(e.target.value); openDropdown(); }}
          onFocus={openDropdown}
          placeholder="Select or type a custom position…"
          autoComplete="off"
        />
      </div>
      {showDropdown && (
        <div style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999,
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map(p => (
            <div key={p}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, background: value === p ? 'var(--bg-sunk)' : 'transparent' }}
              onMouseDown={e => { e.preventDefault(); onChange(p); setOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunk)'}
              onMouseLeave={e => e.currentTarget.style.background = value === p ? 'var(--bg-sunk)' : 'transparent'}
            >
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── File Upload Zone ────────────────────────────────────────────────────────

function FileUploadZone({ label, hint, accept, icon: Icon, file, preview, onFile, onClear, isImage }) {
  const ref = useRef(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      {file ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          background: 'var(--bg-sunk)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
        }}>
          {isImage && preview ? (
            <img src={preview} alt="" style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon size={18} style={{ color: 'var(--accent)' }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{(file.size / 1024).toFixed(0)} KB</div>
          </div>
          <button type="button" className="icon-btn" style={{ color: 'var(--danger)', flexShrink: 0 }} onClick={onClear}>
            <X size={13} />
          </button>
        </div>
      ) : (
        <div
          style={{
            border: '2px dashed var(--border)', borderRadius: 'var(--r-md)',
            padding: '18px 12px', textAlign: 'center', cursor: 'pointer',
            background: 'var(--bg-sunk)', transition: 'border-color 0.15s',
          }}
          onClick={() => ref.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'var(--border)';
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
          }}
        >
          <Icon size={20} style={{ color: 'var(--fg-subtle)', marginBottom: 6 }} />
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500 }}>Click or drag to upload</div>
          <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2 }}>{hint}</div>
        </div>
      )}
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
    </div>
  );
}

// ── Field wrapper ───────────────────────────────────────────────────────────

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

function IconInput({ icon: Icon, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
      <input className="stoq-input" style={{ paddingLeft: 30 }} {...props} />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

const CreateEmployee = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const photoRef = useRef(null);

  const draft = loadDraft(DRAFT_KEY);
  const [formData, setFormData] = useState(draft ?? {
    firstName: '', lastName: '', email: '', phone: '',
    position: 'Standard Staff', status: 'ACTIVE',
  });

  useFormDraft(DRAFT_KEY, formData);

  // File states
  const [profileImg, setProfileImg]       = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const [idCardFile, setIdCardFile]       = useState(null);
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [cvFile, setCvFile]               = useState(null);
  const [supportingFile, setSupportingFile] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };
  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const pickImagePreview = (file, setPreview) => {
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleProfileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setProfileImg(f); pickImagePreview(f, setImagePreview); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = new FormData();
      Object.keys(formData).forEach(k => data.append(k, formData[k]));
      if (profileImg)      data.append('profileImg',      profileImg);
      if (idCardFile)      data.append('idCardImage',     idCardFile);
      if (cvFile)          data.append('cvDocument',      cvFile);
      if (supportingFile)  data.append('supportingDocument', supportingFile);

      await employeeService.createEmployee(data);
      clearDraft(DRAFT_KEY);
      setSuccess(true);
      showToast('Employee created successfully');
      setTimeout(() => navigate('/admin/employees'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee');
    } finally { setIsLoading(false); }
  };

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
          <button className="icon-btn" onClick={() => navigate('/admin/employees')}><ArrowLeft size={14} /></button>
          <div>
            <h1>New Employee</h1>
            <div className="page-head__sub">Register a new staff member</div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={() => navigate('/admin/employees')}>Cancel</button>
          <button className="stoq-btn stoq-btn--primary" disabled={isLoading || success} onClick={handleSubmit}
            style={{ opacity: isLoading ? 0.6 : 1 }}>
            {isLoading
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</>
              : <><Save size={13} /> Create Employee</>}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Personal Information */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><User size={13} /></span>
                Personal Information
              </span>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="First Name" required>
                <IconInput icon={User} name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First name" required />
              </Field>
              <Field label="Last Name" required>
                <IconInput icon={User} name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last name" required />
              </Field>
              <Field label="Email Address" required>
                <IconInput icon={Mail} type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@company.com" required />
              </Field>
              <Field label="Phone Number" required>
                <IconInput icon={Phone} type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+250 788 000 000" required />
              </Field>
            </div>
          </div>

          {/* Role & Access */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><Briefcase size={13} /></span>
                Role & Access
              </span>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Position">
                <PositionCombobox value={formData.position} onChange={v => setFormData(p => ({ ...p, position: v }))} />
              </Field>
              <Field label="Initial Status">
                <div style={{ position: 'relative' }}>
                  <ShieldCheck size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                  <select className="stoq-select" name="status" value={formData.status} onChange={handleChange} style={{ width: '100%', paddingLeft: 30 }}>
                    <option value="ACTIVE">Active</option>
                    <option value="PROBATION">Probation</option>
                  </select>
                </div>
              </Field>
            </div>
          </div>

          {/* Documents */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><Paperclip size={13} /></span>
                Documents
              </span>
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Optional — upload employee documents</span>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <FileUploadZone
                label="ID Card"
                hint="JPG, PNG · max 10 MB"
                accept="image/*"
                icon={CreditCard}
                isImage
                file={idCardFile}
                preview={idCardPreview}
                onFile={f => { setIdCardFile(f); pickImagePreview(f, setIdCardPreview); }}
                onClear={() => { setIdCardFile(null); setIdCardPreview(null); }}
              />
              <FileUploadZone
                label="CV / Résumé"
                hint="PDF, DOC, DOCX · max 10 MB"
                accept=".pdf,.doc,.docx"
                icon={FileText}
                isImage={false}
                file={cvFile}
                preview={null}
                onFile={f => setCvFile(f)}
                onClear={() => setCvFile(null)}
              />
              <FileUploadZone
                label="Supporting Document"
                hint="PDF, DOC, DOCX · max 10 MB"
                accept=".pdf,.doc,.docx"
                icon={Paperclip}
                isImage={false}
                file={supportingFile}
                preview={null}
                onFile={f => setSupportingFile(f)}
                onClear={() => setSupportingFile(null)}
              />
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="stoq-panel">
          <div className="stoq-panel__head"><span className="stoq-panel__title">Profile Photo</span></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              style={{ width: 100, height: 100, borderRadius: 'var(--r-md)', background: 'var(--bg-sunk)', border: '2px dashed var(--border)', display: 'grid', placeItems: 'center', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => photoRef.current?.click()}
            >
              {imagePreview
                ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Camera size={28} style={{ color: 'var(--fg-subtle)' }} />}
            </div>
            <button type="button" className="stoq-btn stoq-btn--sm" onClick={() => photoRef.current?.click()}>
              {imagePreview ? 'Change Photo' : 'Select Photo'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', textAlign: 'center', lineHeight: 1.5 }}>
              JPG or PNG, max 5 MB. A temporary password will be emailed automatically.
            </p>
            <input type="file" ref={photoRef} accept="image/*" onChange={handleProfileChange} style={{ display: 'none' }} />
          </div>
        </div>
      </form>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
};

export default CreateEmployee;
