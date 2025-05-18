import { useState } from "react";

// Define toast types
export type ToastProps = {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success";
};

// Create a store for toasts
type ToastStore = {
  toasts: ToastProps[];
};

const useToastStore = () => {
  // Using local state for simplicity
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: ToastProps) => {
    const id = toast.id || String(Date.now());
    
    setToasts((prevToasts) => [
      ...prevToasts.filter((t) => t.id !== id),
      { ...toast, id },
    ]);
    
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const updateToast = (toast: ToastProps) => {
    if (!toast.id) return;
    
    setToasts((prevToasts) => 
      prevToasts.map((t) => (t.id === toast.id ? { ...t, ...toast } : t))
    );
  };

  return {
    toasts,
    addToast,
    removeToast,
    updateToast,
  };
};

// Singleton store instance
let store: ReturnType<typeof useToastStore> | null = null;

// Initialize store if it doesn't exist
const getStore = () => {
  if (store === null) {
    throw new Error(
      "Toast store not initialized. Make sure you're using the ToastProvider at the root of your app."
    );
  }
  return store;
};

// Hook to access and manipulate toasts
export function useToast() {
  // This is a fake hook that just returns the store methods
  // In a real app, you'd use React context or a state management library
  
  function toast(props: ToastProps) {
    const id = props.id || String(Date.now());
    getStore().addToast({ id, ...props });
    
    return {
      id,
      dismiss: () => dismiss(id),
      update: (props: ToastProps) => update({ id, ...props }),
    };
  }
  
  function dismiss(id: string) {
    getStore().removeToast(id);
  }
  
  function update(props: ToastProps) {
    getStore().updateToast(props);
  }
  
  return {
    toast,
    dismiss,
    update,
    toasts: getStore().toasts,
  };
}

// Initialization function to be called in ToastProvider
export function initializeToastStore(newStore: ReturnType<typeof useToastStore>) {
  store = newStore;
}