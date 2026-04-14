import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  MapPin, 
  User, 
  Calendar, 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  MoreVertical,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  LayoutGrid
} from 'lucide-react';
import siteService from '../../services/siteService';
import AddEditSiteModal from './site/AddEditSiteModal';

export default function SiteManagement() {
  const [sites, setSites] = useState([]);
  const [stats, setStats] = useState({ totalSites: 0, activeSites: 0, pausedSites: 0, totalBudget: 0, totalWorkers: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', location: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSites = async () => {
    try {
      const data = await siteService.getAll(filters);
      setSites(data);
    } catch (err) {
      showToast('Failed to load sites', 'error');
    }
  };

  const fetchStats = async () => {
    try {
      const data = await siteService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Stats failed', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchSites(), fetchStats()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [filters.status, filters.location]);

  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchSites();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this site from the registry?')) return;
    try {
      await siteService.remove(id);
      showToast('Site successfully decommissioned');
      loadData();
    } catch (err) {
      showToast('Failed to delete site', 'error');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl text-sm font-black text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'} animate-in slide-in-from-right-8`}>
          {toast.msg}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4">
            Sites Management 
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-tighter font-black">Admin Suite</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm tracking-wide">Orchestrate and monitor all construction sites and warehouse locations globally.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm bg-white hover:bg-slate-50 transition-all shadow-sm">
            <TrendingUp size={18} className="text-primary" /> Reports
          </button>
          <button onClick={() => { setSelectedSite(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-xl shadow-primary/20 hover:opacity-95 transition-all active:scale-95">
            <Plus size={20} /> Add New Site
          </button>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Sites', value: stats.totalSites, icon: LayoutGrid, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Active', value: stats.activeSites, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Paused', value: stats.pausedSites, icon: Layers, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Total Workers', value: stats.totalWorkers, icon: User, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Total Budget (RWF)', value: stats.totalBudget.toLocaleString(), icon: DollarSign, color: 'text-primary', bg: 'bg-primary/5', lg: true },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow relative overflow-hidden ${stat.lg ? 'lg:col-span-1' : ''}`}>
             <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                  <stat.icon size={22} />
                </div>
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Global Snapshot</div>
             </div>
             <div>
                <div className="text-2xl font-black text-slate-800 tracking-tighter">{stat.value}</div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{stat.label}</div>
             </div>
             <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:scale-150 transition-transform">
               <stat.icon size={100} />
             </div>
          </div>
        ))}
      </div>

      {/* Utilities/Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white p-3 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} onKeyDown={handleSearch}
            placeholder="Search sites, managers, or locations..." 
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-transparent focus:border-primary/20 rounded-[2rem] text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-slate-700" 
          />
        </div>
        <div className="flex items-center gap-3">
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}
            className="px-6 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer hover:bg-slate-100 min-w-[140px]">
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
          <select value={filters.location} onChange={e => setFilters({...filters, location: e.target.value})}
            className="px-6 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer hover:bg-slate-100 min-w-[140px]">
            <option value="">All Locations</option>
            <option value="Kigali">Kigali</option>
            <option value="Eastern Province">Eastern Province</option>
            <option value="Northern Province">Northern Province</option>
          </select>
          <button onClick={fetchSites} className="p-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200">
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* Site Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Initializing data streams...</div>
        ) : sites.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-300">
              <Landmark size={32} />
            </div>
            <h3 className="font-black text-slate-800 text-lg">No sites registered yet</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">Start by adding your first project location to the registry.</p>
            <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90">Add Entry</button>
          </div>
        ) : sites.map(site => (
          <div key={site.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 group overflow-hidden border-l-[12px] border-l-primary/10 hover:border-l-primary/30">
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden bg-slate-100 border border-slate-100 shadow-inner flex items-center justify-center">
                    {site.image ? (
                      <img src={`http://localhost:3000${site.image}`} className="w-full h-full object-cover" />
                    ) : (
                      <Landmark size={28} className="text-slate-300 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{site.name}</h2>
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-400 mt-1">
                      <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary"/> {site.location}</span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                      <span className="flex items-center gap-1.5"><User size={14} className="text-orange-400"/> {site.managerName || 'UNASSIGNED'}</span>
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${
                  site.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 
                  site.status === 'PAUSED' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {site.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                   <div>
                     <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Assets</div>
                     <div className="text-lg font-black text-slate-800">{site._count?.stocks || 0} items</div>
                   </div>
                   <div>
                     <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Financial Budget</div>
                     <div className="text-lg font-black text-primary">{formatCurrency(site.budget)}</div>
                   </div>
                </div>
                <div className="space-y-4">
                   <div>
                     <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Estimated Workforce</div>
                     <div className="text-lg font-black text-slate-800">12 workers</div>
                   </div>
                   <div>
                     <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Remaining Scope</div>
                     <div className="text-lg font-black text-orange-600">{formatCurrency(Number(site.budget) * 0.4)}</div>
                   </div>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between text-xs font-black mb-1.5">
                  <span className="text-slate-400 uppercase tracking-widest italic">Budget Utilization</span>
                  <span className="text-primary">61%</span>
                </div>
                <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div className="h-full bg-primary rounded-full shadow-lg shadow-primary/30" style={{ width: '61%' }}></div>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed italic">{site.description || 'No strategic overview provided for this location.'}</p>
              </div>

              <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
                  <Calendar size={12}/> {site.startDate ? new Date(site.startDate).toLocaleDateString() : 'N/A'} → {site.endDate ? new Date(site.endDate).toLocaleDateString() : 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => { setSelectedSite(site); setIsModalOpen(true); }} className="px-5 py-2.5 rounded-xl border border-slate-100 text-xs font-black text-slate-500 hover:bg-slate-50 transition-all">EDIT</button>
                   <button onClick={() => handleDelete(site.id)} className="px-5 py-2.5 rounded-xl bg-red-50 text-red-500 text-xs font-black hover:bg-red-100 transition-all">REMOVE</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <AddEditSiteModal 
          site={selectedSite} 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={loadData} 
        />
      )}
    </div>
  );
}
