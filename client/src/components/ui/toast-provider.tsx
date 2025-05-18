import React from 'react';
import { useToastStore, initializeToastStore } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // Create the toast store
  const store = useToastStore();
  
  // Initialize the store on mount
  React.useEffect(() => {
    initializeToastStore(store);
  }, [store]);
  
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}