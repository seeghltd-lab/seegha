import api from '../lib/axios';

class CategoryService {
  async create(data) {
    const { data: res } = await api.post('/categories', data);
    return res;
  }

  async getAll() {
    const { data } = await api.get('/categories');
    return data;
  }

  async update(id, data) {
    const { data: res } = await api.put(`/categories/${id}`, data);
    return res;
  }

  async remove(id) {
    const { data } = await api.delete(`/categories/${id}`);
    return data;
  }
}

export default new CategoryService();
