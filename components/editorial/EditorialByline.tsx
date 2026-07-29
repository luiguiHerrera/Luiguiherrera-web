import { formatEditorialDate, type EditorialLocale } from "@/lib/editorial/dates";

type EditorialBylineProps = {
  automaticDataCutoffAt?: string;
  editorialCutoffAt?: string;
  locale: EditorialLocale;
  modifiedAt: string;
  publishedAt: string;
};

export function EditorialByline({
  automaticDataCutoffAt,
  editorialCutoffAt,
  locale,
  modifiedAt,
  publishedAt,
}: EditorialBylineProps) {
  const isSpanish = locale === "es";

  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-muted">
      <p>
        {isSpanish ? "Por" : "By"}{" "}
        <a className="font-semibold text-petrol underline decoration-petrol/30 underline-offset-4" href="https://www.luiguiherrera.com">
          Luigui Herrera
        </a>
      </p>
      <p>
        {isSpanish ? "Publicado" : "Published"}:{" "}
        <time dateTime={publishedAt}>{formatEditorialDate(publishedAt, locale)}</time>
      </p>
      <p>
        {isSpanish ? "Actualizado" : "Updated"}:{" "}
        <time dateTime={modifiedAt}>{formatEditorialDate(modifiedAt, locale)}</time>
      </p>
      {editorialCutoffAt ? (
        <p>
          {isSpanish ? "Corte editorial" : "Editorial cutoff"}:{" "}
          <time dateTime={editorialCutoffAt}>{formatEditorialDate(editorialCutoffAt, locale)}</time>
        </p>
      ) : null}
      {automaticDataCutoffAt ? (
        <p>
          {isSpanish ? "Datos automáticos con corte a" : "Automatic data through"}:{" "}
          <time dateTime={automaticDataCutoffAt}>{formatEditorialDate(automaticDataCutoffAt, locale)}</time>
        </p>
      ) : null}
    </div>
  );
}
