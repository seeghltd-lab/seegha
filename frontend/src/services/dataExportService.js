import api from '../lib/axios';

const dataExportService = {
  async exportData(options) {
    const response = await api.post('/data-export/export', options, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    const cd = response.headers['content-disposition'] ?? '';
    const match = cd.match(/filename="?([^";\n]+)"?/);
    a.href = url;
    a.download = match ? match[1] : `amza-export.${options.format === 'pdf' ? 'pdf' : options.format === 'excel' ? 'xlsx' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importPreview(file, conflictStrategy = 'SKIP', groups = null) {
    const form = new FormData();
    form.append('file', file);
    form.append('conflictStrategy', conflictStrategy);
    if (groups) form.append('groups', JSON.stringify(groups));
    const response = await api.post('/data-export/import/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  async importData(file, options = {}) {
    const form = new FormData();
    form.append('file', file);
    form.append('conflictStrategy', options.conflictStrategy ?? 'SKIP');
    if (options.groups) form.append('groups', JSON.stringify(options.groups));
    const response = await api.post('/data-export/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    });
    return response.data;
  },

  async previewStockCsv(file) {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post('/data-export/import/stock-csv/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  async importStockCsv(file) {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post('/data-export/import/stock-csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  },

  async getImportHistory() {
    const response = await api.get('/data-export/import/history');
    return response.data;
  },

  async rollbackImport(snapshotId) {
    const response = await api.post(`/data-export/import/rollback/${snapshotId}`);
    return response.data;
  },
};

export default dataExportService;
