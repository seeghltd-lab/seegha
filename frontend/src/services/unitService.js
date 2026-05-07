import api from '../lib/axios';

class UnitService {
  async getAll(search = '') {
    const params = search ? { search } : {};
    const { data } = await api.get('/units', { params });
    return data;
  }

  async create(name) {
    const { data } = await api.post('/units', { name });
    return data;
  }

  async remove(id) {
    const { data } = await api.delete(`/units/${id}`);
    return data;
  }
}

export default new UnitService();
