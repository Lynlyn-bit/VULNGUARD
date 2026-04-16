import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiError, logger } from './error-handler';

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
  private refreshPromise: Promise<string> | null = null;

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
        const originalRequest = error.config as any;

        // Prevent infinite loops by checking if this is a retry attempt
        if (
          error.response?.status === 401 &&
          this.refreshToken &&
          originalRequest &&
          !originalRequest._isRetry
        ) {
          originalRequest._isRetry = true;

          try {
            // Prevent multiple simultaneous refresh requests
            if (!this.refreshPromise) {
              this.refreshPromise = this.performTokenRefresh().then((response) => {
                this.setTokens(response.accessToken, response.refreshToken);
                this.refreshPromise = null;
                return response.accessToken;
              }).catch((err) => {
                this.refreshPromise = null;
                throw err;
              });
            }

            const newAccessToken = await this.refreshPromise;

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.client(originalRequest);
          } catch (refreshError: unknown) {
            logger.error('Token refresh failed', refreshError);
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Transform axios errors to ApiError
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data as any;
          
          const apiError = new ApiError(
            status,
            data?.code || 'UNKNOWN_ERROR',
            data?.error || data?.message || error.message,
            data
          );

          logger.error(
            `API Error [${status}]: ${apiError.code}`,
            apiError,
            { url: originalRequest?.url }
          );

          return Promise.reject(apiError);
        }

        // Network or client error
        if (error.request) {
          const apiError = new ApiError(
            0,
            'NETWORK_ERROR',
            'Failed to connect to the server. Please check your internet connection.',
            error
          );
          logger.error('Network Error', apiError);
          return Promise.reject(apiError);
        }

        // Request setup error
        const apiError = new ApiError(
          0,
          'REQUEST_ERROR',
          'Failed to create request. Please try again.',
          error
        );
        logger.error('Request Error', apiError);
        return Promise.reject(apiError);
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
    if (!this.refreshToken) {
      throw new ApiError(401, 'NO_REFRESH_TOKEN', 'No refresh token available');
    }

    const response = await this.client.post<TokenResponse>('/auth/refresh', {
      refreshToken: this.refreshToken,
    });

    if (!response.data.accessToken) {
      throw new ApiError(401, 'INVALID_REFRESH_RESPONSE', 'Invalid refresh response');
    }

    return response.data;
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
    } catch (error) {
      logger.warn('Logout API call failed, clearing tokens locally', error);
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser() {
    return this.client.get<AuthUser>('/auth/me');
  }

  // Scan endpoints
  async createScan(url: string, vulnerabilities: unknown[] = [], duration: number = 0) {
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

  async updateScan(id: string, data: unknown) {
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

  async updateUserSettings(data: unknown) {
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

  async updateSchedule(id: string, data: unknown) {
    return this.client.put(`/schedules/${id}`, data);
  }

  async deleteSchedule(id: string) {
    return this.client.delete(`/schedules/${id}`);
  }
}

export const apiClient = new ApiClient();
