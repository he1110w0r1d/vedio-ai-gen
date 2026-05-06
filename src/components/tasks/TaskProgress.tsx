export function TaskProgress({ progress }: { progress: number }) {
  return (
    <div className="mt-4 h-2 rounded-full bg-surface-container-high">
      <div className="h-full rounded-full bg-primary-fixed-dim transition-all" style={{ width: `${progress}%` }} />
    </div>
  );
}
