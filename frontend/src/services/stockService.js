import api from '../lib/axios';

class StockService {
  async create(formData) {
    const { data } = await api.post('/stock', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async batchCreate(items) {
    const { data } = await api.post('/stock/batch', { items });
    return data;
  }

  async directReceipt(items) {
    const { data } = await api.post('/stock/direct-receipt', { items });
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

  async getHistory(params = {}) {
    const { data } = await api.get('/stock/history', { params });
    return data;
  }

  async getHistoryByStock(stockId, params = {}) {
    const { data } = await api.get(`/stock/history/${stockId}`, { params });
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

  async recordPayment(stockId, paymentData) {
    const { data } = await api.post(`/stock/${stockId}/payments`, paymentData);
    return data;
  }

  async getStockPayments(stockId) {
    const { data } = await api.get(`/stock/${stockId}/payments`);
    return data;
  }

}

export default new StockService();
