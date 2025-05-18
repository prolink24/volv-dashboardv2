import { useState, useEffect } from "react";

export type ToastProps = {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success";
};

const TOAST_TIMEOUT = 5000; // 5 seconds

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setToasts((toasts) => {
        if (toasts.length > 0) {
          const [, ...rest] = toasts;
          return rest;
        }
        return toasts;
      });
    }, TOAST_TIMEOUT);

    return () => clearTimeout(timer);
  }, [toasts]);

  function toast(props: ToastProps) {
    const id = props.id || Math.random().toString(36).substring(2, 9);
    setToasts((toasts) => [...toasts, { id, ...props }]);
    
    return {
      id,
      dismiss: () => dismiss(id),
      update: (props: ToastProps) => update({ id, ...props }),
    };
  }

  function dismiss(id: string) {
    setToasts((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  function update(props: ToastProps) {
    if (!props.id) return;
    
    setToasts((toasts) =>
      toasts.map((t) => (t.id === props.id ? { ...t, ...props } : t))
    );
  }

  return {
    toast,
    dismiss,
    toasts,
  };
}

export default useToast;