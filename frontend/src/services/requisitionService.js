import api from '../lib/axios';

class RequisitionService {
  async create(data) {
    const { data: res } = await api.post('/requisitions', data);
    return res;
  }

  async getAll(params = {}) {
    const { data } = await api.get('/requisitions', { params });
    return data;
  }

  async getOne(id) {
    const { data } = await api.get(`/requisitions/${id}`);
    return data;
  }

  async getReceivingSummary(id) {
    const { data } = await api.get(`/requisitions/${id}/receiving-summary`);
    return data;
  }

  async approve(id, payload = {}) {
    const { data } = await api.put(`/requisitions/${id}/approve`, payload);
    return data;
  }

  async reject(id, reason) {
    const { data } = await api.put(`/requisitions/${id}/reject`, { reason });
    return data;
  }

  async receiveItems(id, items) {
    const { data } = await api.put(`/requisitions/${id}/receive`, { items });
    return data;
  }

  async remove(id) {
    const { data } = await api.delete(`/requisitions/${id}`);
    return data;
  }
}

export default new RequisitionService();
