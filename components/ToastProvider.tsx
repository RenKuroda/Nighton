import React from 'react';

export type ToastType = 'info' | 'success' | 'error';

type Toast = { id: number; message: string; type: ToastType };

type ToastContextValue = {
  showToast: (opts: { message: string; type?: ToastType }) => void;
};

const ToastContext = React.createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => React.useContext(ToastContext);

const ToastItem: React.FC<{ toast: Toast; onDone: (id: number) => void }> = ({ toast, onDone }) => {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const enter = setTimeout(() => setVisible(true), 10);
    const leave = setTimeout(() => setVisible(false), 2800);
    const cleanup = setTimeout(() => onDone(toast.id), 3000);
    return () => { clearTimeout(enter); clearTimeout(leave); clearTimeout(cleanup); };
  }, [toast.id, onDone]);

  const borderColor = '#7e5eff';
  return (
    <div
      className="rounded-xl px-4 py-3 text-white shadow-lg"
      style={{
        background: '#121321',
        border: `1px solid ${borderColor}`,
        boxShadow: `0 0 12px rgba(126, 94, 255, 0.5)`,
        transition: 'opacity 180ms ease, transform 180ms ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)'
      }}
    >
      {toast.message}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const showToast = React.useCallback(({ message, type = 'info' }: { message: string; type?: ToastType }) => {
    setToasts(prev => [...prev, { id: Date.now() + Math.floor(Math.random() * 1000), message, type }]);
  }, []);

  const handleDone = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDone={handleDone} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;


