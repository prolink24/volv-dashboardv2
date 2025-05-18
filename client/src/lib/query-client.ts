import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Create a custom axios instance for API requests
export const apiClient = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to handle API requests
export const apiRequest = async <T>({
  url,
  method = 'GET',
  data,
  params,
}: {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  params?: any;
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
    if (axios.isAxiosError(error) && error.response) {
      // Extract the error message from the response
      const message = error.response.data?.message || error.message;
      throw new Error(message);
    }
    throw error;
  }
};

// Create a client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});