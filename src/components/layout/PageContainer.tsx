export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <main className="lg:ml-[280px]">
      <div className="mx-auto max-w-studio px-4 py-6 lg:px-8">{children}</div>
    </main>
  );
}
