import api from '../lib/axios';

class EmployeeAuthService {
  async login(credentials) {
    const { data } = await api.post('/employee-auth/login', credentials);
    return data;
  }

  async logout() {
    const { data } = await api.post('/employee-auth/logout');
    return data;
  }

  async getProfile() {
    const { data } = await api.get('/employee-auth/profile');
    return data;
  }

  async updateProfile(formData) {
    const { data } = await api.put('/employee-auth/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async changePassword(passwords) {
    const { data } = await api.patch('/employee-auth/change-password', passwords);
    return data;
  }
}

export default new EmployeeAuthService();
