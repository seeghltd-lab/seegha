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

  async updateStatus(id, status, notes) {
    const { data } = await api.patch(`/requisitions/${id}/status`, { status, notes });
    return data;
  }

  async remove(id) {
    const { data } = await api.delete(`/requisitions/${id}`);
    return data;
  }
}

export default new RequisitionService();
