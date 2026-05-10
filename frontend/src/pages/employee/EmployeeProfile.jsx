import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, Lock, User, Mail, Phone, RefreshCw, AlertCircle, CheckCircle, ShieldCheck, Briefcase, Smartphone } from 'lucide-react';
import employeeAuthService from '../../services/employeeAuthService';
import PWAPanel from '../../components/PWAPanel';

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

export default function EmployeeProfile() {
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '', position: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setLoading(true);
    employeeAuthService.getProfile().then(data => {
      setProfile({ firstName: data.firstName || '', lastName: data.lastName || '', email: data.email || '', phone: data.phone || '', position: data.position || '' });
      if (data.profilePicture) setAvatarPreview(`http://localhost:3000${data.profilePicture}`);
    }).catch(() => showToast('Failed to load profile', 'error')).finally(() => setLoading(false));
  }, []);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profile.firstName || !profile.email) return showToast('First name and email are required', 'error');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(profile).forEach(([k, v]) => fd.append(k, v));
      if (avatarFile) fd.append('profilePicture', avatarFile);
      await employeeAuthService.updateProfile(fd);
      showToast('Profile updated successfully');
      setAvatarFile(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!passwords.currentPassword) return showToast('Current password required', 'error');
    if (passwords.newPassword.length < 6) return showToast('New password too short (min 6 chars)', 'error');
    if (passwords.newPassword !== passwords.confirmPassword) return showToast('Passwords do not match', 'error');
    setSaving(true);
    try {
      await employeeAuthService.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      showToast('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 12 }}>Loading profile…</span>
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
        <div>
          <h1>My Profile</h1>
          <div className="page-head__sub">Manage your account information</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, alignItems: 'start' }}>
        {/* Sidebar */}
        <div className="stoq-panel">
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { key: 'general', icon: User, label: 'Account Info' },
              { key: 'security', icon: ShieldCheck, label: 'Password' },
              { key: 'pwa', icon: Smartphone, label: 'App & PWA' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 'var(--r-sm)',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 12, fontWeight: 600,
                  background: activeTab === key ? 'var(--accent-soft)' : 'transparent',
                  color: activeTab === key ? 'var(--accent-soft-fg)' : 'var(--fg-muted)',
                }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          {activeTab === 'general' && (
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Avatar */}
              <div className="stoq-panel">
                <div className="stoq-panel__head"><span className="stoq-panel__title">Display Photo</span></div>
                <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', overflow: 'hidden', border: '3px solid var(--border)' }}>
                      {avatarPreview
                        ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <User size={28} />}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--fg)', color: 'var(--bg)', display: 'grid', placeItems: 'center', border: '2px solid var(--panel)' }}>
                      <Camera size={11} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>Click to change photo</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>JPG, PNG — max 2MB</div>
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
                </div>
              </div>

              <div className="stoq-panel">
                <div className="stoq-panel__head"><span className="stoq-panel__title">Personal Information</span></div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="First Name">
                    <IconInput icon={User} value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} placeholder="First name" />
                  </Field>
                  <Field label="Last Name">
                    <IconInput icon={User} value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} placeholder="Last name" />
                  </Field>
                  <Field label="Email Address">
                    <IconInput icon={Mail} type="email" value={profile.email} disabled placeholder="email@domain.com" style={{ opacity: 0.6 }} />
                    <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>Contact management to change email</span>
                  </Field>
                  <Field label="Phone Number">
                    <IconInput icon={Phone} value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+250…" />
                  </Field>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Position / Role">
                      <IconInput icon={Briefcase} value={profile.position} disabled style={{ opacity: 0.6 }} />
                      <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>Assigned by management</span>
                    </Field>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="stoq-btn stoq-btn--primary" disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
                  {saving ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={13} /> Save Changes</>}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="stoq-panel">
                <div className="stoq-panel__head">
                  <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="kpi__icon"><ShieldCheck size={13} /></span>
                    Change Password
                  </span>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Field label="Current Password">
                    <IconInput icon={Lock} type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} />
                  </Field>
                  <Field label="New Password">
                    <IconInput icon={Lock} type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} />
                  </Field>
                  <Field label="Confirm New Password">
                    <IconInput icon={Lock} type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
                  </Field>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="stoq-btn stoq-btn--primary" disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
                  {saving ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={13} /> Update Password</>}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'pwa' && <PWAPanel />}
        </div>
      </div>
    </div>
  );
}
