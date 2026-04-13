import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Briefcase, 
  Calendar,
  ShieldCheck,
  History,
  ExternalLink,
  Lock,
  Unlock,
  Pencil,
  AlertCircle,
  FileText
} from 'lucide-react';
import employeeService from '../../../services/employeeService';

const EmployeeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      setIsLoading(true);
      const data = await employeeService.getEmployee(id);
      setEmployee(data);
    } catch (err) {
      setError('Employee record unavailable or access restricted.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Accessing Secure Records...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center animate-in fade-in duration-300">
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-black text-on-surface uppercase tracking-tight">{error || 'Data Corruption - Record Not Found'}</h2>
        <button onClick={() => navigate('/admin/employees')} className="mt-6 text-primary font-black uppercase tracking-widest text-xs hover:underline underline-offset-8">Return to Central Repository</button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header / Breadcrumb */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/employees')}
            className="p-3 bg-white border border-outline-variant/20 rounded-xl text-slate-500 hover:text-primary transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-on-surface tracking-tighter leading-none">{employee.firstName} {employee.lastName}</h1>
            <p className="text-xs text-secondary font-black opacity-60 mt-1 uppercase tracking-[2px]">Personnel Profile Detail</p>
          </div>
        </div>
        <Link 
          to={`/admin/employees/edit/${employee.id}`}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-outline-variant/20 rounded-xl text-slate-700 font-bold text-sm shadow-sm hover:border-primary/40 hover:text-primary transition-all"
        >
          <Pencil size={18} />
          <span>Modify Credentials</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Info Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-3xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="h-24 primary-gradient"></div>
            <div className="px-6 pb-8 -mt-12 text-center">
              <div className="w-24 h-24 rounded-3xl bg-white p-1 inline-block shadow-xl mb-4">
                <div className="w-full h-full rounded-2xl bg-surface border border-outline-variant/20 flex items-center justify-center overflow-hidden">
                  {employee.profilePicture ? (
                    <img 
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${employee.profilePicture}`} 
                      alt={employee.firstName} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-black text-primary uppercase">{employee.firstName.charAt(0)}</span>
                  )}
                </div>
              </div>
              <h2 className="text-xl font-black text-on-surface tracking-tight leading-none mb-1">{employee.firstName} {employee.lastName}</h2>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest opacity-60">{employee.position}</p>
              
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${employee.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                   {employee.status}
                </span>
                <span className="px-3 py-1 bg-slate-50 text-slate-700 border border-outline-variant/20 rounded-full text-[10px] font-black uppercase tracking-widest items-center flex gap-1.5">
                   {employee.isLocked ? <Lock size={10} className="text-rose-500" /> : <Unlock size={10} className="text-emerald-500" />}
                   {employee.isLocked ? 'Account Restricted' : 'Secure Entry Enabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-outline-variant/20 shadow-sm space-y-6">
            <h3 className="text-[11px] font-black text-secondary uppercase tracking-widest opacity-60 flex items-center gap-2">
              <Mail size={14} /> Communication Nodes
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Email Endpoint</span>
                <span className="text-sm font-bold text-on-surface break-all">{employee.email}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Tele-Contact</span>
                <span className="text-sm font-bold text-on-surface">{employee.phone}</span>
              </div>
              <div className="flex flex-col pt-4 border-t border-surface">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Registry Entry</span>
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 focus:outline-none">
                  <Calendar size={14} className="text-slate-300" />
                  {new Date(employee.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Security Permissions */}
          <div className="bg-white p-8 rounded-3xl border border-outline-variant/20 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-primary" />
                </div>
                <h3 className="text-lg font-black text-on-surface tracking-tight">Security Clearances</h3>
              </div>
              <span className="text-[10px] font-black text-secondary uppercase tracking-[2px] opacity-40">System-Wide</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {employee.permissions?.length > 0 ? (
                employee.permissions.map((p, i) => (
                  <div key={i} className="px-4 py-3 bg-slate-50 border border-outline-variant/10 rounded-2xl flex items-center gap-3 group transition-all hover:bg-white hover:border-primary/20">
                    <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
                    <span className="text-xs font-black text-slate-700 group-hover:text-on-surface uppercase tracking-wide">
                      {p.permission.name.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 py-8 text-center bg-slate-50 border-2 border-dashed border-outline-variant/20 rounded-2xl">
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Base Privilege Level Only</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity / Requisitions */}
          <div className="bg-white p-8 rounded-3xl border border-outline-variant/20 shadow-sm min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <History size={20} className="text-amber-600" />
                </div>
                <h3 className="text-lg font-black text-on-surface tracking-tight">Recent System Activity</h3>
              </div>
              <Link to="/admin/requisitions" className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">Archive Archive</Link>
            </div>

            <div className="space-y-4">
              {employee.requisitions?.length > 0 ? (
                employee.requisitions.map((req, i) => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-outline-variant/10 group hover:shadow-sm transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-outline-variant/20 flex items-center justify-center shadow-sm">
                         <FileText size={18} className="text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-on-surface">Requisition #{req.id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] font-bold text-secondary opacity-60 uppercase tracking-tight">Status: {req.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[11px] font-bold text-slate-500">{new Date(req.createdAt).toLocaleDateString('en-GB')}</p>
                       <span className="inline-flex items-center gap-1 text-[10px] font-black text-primary/40 group-hover:text-primary transition-colors cursor-pointer uppercase tracking-widest mt-1">
                         Audit <ExternalLink size={10} />
                       </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <History size={40} className="text-slate-200 mb-3" />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No operation logging detected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;
