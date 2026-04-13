import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Pencil, 
  Trash2, 
  Mail, 
  Phone,
  Users,
  UserCheck,
  UserMinus,
  AlertCircle
} from 'lucide-react';
import employeeService from '../../../services/employeeService';
import { useNotification } from '../../../context/NotificationContext';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isDeleting, setIsDeleting] = useState(null);
  
  const navigate = useNavigate();
  const { setRecipient } = useNotification();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await employeeService.getAllEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this employee? This action cannot be undone.')) return;
    
    try {
      setIsDeleting(id);
      await employeeService.deleteEmployee(id);
      setEmployees(employees.filter(emp => emp.id !== id));
    } catch (error) {
      alert('Failed to delete employee: ' + error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter">Personnel Repository</h1>
          <p className="text-sm text-secondary font-bold opacity-70 mt-1">Manage staff credentials and access levels</p>
        </div>
        <Link 
          to="/admin/employees/new"
          className="flex items-center justify-center gap-2 px-6 py-3 primary-gradient text-white rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>Onboard Employee</span>
        </Link>
      </div>

      {/* Stats Quick Look */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest opacity-60">Total Force</p>
            <p className="text-2xl font-black text-on-surface">{employees.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users size={20} className="text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest opacity-60">Active Now</p>
            <p className="text-2xl font-black text-emerald-600">{employees.filter(e => e.status === 'ACTIVE').length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <UserCheck size={20} className="text-emerald-600" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest opacity-60">Locked/Inactive</p>
            <p className="text-2xl font-black text-rose-600">{employees.filter(e => e.status !== 'ACTIVE' || e.isLocked).length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
            <UserMinus size={20} className="text-rose-600" />
          </div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email or position..."
            className="w-full pl-12 pr-4 py-3 bg-surface border-0 rounded-xl text-sm font-bold text-on-surface ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-4 py-3 bg-surface border border-outline-variant/20 rounded-xl min-w-[160px]">
            <Filter size={16} className="text-slate-400" />
            <select 
              className="bg-transparent text-xs font-black text-on-surface uppercase outline-none flex-1 appearance-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface/50 border-b border-outline-variant/20">
                <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest">Employee Information</th>
                <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest">Role/Position</th>
                <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest">Onboarded</th>
                <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Retrieving Records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-surface/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                          {emp.profilePicture ? (
                            <img 
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${emp.profilePicture}`} 
                              alt={emp.firstName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-black text-primary uppercase">{emp.firstName.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-black text-on-surface truncate leading-none mb-1.5">{emp.firstName} {emp.lastName}</p>
                          <div className="flex items-center gap-3 text-[11px] font-bold text-secondary opacity-70">
                            <span className="flex items-center gap-1"><Mail size={12} /> {emp.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`
                        inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                        ${emp.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${emp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] font-bold text-on-surface uppercase tracking-tight">{emp.position}</p>
                      <p className="text-[10px] font-bold text-secondary opacity-60">System Operator</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[12px] font-bold text-secondary">{new Date(emp.createdAt).toLocaleDateString('en-GB')}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/admin/employees/${emp.id}`}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link 
                          to={`/admin/employees/edit/${emp.id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit Profile"
                        >
                          <Pencil size={18} />
                        </Link>
                        <button 
                          className={`p-2 rounded-lg transition-all ${isDeleting === emp.id ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                          title="Remove Employee"
                          onClick={() => handleDelete(emp.id)}
                          disabled={isDeleting === emp.id}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="text-base font-black text-on-surface uppercase">No Employees Found</p>
                      <p className="text-sm text-secondary font-bold opacity-60 mt-1">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
