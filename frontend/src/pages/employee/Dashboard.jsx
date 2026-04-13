import React from 'react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import { ShieldCheck, ClipboardList, Link2 } from 'lucide-react';

const EmployeeDashboard = () => {
  const { employee } = useEmployeeAuth();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-on-surface tracking-tighter mb-2">Staff Workspace</h2>
        <p className="text-sm text-secondary font-bold opacity-70">Welcome back, {employee?.firstName || 'User'}. Your operations are nominal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden h-full min-h-[450px]">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-on-surface tracking-tight">Active Requisitions</h2>
            </div>
            
            <div className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface/30 group transition-all hover:border-emerald-500/30 hover:bg-emerald-50/10">
              <Link2 className="w-10 h-10 text-slate-300 mb-4 group-hover:text-emerald-500/40 transition-all group-hover:scale-110" />
              <p className="text-slate-400 font-bold group-hover:text-slate-600 transition-colors">No active requisitions found.</p>
              <button className="mt-6 px-6 py-2.5 bg-white hover:bg-emerald-50 border border-outline-variant/20 rounded-xl text-sm font-black text-emerald-700 shadow-sm transition-all active:scale-95 border-l-4 border-l-emerald-500">
                Initiate Request
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar / Permissions panel */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-outline-variant/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-black text-on-surface tracking-tight">Security Access</h2>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {employee?.permissions?.length > 0 ? (
                employee.permissions.map((p, i) => (
                  <span 
                    key={i} 
                    className="px-4 py-2 bg-slate-50 text-slate-700 border border-outline-variant/20 text-[11px] font-black uppercase tracking-widest rounded-xl shadow-sm transition-all hover:bg-white hover:border-primary/40 cursor-default"
                  >
                    {p.permission.name}
                  </span>
                ))
              ) : (
                <div className="w-full text-center py-8 border border-dashed border-outline-variant/20 rounded-xl bg-surface/50">
                  <p className="text-[10px] font-black text-secondary opacity-40 uppercase tracking-[2px]">Standard Clearance Only</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
