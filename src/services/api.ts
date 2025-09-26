// API service for handling all HTTP requests

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get authentication headers
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
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

  // HTTP methods
  async get(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data: any): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: any): Promise<any> {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // File upload request
  async uploadFile(endpoint: string, formData: FormData): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {};

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
  async login(credentials: any): Promise<any> {
    const response = await this.post('/auth/login', credentials);
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async register(userData: any): Promise<any> {
    const response = await this.post('/auth/register', userData);
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setToken(null);
    }
  }

  async getProfile(): Promise<any> {
    return this.get('/auth/profile');
  }

  async updateProfile(profileData: any): Promise<any> {
    return this.put('/auth/profile', profileData);
  }

  // Student methods
  async getStudents(params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/students${queryString ? `?${queryString}` : ''}`);
  }

  async getStudent(id: string): Promise<any> {
    return this.get(`/students/${id}`);
  }

  async createStudent(studentData: any): Promise<any> {
    return this.post('/students', studentData);
  }

  async updateStudent(id: string, studentData: any): Promise<any> {
    return this.put(`/students/${id}`, studentData);
  }

  async deleteStudent(id: string): Promise<any> {
    return this.delete(`/students/${id}`);
  }

  async uploadFaceImages(studentId: string, images: Blob[]): Promise<any> {
    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append('images', image, `face-${index}.jpg`);
    });
    return this.uploadFile(`/students/${studentId}/face-images`, formData);
  }

  async getStudentAttendance(studentId: string, params?: URLSearchParams): Promise<any> {
    const queryString = params ? params.toString() : '';
    return this.get(`/students/${studentId}/attendance${queryString ? `?${queryString}` : ''}`);
  }

  // Faculty methods
  async getFaculty(params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/faculty${queryString ? `?${queryString}` : ''}`);
  }

  async createFaculty(facultyData: any): Promise<any> {
    return this.post('/faculty', facultyData);
  }

  // Course methods
  async getCourses(params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/courses${queryString ? `?${queryString}` : ''}`);
  }

  async getCourse(id: string): Promise<any> {
    return this.get(`/courses/${id}`);
  }

  async createCourse(courseData: any): Promise<any> {
    return this.post('/courses', courseData);
  }

  async updateCourse(id: string, courseData: any): Promise<any> {
    return this.put(`/courses/${id}`, courseData);
  }

  async deleteCourse(id: string): Promise<any> {
    return this.delete(`/courses/${id}`);
  }

  // Attendance methods
  async startAttendanceSession(sessionData: any): Promise<any> {
    return this.post('/attendance/sessions', sessionData);
  }

  async markAttendance(attendanceData: any): Promise<any> {
    return this.post('/attendance/mark', attendanceData);
  }

  async recognizeFace(imageData: string, sessionId: string): Promise<any> {
    return this.post('/attendance/recognize', { imageData, sessionId });
  }

  async getActiveSessions(): Promise<any> {
    return this.get('/attendance/sessions/active');
  }

  async endAttendanceSession(sessionId: string): Promise<any> {
    return this.put(`/attendance/sessions/${sessionId}/end`, {});
  }

  async getSessionAttendance(sessionId: string): Promise<any> {
    return this.get(`/attendance/sessions/${sessionId}/attendance`);
  }

  async getAttendanceHistory(params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/attendance/history${queryString ? `?${queryString}` : ''}`);
  }

  // Report methods
  async generateReport(reportType: string, params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/reports/${reportType}${queryString ? `?${queryString}` : ''}`);
  }

  async exportReport(reportType: string, format: string, params: Record<string, any> = {}): Promise<Blob> {
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
  async getAuditLogs(params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/audit${queryString ? `?${queryString}` : ''}`);
  }

  // System health check
  async healthCheck(): Promise<any> {
    return this.get('/health');
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;

// Named export for compatibility
export { apiService };