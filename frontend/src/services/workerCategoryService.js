import api from '../lib/axios';

class WorkerCategoryService {
  async getAll() {
    const { data } = await api.get('/worker-categories');
    return data;
  }

  async create(name) {
    const { data } = await api.post('/worker-categories', { name });
    return data;
  }

  async remove(id) {
    const { data } = await api.delete(`/worker-categories/${id}`);
    return data;
  }
}

export default new WorkerCategoryService();
