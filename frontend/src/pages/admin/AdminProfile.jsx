import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, Lock, User, Mail, Phone, RefreshCw } from 'lucide-react';
import adminAuthService from '../../services/adminAuthService';

export default function AdminProfile() {
  const [profile, setProfile] = useState({ names: '', email: '', phone: '' });
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
    adminAuthService.getProfile().then(data => {
      setProfile({
        names: data.names || '',
        email: data.email || '',
        phone: data.phone || '',
      });
      if (data.profilePicture) {
        setAvatarPreview(`http://localhost:3000${data.profilePicture}`);
      }
    }).catch(() => showToast('Failed to load profile details', 'error')).finally(() => setLoading(false));
  }, []);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profile.names || !profile.email) return showToast('Names and Email are required', 'error');

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('names', profile.names);
      fd.append('email', profile.email);
      fd.append('phone', profile.phone);
      if (avatarFile) fd.append('profilePicture', avatarFile);

      await adminAuthService.editProfile(fd);
      showToast('Profile updated successfully!');
      
      // Clear file target to prevent re-uploading on next save
      setAvatarFile(null); 
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!passwords.currentPassword) return showToast('Current password required', 'error');
    if (passwords.newPassword.length < 6) return showToast('New password too short', 'error');
    if (passwords.newPassword !== passwords.confirmPassword) return showToast('Passwords do not match', 'error');

    setSaving(true);
    try {
      await adminAuthService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      showToast('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all font-medium text-slate-700";
  const passClass = "w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 font-medium text-slate-700 tracking-wide";

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading environment...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header Info */}
      <h1 className="text-3xl font-black text-slate-800 tracking-tight">Account Settings</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 space-y-2 flex-shrink-0">
          <button onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
            <User size={18} /> General Info
          </button>
          <button onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Lock size={18} /> Security
          </button>
        </div>

        {/* Form Screens */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <form onSubmit={saveProfile} className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm space-y-8">
              
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shadow-md bg-slate-100 flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="User Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={36} className="text-slate-300" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="text-white" size={24} />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Profile Picture</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Click image to upload a new avatar. JPG, PNG below 2MB.</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarSelect} />
              </div>

              {/* Text Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Full Names</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 leading-none" />
                    <input type="text" value={profile.names} onChange={e => setProfile({...profile, names: e.target.value})} className={inputClass} placeholder="Administrator" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                   <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 leading-none" />
                    <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className={inputClass} placeholder="admin@domain.com" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                   <div className="relative mt-1">
                    <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 leading-none" />
                    <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className={inputClass} placeholder="+250..." />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-50">
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/95 disabled:opacity-50 transition-all active:scale-95">
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Details
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={savePassword} className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 text-lg">Change Password</h3>
                <p className="text-xs text-slate-400 font-medium">Update your security token to protect your account standing.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={passwords.currentPassword} onChange={e => setPasswords({...passwords, currentPassword: e.target.value})} className={passClass} />
                </div>
              </div>
              
              <div className="pt-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} className={passClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} className={passClass} />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-50">
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-white font-bold text-sm shadow-md hover:bg-slate-900 disabled:opacity-50 transition-all active:scale-95">
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
