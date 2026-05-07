import api from '../lib/axios';

class SiteService {
  async create(formData) {
    const { data } = await api.post('/sites', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async getAll(params = {}) {
    const { data } = await api.get('/sites', { params });
    return data;
  }

  async getOne(id) {
    const { data } = await api.get(`/sites/${id}`);
    return data;
  }

  async update(id, formData) {
    const { data } = await api.put(`/sites/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async remove(id) {
    const { data } = await api.delete(`/sites/${id}`);
    return data;
  }

  async getStats() {
    const { data } = await api.get('/sites/stats');
    return data;
  }

  // Worker Records
  async addWorkerRecord(siteId, payload) {
    const { data } = await api.post(`/sites/${siteId}/workers`, payload);
    return data;
  }

  async getWorkerRecords(siteId) {
    const { data } = await api.get(`/sites/${siteId}/workers`);
    return data;
  }

  async removeWorkerRecord(siteId, recordId) {
    const { data } = await api.delete(`/sites/${siteId}/workers/${recordId}`);
    return data;
  }

  // Expenses
  async addExpense(siteId, payload) {
    const { data } = await api.post(`/sites/${siteId}/expenses`, payload);
    return data;
  }

  async getExpenses(siteId) {
    const { data } = await api.get(`/sites/${siteId}/expenses`);
    return data;
  }

  async removeExpense(siteId, expenseId) {
    const { data } = await api.delete(`/sites/${siteId}/expenses/${expenseId}`);
    return data;
  }
}

export default new SiteService();
