import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, X, Search, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import requisitionService from '../../../services/requisitionService';
import stockService from '../../../services/stockService';

const fmt = (n) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n ?? 0);

export default function ApproveRequisition() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [requisition, setRequisition] = useState(null);
  const [items, setItems] = useState([]);
  const [allStocks, setAllStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [req, stockData] = await Promise.all([
          requisitionService.getOne(id),
          stockService.getAll({ limit: 500 }),
        ]);
        setRequisition(req);
        setItems(
          req.items.map((item) => ({
            ...item,
            costPrice: item.costPrice ?? (item.stock ? Number(item.stock.unitCost) : ''),
            isNew: false,
            remove: false,
          })),
        );
        const stocks = stockData.stocks ?? stockData;
        setAllStocks(stocks);
        setFilteredStocks(stocks);
      } catch {
        setErrors({ load: 'Failed to load requisition.' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!searchTerm.trim()) { setFilteredStocks(allStocks); return; }
    const t = searchTerm.toLowerCase();
    setFilteredStocks(allStocks.filter((s) => s.itemName?.toLowerCase().includes(t) || s.sku?.toLowerCase().includes(t)));
  }, [searchTerm, allStocks]);

  const getStock = (stockId) => allStocks.find((s) => s.id === stockId) || null;

  const isAlreadySelected = (stockId, currentIdx) =>
    items.some((item, i) => i !== currentIdx && item.stockId === stockId && !item.remove);

  const openStockModal = (index) => {
    setSelectedItemIndex(index);
    setSearchTerm('');
    setFilteredStocks(allStocks);
    setShowStockModal(true);
  };

  const selectStock = (stock) => {
    if (selectedItemIndex === null) return;
    if (isAlreadySelected(stock.id, selectedItemIndex)) return;
    const next = [...items];
    next[selectedItemIndex] = {
      ...next[selectedItemIndex],
      stockId: stock.id,
      itemName: stock.itemName,
      unit: stock.unit,
      costPrice: Number(stock.unitCost) || '',
    };
    setItems(next);
    setShowStockModal(false);
    setSelectedItemIndex(null);
  };

  const handleItemChange = (index, field, value) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const addItem = () =>
    setItems([...items, { itemName: '', quantity: '', unit: 'PCS', note: '', stockId: '', costPrice: '', isNew: true, remove: false }]);

  const toggleRemove = (index) => {
    const next = [...items];
    next[index].remove = !next[index].remove;
    setItems(next);
  };

  const removeNewItem = (index) => setItems(items.filter((_, i) => i !== index));

  const clearStock = (index) => {
    const next = [...items];
    next[index] = { ...next[index], stockId: '', itemName: '', costPrice: '' };
    setItems(next);
  };

  const estimatedTotal = items
    .filter((item) => !item.remove)
    .reduce((sum, item) => {
      const price = item.costPrice !== '' && item.costPrice != null ? Number(item.costPrice) : 0;
      return sum + (Number(item.quantity) || 0) * price;
    }, 0);

  const validate = () => {
    const errs = {};
    const active = items.filter((i) => !i.remove);
    if (active.length === 0) errs.items = 'At least one item is required';
    active.forEach((item) => {
      const idx = items.indexOf(item);
      if (!item.itemName?.trim()) errs[`items.${idx}.itemName`] = 'Required';
      if (!item.quantity || Number(item.quantity) <= 0) errs[`items.${idx}.quantity`] = 'Must be > 0';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleApprove = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        notes: notes || undefined,
        items: items.map((item) => {
          if (item.remove && item.id) return { id: item.id, remove: true };
          const data = {
            itemName: item.itemName,
            quantity: Number(item.quantity),
            unit: item.unit,
            note: item.note || undefined,
            stockId: item.stockId || undefined,
            costPrice: item.costPrice !== '' && item.costPrice != null ? Number(item.costPrice) : undefined,
          };
          if (item.id && !item.isNew) data.id = item.id;
          return data;
        }),
      };
      await requisitionService.approve(id, payload);
      setSuccess(true);
      setTimeout(() => navigate('/admin/requisition-management'), 1800);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || err.message || 'Failed to approve' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (errors.load || !requisition) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-red-400 mb-3" size={40} />
        <p className="text-slate-700 font-semibold">{errors.load || 'Requisition not found'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft size={15} /> Back to Requisitions
      </button>

      {/* Requisition header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Review & Approve</h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">#{requisition.id.slice(-8).toUpperCase()}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">PENDING</span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Requested by</p>
            <p className="font-semibold text-slate-700">
              {requisition.employee?.firstName} {requisition.employee?.lastName}
            </p>
            <p className="text-xs text-slate-500">{requisition.employee?.position}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Description</p>
            <p className="text-slate-600">{requisition.description || <span className="italic text-slate-300">None</span>}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Items</h2>
          <button onClick={addItem}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors">
            <Plus size={13} /> Add Item
          </button>
        </div>

        {success && (
          <div className="mx-5 mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-semibold">
            <CheckCircle size={16} /> Approved! Redirecting...
          </div>
        )}
        {errors.submit && (
          <div className="mx-5 mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} /> {errors.submit}
          </div>
        )}
        {errors.items && (
          <p className="mx-5 mt-4 text-sm text-red-600">{errors.items}</p>
        )}

        <div className="p-5 space-y-4">
          {items.map((item, idx) => {
            const stockInfo = item.stockId ? getStock(item.stockId) : null;
            return (
              <div key={idx} className={`border rounded-xl p-4 transition-colors ${
                item.remove ? 'bg-red-50 border-red-200 opacity-60' :
                item.isNew ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* Item header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Item {idx + 1}</span>
                    {item.isNew && <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500 text-white rounded-full">NEW</span>}
                    {item.remove && <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">TO REMOVE</span>}
                  </div>
                  {item.isNew ? (
                    <button onClick={() => removeNewItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                  ) : item.id && (
                    <button onClick={() => toggleRemove(idx)} className={item.remove ? 'text-emerald-600' : 'text-red-500'}>
                      {item.remove ? <X size={14} /> : <Trash2 size={14} />}
                    </button>
                  )}
                </div>

                {!item.remove && (
                  <>
                    {/* Stock picker */}
                    <div className="mb-3">
                      {!stockInfo ? (
                        <button onClick={() => openStockModal(idx)}
                          className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-400 hover:border-primary/40 transition-colors">
                          <span>Browse stock (optional)</span>
                          <Search size={14} />
                        </button>
                      ) : (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{stockInfo.itemName}</p>
                              <p className="text-xs text-slate-400 font-mono">{stockInfo.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{stockInfo.quantity} {stockInfo.unit}</p>
                              <p className="text-xs text-slate-400">in stock</p>
                            </div>
                          </div>
                          <button onClick={() => clearStock(idx)} className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium">
                            Clear stock link
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Fields grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name <span className="text-red-500">*</span></label>
                        <input type="text" value={item.itemName}
                          onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors[`items.${idx}.itemName`] ? 'border-red-300' : 'border-slate-200'}`} />
                        {errors[`items.${idx}.itemName`] && <p className="text-xs text-red-500 mt-1">{errors[`items.${idx}.itemName`]}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity <span className="text-red-500">*</span></label>
                        <input type="number" min="0.01" step="0.01" value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors[`items.${idx}.quantity`] ? 'border-red-300' : 'border-slate-200'}`} />
                        {errors[`items.${idx}.quantity`] && <p className="text-xs text-red-500 mt-1">{errors[`items.${idx}.quantity`]}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                        <select value={item.unit} onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                          {['PCS', 'BOX', 'KG', 'LITERS', 'METER', 'OTHER'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Cost Price (RWF)
                          {stockInfo?.unitCost && (
                            <span className="ml-1 text-slate-400 font-normal">· stock: {fmt(Number(stockInfo.unitCost))}</span>
                          )}
                        </label>
                        <input type="number" min="0" step="0.01" value={item.costPrice ?? ''}
                          onChange={(e) => handleItemChange(idx, 'costPrice', e.target.value)}
                          placeholder="e.g. 1500"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Note</label>
                        <input type="text" value={item.note || ''}
                          onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Estimated total */}
        {estimatedTotal > 0 && (
          <div className="mx-5 mb-4 flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-sm font-semibold text-slate-600">Estimated Total Cost</span>
            <span className="text-lg font-extrabold text-primary">{fmt(estimatedTotal)}</span>
          </div>
        )}

        {/* Admin notes */}
        <div className="px-5 pb-5">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Approval Note (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note for the employee..."
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3 border-t border-slate-100 pt-4">
          <button onClick={() => navigate(-1)}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleApprove} disabled={submitting || success}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold disabled:opacity-60 transition-colors">
            {submitting ? 'Approving...' : 'Approve Requisition'}
          </button>
        </div>
      </div>

      {/* Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Select Stock Item</h3>
              <button onClick={() => setShowStockModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or SKU..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {filteredStocks.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">No stocks found</p>
              ) : filteredStocks.map((stock) => {
                const isDup = isAlreadySelected(stock.id, selectedItemIndex);
                return (
                  <button key={stock.id} disabled={isDup} onClick={() => selectStock(stock)}
                    className={`w-full p-3 border rounded-xl text-left transition-colors ${isDup ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50' : 'border-slate-200 hover:border-primary/30 hover:bg-primary/5'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{stock.itemName}</p>
                        <p className="text-xs text-slate-400 font-mono">{stock.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-sm">{stock.quantity} {stock.unit}</p>
                        <p className="text-xs text-slate-400">{fmt(Number(stock.unitCost))}</p>
                      </div>
                    </div>
                    {isDup && <p className="text-xs text-red-500 mt-1">Already selected in another item</p>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
