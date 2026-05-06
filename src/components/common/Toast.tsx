type ToastItem = { id: string; tone: 'success' | 'error' | 'info'; message: string };

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
            toast.tone === 'success'
              ? 'border-[#00ff9d]/30 bg-[#07130d] text-[#b8ffd9]'
              : toast.tone === 'error'
                ? 'border-error/30 bg-error-container/70 text-error'
                : 'border-primary-fixed-dim/30 bg-surface-container text-on-surface'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
