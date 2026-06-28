import api from '../lib/axios';

class PurchaseOrderService {
  async create(data) {
    const { data: res } = await api.post('/purchase-orders', data);
    return res;
  }

  async getAll(params = {}) {
    const { data } = await api.get('/purchase-orders', { params });
    return data;
  }

  async getOne(id) {
    const { data } = await api.get(`/purchase-orders/${id}`);
    return data;
  }

  async update(id, data) {
    const { data: res } = await api.put(`/purchase-orders/${id}`, data);
    return res;
  }

  async receiveItems(id, items) {
    const { data } = await api.put(`/purchase-orders/${id}/receive`, { items });
    return data;
  }

  async cancel(id, reason) {
    const { data } = await api.put(`/purchase-orders/${id}/cancel`, { reason });
    return data;
  }

  async remove(id) {
    const { data } = await api.delete(`/purchase-orders/${id}`);
    return data;
  }

  async setItemPaymentType(poId, itemId, paymentType) {
    const { data } = await api.patch(
      `/purchase-orders/${poId}/items/${itemId}/payment-type`,
      { paymentType },
    );
    return data;
  }
}

export default new PurchaseOrderService();
