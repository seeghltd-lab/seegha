import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, X, RefreshCw, Plus } from 'lucide-react';
import stockService from '../../../services/stockService';
import categoryService from '../../../services/categoryService';
import supplierService from '../../../services/supplierService';

const UNITS = ['PCS', 'BOX', 'KG', 'LITERS', 'METER', 'PACK', 'CARTON', 'OTHER'];

const emptyForm = {
  itemName: '',
  categoryId: '',
  supplierId: '',
  unit: 'PCS',
  quantity: '',
  unitCost: '',
  warehouseLocation: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  reorderLevel: 5,
  expiryDate: '',
  description: '',
};

/**
 * Searchable select with inline "Create new" option.
 * @param {string} label
 * @param {{ value: string, label: string }[]} options
 * @param {string} value  — selected value
 * @param {(v: string) => void} onChange
 * @param {string} placeholder
 * @param {(name: string) => Promise<string>} onCreate — returns the new item's id
 * @param {string} createLabel — e.g. "category" or "supplier"
 */
function SearchableSelect({ label, options, value, onChange, placeholder, onCreate, createLabel }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const ref = useRef(null);

  const filtered = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));
  const selected = options.find(o => o.value === value);
  const noMatch = q.trim() && filtered.length === 0;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreate = async () => {
    if (!q.trim() || creating) return;
    setCreating(true);
    try {
      const newId = await onCreate(q.trim());
      onChange(newId);
      setOpen(false);
      setQ('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <button type="button" onClick={() => { setOpen(!open); setQ(''); }}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center justify-between">
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>{selected ? selected.label : placeholder}</span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (noMatch) handleCreate(); } }}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Search or type to create..." />
          </div>
          <div>
            {/* Clear option */}
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50">
              None
            </button>

            {/* Matching options */}
            {filtered.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 ${value === o.value ? 'text-primary font-semibold bg-primary/5' : 'text-slate-700'}`}>
                {o.label}
              </button>
            ))}

            {/* Inline create */}
            {q.trim() && (
              <button type="button" onClick={handleCreate} disabled={creating}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-primary font-semibold hover:bg-primary/5 border-t border-slate-100">
                <Plus size={14} />
                {creating ? `Creating...` : `Create ${createLabel} "${q.trim()}"`}
              </button>
            )}

            {!q.trim() && options.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-400">No {createLabel}s yet. Type a name to create one.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

export default function AddStock() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [sku, setSku] = useState('');
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const totalValue = form.quantity && form.unitCost
    ? (parseFloat(form.quantity || 0) * parseFloat(form.unitCost || 0)).toFixed(2)
    : '0.00';

  const loadDropdowns = () => {
    categoryService.getAll()
      .then(data => setCategories(data.map(c => ({ value: c.id, label: c.name }))))
      .catch(() => {});
    supplierService.getForSelect()
      .then(data => setSuppliers(data.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))))
      .catch(() => {});
  };

  useEffect(() => { loadDropdowns(); }, []);

  // Inline create handlers
  const handleCreateCategory = async (name) => {
    const cat = await categoryService.create({ name });
    setCategories(prev => [...prev, { value: cat.id, label: cat.name }]);
    showToast(`Category "${name}" created`);
    return cat.id;
  };

  const handleCreateSupplier = async (name) => {
    const sup = await supplierService.create({ name });
    setSuppliers(prev => [...prev, { value: sup.id, label: `${sup.name} (${sup.code})` }]);
    showToast(`Supplier "${name}" created`);
    return sup.id;
  };

  useEffect(() => {
    if (!isEdit) { setSku('Auto-generated'); return; }
    setLoading(true);
    stockService.getOne(id).then(stock => {
      setSku(stock.sku);
      setForm({
        itemName: stock.itemName,
        categoryId: stock.categoryId || '',
        supplierId: stock.supplierId || '',
        unit: stock.unit,
        quantity: stock.quantity,
        unitCost: parseFloat(stock.unitCost),
        warehouseLocation: stock.warehouseLocation,
        receivedDate: new Date(stock.receivedDate).toISOString().slice(0, 10),
        reorderLevel: stock.reorderLevel,
        expiryDate: stock.expiryDate ? new Date(stock.expiryDate).toISOString().slice(0, 10) : '',
        description: stock.description || '',
      });
      if (stock.stockImg) setImagePreview(`http://localhost:3000${stock.stockImg}`);
    }).catch(() => showToast('Failed to load stock', 'error')).finally(() => setLoading(false));
  }, [id]);

  const validate = () => {
    const errs = {};
    if (!form.itemName.trim()) errs.itemName = 'Item name is required';
    if (form.quantity === '' || parseFloat(form.quantity) < 0) errs.quantity = 'Valid quantity required';
    if (form.unitCost === '' || parseFloat(form.unitCost) < 0) errs.unitCost = 'Valid unit cost required';
    if (!form.warehouseLocation.trim()) errs.warehouseLocation = 'Location is required';
    if (!form.receivedDate) errs.receivedDate = 'Received date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
      if (imageFile) fd.append('stockImg', imageFile);

      if (isEdit) {
        await stockService.update(id, fd);
        showToast('Stock updated');
      } else {
        await stockService.create(fd);
        showToast('Stock created');
      }
      setTimeout(() => navigate('/admin/stock'), 900);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors[field] ? 'border-red-300' : 'border-slate-200'}`;

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/stock')} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">{isEdit ? 'Edit Stock Item' : 'Add Stock Item'}</h1>
          {isEdit && <p className="text-sm text-slate-400 font-mono">{sku}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-700 text-xs uppercase tracking-widest">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">SKU</label>
              <input disabled value={isEdit ? sku : 'Auto-generated'}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
            </div>
            <Field label="Item Name" required error={errors.itemName}>
              <input value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
                className={inputClass('itemName')} placeholder="e.g. A4 Printer Paper" />
            </Field>
            <SearchableSelect
              label="Category"
              options={categories}
              value={form.categoryId}
              onChange={v => setForm(f => ({ ...f, categoryId: v }))}
              placeholder="Select or create category..."
              onCreate={handleCreateCategory}
              createLabel="category"
            />
            <SearchableSelect
              label="Supplier"
              options={suppliers}
              value={form.supplierId}
              onChange={v => setForm(f => ({ ...f, supplierId: v }))}
              placeholder="Select or create supplier..."
              onCreate={handleCreateSupplier}
              createLabel="supplier"
            />
          </div>
        </div>

        {/* Quantity & Pricing */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-700 text-xs uppercase tracking-widest">Quantity & Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Unit of Measure" required>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className={inputClass('unit')}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Quantity" required error={errors.quantity}>
              <input type="number" min="0" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className={inputClass('quantity')} placeholder="0" />
            </Field>
            <Field label="Unit Cost (RWF)" required error={errors.unitCost}>
              <input type="number" min="0" step="0.01" value={form.unitCost}
                onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))}
                className={inputClass('unitCost')} placeholder="0.00" />
            </Field>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Total Value</label>
              <input disabled value={`RWF ${parseFloat(totalValue).toLocaleString()}`}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-emerald-700 font-semibold cursor-not-allowed" />
            </div>
            <Field label="Reorder Level">
              <input type="number" min="0" value={form.reorderLevel}
                onChange={e => setForm(f => ({ ...f, reorderLevel: parseInt(e.target.value) || 0 }))}
                className={inputClass('reorderLevel')} />
            </Field>
          </div>
        </div>

        {/* Storage & Dates */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-700 text-xs uppercase tracking-widest">Storage & Dates</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Warehouse Location" required error={errors.warehouseLocation}>
              <input value={form.warehouseLocation}
                onChange={e => setForm(f => ({ ...f, warehouseLocation: e.target.value }))}
                className={inputClass('warehouseLocation')} placeholder="e.g. Shelf A-3" />
            </Field>
            <Field label="Received Date" required error={errors.receivedDate}>
              <input type="date" value={form.receivedDate}
                onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))}
                className={inputClass('receivedDate')} />
            </Field>
            <Field label="Expiry Date">
              <input type="date" value={form.expiryDate}
                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                className={inputClass('expiryDate')} />
            </Field>
          </div>
        </div>

        {/* Image & Description */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-700 text-xs uppercase tracking-widest">Image & Description</h2>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Product Image</label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="preview" className="w-32 h-32 object-cover rounded-xl border border-slate-200" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary/50 hover:text-primary transition-colors">
                <Upload size={22} />
                <span className="text-xs mt-1 font-medium">Upload</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>
          <Field label="Description">
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Product description, notes, specifications..." />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/stock')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-60 shadow">
            {submitting && <RefreshCw size={14} className="animate-spin" />}
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Stock'}
          </button>
        </div>
      </form>
    </div>
  );
}
