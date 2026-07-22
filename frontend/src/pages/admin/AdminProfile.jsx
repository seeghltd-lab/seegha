import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Save, Lock, User, Mail, Phone, RefreshCw,
  AlertCircle, CheckCircle, ShieldCheck, Smartphone,
  Eye, EyeOff, KeyRound, Shield,
} from 'lucide-react';
import adminAuthService from '../../services/adminAuthService';
import { useAdminAuth } from '../../context/AdminAuthContext';
import PWAPanel from '../../components/PWAPanel';

/* ── Password strength ── */
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: '',         color: 'transparent' },
    { label: 'Weak',     color: 'var(--danger)' },
    { label: 'Fair',     color: 'var(--warning)' },
    { label: 'Good',     color: 'var(--warning)' },
    { label: 'Strong',   color: 'var(--success)' },
    { label: 'Excellent',color: 'var(--success)' },
  ];
  return { score, ...map[Math.min(score, 5)] };
}

function validateProfile(p) {
  const e = {};
  if (!p.names?.trim()) e.names = 'Full name is required';
  if (!p.email?.trim()) e.email = 'Email address is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) e.email = 'Enter a valid email';
  return e;
}

function validatePassword(pw) {
  const e = {};
  if (!pw.currentPassword) e.currentPassword = 'Required';
  if (!pw.newPassword || pw.newPassword.length < 6) e.newPassword = 'Minimum 6 characters';
  if (!pw.confirmPassword) e.confirmPassword = 'Please confirm your password';
  else if (pw.newPassword !== pw.confirmPassword) e.confirmPassword = 'Passwords do not match';
  return e;
}

/* ── Reusable Field ── */
function Field({ label, error, hint, children }) {
  return (
    <div className="stoq-field">
      <label className="stoq-field__label">{label}</label>
      {children}
      {error
        ? <span style={{ fontSize: 11, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <AlertCircle size={10} /> {error}
          </span>
        : hint
          ? <span style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{hint}</span>
          : null}
    </div>
  );
}

/* ── Icon-prefixed input ── */
function IconInput({ icon: Icon, suffix, ...props }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Icon size={13} style={{ position: 'absolute', left: 10, color: 'var(--fg-subtle)', pointerEvents: 'none', flexShrink: 0 }} />
      <input className="stoq-input" style={{ paddingLeft: 30, paddingRight: suffix ? 36 : undefined, width: '100%' }} {...props} />
      {suffix && <div style={{ position: 'absolute', right: 2 }}>{suffix}</div>}
    </div>
  );
}

/* ── Password input with show/hide toggle ── */
function PasswordInput({ icon: Icon = KeyRound, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <IconInput
      icon={Icon}
      type={show ? 'text' : 'password'}
      suffix={
        <button type="button" onClick={() => setShow(s => !s)}
          style={{ width: 32, height: 28, display: 'grid', placeItems: 'center', background: 'none', border: 'none', color: 'var(--fg-subtle)', cursor: 'pointer', borderRadius: 4 }}>
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      }
      {...props}
    />
  );
}

/* ── Strength bar ── */
function StrengthBar({ password }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? color : 'var(--border)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      {label && <div style={{ fontSize: 10, color, fontWeight: 600, marginTop: 3 }}>{label}</div>}
    </div>
  );
}

/* ── Tab definitions ── */
const TABS = [
  { key: 'general',  icon: User,       label: 'General Info' },
  { key: 'security', icon: ShieldCheck, label: 'Security' },
  { key: 'pwa',      icon: Smartphone,  label: 'App & PWA' },
];

/* ════════════════════════════════════════════════════════════ */

