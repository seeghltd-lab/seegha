import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Save, MapPin, User, Calendar, DollarSign, AlignLeft } from 'lucide-react';
import siteService from '../../../services/siteService';

export default function AddEditSiteModal({ site, onClose, onRefresh }) {
  const isEdit = Boolean(site);
  const [form, setForm] = useState({
    name: '',
    location: '',
    managerName: '',
    status: 'ACTIVE',
    description: '',
    budget: '',
    startDate: '',
    endDate: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    if (site) {
      setForm({
        name: site.name,
        location: site.location,
        managerName: site.managerName || '',
        status: site.status,
        description: site.description || '',
        budget: site.budget,
        startDate: site.startDate ? new Date(site.startDate).toISOString().split('T')[0] : '',
        endDate: site.endDate ? new Date(site.endDate).toISOString().split('T')[0] : '',
      });
      if (site.image) {
        setImagePreview(`http://localhost:3000${site.image}`);
      }
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
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null) fd.append(k, v);
      });
      if (imageFile) fd.append('image', imageFile);

      if (isEdit) {
        await siteService.update(site.id, fd);
      } else {
        await siteService.create(fd);
      }
      onRefresh();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save site');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const inputClass = (field) => 
    `w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${errors[field] ? 'border-red-300' : 'border-slate-200'}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{isEdit ? 'Edit Site Environment' : 'Initialize New Site'}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Configuration Portal</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-colors bg-white/50 shadow-sm">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Upload */}
            <div className="md:col-span-2 flex items-center gap-6 p-4 rounded-3xl bg-slate-50 border border-slate-100 border-dashed border-2">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white shadow-sm flex items-center justify-center border border-slate-200">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={24} className="text-slate-300" />
                  )}
                </div>
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                  <Upload className="text-primary" size={20} />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">Site Perspective Image</h4>
                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG under 5MB. Visual reference for dashboard.</p>
                <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-xs font-black text-primary uppercase tracking-wider hover:underline">Select File</button>
              </div>
              <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>

            {/* Basic Info */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Site Identity Name</label>
              <div className="relative">
                <AlignLeft size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputClass('name')} placeholder="e.g. KICUKIRO HEADQUARTERS" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Geographic Location</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className={inputClass('location')} placeholder="e.g. Kigali, Rwanda" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Site Manager Assignment</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.managerName} onChange={e => setForm({...form, managerName: e.target.value})} className={inputClass('managerName')} placeholder="e.g. ADRien" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Initial Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none transition-all font-bold text-slate-700">
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            {/* Financial & Dates */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Project Budget (RWF)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} className={inputClass('budget')} placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Start</label>
                <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 font-bold" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">End</label>
                <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 font-bold" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Strategic Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-medium text-slate-600" placeholder="Scope of the site, construction highlights, or unique warehouse properties..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-primary text-white text-sm font-black hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/20 transition-all active:scale-95">
              <Save size={18} />
              {submitting ? 'Processing...' : 'Deploy Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
