import api from '../lib/axios';

class NotificationService {
  async getNotifications(recipientId, recipientType, page = 1, limit = 20, search = '') {
    const { data } = await api.get('/notifications', {
      params: { recipientId, recipientType, page, limit, search },
    });
    return data;
  }

  async getUnreadCount(recipientId, recipientType) {
    const { data } = await api.get('/notifications/unread-count', {
      params: { recipientId, recipientType },
    });
    return data;
  }

  async markAsRead(id) {
    const { data } = await api.put(`/notifications/${id}/read`);
    return data;
  }
}

export default new NotificationService();
