import React from 'react';
import { ToastProvider as ToastContextProvider } from '@/contexts/toast-context';

export function ToastProvider({ children }: { children: React.ReactNode }) {  
  return (
    <ToastContextProvider>
      {children}
    </ToastContextProvider>
  );
}