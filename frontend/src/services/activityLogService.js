import api from '../lib/axios';

class ActivityLogService {
  async getAll(params = {}) {
    const { data } = await api.get('/activity-logs', { params });
    return data;
  }

  async getStats() {
    const { data } = await api.get('/activity-logs/stats');
    return data;
  }

  async purge(days) {
    const { data } = await api.delete(`/activity-logs/purge/${days}`);
    return data;
  }
}

export default new ActivityLogService();
