# Trends research preview · 24 November 2026

The Spanish JSON and research Markdown are unchanged copies from
`Tendencias_17_Paquete_para_Codex_2026-11-24_v2.zip`.
Package SHA-256: `89dca6c4aa381639a216498beb726b9197ceba8d9b2446796f5be7b352eacf88`.

The four English assets preserve schema, numeric values, flags, source IDs, URLs,
period boundaries, instruments and graph relations. Display strings are localized;
original Spanish `value` and `unit` remain the authoritative numeric contract.

The views are server-rendered from this versioned snapshot, without new dependencies,
remote calls, data collection jobs or changes to the existing 13F pipeline. Only the
category filter requires a client component. Independent native disclosures support
keyboard input, multiple open sections and fragment navigation.

`format.ts` gives `display_value` precedence; otherwise it applies `display_scale`
once. Noncomparable and newly reported positions never enter change comparisons.
Gold physical reserves, corporate events and disclosed holdings render separately.

Research qualifications retained: unresolved CRWD split basis; selected rather than
exhaustive capital coverage; pending broader corporate-action checks; SNB passive
mandate; RKLB/IRDM corporate context; no reconstructed politician transaction data.
These remain visible in the appropriate sections and methodology.

The main chart references plus additional charts are built from data. Chain and
branching references resolve to the same value-chain component; gold two-panel data
resolves to official-source panels; quantum milestones resolve to metric cards with
separate units. Every measured graph has an accessible equivalent table.

Source documents and DOCX were checked against the JSON/master research. No numeric
conflict requiring alteration of the supplied version was found. No production
publication is part of this preview.

Public wording is revised through `editorial-overrides.json` and `editorial.ts`; the supplied research stays unchanged. Spanish uses an implied first-person subject, methodological notes describe the current page, and redundant policy badges are omitted without changing the documented legal status.

## Review checkpoint · 24 November 2026

The last annotated corrections are complete in the local preview:

- The catalogue subtitle begins “Observaciones”; there is no shared cutoff on the catalogue. Each profile uses its own `reviewedAt` from `catalog.ts`.
- The green strip reads “ENFOQUE ESTRUCTURAL”, in gold with the display typography.
- Education adds funded access from Santander and Google.org, the funding relationship in its value chain, and the documented roles of platform and universities. Santander and Coursera are collaborators, not parent and subsidiary.
- The SNB's 79,260 DUOL shares have a separate holding card. Coursera–Udemy shows the documented 0.8 share exchange ratio instead of a missing monetary amount. Funded places, holdings and corporate transactions remain distinct.
- Methodology now carries the same WebPage and BreadcrumbList structured data as the other research pages.

Verification after recovery: 51 trend/research tests pass; `npm run build -- --webpack` passes, including TypeScript; all 38 built ES/EN pages pass heading, canonical, hreflang, breadcrumb, fragment and capital HTML/RSC checks. Browser review covered the catalogue and Education at desktop width and 390px, filters, native disclosures, fragment opening, reciprocal language navigation and zero page overflow or console errors. The original Spanish research hash remains unchanged.

Preview: `http://localhost:3000/tendencias` and `http://localhost:3000/en/trends`. The existing development server was reused. No production deployment, Git commit or push was performed. Production publication still requires the user's explicit approval after reviewing this preview.

The user approved production publication on 24 November 2026. The release is prepared from the current production commit `d2aaf66b5cb3b8e0a7fe236d2587ba7fb8293eed`, adding only the reviewed Trends files and assets; other local changes are excluded.
