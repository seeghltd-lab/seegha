import React from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Users, Package, FileText, Settings, Link2 } from 'lucide-react';

const AdminDashboard = () => {
  const { admin } = useAdminAuth();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Systems Overview</h2>
        <p className="text-sm text-slate-500 font-medium">Real-time metrics and inventory status for {admin?.names}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat Cards */}
        <Link to="/admin/employees" className="bg-white p-7 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 block">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex items-start justify-between mb-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-inner">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-secondary text-xs font-black uppercase tracking-widest mb-1.5 relative z-10 opacity-70">Active Personnel</h3>
            <p className="text-3xl font-black text-on-surface tracking-tighter relative z-10">0</p>
          </div>
        </Link>

        <div className="bg-white p-7 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
          <div className="flex items-start justify-between mb-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-inner">
              <Package className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div>
            <h3 className="text-secondary text-xs font-black uppercase tracking-widest mb-1.5 relative z-10 opacity-70">Global Inventory</h3>
            <p className="text-3xl font-black text-on-surface tracking-tighter relative z-10">0</p>
          </div>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
          <div className="flex items-start justify-between mb-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shadow-inner">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div>
            <h3 className="text-secondary text-xs font-black uppercase tracking-widest mb-1.5 relative z-10 opacity-70">Pending Requests</h3>
            <p className="text-3xl font-black text-on-surface tracking-tighter relative z-10">0</p>
          </div>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
           <div className="flex items-start justify-between mb-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-inner">
              <Settings className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div>
            <h3 className="text-secondary text-xs font-black uppercase tracking-widest mb-1.5 relative z-10 opacity-70">System Status</h3>
            <p className="text-xl font-black text-emerald-600 tracking-tight flex items-center gap-2.5 mt-2.5 relative z-10">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              Nominal
            </p>
          </div>
        </div>
      </div>
      
      {/* Placeholder Data Table area */}
      <div className="mt-8 bg-white/50 rounded-2xl p-8 min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/40 transition-all hover:bg-white hover:border-primary/40 group">
         <Link2 className="w-12 h-12 text-slate-300 mb-4 group-hover:text-primary/40 transition-transform group-hover:rotate-12 duration-300" />
         <p className="text-slate-400 font-bold tracking-tight text-lg group-hover:text-on-surface transition-colors">Infrastructure ready for functional modules</p>
         <p className="text-xs text-secondary opacity-60 mt-1">Connect inventory and user services to populate data</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
