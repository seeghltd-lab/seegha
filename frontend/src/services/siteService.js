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

  // Stock Out
  async recordStockOut(siteId, payload) {
    const { data } = await api.post(`/sites/${siteId}/stock-out`, payload);
    return data;
  }

  async getStockOuts(siteId, params = {}) {
    const { data } = await api.get(`/sites/${siteId}/stock-out`, { params });
    return data;
  }

  async getStockOutSummary(siteId) {
    const { data } = await api.get(`/sites/${siteId}/stock-out/summary`);
    return data;
  }

  async updateStockOut(siteId, id, payload) {
    const { data } = await api.put(`/sites/${siteId}/stock-out/${id}`, payload);
    return data;
  }

  async deleteStockOut(siteId, id) {
    const { data } = await api.delete(`/sites/${siteId}/stock-out/${id}`);
    return data;
  }

  // Site Employee Access
  async getSiteAccess(siteId) {
    const { data } = await api.get(`/sites/${siteId}/access`);
    return data;
  }

  async getMyAccess(siteId) {
    const { data } = await api.get(`/sites/my-access/${siteId}`);
    return data;
  }

  async assignEmployeeToSite(siteId, payload) {
    const { data } = await api.post(`/sites/${siteId}/access`, payload);
    return data;
  }

  async updateSiteAccess(siteId, employeeId, payload) {
    const { data } = await api.put(`/sites/${siteId}/access/${employeeId}`, payload);
    return data;
  }

  async removeSiteAccess(siteId, employeeId) {
    const { data } = await api.delete(`/sites/${siteId}/access/${employeeId}`);
    return data;
  }
}

export default new SiteService();
