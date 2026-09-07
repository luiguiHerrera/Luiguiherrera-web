import type { CapitalTab, ManagerQuarter } from "./types.ts";
type CapitalCopy = {
  tabsLabel: string; refreshFailed: string; disclosedManagers: string; noticeOnly: string; pending: string; failed: string; tabs: Record<CapitalTab, string>; positionsAt: string; delayed: string; checked: string;
  company: string; ticker: string; managers: string; universePercent: string; increased: string; reduced: string; related: string;
  unavailable: string; unavailableText: string; empty: string; emptyText: string; reviewPending: string; reviewText: string;
  partial: string; stale: string; validated: string; filings: string; coverage: string; universeCopy: string; criteria: string;
  positionsText: string; details: string; source: string; unresolved: string; noMapping: string;
  sharedOrder: string; subset: string; comparisonNote: string; states: Record<ManagerQuarter["status"], string>;
};
export const capitalCopy: Record<"es" | "en", CapitalCopy> = {
  es: {
    tabsLabel: "Vistas del capital divulgado",
    refreshFailed: "Última consulta fallida; se conserva la fecha del snapshot validado.", disclosedManagers: "gestores divulgados", noticeOnly: "avisos sin recuento separado", pending: "pendientes", failed: "no disponibles",
    tabs: { shared: "Coincidencias", new: "Nuevas posiciones", increased: "Aumentadas", reduced: "Reducidas", exited: "Salidas", disagreement: "Desacuerdo" },
    positionsAt: "posiciones al", delayed: "datos con retraso", checked: "Consulta SEC", company: "Empresa", ticker: "Ticker", managers: "gestores", universePercent: "% divulgados", increased: "Aumentaron", reduced: "Redujeron", related: "Tendencias relacionadas",
    unavailable: "No disponible", unavailableText: "No hay tablas de posiciones validadas para este trimestre. Un filing localizado no equivale a datos de posiciones comprobados.",
    empty: "Sin posiciones en esta vista", emptyText: "No se encontraron posiciones que cumplan este criterio dentro de los datos validados.",
    reviewPending: "Movimientos pendientes de revisión", reviewText: "Las posiciones están disponibles, pero la revisión de movimientos está incompleta. Ordenar solo una parte revisada distorsionaría el conjunto.",
    partial: "Cobertura parcial", stale: "Actualización pendiente", validated: "filings disponibles / esperados", filings: "filings localizados", coverage: "Cobertura del universo",
    universeCopy: "Selección explícita de grupos declarantes independientes. No representa a todos los gestores; el 13F muestra una parte limitada y retrasada de cada cartera.", criteria: "Ver criterios y metodología",
    positionsText: "La coincidencia cuenta cada gestor una vez por valor. El porcentaje usa los gestores con posiciones divulgadas utilizables; no expresa peso en cartera ni una tesis compartida.", details: "Ver más detalles", source: "Ver fuente SEC", unresolved: "No resuelto", noMapping: "Sin vínculo verificado",
    sharedOrder: "Ordenadas por número de gestores.", subset: "Hasta 8 valores por vista. Clases de acciones separadas; opciones excluidas de esta tabla.", comparisonNote: "Una raya indica un movimiento indeterminado, no cero operaciones.",
    states: { available: "Tabla validada", unavailable: "Tabla no disponible", not_filed: "Filing no localizado", not_separately_disclosed: "13F-NT: no divulgado por separado", unknown: "Consulta no disponible" },
  },
  en: {
    tabsLabel: "Disclosed capital views",
    refreshFailed: "Last retrieval failed; the validated snapshot retains its original date.", disclosedManagers: "disclosed managers", noticeOnly: "notices without separate counting", pending: "pending", failed: "unavailable",
    tabs: { shared: "Overlap", new: "New positions", increased: "Increased", reduced: "Reduced", exited: "Exits", disagreement: "Disagreement" },
    positionsAt: "positions as of", delayed: "delayed data", checked: "SEC checked", company: "Company", ticker: "Ticker", managers: "managers", universePercent: "% disclosed", increased: "Increased", reduced: "Reduced", related: "Related trends",
    unavailable: "Unavailable", unavailableText: "No validated holdings tables are available for this quarter. Locating a filing does not mean its holdings have been verified.",
    empty: "No positions in this view", emptyText: "No positions meeting this criterion were found in the validated data.",
    reviewPending: "Movement review pending", reviewText: "Holdings are available, but movement review is incomplete. Publishing a ranking from a reviewed subset would misrepresent the whole selection.",
    partial: "Partial coverage", stale: "Update pending", validated: "available / expected filings", filings: "filings located", coverage: "Universe coverage",
    universeCopy: "Explicit selection of independent reporting groups. It is not representative of all managers; 13F shows a limited, delayed part of each portfolio.", criteria: "View criteria and methodology",
    positionsText: "Overlap counts each manager once per security. The percentage uses managers with usable disclosed holdings; it does not express portfolio weight or a shared thesis.", details: "View more details", source: "View SEC source", unresolved: "Unresolved", noMapping: "No verified link",
    sharedOrder: "Ordered by manager count.", subset: "Up to 8 securities per view. Share classes stay separate; options are excluded from this table.", comparisonNote: "A dash means an indeterminate movement, not zero transactions.",
    states: { available: "Table validated", unavailable: "Table unavailable", not_filed: "Filing not located", not_separately_disclosed: "13F-NT: not separately disclosed", unknown: "Lookup unavailable" },
  },
};
