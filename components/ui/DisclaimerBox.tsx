export function DisclaimerBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="editorial-surface rounded-[6px] border border-brass/25 px-4 py-3 text-[13px] leading-6 text-muted">
      {children}
    </div>
  );
}
