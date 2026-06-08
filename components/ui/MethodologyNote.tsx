export function MethodologyNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}
