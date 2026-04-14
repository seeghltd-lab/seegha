import api from '../lib/axios';

class StockService {
  async create(formData) {
    const { data } = await api.post('/stock', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async getAll(params = {}) {
    const { data } = await api.get('/stock', { params });
    return data;
  }

  async getOne(id) {
    const { data } = await api.get(`/stock/${id}`);
    return data;
  }

  async getAlerts() {
    const { data } = await api.get('/stock/alerts');
    return data;
  }

  async getHistory() {
    const { data } = await api.get('/stock/history');
    return data;
  }

  async getHistoryByStock(stockId) {
    const { data } = await api.get(`/stock/history/${stockId}`);
    return data;
  }

  async update(id, formData) {
    const { data } = await api.put(`/stock/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async remove(id) {
    const { data } = await api.delete(`/stock/${id}`);
    return data;
  }
}

export default new StockService();
