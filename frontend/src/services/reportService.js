import api from '../lib/axios';

class ReportService {
  async getReport({ period = 'month', from, to } = {}) {
    const params = { period };
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await api.get('/admin-auth/reports', { params });
    return data;
  }
}

export default new ReportService();
