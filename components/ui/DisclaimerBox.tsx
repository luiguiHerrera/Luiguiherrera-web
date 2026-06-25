export function DisclaimerBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[6px] border border-brass/25 bg-white/55 px-4 py-3 text-[13px] leading-6 text-muted shadow-[0_12px_30px_rgba(11,52,54,0.035)]">
      {children}
    </div>
  );
}
