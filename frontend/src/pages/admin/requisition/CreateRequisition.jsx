import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, Package, Search, User } from 'lucide-react';
import requisitionService from '../../../services/requisitionService';
import stockService from '../../../services/stockService';
import employeeService from '../../../services/employeeService';

const UNITS = ['PCS', 'BOX', 'KG', 'LITERS', 'METER', 'SET', 'PAIR', 'ROLL', 'BAG', 'OTHER'];

function ItemRow({ item, index, stocks, onUpdate, onRemove }) {
  const [stockSearch, setStockSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const filtered = stocks.filter(s =>
    s.itemName.toLowerCase().includes(stockSearch.toLowerCase()) ||
    s.sku.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const selectStock = (stock) => {
    onUpdate(index, { ...item, stockId: stock.id, itemName: stock.itemName, unit: stock.unit });
    setStockSearch('');
    setShowPicker(false);
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Item {index + 1}</span>
        {index > 0 && (
          <button type="button" onClick={() => onRemove(index)} className="p-1 rounded-lg hover:bg-red-50 text-red-400">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="relative">
        <label className="text-xs font-semibold text-slate-500 mb-1 block">
          Link to inventory <span className="text-slate-300 font-normal">(optional)</span>
        </label>
        {item.stockId ? (
          <div className="flex items-center gap-2 px-3 py-2 border border-emerald-200 rounded-xl bg-emerald-50">
            <Package size={13} className="text-emerald-600" />
            <span className="text-sm text-emerald-700 font-semibold flex-1">{item.itemName}</span>
            <button type="button" onClick={() => onUpdate(index, { ...item, stockId: '', itemName: '', unit: 'PCS' })} className="text-slate-400 hover:text-red-500">
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={stockSearch}
              onChange={e => { setStockSearch(e.target.value); setShowPicker(true); }}
              onFocus={() => setShowPicker(true)}
              placeholder="Search stock by name or SKU..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {showPicker && stockSearch && (
              <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-xs text-slate-400 px-3 py-2 text-center">No matching items</p>
                ) : filtered.slice(0, 8).map(s => (
                  <button key={s.id} type="button" onMouseDown={() => selectStock(s)}
                    className="w-full text-left px-3 py-2 hover:bg-primary/5 text-sm flex items-center gap-2">
                    <Package size={12} className="text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-slate-700">{s.itemName}</span>
                    <span className="text-xs text-slate-400 font-mono ml-auto">{s.sku}</span>
                    <span className="text-xs text-slate-400">({s.quantity} {s.unit})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!item.stockId && (
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Item Name <span className="text-red-400">*</span></label>
          <input
            value={item.itemName}
            onChange={e => onUpdate(index, { ...item, itemName: e.target.value })}
            placeholder="What is needed?"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Quantity <span className="text-red-400">*</span></label>
          <input
            type="number" min="0.01" step="0.01"
            value={item.quantity}
            onChange={e => onUpdate(index, { ...item, quantity: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Unit</label>
          <select
            value={item.unit}
            onChange={e => onUpdate(index, { ...item, unit: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

const emptyItem = () => ({ stockId: '', itemName: '', quantity: '', unit: 'PCS' });

export default function CreateRequisition() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    employeeService.getAllEmployees()
      .then(d => setEmployees(d.employees || d || []))
      .catch(() => {});
    stockService.getAll({ limit: 200 })
      .then(d => setStocks(d.stocks || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!employeeId) { setError('Select an employee'); return; }
    for (const [i, item] of items.entries()) {
      if (!item.itemName.trim()) { setError(`Item ${i + 1}: name is required`); return; }
      if (!item.quantity || parseFloat(item.quantity) <= 0) { setError(`Item ${i + 1}: quantity must be > 0`); return; }
    }
    setSubmitting(true);
    try {
      await requisitionService.create({
        employeeId,
        description: description.trim() || undefined,
        items: items.map(it => ({
          stockId: it.stockId || undefined,
          itemName: it.itemName.trim(),
          quantity: parseFloat(it.quantity),
          unit: it.unit,
        })),
      });
      navigate('/admin/requisition-management');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create requisition');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft size={15} /> Back to Requisitions
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h1 className="text-xl font-extrabold text-slate-800 mb-1">Create Requisition</h1>
        <p className="text-sm text-slate-500 mb-6">Create a requisition on behalf of an employee.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Employee picker */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 block flex items-center gap-1">
              <User size={13} /> Employee <span className="text-red-400">*</span>
            </label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} — {emp.position}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Description / Purpose</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Briefly explain what these items are needed for..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Items</p>
              <button type="button" onClick={() => setItems(prev => [...prev, emptyItem()])}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <Plus size={13} /> Add Item
              </button>
            </div>
            {items.map((item, i) => (
              <ItemRow
                key={i} item={item} index={i} stocks={stocks}
                onUpdate={(idx, updated) => setItems(prev => prev.map((it, j) => j === idx ? updated : it))}
                onRemove={(idx) => setItems(prev => prev.filter((_, j) => j !== idx))}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-60">
              {submitting ? 'Creating...' : 'Create Requisition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