export default function AdminProfile() {
  const { refreshProfile } = useAdminAuth();

  const [profile, setProfile]     = useState({ names: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile]       = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  const [profileErrors,  setProfileErrors]  = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setLoading(true);
    adminAuthService.getProfile()
      .then(data => {
        setProfile({ names: data.names || '', email: data.email || '', phone: data.phone || '' });
        if (data.profilePicture) setAvatarPreview(data.profilePicture);
      })
      .catch(() => showToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('File too large — max 2 MB', 'error'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const errs = validateProfile(profile);
    if (Object.keys(errs).length) { setProfileErrors(errs); return; }
    setProfileErrors({});
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('names', profile.names);
      fd.append('email', profile.email);
      fd.append('phone', profile.phone);
      if (avatarFile) fd.append('profilePicture', avatarFile);
      const updated = await adminAuthService.editProfile(fd);
      if (updated?.profilePicture) setAvatarPreview(updated.profilePicture);
      showToast('Profile updated successfully');
      setAvatarFile(null);
      await refreshProfile();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const errs = validatePassword(passwords);
    if (Object.keys(errs).length) { setPasswordErrors(errs); return; }
    setPasswordErrors({});
    setSaving(true);
    try {
      await adminAuthService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword:     passwords.newPassword,
      });
      showToast('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally { setSaving(false); }
  };

  /* ── Initials for avatar fallback ── */
  const initials = profile.names
    ? profile.names.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--fg-subtle)' }}>
      <RefreshCw size={16} style={{ animation: 'ap-spin 1s linear infinite' }} />
      <span style={{ fontSize: 13 }}>Loading profile…</span>
      <style>{`@keyframes ap-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 24px 48px' }}>
      <style>{`
        @keyframes ap-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes ap-fade { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .ap-layout  { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: start; }
        .ap-2col    { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ap-sidebar { display: flex; flex-direction: column; gap: 2px; }
        .ap-mob-tabs { display: none; }
        @media (max-width: 768px) {
          .ap-layout  { grid-template-columns: 1fr; }
          .ap-2col    { grid-template-columns: 1fr; }
          .ap-sidebar-panel { display: none !important; }
          .ap-mob-tabs { display: flex; gap: 4px; overflow-x: auto; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
          .ap-mob-tabs::-webkit-scrollbar { display: none; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`stoq-toast stoq-toast--${toast.type}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'ap-fade 0.18s ease-out' }}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
          {toast.msg}
        </div>
      )}

      {/* Page head */}
      <div className="page-head">
        <div>
          <h1>Account Settings</h1>
          <div className="page-head__sub">Manage your profile, security, and app preferences</div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="ap-mob-tabs">
        {TABS.map(({ key, icon: Icon, label }) => (
          <button key={key} className="stoq-tab"
            data-active={activeTab === key ? 'true' : undefined}
            onClick={() => setActiveTab(key)}
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="ap-layout">

        {/* ── Sidebar ── */}
        <div className="ap-sidebar-panel">
          {/* Profile card */}
          <div className="stoq-panel" style={{ marginBottom: 12, overflow: 'hidden' }}>
            {/* Accent strip */}
            <div style={{ height: 52, background: 'linear-gradient(135deg, var(--accent) 0%, oklch(0.55 0.20 270) 100%)', position: 'relative' }} />
            <div style={{ padding: '0 16px 16px', marginTop: -26 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: avatarPreview ? 'transparent' : 'var(--accent)',
                color: 'var(--accent-fg)',
                display: 'grid', placeItems: 'center',
                overflow: 'hidden',
                border: '3px solid var(--panel)',
                boxShadow: 'var(--shadow-md)',
                fontSize: 18, fontWeight: 700,
                fontFamily: 'var(--font-display)',
              }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>
                  {profile.names || 'Administrator'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2, wordBreak: 'break-all' }}>
                  {profile.email}
                </div>
                {profile.phone && (
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>{profile.phone}</div>
                )}
              </div>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="stoq-panel">
            <div className="ap-sidebar" style={{ padding: 6 }}>
              {TABS.map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 10px', borderRadius: 'var(--r-sm)',
                    border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                    fontSize: 12.5, fontWeight: 600,
                    background: activeTab === key ? 'var(--accent-soft)' : 'transparent',
                    color: activeTab === key ? 'var(--accent-soft-fg)' : 'var(--fg-muted)',
                    transition: 'background 0.12s, color 0.12s',
                  }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 6,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    background: activeTab === key ? 'var(--accent-soft-fg)' : 'var(--bg-sunk)',
                    color: activeTab === key ? 'var(--accent-soft)' : 'var(--fg-subtle)',
                    transition: 'background 0.12s, color 0.12s',
                  }}>
                    <Icon size={13} />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ══ General Info ══ */}
          {activeTab === 'general' && (
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>

              {/* Avatar card */}
              <div className="stoq-panel">
                <div className="stoq-panel__head">
                  <span className="stoq-panel__title">Profile Picture</span>
                  {avatarFile && (
                    <span className="stoq-badge stoq-badge--accent stoq-badge--plain">
                      New photo ready
                    </span>
                  )}
                </div>
                <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  {/* Avatar ring */}
                  <div style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => fileInputRef.current?.click()}>
                    <div style={{
                      width: 80, height: 80, borderRadius: 18,
                      background: avatarPreview ? 'transparent' : 'var(--accent)',
                      color: 'var(--accent-fg)',
                      display: 'grid', placeItems: 'center',
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      fontSize: 26, fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                    }}>
                      {avatarPreview
                        ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initials}
                    </div>
                    {/* Camera overlay */}
                    <div style={{
                      position: 'absolute', bottom: -4, right: -4,
                      width: 26, height: 26, borderRadius: 8,
                      background: 'var(--fg)', color: 'var(--bg)',
                      display: 'grid', placeItems: 'center',
                      border: '2px solid var(--panel)',
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                      <Camera size={12} />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>
                      Update your photo
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', lineHeight: 1.5, marginBottom: 10 }}>
                      JPG or PNG · Max 2 MB<br />
                      Recommended: 256 × 256 px
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="stoq-btn stoq-btn--sm"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Camera size={11} /> Choose photo
                      </button>
                      {avatarPreview && avatarFile && (
                        <button type="button" className="stoq-btn stoq-btn--sm stoq-btn--ghost"
                          onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
                </div>
              </div>

              {/* Personal information */}
              <div className="stoq-panel">
                <div className="stoq-panel__head">
                  <span className="stoq-panel__title">Personal Information</span>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label="Full Name" error={profileErrors.names}>
                    <IconInput icon={User}
                      value={profile.names}
                      onChange={e => { setProfile(p => ({ ...p, names: e.target.value })); setProfileErrors(er => ({ ...er, names: '' })); }}
                      placeholder="Your full name"
                      style={profileErrors.names ? { borderColor: 'var(--danger)' } : {}}
                    />
                  </Field>

                  <div className="ap-2col">
                    <Field label="Email Address" error={profileErrors.email}>
                      <IconInput icon={Mail} type="email"
                        value={profile.email}
                        onChange={e => { setProfile(p => ({ ...p, email: e.target.value })); setProfileErrors(er => ({ ...er, email: '' })); }}
                        placeholder="admin@example.com"
                        style={profileErrors.email ? { borderColor: 'var(--danger)' } : {}}
                      />
                    </Field>
                    <Field label="Phone Number" hint="Optional — for 2FA or recovery">
                      <IconInput icon={Phone}
                        value={profile.phone}
                        onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+1 (555) 000-0000"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="stoq-btn stoq-btn--ghost"
                  onClick={() => setProfileErrors({})}>
                  Discard
                </button>
                <button type="submit" className="stoq-btn stoq-btn--primary" disabled={saving}>
                  {saving
                    ? <><RefreshCw size={12} style={{ animation: 'ap-spin 1s linear infinite' }} /> Saving…</>
                    : <><Save size={13} /> Save Changes</>}
                </button>
              </div>
            </form>
          )}

          {/* ══ Security ══ */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Security status */}
              <div className="stoq-panel">
                <div className="stoq-panel__head">
                  <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="kpi__icon"><Shield size={13} /></span>
                    Security Overview
                  </span>
                </div>
                <div style={{ padding: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { icon: CheckCircle, label: 'Password set', ok: true  },
                    { icon: CheckCircle, label: 'Email verified', ok: true },
                    { icon: AlertCircle, label: '2FA not enabled', ok: false },
                  ].map(({ icon: Icon, label, ok }) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '7px 12px', borderRadius: 'var(--r-sm)',
                      border: '1px solid var(--border)',
                      background: ok ? 'var(--success-soft)' : 'var(--warning-soft)',
                      fontSize: 11.5, fontWeight: 600,
                      color: ok ? 'var(--success)' : 'var(--warning)',
                    }}>
                      <Icon size={13} /> {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Change password */}
              <form onSubmit={savePassword} noValidate>
                <div className="stoq-panel">
                  <div className="stoq-panel__head">
                    <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="kpi__icon"><KeyRound size={13} /></span>
                      Change Password
                    </span>
                    <span className="stoq-panel__sub">Choose a strong, unique password</span>
                  </div>
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

                    <Field label="Current Password" error={passwordErrors.currentPassword}>
                      <PasswordInput
                        value={passwords.currentPassword}
                        onChange={e => { setPasswords(p => ({ ...p, currentPassword: e.target.value })); setPasswordErrors(er => ({ ...er, currentPassword: '' })); }}
                        placeholder="Enter current password"
                        style={passwordErrors.currentPassword ? { borderColor: 'var(--danger)' } : {}}
                      />
                    </Field>

                    <div style={{ height: 1, background: 'var(--border)' }} />

                    <Field label="New Password" error={passwordErrors.newPassword}
                      hint={!passwordErrors.newPassword ? 'Minimum 6 characters' : undefined}>
                      <PasswordInput
                        value={passwords.newPassword}
                        onChange={e => { setPasswords(p => ({ ...p, newPassword: e.target.value })); setPasswordErrors(er => ({ ...er, newPassword: '' })); }}
                        placeholder="Choose a new password"
                        style={passwordErrors.newPassword ? { borderColor: 'var(--danger)' } : {}}
                      />
                      <StrengthBar password={passwords.newPassword} />
                    </Field>

                    <Field label="Confirm New Password" error={passwordErrors.confirmPassword}>
                      <PasswordInput
                        value={passwords.confirmPassword}
                        onChange={e => { setPasswords(p => ({ ...p, confirmPassword: e.target.value })); setPasswordErrors(er => ({ ...er, confirmPassword: '' })); }}
                        placeholder="Repeat new password"
                        style={passwordErrors.confirmPassword ? { borderColor: 'var(--danger)' } : {}}
                      />
                      {passwords.confirmPassword && passwords.newPassword === passwords.confirmPassword && !passwordErrors.confirmPassword && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
                          <CheckCircle size={11} /> Passwords match
                        </div>
                      )}
                    </Field>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                  <button type="button" className="stoq-btn stoq-btn--ghost"
                    onClick={() => { setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPasswordErrors({}); }}>
                    Clear
                  </button>
                  <button type="submit" className="stoq-btn stoq-btn--primary" disabled={saving}>
                    {saving
                      ? <><RefreshCw size={12} style={{ animation: 'ap-spin 1s linear infinite' }} /> Updating…</>
                      : <><Lock size={13} /> Update Password</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══ App & PWA ══ */}
          {activeTab === 'pwa' && <PWAPanel />}
        </div>
      </div>
    </div>
  );
}
