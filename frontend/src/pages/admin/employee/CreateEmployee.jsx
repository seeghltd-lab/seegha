import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Camera,
  CheckCircle2,
  AlertCircle,
  Save
} from 'lucide-react';
import employeeService from '../../../services/employeeService';

const CreateEmployee = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: 'Standard Staff',
    status: 'ACTIVE'
  });

  const [profileImg, setProfileImg] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImg(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (profileImg) {
        data.append('profileImg', profileImg);
      }

      await employeeService.createEmployee(data);
      setSuccess(true);
      setTimeout(() => navigate('/admin/employees'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to onboard employee. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-in zoom-in duration-300">
        <div className="text-center p-10 bg-white rounded-3xl border border-outline-variant/20 shadow-xl max-w-md">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} className="text-emerald-500 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight mb-2">Registration Successful</h2>
          <p className="text-secondary font-medium mb-8">Employee record created. An automated welcome email with login credentials has been dispatched.</p>
          <p className="text-xs text-slate-400">Redirecting to repository...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-white border border-outline-variant/20 rounded-xl text-slate-500 hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter leading-none">Onboard New Personnel</h1>
          <p className="text-sm text-secondary font-bold opacity-70 mt-1.5 uppercase tracking-wider">Authentication and Profile Setup</p>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-4 text-rose-700 font-bold animate-shake">
          <AlertCircle size={24} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Image Section */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/20 shadow-sm text-center">
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-6 opacity-60">Identity Asset</p>
            <div className="relative inline-block group">
              <div className="w-40 h-40 rounded-3xl bg-surface border-2 border-dashed border-outline-variant/40 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/40">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={60} className="text-slate-200 group-hover:text-primary/20 transition-colors" />
                )}
              </div>
              <label 
                htmlFor="profile-upload"
                className="absolute bottom-[-10px] right-[-10px] w-12 h-12 bg-white rounded-2xl shadow-lg border border-outline-variant/20 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-primary hover:text-white transition-all active:scale-90"
              >
                <Camera size={20} />
                <input 
                  id="profile-upload" 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <p className="mt-8 text-[11px] font-bold text-secondary opacity-60 leading-relaxed uppercase tracking-tight">
              Recommendation: Square image,<br />max 2MB (JPG, PNG)
            </p>
          </div>
        </div>

        {/* Detailed Information Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-outline-variant/20 shadow-sm space-y-6">
            <h3 className="text-[11px] font-black text-secondary uppercase tracking-widest opacity-60 border-b border-surface pb-4 mb-2">Core Profile Data</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface uppercase tracking-wider ml-1">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    name="firstName"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-surface border-0 rounded-xl text-sm font-bold text-on-surface ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-300"
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface uppercase tracking-wider ml-1">Last Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    name="lastName"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-surface border-0 rounded-xl text-sm font-bold text-on-surface ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-300"
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-on-surface uppercase tracking-wider ml-1">Official Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  name="email"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-surface border-0 rounded-xl text-sm font-bold text-on-surface ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-300"
                  placeholder="name@nexusledger.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface uppercase tracking-wider ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="tel" 
                    name="phone"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-surface border-0 rounded-xl text-sm font-bold text-on-surface ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-300"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-on-surface uppercase tracking-wider ml-1">Job Role/Position</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    name="position"
                    className="w-full pl-12 pr-4 py-3 bg-surface border-0 rounded-xl text-sm font-black text-on-surface ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                    value={formData.position}
                    onChange={handleInputChange}
                  >
                    <option value="Inventory Manager">Inventory Manager</option>
                    <option value="Standard Staff">Standard Staff</option>
                    <option value="Sales Clerk">Sales Clerk</option>
                    <option value="Finance Officer">Finance Officer</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-surface flex items-center justify-between gap-4">
              <button 
                type="button"
                onClick={() => navigate(-1)}
                className="px-8 py-3.5 text-secondary font-black text-sm uppercase tracking-widest hover:bg-surface rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-3 px-10 py-3.5 primary-gradient text-white rounded-xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={18} />
                    Finalize Onboarding
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateEmployee;
