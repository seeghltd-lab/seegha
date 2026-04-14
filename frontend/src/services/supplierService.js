import api from '../lib/axios';

class SupplierService {
  async create(data) {
    const { data: res } = await api.post('/suppliers', data);
    return res;
  }

  async getAll(params = {}) {
    const { data } = await api.get('/suppliers', { params });
    return data;
  }

  async getOne(id) {
    const { data } = await api.get(`/suppliers/${id}`);
    return data;
  }

  async getForSelect() {
    const { data } = await api.get('/suppliers/select');
    return data;
  }

  async update(id, data) {
    const { data: res } = await api.put(`/suppliers/${id}`, data);
    return res;
  }

  async remove(id) {
    const { data } = await api.delete(`/suppliers/${id}`);
    return data;
  }
}

export default new SupplierService();
