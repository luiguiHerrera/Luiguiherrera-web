import Image from "next/image";

type ReportFigureProps = {
  src: string;
  alt: string;
  caption: string;
  source: string;
  sourceHref?: string;
  note?: string;
  width: number;
  height: number;
  priority?: boolean;
};

export function ReportFigure({
  alt,
  caption,
  height,
  note,
  priority = false,
  source,
  sourceHref,
  src,
  width,
}: ReportFigureProps) {
  return (
    <figure className="overflow-hidden border border-line bg-white">
      <a href={src} target="_blank" rel="noreferrer" aria-label="Abrir figura en tamaño original">
        <Image
          alt={alt}
          className="h-auto w-full"
          height={height}
          priority={priority}
          sizes="(min-width: 1024px) 620px, (min-width: 768px) 82vw, 100vw"
          src={src}
          width={width}
        />
      </a>
      <figcaption className="grid gap-2 border-t border-line bg-panelSoft px-4 py-3 text-sm leading-6">
        <span className="text-ink">{caption}</span>
        <span className="text-xs leading-5 text-muted">
          {sourceHref ? (
            <a className="border-b border-petrol/30 text-petrol transition hover:border-petrol" href={sourceHref} target="_blank" rel="noreferrer">
              {source}
            </a>
          ) : (
            source
          )}
        </span>
        {note ? <span className="text-xs leading-5 text-muted">{note}</span> : null}
      </figcaption>
    </figure>
  );
}
