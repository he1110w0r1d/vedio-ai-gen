import type { ReactNode } from 'react';

export function InfoNotice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 p-4 text-sm leading-6 text-primary ${className}`}>
      {children}
    </div>
  );
}
