export function RegimeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-petrol/50 bg-petrol/15 px-4 py-2 text-sm font-semibold text-sage">
      {label}
    </span>
  );
}
