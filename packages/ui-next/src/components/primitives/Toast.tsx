import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import styles from './Toast.module.css';
import { ToastContext, type ToastVariant } from './use-toast';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

export type { ToastVariant };

export interface ToastProviderProps { children: ReactNode }

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
