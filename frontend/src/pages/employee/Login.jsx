import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import { useNotification } from '../../context/NotificationContext';
import { SITE_NAME, SITE_DESCRIPTION } from '../../config/site';

const EmployeeLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useEmployeeAuth();
  const { setRecipient } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError('');
      const employee = await login({ identifier, password });
      setRecipient(employee.id, 'EMPLOYEE');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-surface font-sans">
      {/* Left side - Image & Branding */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden h-screen">
        <img 
          alt="Modern glass office building facade" 
          className="absolute inset-0 w-full h-full object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1ZyRdIetrQR_ExzMbwQgJgvryhsoWmk_R3K0cPHUkFo0nzh9Cq81h3yRWgo4YznnYVjIg_7-kpSY5m8WcTVb9c9zbzvX6t1sAnLH807M8JeI8RzrpJKeqnyp_8B14sKIcuBI4oWvLMxXnteyzJvfSMKJLNNSEIYssqC31M4hLIa-YONNXVBQBkVEGJIxLLwfXVBeWWN_NGt-XbiIGFaJ3R8KCnf_hq5BULqRw41apqJ8QB1C6o9Qx9Oq8aHl52MlE0-09FO6qAwyH"
        />
        <div className="absolute inset-0 bg-primary/20 backdrop-multiply"></div>
        <div className="absolute bottom-12 left-12 right-12 z-10 transition-all duration-700 delay-300">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/20 shadow-2xl">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-4 headline">Efficiency at Your Fingertips.</h2>
            <p className="text-blue-50 text-lg font-light leading-relaxed">
              {SITE_DESCRIPTION}
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-surface min-h-screen">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-8">
              <div className="w-10 h-10 primary-gradient rounded-lg flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <span className="text-2xl font-extrabold tracking-tighter text-on-surface uppercase">{SITE_NAME}</span>
            </div>
            <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2">Welcome Back</h1>
            <p className="text-on-surface-variant font-medium">Please enter your credentials to access your staff portal.</p>
          </div>

          {error && (
            <div className="p-4 text-sm text-on-error-container bg-error-container/20 border border-error/20 rounded-lg flex items-center gap-3 animate-shake">
              <span className="material-symbols-outlined text-error">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-5">
              <div className="group">
                <label className="block text-sm font-semibold text-on-surface mb-2" htmlFor="identifier">Email or Phone</label>
                <input 
                  className="block w-full px-4 py-3 bg-surface-container-lowest border-0 rounded-lg text-on-surface ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary transition-all placeholder:text-secondary/50 outline-none" 
                  id="identifier" 
                  name="identifier" 
                  placeholder="e.g. employee@nexusledger.com" 
                  required 
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <div className="group">
                <label className="block text-sm font-semibold text-on-surface mb-2" htmlFor="password">Passcode</label>
                <div className="relative">
                  <input 
                    className="block w-full px-4 py-3 bg-surface-container-lowest border-0 rounded-lg text-on-surface ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary transition-all placeholder:text-secondary/50 outline-none" 
                    id="password" 
                    name="password" 
                    placeholder="••••••••" 
                    required 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors focus:outline-none" 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary accent-primary" id="remember-me" name="remember-me" type="checkbox"/>
                <label className="ml-2 block text-sm font-medium text-on-surface-variant" htmlFor="remember-me">Remember me</label>
              </div>
              <div className="text-sm">
                <a className="font-semibold text-primary hover:text-primary-dim transition-colors underline decoration-2 underline-offset-4 decoration-primary/20" href="#">Forgot passcode?</a>
              </div>
            </div>

            <div>
              <button 
                className="group relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white primary-gradient hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-95 shadow-md disabled:opacity-70 disabled:active:scale-100" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Access Dashboard
                    <span className="material-symbols-outlined ml-2 text-lg">arrow_forward</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative py-4">
              <div aria-hidden="true" class="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-container-highest"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                <span className="px-2 bg-surface text-on-surface-variant">Staff Authentication</span>
              </div>
            </div>
          </form>

          <p className="text-center text-sm font-medium text-on-surface-variant">
            Are you an administrator? 
            <Link to="/admin/login" className="ml-1 font-bold text-primary hover:text-primary-dim underline decoration-2 underline-offset-4">Admin Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;
