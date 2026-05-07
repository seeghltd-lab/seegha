import api from '../lib/axios';

class PermissionService {
  async getAll() {
    const { data } = await api.get('/permissions');
    return data;
  }

  async create(data) {
    const { data: res } = await api.post('/permissions', data);
    return res;
  }

  async update(id, data) {
    const { data: res } = await api.put(`/permissions/${id}`, data);
    return res;
  }

  async remove(id) {
    const { data } = await api.delete(`/permissions/${id}`);
    return data;
  }

  async assign(employeeId, permissionId) {
    const { data } = await api.post('/permissions/assign', { employeeId, permissionId });
    return data;
  }

  async revoke(employeeId, permissionId) {
    const { data } = await api.delete('/permissions/remove', { data: { employeeId, permissionId } });
    return data;
  }

  async getByEmployee(employeeId) {
    const { data } = await api.get(`/permissions/employee/${employeeId}`);
    return data;
  }
}

export default new PermissionService();
