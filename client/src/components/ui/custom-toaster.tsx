import React from 'react';
import { useToast } from '@/contexts/toast-context';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
  ToastProvider as ShadcnToastProvider
} from "@/components/ui/toast";

export function CustomToaster() {
  const { toasts } = useToast();

  return (
    <ShadcnToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} {...props} variant={variant}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ShadcnToastProvider>
  );
}