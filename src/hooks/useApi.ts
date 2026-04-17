import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/error-handler';

/**
 * Custom React Query hooks for API calls
 * Centralized data management with caching, refetching, and error handling
 */

// Query keys for consistency and easy invalidation
export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    user: ['auth', 'user'] as const,
    profile: ['auth', 'profile'] as const,
  },
  scans: {
    all: ['scans'] as const,
    list: (page: number, limit: number) => ['scans', 'list', page, limit] as const,
    detail: (id: string) => ['scans', 'detail', id] as const,
  },
  schedules: {
    all: ['schedules'] as const,
    list: ['schedules', 'list'] as const,
  },
};

// Auth hooks
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      const response = await apiClient.getCurrentUser();
      return response.data;
    },
    enabled: apiClient.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
    }: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => {
      return apiClient.signup(email, password, firstName, lastName);
    },
    onSuccess: (data) => {
      logger.info('Signup successful', { email: data.user.email });
      queryClient.setQueryData(queryKeys.auth.user, data.user);
    },
    onError: (error) => {
      logger.error('Signup failed', error);
    },
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return apiClient.signin(email, password);
    },
    onSuccess: (data) => {
      logger.info('Login successful', { email: data.user.email });
      queryClient.setQueryData(queryKeys.auth.user, data.user);
      // Invalidate scans to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.scans.all });
    },
    onError: (error) => {
      logger.error('Login failed', error);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      logger.info('Logout successful');
      // Clear all auth data
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      queryClient.removeQueries({ queryKey: queryKeys.scans.all });
      queryClient.removeQueries({ queryKey: queryKeys.schedules.all });
    },
    onError: (error) => {
      logger.error('Logout failed', error);
    },
  });
}

// Scan hooks
export function useScans(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.scans.list(page, limit),
    queryFn: async () => {
      const response = await apiClient.getScans(page, limit);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

export function useScanDetail(scanId: string) {
  return useQuery({
    queryKey: queryKeys.scans.detail(scanId),
    queryFn: async () => {
      const response = await apiClient.getScanById(scanId);
      return response.data;
    },
    enabled: !!scanId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      url,
      vulnerabilities,
      duration,
    }: {
      url: string;
      vulnerabilities?: unknown[];
      duration?: number;
    }) => {
      return apiClient.createScan(url, vulnerabilities, duration);
    },
    onSuccess: () => {
      logger.info('Scan created successfully');
      // Invalidate scan list to refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.scans.list(1, 10) });
    },
    onError: (error) => {
      logger.error('Failed to create scan', error);
    },
  });
}

export function useUpdateScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      return apiClient.updateScan(id, data);
    },
    onSuccess: (_, variables) => {
      logger.info('Scan updated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.scans.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.scans.all });
    },
    onError: (error) => {
      logger.error('Failed to update scan', error);
    },
  });
}

export function useDeleteScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.deleteScan(id);
    },
    onSuccess: (_, scanId) => {
      logger.info('Scan deleted successfully');
      queryClient.removeQueries({ queryKey: queryKeys.scans.detail(scanId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.scans.all });
    },
    onError: (error) => {
      logger.error('Failed to delete scan', error);
    },
  });
}

// Schedule hooks
export function useSchedules() {
  return useQuery({
    queryKey: queryKeys.schedules.list,
    queryFn: async () => {
      const response = await apiClient.getSchedules();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetUrl,
      cronExpression,
      description,
    }: {
      targetUrl: string;
      cronExpression: string;
      description?: string;
    }) => {
      return apiClient.createSchedule(targetUrl, cronExpression, description);
    },
    onSuccess: () => {
      logger.info('Schedule created successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
    },
    onError: (error) => {
      logger.error('Failed to create schedule', error);
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.deleteSchedule(id);
    },
    onSuccess: () => {
      logger.info('Schedule deleted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
    },
    onError: (error) => {
      logger.error('Failed to delete schedule', error);
    },
  });
}
