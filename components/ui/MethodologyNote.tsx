export function MethodologyNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel/95 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}
