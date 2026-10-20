import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastTone = 'info' | 'success' | 'gold' | 'warn' | 'error';

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}

const TONE_BORDER: Record<ToastTone, string> = {
  info: 'border-rim/60',
  success: 'border-[#34D399]/70',
  gold: 'border-[#D4AF37]/70',
  warn: 'border-[#D4A346]/70',
  error: 'border-[#B85D3D]/70',
};

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const pushToast = useCallback((text: string, tone: ToastTone = 'info') => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, text, tone }].slice(-2));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);

  return { toasts, pushToast };
}

function ToastItem({ toast }: { toast: Toast }) {
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFading(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      className={`pointer-events-none w-max max-w-[80vw] rounded-md border bg-[#111A1F]/95 px-3 py-1.5 shadow-panel transition-opacity duration-500 ${
        TONE_BORDER[toast.tone]
      } ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <p className="truncate text-[11px] font-semibold text-[#D8C596]">{toast.text}</p>
    </div>
  );
}

export function ToastManager({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-14 z-50 flex -translate-x-1/2 flex-col items-center gap-1.5" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
