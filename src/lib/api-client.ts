import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
}

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load tokens from localStorage
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');

    // Add request interceptor to attach token
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Add response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && this.refreshToken && originalRequest) {
          try {
            const response = await this.performTokenRefresh();
            this.setTokens(response.accessToken, response.refreshToken);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private setTokens(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    localStorage.setItem('accessToken', accessToken);

    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async performTokenRefresh() {
    return this.client.post<TokenResponse>('/auth/refresh', {
      refreshToken: this.refreshToken,
    });
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  // Auth endpoints
  async signup(email: string, password: string, firstName?: string, lastName?: string) {
    const response = await this.client.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/signup', {
      email,
      password,
      firstName,
      lastName,
    });
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data;
  }

  async signin(email: string, password: string) {
    const response = await this.client.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/login', {
      email,
      password,
    });
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser() {
    return this.client.get<AuthUser>('/auth/me');
  }

  // Password recovery endpoints
  async forgotPassword(email: string) {
    return this.client.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    return this.client.post('/auth/reset-password', {
      token,
      newPassword,
      confirmPassword,
    });
  }

  async verifyResetToken(token: string) {
    return this.client.post<{ valid: boolean; email: string }>('/auth/verify-reset-token', {
      token,
    });
  }

  // Scan endpoints
  async createScan(url: string, vulnerabilities: any[] = [], duration: number = 0) {
    return this.client.post('/scans', {
      url,
      vulnerabilities,
      duration,
    });
  }

  async getScans(page: number = 1, limit: number = 10) {
    return this.client.get('/scans', { params: { page, limit } });
  }

  async getScanById(id: string) {
    return this.client.get(`/scans/${id}`);
  }

  async updateScan(id: string, data: any) {
    return this.client.put(`/scans/${id}`, data);
  }

  async deleteScan(id: string) {
    return this.client.delete(`/scans/${id}`);
  }

  // User endpoints
  async getUserProfile() {
    return this.client.get<AuthUser>('/users/profile');
  }

  async updateUserProfile(data: Partial<AuthUser>) {
    return this.client.put('/users/profile', data);
  }

  async getUserSettings() {
    return this.client.get('/users/settings');
  }

  async updateUserSettings(data: any) {
    return this.client.put('/users/settings', data);
  }

  // Schedule endpoints
  async createSchedule(targetUrl: string, cronExpression: string, description?: string) {
    return this.client.post('/schedules', {
      targetUrl,
      cronExpression,
      description,
    });
  }

  async getSchedules() {
    return this.client.get('/schedules');
  }

  async updateSchedule(id: string, data: any) {
    return this.client.put(`/schedules/${id}`, data);
  }

  async deleteSchedule(id: string) {
    return this.client.delete(`/schedules/${id}`);
  }

  // Stripe / Subscription endpoints
  async createCheckoutSession(planTier: string) {
    return this.client.post('/stripe/checkout-session', { planTier });
  }

  async verifyCheckoutSession(sessionId: string) {
    return this.client.post('/stripe/verify-session', { sessionId });
  }

  async getSubscriptionStatus() {
    return this.client.get('/stripe/subscription-status');
  }

  async cancelSubscription() {
    return this.client.post('/stripe/cancel-subscription');
  }

  async updatePaymentMethod() {
    return this.client.post('/stripe/update-payment-method');
  }
}

export const apiClient = new ApiClient();
