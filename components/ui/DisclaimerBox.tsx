export function DisclaimerBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-brass/30 bg-brass/10 p-4 text-sm leading-6 text-[#e8dcc3]">
      {children}
    </div>
  );
}
