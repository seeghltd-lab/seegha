import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Phone, Briefcase, Camera, Save, AlertCircle, CheckCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import employeeService from '../../../services/employeeService';

function Field({ label, children }) {
  return (
    <div className="stoq-field">
      <label className="stoq-field__label">{label}</label>
      {children}
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

const UpdateEmployee = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '', position: '', status: '' });
  const [profileImg, setProfileImg] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchEmployee = async () => {
    try {
      setIsFetching(true);
      const data = await employeeService.getEmployee(id);
      setFormData({ firstName: data.firstName, lastName: data.lastName, phone: data.phone, position: data.position, status: data.status });
      if (data.profilePicture) setImagePreview(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${data.profilePicture}`);
    } catch { setError('Could not load employee record.'); }
    finally { setIsFetching(false); }
  };

  useEffect(() => { fetchEmployee(); }, [id]);

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
      await employeeService.updateEmployee(id, data);
      showToast('Employee updated successfully');
      setTimeout(() => navigate('/admin/employees'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setIsLoading(false); }
  };

  if (isFetching) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 12 }}>Loading employee…</span>
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
          <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={14} /></button>
          <div>
            <h1>Edit Employee</h1>
            <div className="page-head__sub">Update staff profile and access</div>
          </div>
        </div>
        <div className="page-head__actions">
          <button className="stoq-btn" onClick={() => navigate(-1)}>Cancel</button>
          <button className="stoq-btn stoq-btn--primary" disabled={isLoading} onClick={handleSubmit}
            style={{ opacity: isLoading ? 0.6 : 1 }}>
            {isLoading ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={13} /> Save Changes</>}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--danger-soft)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Personal */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><User size={13} /></span>
                Personal Information
              </span>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="First Name">
                <IconInput icon={User} name="firstName" value={formData.firstName} onChange={handleChange} required />
              </Field>
              <Field label="Last Name">
                <IconInput icon={User} name="lastName" value={formData.lastName} onChange={handleChange} required />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Phone Number">
                  <IconInput icon={Phone} type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                </Field>
              </div>
            </div>
          </div>

          {/* Role & Status */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi__icon"><ShieldCheck size={13} /></span>
                Role & Status
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
              <Field label="Status">
                <div style={{ position: 'relative' }}>
                  <ShieldCheck size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                  <select className="stoq-select" name="status" value={formData.status} onChange={handleChange} style={{ width: '100%', paddingLeft: 30 }}>
                    <option value="ACTIVE">Active</option>
                    <option value="PROBATION">Probation</option>
                    <option value="TERMINATED">Terminated</option>
                    <option value="RESIGNED">Resigned</option>
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
              Change Photo
            </button>
            <input type="file" ref={fileRef} accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </div>
        </div>
      </form>
    </div>
  );
};

export default UpdateEmployee;
