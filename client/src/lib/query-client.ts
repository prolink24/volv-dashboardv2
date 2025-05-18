import { QueryClient } from '@tanstack/react-query';

// Default fetcher function for React Query
export async function defaultFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  
  if (!response.ok) {
    // Handle API errors
    const errorData = await response.json().catch(() => ({
      message: 'Unknown error occurred',
    }));
    
    throw new Error(
      errorData.message || `API error: ${response.status} ${response.statusText}`
    );
  }
  
  return response.json();
}

// Helper function for API requests with different methods
export async function apiRequest<T, U = void>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT' = 'POST',
  data?: U
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    // Handle API errors
    const errorData = await response.json().catch(() => ({
      message: 'Unknown error occurred',
    }));
    
    throw new Error(
      errorData.message || `API error: ${response.status} ${response.statusText}`
    );
  }
  
  // For DELETE operations, we might not have a response body
  if (method === 'DELETE' && response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

// Create a client with default configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
      queryFn: ({ queryKey }) => {
        // Convert array query keys to URL path
        const url = Array.isArray(queryKey) 
          ? queryKey.join('/') 
          : queryKey.toString();
          
        return defaultFetcher(url);
      },
    },
  },
});

export default queryClient;