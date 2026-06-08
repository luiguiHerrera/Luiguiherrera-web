export function MethodologyNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-t border-line py-5">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}
