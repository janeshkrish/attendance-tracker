// API service for handling all HTTP requests

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get authentication headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // File upload request
  async uploadFile(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {};

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(credentials) {
    const response = await this.post('/auth/login', credentials);
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async register(userData) {
    const response = await this.post('/auth/register', userData);
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setToken(null);
    }
  }

  async getProfile() {
    return this.get('/auth/profile');
  }

  async updateProfile(profileData) {
    return this.put('/auth/profile', profileData);
  }

  // Student methods
  async getStudents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/students${queryString ? `?${queryString}` : ''}`);
  }

  async getStudent(id) {
    return this.get(`/students/${id}`);
  }

  async createStudent(studentData) {
    return this.post('/students', studentData);
  }

  async updateStudent(id, studentData) {
    return this.put(`/students/${id}`, studentData);
  }

  async deleteStudent(id) {
    return this.delete(`/students/${id}`);
  }

  async uploadFaceImages(studentId, images) {
    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append('images', image, `face-${index}.jpg`);
    });
    return this.uploadFile(`/students/${studentId}/face-images`, formData);
  }

  async enrollStudent(studentId, courseId) {
    return this.post(`/students/${studentId}/enroll`, { courseId });
  }

  async getStudentAttendance(studentId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/students/${studentId}/attendance${queryString ? `?${queryString}` : ''}`);
  }

  // Faculty methods
  async getFaculty(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/faculty${queryString ? `?${queryString}` : ''}`);
  }

  async createFaculty(facultyData) {
    return this.post('/faculty', facultyData);
  }

  // Course methods
  async getCourses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/courses${queryString ? `?${queryString}` : ''}`);
  }

  async getCourse(id) {
    return this.get(`/courses/${id}`);
  }

  async createCourse(courseData) {
    return this.post('/courses', courseData);
  }

  async updateCourse(id, courseData) {
    return this.put(`/courses/${id}`, courseData);
  }

  async deleteCourse(id) {
    return this.delete(`/courses/${id}`);
  }

  // Attendance methods
  async startAttendanceSession(sessionData) {
    return this.post('/attendance/sessions', sessionData);
  }

  async markAttendance(attendanceData) {
    return this.post('/attendance/mark', attendanceData);
  }

  async recognizeFace(imageData, sessionId) {
    return this.post('/attendance/recognize', { imageData, sessionId });
  }

  async getActiveSessions() {
    return this.get('/attendance/sessions/active');
  }

  async endAttendanceSession(sessionId) {
    return this.put(`/attendance/sessions/${sessionId}/end`);
  }

  async getSessionAttendance(sessionId) {
    return this.get(`/attendance/sessions/${sessionId}/attendance`);
  }

  async getAttendanceHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/attendance/history${queryString ? `?${queryString}` : ''}`);
  }

  // Report methods
  async generateReport(reportType, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/reports/${reportType}${queryString ? `?${queryString}` : ''}`);
  }

  async exportReport(reportType, format, params = {}) {
    const queryString = new URLSearchParams({ ...params, format }).toString();
    const url = `${this.baseURL}/reports/${reportType}/export?${queryString}`;
    
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  // Audit methods
  async getAuditLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/audit${queryString ? `?${queryString}` : ''}`);
  }

  // System health check
  async healthCheck() {
    return this.get('/health');
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;

// Export the class for testing purposes
export { ApiService };