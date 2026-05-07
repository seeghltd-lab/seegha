import api from '../lib/axios';

class DashboardService {
  async getAdminDashboard({ period = 'today', from, to } = {}) {
    const params = { period };
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await api.get('/admin-auth/dashboard', { params });
    return data;
  }

  async getEmployeeDashboard() {
    const { data } = await api.get('/employee-auth/dashboard');
    return data;
  }
}

export default new DashboardService();
