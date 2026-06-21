import api from '../lib/axios';

class StockMigrationService {
  async initiate(payload) {
    const { data } = await api.post('/stock-migrations', payload);
    return data;
  }

  async getAll(params = {}) {
    const { data } = await api.get('/stock-migrations', { params });
    return data;
  }

  async getOne(id) {
    const { data } = await api.get(`/stock-migrations/${id}`);
    return data;
  }

  async receive(id, notes) {
    const { data } = await api.patch(`/stock-migrations/${id}/receive`, { notes });
    return data;
  }

  async cancel(id, reason) {
    const { data } = await api.patch(`/stock-migrations/${id}/cancel`, { reason });
    return data;
  }

  async reject(id, reason) {
    const { data } = await api.patch(`/stock-migrations/${id}/reject`, { reason });
    return data;
  }
}

export default new StockMigrationService();
