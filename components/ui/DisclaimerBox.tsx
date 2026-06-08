export function DisclaimerBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-brass/30 bg-brass/10 px-4 py-3 text-sm leading-6 text-[#eadfca] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {children}
    </div>
  );
}
