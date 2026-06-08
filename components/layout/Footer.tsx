import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <p>Contenido educativo. Sin cuentas, sin respuestas guardadas y sin recomendaciones personalizadas de inversión.</p>
        <div className="flex gap-4">
          <Link className="hover:text-ink" href="/legal">
            Legal
          </Link>
          <Link className="hover:text-ink" href="/metodologia">
            Metodología
          </Link>
        </div>
      </div>
    </footer>
  );
}
