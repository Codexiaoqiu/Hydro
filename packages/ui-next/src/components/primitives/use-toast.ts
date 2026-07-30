import { createContext, useContext } from 'react';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastContextValue {
  push: (item: Omit<ToastItem, 'id'>) => void;
}

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

/**
 * Internal context used by both `<ToastProvider>` and the `useToast` hook.
 * Exported so the hook in `use-toast.ts` can subscribe from a separate file
 * (which lets `Toast.tsx` only export the React component for fast refresh).
 */
export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return {
    info: (message: string) => ctx.push({ variant: 'info', message }),
    success: (message: string) => ctx.push({ variant: 'success', message }),
    error: (message: string) => ctx.push({ variant: 'error', message }),
  };
}
