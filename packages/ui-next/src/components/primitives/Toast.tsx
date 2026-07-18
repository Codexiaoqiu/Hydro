import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './Toast.module.css';

export type ToastVariant = 'info' | 'success' | 'error';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  push: (item: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps { children: ReactNode; }

export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setItems((prev) => [...prev, { id, ...item }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className={styles.container} role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`${styles.toast} ${styles[i.variant]}`}>
            <span>{i.message}</span>
            <button type="button" aria-label="dismiss" onClick={() => dismiss(i.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return {
    info: (message: string) => ctx.push({ variant: 'info', message }),
    success: (message: string) => ctx.push({ variant: 'success', message }),
    error: (message: string) => ctx.push({ variant: 'error', message }),
  };
}