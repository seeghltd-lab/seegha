import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Briefcase, Camera, Save, AlertCircle, CheckCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import employeeService from '../../../services/employeeService';

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

const CreateEmployee = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', position: 'Standard Staff', status: 'ACTIVE' });
  const [profileImg, setProfileImg] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImg(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (profileImg) data.append('profileImg', profileImg);
      await employeeService.createEmployee(data);
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
            {isLoading ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Save size={13} /> Create Employee</>}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Identity */}
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

          {/* Role */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><Briefcase size={13} /></span>
                Role & Access
              </span>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Position">
                <div style={{ position: 'relative' }}>
                  <Briefcase size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                  <select className="stoq-select" name="position" value={formData.position} onChange={handleChange} style={{ width: '100%', paddingLeft: 30 }}>
                    {['Inventory Manager', 'Standard Staff', 'Sales Clerk', 'Finance Officer', 'Auditor'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
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
        </div>

        {/* Sidebar — avatar */}
        <div className="stoq-panel">
          <div className="stoq-panel__head"><span className="stoq-panel__title">Profile Photo</span></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              style={{ width: 100, height: 100, borderRadius: 'var(--r-md)', background: 'var(--bg-sunk)', border: '2px dashed var(--border)', display: 'grid', placeItems: 'center', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview
                ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Camera size={28} style={{ color: 'var(--fg-subtle)' }} />}
            </div>
            <button type="button" className="stoq-btn stoq-btn--sm" onClick={() => fileRef.current?.click()}>
              Select Photo
            </button>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', textAlign: 'center', lineHeight: 1.5 }}>
              JPG or PNG, max 2MB. Optional — a password will be auto-generated and emailed.
            </p>
            <input type="file" ref={fileRef} accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateEmployee;
