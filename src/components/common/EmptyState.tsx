import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex min-h-56 flex-col items-center justify-center text-center">
      <Icon name={icon} className="mb-3 text-5xl text-primary-fixed-dim" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-on-surface-variant">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
