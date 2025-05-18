import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

// Create an axios instance with default configuration
export const apiClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simplified API request function that works with our React Query setup
export const apiRequest = async <T>({
  url,
  method = 'GET',
  data,
  params,
}: {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}): Promise<T> => {
  try {
    const response = await apiClient({
      url,
      method,
      data,
      params,
    });
    
    return response.data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Configure the React Query client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});