export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[6px] border border-dashed border-line bg-white/70 p-5">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}
