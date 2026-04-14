import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Save, Mail, User, Phone, MapPin, Map } from 'lucide-react';
import supplierService from '../../../services/supplierService';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  contactPerson: '',
  city: '',
  address: '',
};

export default function AddEditSupplier() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [code, setCode] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    supplierService.getOne(id).then(sup => {
      setCode(sup.code);
      setForm({
        name: sup.name,
        email: sup.email || '',
        phone: sup.phone || '',
        contactPerson: sup.contactPerson || '',
        city: sup.city || '',
        address: sup.address || '',
      });
    }).catch(() => showToast('Failed to load supplier', 'error'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Supplier name is required';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Valid email is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    
    try {
      const payload = { ...form };
      if (isEdit) {
        await supplierService.update(id, payload);
        showToast('Supplier updated successfully');
      } else {
        await supplierService.create(payload);
        showToast('Supplier created successfully');
      }
      setTimeout(() => navigate('/admin/suppliers'), 900);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save supplier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) => 
    `w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow ${errors[field] ? 'border-red-300' : 'border-slate-200'}`;

  if (loading) return <div className="p-8 text-center text-slate-400 font-medium">Loading supplier details...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/suppliers')} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors bg-white shadow-sm">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{isEdit ? 'Edit Supplier' : 'Add New Supplier'}</h1>
          {isEdit && <p className="text-sm text-slate-400 font-mono tracking-wider">{code}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Core Info */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
            <Building2 size={18} className="text-primary"/>
            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Core details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Supplier Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputClass('name')} placeholder="e.g. Example Supplies Ltd" />
              </div>
              {errors.name && <p className="text-xs text-red-500 mt-1 font-medium">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Contact Person</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))}
                  className={inputClass('contactPerson')} placeholder="e.g. John Doe" />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
            <Phone size={18} className="text-primary"/>
            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Contact Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={inputClass('email')} placeholder="contact@example.com" />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className={inputClass('phone')} placeholder="+250 788 123 456" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">City</label>
              <div className="relative">
                <Map size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className={inputClass('city')} placeholder="e.g. Kigali" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Street Address</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className={inputClass('address')} placeholder="123 Example St." />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/admin/suppliers')}
            className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-primary text-white text-sm font-black hover:opacity-90 disabled:opacity-60 shadow-md transition-all active:scale-95">
            <Save size={16} />
            {submitting ? 'Saving...' : 'Save Supplier'}
          </button>
        </div>

      </form>
    </div>
  );
}
