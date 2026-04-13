import api from '../lib/axios';

const employeeService = {
  /**
   * Fetch all employees
   */
  async getAllEmployees() {
    const { data } = await api.get('/employees');
    return data;
  },

  /**
   * Fetch a single employee by ID
   */
  async getEmployee(id) {
    const { data } = await api.get(`/employees/${id}`);
    return data;
  },

  /**
   * Create a new employee
   * @param {Object|FormData} employeeData - Can be plain object or FormData for image uploads
   */
  async createEmployee(employeeData) {
    const config = employeeData instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    
    const { data } = await api.post('/employees', employeeData, config);
    return data;
  },

  /**
   * Update an existing employee
   * @param {string} id - Employee ID
   * @param {Object|FormData} employeeData - Can be plain object or FormData for image updates
   */
  async updateEmployee(id, employeeData) {
    const config = employeeData instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};

    const { data } = await api.put(`/employees/${id}`, employeeData, config);
    return data;
  },

  /**
   * Delete an employee
   */
  async deleteEmployee(id) {
    const { data } = await api.delete(`/employees/${id}`);
    return data;
  }
};

export default employeeService;
