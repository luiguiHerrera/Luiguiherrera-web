export function MethodologyNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-t border-line py-6">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
    </div>
  );
}
