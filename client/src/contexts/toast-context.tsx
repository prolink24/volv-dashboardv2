import React, { createContext, useState, useContext, useEffect } from 'react';
import { ToastProvider as ShadcnToastProvider } from "@/components/ui/toast";

export type ToastProps = {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
  className?: string;
  duration?: number;
};

type ToastContextType = {
  toasts: ToastProps[];
  toast: (props: ToastProps) => { id: string; dismiss: () => void; update: (props: ToastProps) => void };
  dismiss: (id: string) => void;
  update: (props: ToastProps) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (props: ToastProps) => {
    const id = props.id || String(Date.now());
    const duration = props.duration || 5000;
    
    setToasts((prevToasts) => [
      ...prevToasts.filter((t) => t.id !== id),
      { ...props, id, duration },
    ]);
    
    // Auto-dismiss toast after duration
    setTimeout(() => {
      dismissToast(id);
    }, duration);
    
    return {
      id,
      dismiss: () => dismissToast(id),
      update: (props: ToastProps) => updateToast({ id, ...props }),
    };
  };

  const dismissToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const updateToast = (props: ToastProps) => {
    if (!props.id) return;
    
    setToasts((prevToasts) => 
      prevToasts.map((t) => (t.id === props.id ? { ...t, ...props } : t))
    );
  };

  const value = {
    toasts,
    toast: addToast,
    dismiss: dismissToast,
    update: updateToast,
  };

  // Use a separate Toast Context Provider for the actual toast itself
  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

// Standalone toast function for easier imports
export const toast = (props: ToastProps) => {
  try {
    const { toast } = useToast();
    return toast(props);
  } catch (e) {
    console.error('Toast failed, context may not be available:', e);
    return { 
      id: String(Date.now()), 
      dismiss: () => {}, 
      update: () => {} 
    };
  }
};