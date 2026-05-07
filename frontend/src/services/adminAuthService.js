import api from '../lib/axios';

class AdminAuthService {
  async login(credentials) {
    const { data } = await api.post('/admin-auth/login', credentials);
    return data;
  }

  async logout() {
    const { data } = await api.post('/admin-auth/logout');
    return data;
  }

  async getProfile() {
    const { data } = await api.get('/admin-auth/profile');
    return data;
  }

  async editProfile(updates) {
    const { data } = await api.put('/admin-auth/edit-profile', updates);
    return data;
  }

  async changePassword(passwords) {
    const { data } = await api.patch('/admin-auth/change-password', passwords);
    return data;
  }
}

export default new AdminAuthService();
