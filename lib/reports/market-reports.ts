export type MarketReportSectionBlock = {
  title: string;
  summary: string;
  body: string;
};

export type MarketReportFigure = {
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

export type MarketReportAssetReading = {
  asset: string;
  headline: string;
  badge: string;
  story: string;
  changed: string;
  expected: string;
  /** Optional: el formato condensado concentra la vigilancia en la lista de control. */
  watch?: string;
  /** Optional: el formato condensado no repite una lectura editorial por activo. */
  reading?: string;
  /** Optional: el formato condensado no expone la secuencia de lectura. */
  timeline?: {
    before: string;
    now: string;
    next: string;
  };
  figures?: MarketReportFigure[];
  detailsModule?: "earnings";
};

export type MarketReportCalendarItem = {
  id?: string;
  dateLabel: string;
  dateStart?: string;
  dateEnd?: string;
  startDateTimeUtc?: string;
  event: string;
  whyItMatters: string;
  category?: "macro" | "central-bank" | "earnings" | "options" | "energy" | "other";
  originalTime?: string;
  originalTimeZone?: string;
  displayTimeCest?: string;
  timeStatus?: "confirmed" | "approximate" | "tba";
  affectedAssets?: string[];
  sourceLabel?: string;
  sourceHref?: string;
  trackingHref?: string;
  trackingLabel?: string;
  ticker?: string;
  company?: string;
  impliedMovePct?: number;
  impliedMoveApproximate?: boolean;
  impliedMoveProvider?: string;
  impliedMoveProviderHref?: string;
  impliedMoveConsultedAt?: string;
  dateConfirmationStatus?: "confirmed" | "editorial-unconfirmed";
};

export type MarketReportEarningsItem = {
  company: string;
  ticker: string;
  reportDate: string;
  reactionDate?: string;
  session?: "before-open" | "after-close" | "time-tba";
  startDateTimeUtc?: string;
  originalTime?: string;
  originalTimeZone?: string;
  displayTime?: string;
  impliedMovePct: number;
  impliedMoveApproximate?: boolean;
  actualMovePct?: number;
  impliedMoveProvider: string;
  impliedMoveProviderHref: string;
  dateTimeSourceLabel: string;
  dateTimeSourceHref: string;
  actualMoveSourceLabel?: string;
  actualMoveSourceHref?: string;
  actualMoveMethodology?: string;
  consultedAt: string;
  dateConfirmationStatus: "confirmed" | "editorial-unconfirmed";
  timeConfirmationStatus: "confirmed" | "unconfirmed" | "not-recorded";
};

export type MarketReportProbableRoutes = {
  title: "Rutas probables";
  note: string;
  /** Optional: solo se publica cuando el informe identifica motores explícitos. */
  engines?: Array<{ title: string; body: string }>;
  scenarios: MarketReportScenario[];
};

export type MarketReportStockpickingTheme = {
  label: string;
  title: string;
  body: string;
  examples?: Array<{ ticker: string; company: string }>;
  note?: string;
};

export type MarketReportPresentation = {
  contextTitle?: string;
  timelineStyle?: "progression";
  calendarStyle?: "monthly";
  watchlistStyle?: "dashboard";
  /** Títulos canónicos por sección cuando la edición usa un orden editorial propio. */
  sectionTitles?: {
    assetReadings?: string;
    calendar?: string;
    watchlist?: string;
    sources?: string;
  };
  year?: number;
  month?: number;
  localizedTitle?: string;
  locale?: string;
  primaryTimeZone?: string;
  displayTimeZones?: string[];
};

export type MarketReportScenario = {
  title: string;
  body: string;
};

export type MarketReportWatchItem = {
  key: string;
  name: string;
  category?:
    | "market-structure"
    | "rates-credit"
    | "technology-ai"
    | "fx-commodities"
    | "stockpicking"
    | "macro-global"
    | "crypto";
  status?: "stable" | "watch" | "stressed" | "improving" | "tba";
  statusLabel?: string;
  whatLooksAt: string;
  whyItMatters: string;
  currentReading?: string;
  whatWouldChange?: string;
  asOf?: string;
  source?: string;
  href?: string;
  linkLabel?: string;
  reference?: {
    label: string;
    href: string;
  };
};

export type MarketReport = {
  id: string;
  monthKey: string;
  monthLabel: string;
  label?: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  publishedLabel?: string;
  publishedAt: string;
  modifiedAt: string;
  editorialCutoffAt?: string;
  automaticDataCutoffAt?: string;
  summary: string;
  calendarHref?: string;
  htmlHref?: string;
  markdownHref?: string;
  pdfHref?: string;
  status: "actual" | "archivado";
  /** Optional: en el formato condensado el contexto general cumple esta función. */
  thesis?: string;
  /** Optional: en el formato condensado el contexto general cumple esta función. */
  executiveSummary?: Array<{ title: string; text: string }>;
  transversalFactor?: {
    label?: string;
    title: string;
    text: string;
  };
  whatHappened: MarketReportSectionBlock[];
  assetReadings: MarketReportAssetReading[];
  calendar: MarketReportCalendarItem[];
  /** Optional: las ediciones con rutas probables no duplican los escenarios. */
  scenarios?: MarketReportScenario[];
  watchlist: MarketReportWatchItem[];
  sourcesNote: string;
  disclaimer: string;
  presentation?: MarketReportPresentation;
  probableRoutes?: MarketReportProbableRoutes;
  stockpicking?: {
    earnings: {
      methodology: string;
      publishedNote?: string;
      upcomingNote?: string;
      published: MarketReportEarningsItem[];
      upcoming: MarketReportEarningsItem[];
    };
    themes?: MarketReportStockpickingTheme[];
  };
};

export const marketReports: MarketReport[] = [
  {
    id: "primer-informe-julio-2026",
    monthKey: "2026-07",
    monthLabel: "Julio 2026",
    title: "Primer informe de julio",
    subtitle: "IA, flujos y concentración: un mercado fuerte, pero más mecánico",
    dateLabel: "Primera lectura de julio de 2026",
    publishedLabel: "Julio de 2026",
    publishedAt: "2026-07-06",
    modifiedAt: "2026-07-06",
    summary: "IA, flujos, concentración y señales de amplitud en la primera lectura mensual.",
    calendarHref: "/reports/primer-informe-julio-2026-calendar.ics",
    htmlHref: "/reports/primer-informe-julio-2026.html",
    markdownHref: "/reports/primer-informe-julio-2026.md",
    pdfHref: "/reports/primer-informe-julio-2026.pdf",
    status: "archivado",
    thesis:
      "El mercado mantiene sesgo constructivo, apoyado por inteligencia artificial, tecnología, momentum, flujos pasivos y participación retail. La misma fuerza que sostiene los precios también aumenta la fragilidad: concentración elevada, actividad en opciones de muy corto plazo y dependencia de resultados corporativos.",
    executiveSummary: [
      { title: "VOO", text: "Núcleo constructivo, pero concentrado." },
      { title: "GLD", text: "Pausa útil, rol defensivo." },
      { title: "EWJ", text: "Fortaleza relativa en Asia desarrollada." },
      { title: "FXI", text: "Posición táctica, sin liderazgo claro." },
      { title: "BTC/ETH", text: "Alta beta, dependiente de liquidez." },
      { title: "Stockpicking", text: "Más relevante por dispersión y menor correlación." },
    ],
    whatHappened: [
      {
        title: "Mercado general",
        summary: "El apetito por riesgo sigue, pero la fortaleza está concentrada.",
        body:
          "El mercado mantiene apetito por riesgo, pero de forma desigual. Tecnología, IA, momentum y flujos sostienen el índice, mientras la concentración elevada obliga a mirar debajo de la superficie.",
      },
      {
        title: "Flujos y estructura",
        summary: "Los flujos siguen sosteniendo el precio antes que la narrativa.",
        body:
          "Los flujos hacia tecnología siguen siendo fuertes. La inversión pasiva y los ETF actúan como compradores estructurales, la participación retail continúa activa y las opciones de muy corto plazo aumentan la mecánica del mercado. En ese entorno, el precio puede moverse por flujos antes que por narrativa fundamental.",
      },
      {
        title: "IA e infraestructura",
        summary: "La IA pasa de narrativa a infraestructura medible.",
        body:
          "La inversión en IA pasa de narrativa a infraestructura. Centros de datos, chips, memoria, energía, software, ciberseguridad e industriales forman parte de una misma cadena. No basta con comprar cualquier empresa que mencione IA: importan beneficios, márgenes, valoración y ejecución.",
      },
      {
        title: "Riesgo",
        summary: "La concentración y las opciones elevan la fragilidad de reversión.",
        body:
          "La concentración, el momentum extendido, la sensibilidad a resultados, la actividad en 0DTE y una volatilidad contenida pero frágil elevan el riesgo de reversión. La principal señal de alerta sería un cambio brusco de flujos.",
      },
    ],
    assetReadings: [
      {
        asset: "VOO / S&P 500",
        headline: "El índice sigue fuerte, pero cada vez depende más de pocos motores.",
        badge: "constructivo",
        story:
          "El S&P 500 mantiene una lectura constructiva porque los flujos, el momentum, las expectativas de beneficios y la tecnología siguen empujando. El problema no es que el mercado esté débil; el problema es que la fortaleza está muy concentrada.",
        changed:
          "La IA, los ETF, la inversión pasiva y la actividad retail hacen que el precio pueda seguir subiendo incluso cuando la amplitud no acompaña con la misma fuerza.",
        expected: "Sesgo constructivo mientras flujos y beneficios acompañen.",
        watch: "Concentración, VIX, amplitud, resultados y niveles SPX/JPM.",
        reading:
          "Mantenerlo como núcleo de lectura de mercado, pero no confundir índice fuerte con mercado sano por dentro.",
        timeline: {
          before: "La tecnología y los beneficios ya venían sosteniendo la tendencia.",
          now: "Los flujos mantienen el impulso, con concentración elevada.",
          next: "La amplitud y los resultados dirán si la subida se ensancha.",
        },
      },
      {
        asset: "GLD / Oro",
        headline: "El oro descansa, pero no perdió su papel dentro del mapa.",
        badge: "defensivo",
        story:
          "El oro no lidera 2026 como otros activos de riesgo, pero sigue cumpliendo una función distinta: diversificación y defensa frente a cambios de régimen. No todos los activos tienen que ganar al mismo tiempo para ser útiles.",
        changed: "El apetito por riesgo y tecnología le ha quitado protagonismo de corto plazo.",
        expected:
          "Puede seguir pausado si domina el apetito por riesgo, pero conserva valor si suben tensiones de tasas, dólar, inflación o estrés.",
        watch: "Dólar, tasas reales, inflación, estrés financiero y liquidez.",
        reading: "No exigirle comportamiento de activo de momentum; su función es otra.",
        timeline: {
          before: "Venía actuando como diversificador frente a cambios de régimen.",
          now: "El foco del mercado está más en crecimiento, IA y beta de riesgo.",
          next: "Dólar, tasas reales e inflación marcarán si recupera protagonismo.",
        },
      },
      {
        asset: "EWJ / Japón",
        headline: "Japón sigue mostrando mejor tono relativo dentro de Asia desarrollada.",
        badge: "selectivo",
        story:
          "Japón mantiene una lectura más fuerte que otros bloques asiáticos. No es solo una diversificación geográfica: hoy también funciona como exposición a una región con mejor momentum relativo.",
        changed: "El liderazgo asiático reciente favorece más a Japón/Corea que a China.",
        expected: "Puede seguir funcionando como diversificación geográfica con momentum.",
        watch: "Yen, tasas japonesas, apetito global por riesgo y continuidad del liderazgo regional.",
        reading: "Interesante mientras conserve fortaleza relativa; perder momentum sería la señal a revisar.",
        timeline: {
          before: "Asia no se movía como bloque homogéneo.",
          now: "Japón conserva mejor tono relativo frente a China.",
          next: "La divisa y el apetito global por riesgo serán claves.",
        },
      },
      {
        asset: "FXI / China",
        headline: "China sigue siendo una historia táctica, no una tendencia confirmada.",
        badge: "táctico",
        story:
          "China puede parecer atractiva por rezago, pero rezago no es igual a oportunidad inmediata. El mercado todavía no muestra el mismo liderazgo que Japón, Corea o tecnología estadounidense.",
        changed: "El capital global sigue prefiriendo otras regiones con mejor momentum.",
        expected: "Lectura táctica; necesita catalizador.",
        watch: "Datos macro chinos, política, flujo extranjero y dólar.",
        reading: "No confundir barato con listo para subir.",
        timeline: {
          before: "El rezago abría una lectura de valor relativo.",
          now: "El liderazgo sigue en otras regiones y temas.",
          next: "Hace falta catalizador macro o de flujos para cambiar la lectura.",
        },
      },
      {
        asset: "BTC / ETH",
        headline: "Cripto sigue siendo beta alta: puede acelerar, pero también amplificar estrés.",
        badge: "alta beta",
        story:
          "BTC y ETH dependen de liquidez, apetito por riesgo y flujos. Cuando el mercado busca riesgo, pueden recuperar fuerza; cuando sube la volatilidad, suelen comportarse como activos de alta beta.",
        changed: "La lectura de cripto sigue más atada a liquidez y flujos que a una narrativa aislada.",
        expected: "Mejor comportamiento si se mantiene apetito por riesgo; vulnerabilidad si se enfría tecnología o sube VIX.",
        watch: "ETF flows, dólar, VIX, tecnología y condiciones financieras.",
        reading: "Exposición de alto riesgo, no sustituto de liquidez ni cobertura defensiva.",
        timeline: {
          before: "La liquidez y los flujos explicaban gran parte del tono.",
          now: "La beta frente a tecnología y apetito por riesgo sigue alta.",
          next: "Los flujos ETF y el VIX serán la primera alerta.",
        },
      },
      {
        asset: "Stockpicking",
        headline: "Seleccionar bien importa más cuando el mercado deja de moverse en bloque.",
        badge: "selectivo",
        story:
          "La baja correlación y la alta dispersión hacen que el índice no cuente toda la historia. Algunas compañías capturan la narrativa de IA, infraestructura o beneficios; otras quedan atrás aunque el índice suba.",
        changed:
          "La oportunidad se desplaza de comprar todo el mercado a entender qué empresas realmente monetizan la tendencia.",
        expected:
          "Mejor entorno para selección activa, especialmente en IA, infraestructura, semiconductores, software, ciberseguridad, industriales y financieras selectivas.",
        watch: "Beneficios reales, valoración, márgenes, catalizadores y exceso de momentum.",
        reading: "No perseguir nombres extendidos sin historia fundamental clara.",
        timeline: {
          before: "El índice podía ocultar mucha diferencia entre compañías.",
          now: "La dispersión vuelve más importante la selección.",
          next: "Beneficios, márgenes y catalizadores separarán liderazgo de ruido.",
        },
      },
    ],
    calendar: [
      {
        dateLabel: "Lun. 6 julio",
        dateStart: "2026-07-06",
        event: "ISM / PMI servicios",
        whyItMatters: "Ayuda a medir actividad y presión de crecimiento.",
      },
      {
        dateLabel: "Mié. 8 julio",
        dateStart: "2026-07-08",
        event: "Actas FOMC",
        whyItMatters: "Puede ajustar expectativas sobre tasas, liquidez y duración del ciclo.",
      },
      {
        dateLabel: "Mié. 8 julio",
        dateStart: "2026-07-08",
        event: "Crédito al consumo",
        whyItMatters: "Sirve como lectura adicional sobre demanda, balance del hogar y condiciones financieras.",
      },
      {
        dateLabel: "Jue. 9 julio",
        dateStart: "2026-07-09",
        event: "Solicitudes de desempleo",
        whyItMatters: "Dato sensible para crecimiento, salarios y expectativas de política monetaria.",
      },
      {
        dateLabel: "Semana del 6 al 10 de julio",
        dateStart: "2026-07-06",
        dateEnd: "2026-07-10",
        event: "Inflación China",
        whyItMatters: "Aporta contexto sobre demanda global, presión deflacionaria y emergentes.",
      },
      {
        dateLabel: "Próximos días / semana del 13 de julio",
        dateStart: "2026-07-13",
        dateEnd: "2026-07-17",
        event: "Inicio de temporada de resultados",
        whyItMatters: "Los bancos abren una ventana clave para crédito, márgenes y apetito por riesgo.",
      },
      {
        dateLabel: "Próxima ventana de vencimientos",
        event: "Vencimientos de opciones",
        whyItMatters: "Puede alterar flujos, cobertura y volatilidad alrededor de niveles relevantes.",
      },
    ],
    scenarios: [
      {
        title: "Base",
        body:
          "Mercado constructivo, pero selectivo. Tecnología y flujos sostienen la tendencia, con episodios de volatilidad.",
      },
      {
        title: "Alcista",
        body:
          "Resultados validan beneficios, flujos hacia tecnología continúan, volatilidad se mantiene controlada y amplitud mejora.",
      },
      {
        title: "Bajista",
        body:
          "Reversión de flujos, Fed/tasas más duras, decepción en resultados o deterioro de amplitud activa toma de beneficios.",
      },
    ],
    watchlist: [
      {
        key: "vix",
        name: "VIX",
        whatLooksAt: "Nivel spot, momentum reciente y estructura de futuros.",
        whyItMatters: "Una subida rápida puede anticipar reducción de riesgo y presión sobre activos de beta alta.",
      },
      {
        key: "dollar",
        name: "Dólar",
        whatLooksAt: "Dirección del dólar frente a activos de riesgo, oro y emergentes.",
        whyItMatters: "Un dólar fuerte suele endurecer condiciones financieras fuera de Estados Unidos.",
      },
      {
        key: "oil",
        name: "Petróleo",
        whatLooksAt: "Presión de commodities, inflación esperada y sensibilidad de energía.",
        whyItMatters: "Un repunte sostenido puede complicar la lectura de inflación y tasas.",
      },
      {
        key: "rates",
        name: "Tasas",
        whatLooksAt: "Expectativas de Fed, tasas reales y reacción de duración.",
        whyItMatters: "Afecta múltiplos, tecnología, oro, crédito y apetito por riesgo.",
      },
      {
        key: "tech-flows",
        name: "Flujos hacia tecnología",
        whatLooksAt: "Tono de tecnología, liderazgo relativo y continuidad de compras.",
        whyItMatters: "La concentración actual depende mucho de que ese flujo no se corte de golpe.",
      },
      {
        key: "btc-etf-flows",
        name: "BTC ETF flows",
        whatLooksAt: "Entradas, salidas, rachas y lectura agregada de ETFs spot de BTC.",
        whyItMatters: "Los flujos vía ETF pueden amplificar movimientos de cripto y apetito por riesgo, pero no sustituyen la lectura spot BTC/USDT y ETH/USDT.",
      },
      {
        key: "bank-earnings",
        name: "Resultados bancarios",
        whatLooksAt: "Márgenes, crédito, provisiones, guidance y actividad de mercado.",
        whyItMatters: "Los bancos suelen anticipar economía real, crédito y estrés financiero.",
      },
      {
        key: "semis-earnings",
        name: "Resultados de semiconductores",
        whatLooksAt: "SMH como proxy principal si hay dato; XLK queda como proxy parcial si SMH no está disponible.",
        whyItMatters: "La cadena de semiconductores sostiene gran parte de la narrativa de crecimiento, pero debe leerse separada de tecnología amplia.",
      },
      {
        key: "breadth",
        name: "Amplitud",
        whatLooksAt: "Si la subida está acompañada por muchas acciones, sectores y tamaños de empresa, o si depende de pocos líderes.",
        whyItMatters: "Un índice puede subir y aun así estar frágil si pocos activos hacen el trabajo.",
      },
      {
        key: "levels",
        name: "Niveles SPX/JPM",
        whatLooksAt: "Extensión estadística de SPY y estructura preparada para niveles JPM/SPX.",
        whyItMatters: "Ayuda a ubicar si el movimiento está en zona normal o estirada. Los niveles JPM/SPX, cuando existan, serán sobre SPX, no sobre el ETF.",
        reference: {
          label: "Niveles estadísticos",
          href: "/niveles-estadisticos",
        },
      },
      {
        key: "options",
        name: "0DTE/opciones",
        whatLooksAt: "0DTE real cuando haya datos por vencimiento/serie. Mientras tanto, Cboe put/call ratios funciona solo como proxy de opciones.",
        whyItMatters:
          "Cuando crece el uso de opciones de vencimiento muy corto, los creadores de mercado pueden ajustar coberturas con mayor frecuencia. Mientras no haya datos por vencimiento/serie, esta lectura se mantiene como proxy de opciones.",
      },
      {
        key: "july-seasonality",
        name: "Estacionalidad de julio",
        whatLooksAt: "Comportamiento histórico del mes y ubicación del día actual.",
        whyItMatters: "No predice, pero aporta contexto para no leer el mes en aislamiento.",
        reference: {
          label: "Niveles estadísticos",
          href: "/niveles-estadisticos",
        },
      },
    ],
    sourcesNote:
      "Las lecturas combinan datos de mercado, cálculos propios y referencias de informes financieros.",
    disclaimer:
      "Este documento tiene fines educativos e informativos. No constituye asesoría financiera, recomendación personalizada ni solicitud de compra o venta de activos. Las decisiones de inversión deben considerar objetivos, horizonte, liquidez, tolerancia al riesgo y situación financiera individual. Rentabilidades pasadas no garantizan resultados futuros.",
  },
  {
    id: "segundo-informe-julio-2026",
    monthKey: "2026-07",
    monthLabel: "Julio 2026",
    label: "Segundo informe de julio",
    title: "El índice aguanta, pero por dentro el mercado ya cambió",
    subtitle: "Resultados, rotación, dólar y la prueba real de la inteligencia artificial.",
    dateLabel: "Corte: 17 de julio de 2026 · Publicado: 20 de julio de 2026",
    publishedLabel: "20 de julio de 2026",
    publishedAt: "2026-07-20",
    modifiedAt: "2026-07-20",
    editorialCutoffAt: "2026-07-17",
    automaticDataCutoffAt: "2026-07-18",
    summary: "Momentum, resultados, dólar y dispersión interna para seguimiento de activos, factores de mercado y riesgo.",
    htmlHref: "/reports/segundo-informe-julio-2026.html",
    markdownHref: "/reports/segundo-informe-julio-2026.md",
    pdfHref: "/reports/segundo-informe-julio-2026.pdf",
    status: "archivado",
    thesis:
      "El S&P 500 conserva su estructura de medio y largo plazo, pero debajo del índice ocurrió una rotación violenta. Las acciones individuales se están moviendo mucho más que el mercado agregado: unas suben mientras otras caen, y el índice oculta parte de ese cambio interno.",
    executiveSummary: [
      { title: "VOO", text: "El índice aguanta, pero ya no explica bien la dispersión interna." },
      { title: "GLD", text: "El oro sigue débil en precio y conserva su función estructural." },
      { title: "EWJ", text: "Japón mantiene fortaleza relativa, con más peso de tecnología, yen y tasas." },
      { title: "FXI", text: "China sigue táctica: valoraciones bajas no bastan sin catalizador." },
      { title: "BTC / ETH", text: "Cripto volvió a comportarse como beta alta, no como cobertura defensiva." },
      { title: "Stockpicking", text: "La dispersión abre oportunidades, pero también castiga duplicar factores." },
    ],
    transversalFactor: {
      label: "Factor transversal",
      title: "DXY / USD/COP",
      text:
        "El dólar conserva apoyo, aunque el posicionamiento largo luce congestionado y USD/COP mantiene factores locales propios.",
    },
    whatHappened: [
      {
        title: "VOO / S&P 500",
        summary: "El índice resistió, pero la volatilidad interna aumentó.",
        body:
          "El índice resistió mejor que sus antiguos líderes. La corrección se concentró en momentum, acciones que venían subiendo por inercia y liderazgo reciente, semiconductores e infraestructura de IA, sin una venta indiscriminada. Cerca del 68 % de los componentes sigue sobre su media de 200 días, una señal de amplitud estructural todavía razonable, aunque la amplitud de corto plazo se deterioró especialmente en tecnología. La volatilidad de acciones individuales está cerca de niveles extremos y la correlación del índice se acerca a mínimos históricos: unas acciones suben mientras otras caen. La temporada de resultados será el siguiente catalizador.",
      },
      {
        title: "GLD",
        summary: "El oro mantiene una debilidad técnica real.",
        body:
          "El oro acumula más de 30 sesiones por debajo de su media de 200 días, la racha más prolongada desde 2022. No funcionó como refugio durante la corrección del momentum porque dólar firme, rendimientos elevados y posicionamiento sistemático débil presionaron el precio. La debilidad es técnica y real, no una fluctuación aislada. Aun así, su función estructural de diversificación no depende de liderar cada semana. SLV sirve solo como comparación: la plata mezcla sensibilidad monetaria con ciclo industrial. JNUG debe leerse aparte: es un instrumento táctico y apalancado, no una posición estructural en oro.",
      },
      {
        title: "EWJ",
        summary: "Japón conserva fortaleza relativa con liderazgo más concentrado.",
        body:
          "Japón mantiene fortaleza relativa entre mercados desarrollados, con liderazgo más concentrado en tecnología, inversión y activos ligados a IA. SoftBank superó a Toyota por capitalización por segunda vez en la serie mostrada; la primera coincidió con la burbuja tecnológica de 2000. La comparación sirve como advertencia de concentración narrativa, no como predicción automática de colapso. A la vez, los rendimientos japoneses se acercan a los de Alemania y Estados Unidos, por lo que normalización monetaria y yen vuelven a importar. EWJ mantiene exposición al yen; HEWJ sirve como referencia para entender cuánto puede cambiar la lectura al cubrir ese riesgo cambiario.",
      },
      {
        title: "FXI",
        summary: "China sigue táctica y todavía carece de liderazgo propio.",
        body:
          "Los gestores institucionales redujeron exposición a mercados emergentes y China todavía no recupera liderazgo sostenido. Las valoraciones bajas no han sido suficientes para atraer un flujo consistente. FXI conserva carácter táctico y contrarian: puede diversificar la concentración estadounidense, pero necesita catalizadores propios para dejar de ser solo una historia barata.",
      },
      {
        title: "BTC / ETH",
        summary: "Cripto volvió a comportarse como beta alta.",
        body:
          "BTC y ETH se comportaron como activos de beta alta: activos que suelen amplificar el apetito por riesgo, tanto al alza como a la baja. No funcionaron como liquidez ni como cobertura defensiva durante la corrección de tecnología y momentum. La fortaleza del dólar redujo apetito por riesgo y recordó que cripto sigue dependiendo de liquidez, flujos, tasas y DXY. BTC suele conservar mayor fortaleza relativa; ETH puede mostrar más sensibilidad a desapalancamiento y cambios de narrativa.",
      },
      {
        title: "Stockpicking",
        summary: "La dispersión aumenta oportunidades y también errores de concentración.",
        body:
          "La dispersión elevada, diferencias grandes entre ganadores y perdedores, favorece selección activa, pero también aumenta la posibilidad de pérdidas grandes por acción. La baja correlación permite que compañías distintas tengan resultados muy diferentes. La corrección del momentum mostró que varias posiciones aparentemente distintas podían depender del mismo factor: semiconductores estadounidenses, Taiwán, Corea, IA y high beta pueden ser una sola apuesta disfrazada de diversificación. La temporada de resultados mueve el foco desde expectativas hacia ventas, márgenes, guidance, la guía que entrega la empresa, retorno del CapEx, inversión de capital, financiación y capacidad de convertir IA en beneficios.",
      },
      {
        title: "DXY y USD/COP",
        summary: "El dólar conserva apoyo, pero su posicionamiento está congestionado.",
        body:
          "CTAs, estrategias sistemáticas que suelen seguir tendencias, y operadores no reportables mantienen posiciones largas elevadas en dólares. El posicionamiento largo en USD está congestionado, aunque el DXY, índice que resume el dólar frente a una cesta de divisas desarrolladas, conserva apoyo por rendimientos, tasas y demanda defensiva. Después de CPI y PPI aumentó el peso de escenarios de tasas algo más bajas, y la convergencia entre rendimientos de Estados Unidos, Alemania y Japón puede reducir parte de la ventaja relativa del dólar. USD/COP no se mueve uno a uno con DXY: también pesan petróleo, riesgo global, flujos a emergentes, tasas en Colombia, situación fiscal y riesgo político local.",
      },
    ],
    assetReadings: [
      {
        asset: "VOO / S&P 500",
        headline: "El índice no está roto, pero su calma no refleja bien lo que ocurre debajo.",
        badge: "núcleo",
        story:
          "El S&P 500 resistió mejor que momentum, semiconductores e infraestructura de IA. La venta no fue indiscriminada: la amplitud estructural sigue razonable, mientras la amplitud corta se deterioró en tecnología.",
        changed:
          "La correlación baja significa que el índice agrega movimientos opuestos. Puede verse tranquilo aunque haya rotación violenta debajo.",
        expected:
          "Escenario base: mercado constructivo, pero más volátil y selectivo. El índice puede continuar firme si los resultados sostienen expectativas y la correlación permanece baja.",
        watch:
          "Riesgo principal: decepción en IA, inflación o tasas que eleve correlación y lleve al índice la volatilidad hoy concentrada en acciones. Vigilar amplitud de 20, 50 y 200 días, VIX, correlación implícita, grandes tecnológicas, reacción T+3 a T+5 y ventas sistemáticas.",
        reading:
          "VOO conserva función de núcleo. La estabilidad del índice no debe confundirse con ausencia de riesgo interno.",
        timeline: {
          before: "El liderazgo descansaba en tecnología, IA, momentum y flujos.",
          now: "El índice aguanta, pero los antiguos líderes corrigen y la dispersión sube.",
          next: "Resultados y amplitud dirán si la rotación es sana o empieza a contaminar al índice.",
        },
        figures: [
          {
            src: "/images/reports/segundo-informe-julio-2026/02-volatilidad-gs.png",
            alt: "Comparación histórica de la caída y volatilidad del factor High Beta Momentum frente al S&P 500.",
            caption: "El daño dentro de momentum ha sido mucho mayor que el movimiento observado en el índice.",
            source: "Fuente: Goldman Sachs FICC & Equities y Bloomberg, julio de 2026.",
            width: 662,
            height: 570,
            priority: true,
          },
          {
            src: "/images/reports/segundo-informe-julio-2026/04-amplitud-sp500-medias-20-50-200.png",
            alt: "Porcentaje de componentes del S&P 500 por encima de sus medias móviles de 20, 50 y 200 días.",
            caption: "La amplitud de corto plazo se debilitó, pero la estructura de medio y largo plazo todavía no muestra una ruptura general.",
            source: "Fuente: StockCharts, datos al 17 de julio de 2026.",
            width: 900,
            height: 811,
          },
        ],
      },
      {
        asset: "GLD",
        headline: "El oro atraviesa una debilidad técnica real.",
        badge: "diversificador",
        story:
          "GLD acumula una racha prolongada bajo la media de 200 días. Dólar firme, rendimientos elevados y posicionamiento sistemático débil explican la presión.",
        changed:
          "El oro no actuó como refugio durante la corrección del momentum, lo que obliga a separar su lectura estructural de su comportamiento semanal.",
        expected:
          "Escenario base: GLD puede seguir débil mientras DXY y rendimientos reales, tasas ajustadas por inflación, permanezcan elevados. Señal positiva: recuperación de la media de 200 días, caída del dólar o moderación de esos rendimientos.",
        watch:
          "Riesgo principal: mayor deterioro técnico y continuación de salidas sistemáticas. Vigilar media de 200 días, tasas reales, dólar y flujos de presión en GLD.",
        reading:
          "La diversificación de GLD y la operación táctica en JNUG son lecturas distintas. JNUG no debe equipararse con una posición estructural en oro.",
        timeline: {
          before: "GLD funcionaba como diversificador de régimen.",
          now: "La presión técnica domina y los productos apalancados amplifican movimientos de corto plazo.",
          next: "La recuperación de la media larga sería la primera mejora seria.",
        },
        figures: [
          {
            src: "/images/reports/segundo-informe-julio-2026/06-oro-bajo-media-200-dias.png",
            alt: "Precio del oro por debajo de su media móvil de 200 días durante julio de 2026.",
            caption: "El oro atraviesa su periodo más prolongado bajo la media de 200 días desde 2022.",
            source: "Fuente: Barchart, julio de 2026.",
            width: 1254,
            height: 828,
          },
        ],
      },
      {
        asset: "EWJ",
        headline: "Japón sigue fuerte, pero el liderazgo también se está concentrando.",
        badge: "internacional",
        story:
          "Japón conserva fortaleza relativa entre desarrollados. El liderazgo se inclinó hacia tecnología, inversión y activos ligados a IA, con la comparación SoftBank/Toyota como advertencia de concentración narrativa.",
        changed:
          "La normalización monetaria y el yen vuelven al centro porque los rendimientos japoneses se acercan a los de Alemania y Estados Unidos.",
        expected:
          "Escenario base: sesgo favorable mientras Japón conserve fortaleza relativa. Señal positiva: liderazgo más amplio y yen ordenado.",
        watch:
          "Riesgo principal: concentración tecnológica, normalización monetaria, movimientos bruscos del yen y toma de beneficios. EWJ mantiene riesgo yen; la cobertura cambiaria reduce gran parte de esa exposición.",
        reading:
          "Distinguir retorno del mercado japonés de retorno cambiario. La exposición sin cobertura y la exposición cubierta no ofrecen el mismo resultado.",
        timeline: {
          before: "Japón venía liderando dentro de Asia desarrollada.",
          now: "El liderazgo se concentra y el yen vuelve a pesar.",
          next: "Fortaleza relativa y política monetaria definirán la lectura.",
        },
        figures: [
          {
            src: "/images/reports/segundo-informe-julio-2026/08-softbank-vs-toyota-japon.png",
            alt: "Comparación histórica entre la capitalización de SoftBank y Toyota junto con el Nasdaq.",
            caption: "SoftBank vuelve a superar a Toyota, una señal de cuánto peso ha ganado la narrativa tecnológica dentro de Japón.",
            source: "Fuente: BCA Research, julio de 2026.",
            note: "Esta comparación no implica que el desenlace deba repetir el episodio del año 2000.",
            width: 564,
            height: 297,
          },
        ],
      },
      {
        asset: "FXI",
        headline: "China sigue táctica: valoraciones bajas no bastan sin catalizador.",
        badge: "contrarian",
        story:
          "La reducción de exposición a emergentes y la falta de liderazgo sostenido mantienen a FXI en una lectura de rezago.",
        changed:
          "El mercado sigue exigiendo algo más que múltiplos bajos: necesita flujo, confianza y mejora de beneficios.",
        expected:
          "Escenario base: comportamiento táctico y dependiente de catalizadores. Señal positiva: estímulo creíble, recuperación de confianza, mejora de flujos y fortaleza relativa.",
        watch:
          "Riesgo principal: permanecer barata sin compradores ni crecimiento de beneficios. Vigilar datos chinos, dólar, flujos a emergentes y respuesta política.",
        reading:
          "FXI puede diversificar concentración estadounidense, pero todavía no confirma liderazgo propio.",
        timeline: {
          before: "El rezago ofrecía una hipótesis contrarian.",
          now: "La falta de flujo consistente mantiene la cautela.",
          next: "Solo catalizadores claros cambiarían la lectura.",
        },
      },
      {
        asset: "BTC / ETH",
        headline: "Cripto sigue siendo beta alta, sensible a liquidez, dólar y tecnología.",
        badge: "alta beta",
        story:
          "BTC y ETH no actuaron como liquidez ni como cobertura defensiva. La corrección de tecnología, momentum y la fortaleza del dólar redujeron apetito por riesgo.",
        changed:
          "La lectura vuelve a separar precio spot de flujos y narrativa. BTC suele conservar mejor fortaleza relativa; ETH puede ser más sensible a desapalancamiento.",
        expected:
          "Escenario base: alta sensibilidad a liquidez, dólar y apetito por riesgo. Señal positiva: DXY más débil, tasas más bajas, estabilización de momentum y regreso de flujos.",
        watch:
          "Riesgo principal: desapalancamiento, dólar fuerte y ampliación de la corrección tecnológica. Vigilar BTC spot, ETH spot, VIX, DXY y condiciones financieras.",
        reading:
          "No tratarlos como activos defensivos. Funcionan mejor como lectura de beta y liquidez.",
        timeline: {
          before: "La liquidez sostenía el apetito por cripto.",
          now: "La beta frente a tecnología vuelve a quedar visible.",
          next: "Dólar, tasas y momentum marcarán la estabilidad del rebote.",
        },
      },
      {
        asset: "Stockpicking",
        headline: "La selección gana importancia, pero el tamaño de posición gana todavía más.",
        badge: "clave",
        story:
          "La dispersión elevada favorece selección activa: compañías diferentes pueden tener resultados muy distintos. También aumenta el riesgo de pérdidas grandes por acción. Tener cinco acciones distintas no sirve de mucho si las cinco dependen de la misma historia.",
        changed:
          "La corrección del momentum mostró que semiconductores estadounidenses, Taiwán, Corea, IA y high beta pueden representar una sola apuesta. Resultados cambiarán el foco hacia ventas, márgenes, guidance, retorno del CapEx, financiación y capacidad de convertir IA en beneficios.",
        expected:
          "Escenario base: más oportunidades individuales y menos utilidad en comprar sectores completos sin filtro. Prioridades: beneficios reales, márgenes defendibles, catalizadores propios, balance, financiación, guidance y tamaño de posición.",
        watch:
          "Riesgos: duplicar factores, comprar antes de resultados sin margen, interpretar toda caída como oportunidad, depender de una sola narrativa y perseguir rebotes de momentum antes de confirmación. En IA y semiconductores, mirar capex y márgenes; en financieras, crédito y provisiones; en salud, guidance y regulación; en industriales e infraestructura, backlog y costes; en consumo, demanda y poder de precio.",
        reading:
          "El crecimiento agregado esperado de EPS ronda 22 %, pero la acción mediana estaría cerca de 9 %. Infraestructura de IA explicaría cerca del 60 % del crecimiento; MU y NVDA más del 40 %, y los diez mayores contribuyentes cerca del 75 %. La reacción útil suele verse entre T+3 y T+5, no necesariamente el primer día.",
        timeline: {
          before: "El índice permitía ignorar parte de la dispersión.",
          now: "La dispersión expone dependencias comunes y errores de diversificación.",
          next: "Resultados separarán narrativas sólidas de momentum vulnerable.",
        },
        figures: [
          {
            src: "/images/reports/segundo-informe-julio-2026/01-momentum-caida.png",
            alt: "Retroceso histórico del factor High Beta Momentum durante julio de 2026.",
            caption: "La corrección fue extrema, pero los episodios históricos no garantizan que el suelo ya esté formado.",
            source: "Fuente: Goldman Sachs FICC & Equities y Bloomberg, julio de 2026.",
            width: 656,
            height: 548,
          },
          {
            src: "/images/reports/segundo-informe-julio-2026/03-concentracion-crecimiento-eps-sp500.png",
            alt: "Crecimiento esperado del EPS del S&P 500 agregado, excluyendo grandes contribuyentes y para la acción mediana.",
            caption: "El crecimiento del índice está mucho más concentrado de lo que sugiere el titular agregado.",
            source: "Fuente: Goldman Sachs Global Investment Research y FactSet, julio de 2026.",
            width: 691,
            height: 546,
          },
        ],
      },
      {
        asset: "DXY y USD/COP",
        headline: "El dólar sigue diversificando frente al peso, pero el posicionamiento está cargado.",
        badge: "divisa",
        story:
          "El DXY conserva apoyo por rendimientos, tasas y demanda defensiva. Al mismo tiempo, CTAs y operadores no reportables mantienen largos elevados en dólares, una señal de posicionamiento congestionado.",
        changed:
          "Tras CPI y PPI aumentó el peso de escenarios de tasas algo más bajas. La convergencia de rendimientos entre Estados Unidos, Alemania y Japón puede reducir parte de la ventaja relativa del dólar.",
        expected:
          "Escenario base: dólar todavía firme, aunque con riesgo creciente de reversión por posicionamiento. Puede fortalecerse si la Fed sigue restrictiva, suben rendimientos o cae apetito por riesgo; puede debilitarse si modera inflación, la Fed resulta menos dura, caen rendimientos o se cierran largos.",
        watch:
          "Para USD/COP mirar además petróleo, riesgo colombiano, flujos hacia emergentes, política fiscal y monetaria local. DXY y USD/COP no se mueven siempre uno a uno.",
        reading:
          "La exposición en dólares sigue diversificando frente al peso colombiano, pero un posicionamiento tan cargado aumenta el riesgo de una corrección rápida del dólar.",
        timeline: {
          before: "El dólar ofrecía defensa y rendimiento relativo.",
          now: "El apoyo sigue, pero el consenso largo luce más lleno.",
          next: "Inflación, Fed, petróleo y riesgo local marcarán USD/COP.",
        },
        figures: [
          {
            src: "/images/reports/segundo-informe-julio-2026/07-posicionamiento-especulativo-dolar.png",
            alt: "Posición neta de operadores no reportables en futuros del dólar frente al Dollar Index.",
            caption: "El dólar conserva apoyo, pero la posición larga ya está congestionada.",
            source: "Fuente: CFTC y McClellan Financial Publications, julio de 2026.",
            width: 777,
            height: 447,
          },
          {
            src: "/images/reports/segundo-informe-julio-2026/09-convergencia-rendimientos-10-anos.png",
            alt: "Rendimientos de bonos gubernamentales a diez años de Estados Unidos, Alemania y Japón entre 1990 y 2026.",
            caption: "La diferencia entre los principales rendimientos globales se está reduciendo.",
            source: "Fuente: BlackRock Investment Institute y LSEG Datastream, julio de 2026.",
            width: 459,
            height: 286,
          },
        ],
      },
    ],
    calendar: [
      {
        dateLabel: "Temporada de resultados",
        event: "Guía de empresas, márgenes y retorno del CapEx",
        whyItMatters: "El mercado pasa de premiar expectativas a exigir evidencia de ventas, márgenes y beneficios.",
      },
      {
        dateLabel: "Ventana posterior a resultados",
        event: "Reacción T+3 a T+5",
        whyItMatters: "El primer día puede reflejar posicionamiento; la lectura más útil suele aparecer cuando el mercado digiere la guía de la empresa y las revisiones.",
      },
      {
        dateLabel: "Durante julio",
        event: "DXY, tasas y USD/COP",
        whyItMatters: "Dólar, rendimientos y riesgo local pueden cambiar la lectura de activos internacionales y liquidez en USD.",
      },
    ],
    scenarios: [
      {
        title: "Base",
        body:
          "Rotación y volatilidad interna, pero sin ruptura general del índice. El mercado sigue constructivo si resultados y amplitud estructural sostienen la lectura.",
      },
      {
        title: "Positivo",
        body:
          "Resultados validan el CapEx de IA, momentum se estabiliza, DXY y rendimientos se moderan, y la subida se ensancha más allá de pocos líderes.",
      },
      {
        title: "Adverso",
        body:
          "Resultados decepcionan, sube la correlación, venden los sistemáticos y el dólar se fortalece frente a monedas emergentes.",
      },
    ],
    watchlist: [
      {
        key: "vix",
        name: "VIX",
        statusLabel: "Contenido",
        whatLooksAt: "Nivel spot, cambio reciente y estructura de futuros.",
        whyItMatters: "Un VIX tranquilo puede convivir con mucha volatilidad individual; una subida rápida cambia la lectura de riesgo agregado.",
        currentReading: "La volatilidad agregada sigue contenida frente al daño observado dentro de momentum y high beta. Esa divergencia mantiene al índice estable, pero deja menos margen si la presión se extiende.",
        whatWouldChange: "Una subida rápida del VIX junto con deterioro de amplitud y aumento de correlación indicaría que la volatilidad interna empieza a trasladarse al índice.",
        asOf: "20 de julio de 2026",
        source: "Dashboard interno, FRED VIXCLS y estructura VIX.",
        href: "/dashboard",
        linkLabel: "Ver Dashboard",
      },
      {
        key: "correlation",
        name: "Correlación implícita",
        statusLabel: "Baja",
        whatLooksAt: "Si las acciones empiezan a moverse juntas o siguen compensándose entre sí dentro del índice.",
        whyItMatters: "Cuando sube la correlación, la volatilidad que estaba en acciones individuales puede trasladarse al índice.",
        currentReading: "La correlación implícita continúa baja: la volatilidad está concentrada en acciones y factores, mientras el índice permanece relativamente estable. Esa dispersión favorece el stockpicking, pero también deja al índice expuesto si las acciones comienzan a caer juntas.",
        whatWouldChange: "Un aumento sostenido de la correlación acompañado por deterioro de la amplitud indicaría que la volatilidad está dejando de ser un problema interno y empieza a trasladarse al índice.",
        asOf: "20 de julio de 2026",
        source: "Goldman Sachs FICC & Equities y Bloomberg.",
      },
      {
        key: "breadth",
        name: "Amplitud 20/50/200 días",
        statusLabel: "Mixta",
        whatLooksAt: "Participación de corto, medio y largo plazo dentro del mercado.",
        whyItMatters: "La amplitud ayuda a distinguir rotación sana de deterioro estructural.",
        currentReading: "La amplitud de corto plazo se debilitó, especialmente en tecnología, pero cerca de dos tercios del S&P 500 siguen sobre su media de 200 días. La lectura todavía parece más rotación interna que ruptura general.",
        whatWouldChange: "Un deterioro simultáneo en medias de 20, 50 y 200 días, junto con sectores defensivos liderando por varias semanas, convertiría la señal en una alerta más amplia.",
        asOf: "20 de julio de 2026",
        source: "StockCharts y dashboard interno de amplitud.",
        href: "/dashboard",
        linkLabel: "Ver detalle de amplitud",
      },
      {
        key: "growth-value",
        name: "Growth frente a Value",
        statusLabel: "Rotación parcial",
        whatLooksAt: "Rotación entre crecimiento, valor y defensivos.",
        whyItMatters: "Muestra si la corrección es específica de momentum o un cambio más amplio de apetito por riesgo.",
        currentReading: "La corrección ha castigado especialmente a momentum y high beta, pero todavía no existe una rotación limpia y persistente hacia Value. La amplitud de medio plazo continúa razonable, por lo que el movimiento se parece más a una limpieza de factores que a un cambio completo de régimen.",
        whatWouldChange: "Varias semanas de fortaleza relativa de Value y defensivos, junto con revisiones negativas de beneficios en Growth y un deterioro más amplio de la participación del mercado.",
        asOf: "20 de julio de 2026",
        source: "Goldman Sachs, BofA y datos de amplitud del S&P 500.",
      },
      {
        key: "hyperscaler-guidance",
        name: "Guidance de hyperscalers",
        statusLabel: "Prueba abierta",
        whatLooksAt: "CapEx, es decir inversión de capital, demanda de nube, inversión en IA y señales de monetización.",
        whyItMatters: "La narrativa de IA necesita pasar de expectativa a beneficios y retorno sobre inversión.",
        currentReading: "La temporada de resultados pasa la discusión desde narrativa hacia ventas, márgenes, guidance y retorno del CapEx. La infraestructura de IA explica una parte grande del crecimiento esperado, así que la guía de hyperscalers pesa más que el titular del índice.",
        whatWouldChange: "Guidance débil, menor visibilidad de monetización o presión persistente en márgenes harían más frágil la lectura de IA. Validación de demanda y retorno sostendría el escenario constructivo.",
        asOf: "20 de julio de 2026",
        source: "Goldman Sachs Global Investment Research, FactSet y lectura editorial del informe.",
      },
      {
        key: "capex-margins",
        name: "Márgenes y retorno del CapEx",
        statusLabel: "Clave en resultados",
        whatLooksAt: "Si la inversión en infraestructura mejora ingresos y márgenes o solo eleva costes.",
        whyItMatters: "El mercado puede tolerar CapEx alto si ve retorno claro; sin retorno, los múltiplos quedan más frágiles.",
        currentReading: "El crecimiento agregado de beneficios luce concentrado. La pregunta operativa es si el CapEx de IA empieza a traducirse en ingresos, márgenes y flujo de caja, o si solo aumenta la base de costes.",
        whatWouldChange: "Revisiones positivas de beneficios, márgenes defendibles y mejor conversión de inversión en ingresos mejorarían la lectura. Más costes sin retorno visible la deteriorarían.",
        asOf: "20 de julio de 2026",
        source: "Goldman Sachs Global Investment Research, FactSet y comentarios de temporada de resultados.",
      },
      {
        key: "dollar",
        name: "DXY",
        statusLabel: "Largo congestionado",
        whatLooksAt: "Dirección del dólar, rendimientos relativos y cierre de posiciones largas.",
        whyItMatters: "DXY afecta oro, cripto, emergentes, activos internacionales y condiciones financieras.",
        currentReading: "El DXY conserva apoyo por rendimientos, tasas y demanda defensiva, pero el posicionamiento largo en dólares luce congestionado. Eso deja al dólar útil como referencia de riesgo, aunque con más vulnerabilidad a una reversión rápida.",
        whatWouldChange: "Inflación más moderada, Fed menos restrictiva, caída de rendimientos o cierre de largos reducirían apoyo. Estrés de riesgo, petróleo o mayores rendimientos podrían fortalecerlo de nuevo.",
        asOf: "20 de julio de 2026",
        source: "CFTC, McClellan Financial Publications, BlackRock Investment Institute y LSEG Datastream.",
      },
      {
        key: "rates",
        name: "Treasury a diez años",
        statusLabel: "Convergencia global",
        whatLooksAt: "Rendimiento nominal, tasas reales, inflación esperada y presión de emisión.",
        whyItMatters: "El diez años marca el coste de capital que atraviesa tecnología, oro, bonos y dólar.",
        currentReading: "Los rendimientos de Estados Unidos, Alemania y Japón se están acercando. Esa convergencia puede reducir parte de la ventaja relativa del dólar y cambia la lectura de oro, cripto y activos internacionales.",
        whatWouldChange: "Una caída sostenida de rendimientos reales aliviaría presión sobre oro y growth. Un repunte por inflación, emisión o prima por plazo endurecería condiciones financieras.",
        asOf: "20 de julio de 2026",
        source: "BlackRock Investment Institute, LSEG Datastream y lectura del informe.",
      },
      {
        key: "usd-cop",
        name: "USD/COP",
        statusLabel: "Riesgo local importa",
        whatLooksAt: "Dólar global, petróleo, flujos a emergentes, tasas locales, fiscalidad y riesgo político.",
        whyItMatters: "USD/COP es una lectura propia: no replica mecánicamente al DXY.",
        currentReading: "USD/COP debe leerse con DXY, petróleo, flujos hacia emergentes y riesgo fiscal/político colombiano. La exposición en dólares sigue diversificando frente al peso, pero no conviene asumir que DXY y USD/COP se mueven uno a uno.",
        whatWouldChange: "Mejora de flujos a emergentes, petróleo estable y menor ruido fiscal reducirían presión sobre USD/COP. Dólar global fuerte, petróleo débil o tensión local la elevarían.",
        asOf: "20 de julio de 2026",
        source: "Lectura macro del informe, DXY, petróleo y riesgo local colombiano.",
      },
      {
        key: "oil",
        name: "Petróleo",
        statusLabel: "Factor externo",
        whatLooksAt: "Presión de energía sobre inflación, Colombia y apetito por emergentes.",
        whyItMatters: "El petróleo puede cambiar inflación, tasas esperadas y lectura de USD/COP.",
        currentReading: "El petróleo funciona como factor de contexto para inflación, emergentes y USD/COP. En este informe no es un activo central, pero puede alterar rápidamente la lectura del dólar frente al peso.",
        whatWouldChange: "Un repunte sostenido aumentaría presión inflacionaria y apoyo a Colombia por términos de intercambio. Una caída fuerte pesaría sobre emergentes ligados a commodities.",
        asOf: "20 de julio de 2026",
        source: "Lectura editorial del informe y señales macro de energía.",
      },
      {
        key: "gold-dma200",
        name: "Oro frente a DMA200",
        statusLabel: "Debilidad técnica",
        whatLooksAt: "Si GLD recupera o sigue perdiendo su media de 200 días.",
        whyItMatters: "La media larga ayuda a separar pausa táctica de deterioro técnico más persistente.",
        currentReading: "GLD atraviesa una racha prolongada bajo la media de 200 días. La señal habla de debilidad técnica real, aunque su función estructural de diversificación no depende de liderar cada semana.",
        whatWouldChange: "Recuperar la media de 200 días, junto con dólar o rendimientos reales más bajos, mejoraría la lectura. Más sesiones bajo la media prolongarían la presión técnica.",
        asOf: "20 de julio de 2026",
        source: "Barchart y lectura del bloque GLD.",
      },
      {
        key: "systematic-flows",
        name: "Flujos sistemáticos",
        statusLabel: "Riesgo de aceleración",
        whatLooksAt: "Exposición de estrategias de control de volatilidad, que reducen riesgo cuando sube la volatilidad, CTAs y ventas forzadas potenciales.",
        whyItMatters: "Cuando el posicionamiento es elevado, un cambio de volatilidad puede acelerar ventas.",
        currentReading: "La presión en momentum y high beta es consistente con una limpieza de factores. Si la volatilidad del índice sube, estrategias sistemáticas pueden acelerar ventas y transformar una rotación interna en un movimiento de mercado más amplio.",
        whatWouldChange: "VIX al alza, correlación subiendo y amplitud cayendo al mismo tiempo aumentarían el riesgo de ventas sistemáticas más agresivas.",
        asOf: "20 de julio de 2026",
        source: "Goldman Sachs FICC & Equities, Bloomberg y lectura del informe.",
      },
      {
        key: "earnings-reaction",
        name: "Reacción T+3 a T+5",
        statusLabel: "Ventana clave",
        whatLooksAt: "Comportamiento de las acciones después de que el mercado digiere resultados y guía de la empresa.",
        whyItMatters: "El primer movimiento puede ser ruido de posicionamiento; la digestión posterior suele dar mejor señal.",
        currentReading: "La temporada de resultados será la prueba principal. El foco está en la reacción posterior a los resultados, cuando el mercado asimila ventas, márgenes, guidance, financiación y retorno del CapEx.",
        whatWouldChange: "Reacciones T+3 a T+5 positivas y con ampliación de liderazgo sostendrían el escenario constructivo. Rebotes iniciales que se revierten dejarían una señal más frágil.",
        asOf: "20 de julio de 2026",
        source: "Lectura editorial del informe y calendario de resultados.",
      },
    ],
    sourcesNote:
      "Las lecturas combinan datos de mercado, cálculos propios, dashboard interno, niveles estadísticos y referencias públicas e institucionales, incluyendo Goldman Sachs, BofA, Deutsche Bank, Bloomberg y BCA Research cuando aportan contexto. Las fuentes informan el análisis; no organizan la estructura del informe.",
    disclaimer:
      "Este documento tiene fines educativos e informativos. No constituye asesoría financiera, recomendación personalizada ni solicitud de compra o venta de activos. Las decisiones de inversión deben considerar objetivos, horizonte, liquidez, tolerancia al riesgo y situación financiera individual. Rentabilidades pasadas no garantizan resultados futuros.",
  },
  {
    id: "primer-informe-agosto-2026",
    monthKey: "2026-08",
    monthLabel: "Agosto 2026",
    label: "Primer informe de agosto",
    title: "Agosto empieza con dispersión: la IA pasa del gasto al retorno",
    subtitle:
      "Semiconductores, crédito, tasas y USD/COP: el índice aún resiste, pero el coste de capital gana peso.",
    dateLabel: "Corte: 31 de julio de 2026 · Publicado: 1 de agosto de 2026",
    publishedLabel: "1 de agosto de 2026",
    publishedAt: "2026-08-01",
    modifiedAt: "2026-08-03",
    editorialCutoffAt: "2026-07-31",
    automaticDataCutoffAt: "2026-07-31",
    summary:
      "Dispersión, semiconductores, retorno de la inversión en IA, crédito, tasas y USD/COP para la primera lectura de agosto.",
    calendarHref: "/reports/primer-informe-agosto-2026-calendar.ics",
    htmlHref: "/reports/primer-informe-agosto-2026.html",
    markdownHref: "/reports/primer-informe-agosto-2026.md",
    pdfHref: "/reports/primer-informe-agosto-2026.pdf",
    status: "archivado",
    presentation: {
      contextTitle: "Contexto general",
      timelineStyle: "progression",
      calendarStyle: "monthly",
      watchlistStyle: "dashboard",
      year: 2026,
      month: 8,
      localizedTitle: "Agosto de 2026",
      locale: "es-ES",
      primaryTimeZone: "America/New_York",
      displayTimeZones: ["America/New_York", "Europe/Madrid"],
    },
    probableRoutes: {
      title: "Rutas probables",
      note: "Escenarios condicionales para organizar la vigilancia; no son predicciones ni recomendaciones.",
      engines: [
        { title: "Resultados y monetización de IA", body: "Ventas, márgenes y retorno del CapEx decidirán qué compañías mantienen liderazgo." },
        { title: "Fed, petróleo y tasas largas", body: "Determinarán si las condiciones financieras se estabilizan o vuelven a endurecerse." },
        { title: "Correlación, sistemáticos y USD/COP", body: "La amplitud, el posicionamiento y el dólar mostrarán si la volatilidad interna alcanza al índice y a las monedas emergentes." },
      ],
      scenarios: [
        { title: "Base", body: "Continúa la dispersión y la rotación, pero sin ruptura general del índice. Los resultados separan ganadores y perdedores." },
        { title: "Positivo", body: "Los resultados justifican parte del gasto en IA, se estabiliza el crédito, se moderan los rendimientos y mejora la amplitud." },
        { title: "Adverso", body: "Decepcionan los resultados, se amplían los diferenciales de crédito, suben petróleo o tasas y la recuperación de la correlación activa ventas sistemáticas." },
      ],
    },
    stockpicking: {
      earnings: {
        methodology: "Los movimientos implícitos esperados proceden de lecturas externas del mercado de opciones —principalmente Unusual Whales— y pueden cambiar hasta la publicación. Representan la magnitud aproximada descontada, no una previsión propia ni una estimación de dirección.",
        published: [
          { company: "Hycroft Mining", ticker: "HYMC", reportDate: "2026-07-28", reactionDate: "2026-07-28", session: "before-open", impliedMovePct: 21.20, actualMovePct: -1.5, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/HYMC/earnings", dateTimeSourceLabel: "SEC EDGAR", dateTimeSourceHref: "https://www.sec.gov/edgar/browse/?CIK=1718405&owner=exclude", actualMoveSourceLabel: "Yahoo Finance — históricos de HYMC", actualMoveSourceHref: "https://finance.yahoo.com/quote/HYMC/history/", actualMoveMethodology: "Variación del cierre regular de la sesión de reacción frente al cierre regular previo, redondeada a una decimal.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "not-recorded" },
          { company: "Vertiv", ticker: "VRT", reportDate: "2026-07-29", reactionDate: "2026-07-29", session: "before-open", impliedMovePct: 8.38, actualMovePct: -17.2, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/VRT/earnings", dateTimeSourceLabel: "Anuncio de resultados de Vertiv", dateTimeSourceHref: "https://investors.vertiv.com/news/news-details/2026/Vertiv-Announces-Date-of-Second-Quarter-2026-Earnings-Release-and-Conference-Call/default.aspx", actualMoveSourceLabel: "Yahoo Finance — históricos de VRT", actualMoveSourceHref: "https://finance.yahoo.com/quote/VRT/history/", actualMoveMethodology: "Variación del cierre regular de la sesión de reacción frente al cierre regular previo, redondeada a una decimal.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Coinbase", ticker: "COIN", reportDate: "2026-07-30", reactionDate: "2026-07-31", session: "after-close", impliedMovePct: 8.72, actualMovePct: -10.6, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/COIN/earnings", dateTimeSourceLabel: "Anuncio de resultados de Coinbase", dateTimeSourceHref: "https://investor.coinbase.com/news/news-details/2026/Coinbase-Announces-Date-of-Second-Quarter-2026-Financial-Results/default.aspx", actualMoveSourceLabel: "Yahoo Finance — históricos de COIN", actualMoveSourceHref: "https://finance.yahoo.com/quote/COIN/history/", actualMoveMethodology: "Variación del cierre regular del 31 de julio frente al cierre regular previo, redondeada a una decimal.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Reddit", ticker: "RDDT", reportDate: "2026-07-30", reactionDate: "2026-07-31", session: "after-close", impliedMovePct: 14.32, actualMovePct: -21.0, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/RDDT/earnings", dateTimeSourceLabel: "Anuncio de resultados de Reddit", dateTimeSourceHref: "https://investor.redditinc.com/news-events/news-releases/news-details/2026/Reddit-to-Announce-Second-Quarter-Results-on-Thursday-July-30-2026/default.aspx", actualMoveSourceLabel: "Yahoo Finance — históricos de RDDT", actualMoveSourceHref: "https://finance.yahoo.com/quote/RDDT/history/", actualMoveMethodology: "Variación del cierre regular del 31 de julio frente al cierre regular previo, redondeada a una decimal.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "AngloGold Ashanti", ticker: "AU", reportDate: "2026-07-31", reactionDate: "2026-07-31", impliedMovePct: 9.53, actualMovePct: -3.7, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/AU/earnings", dateTimeSourceLabel: "Relaciones con inversionistas de AngloGold Ashanti", dateTimeSourceHref: "https://www.anglogoldashanti.com/investors/", actualMoveSourceLabel: "Yahoo Finance — históricos de AU", actualMoveSourceHref: "https://finance.yahoo.com/quote/AU/history/", actualMoveMethodology: "Variación del cierre regular del 31 de julio frente al cierre regular previo, redondeada a una decimal.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "not-recorded" },
          { company: "Cameco", ticker: "CCJ", reportDate: "2026-07-31", reactionDate: "2026-07-31", impliedMovePct: 10.44, actualMovePct: -2.1, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/CCJ/earnings", dateTimeSourceLabel: "Relaciones con inversionistas de Cameco", dateTimeSourceHref: "https://www.cameco.com/invest/events-presentations", actualMoveSourceLabel: "Nasdaq Historical — CCJ", actualMoveSourceHref: "https://api.nasdaq.com/api/quote/CCJ/historical?assetclass=stocks&fromdate=2026-07-29&todate=2026-08-01&limit=10", actualMoveMethodology: "Variación cierre a cierre de la sesión regular: 86,38 USD el 31 de julio frente a 88,23 USD el 30 de julio; (86,38 / 88,23 - 1) × 100 = -2,10 %, redondeada a una decimal.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "not-recorded" },
        ],
        upcoming: [
          { company: "Palantir", ticker: "PLTR", reportDate: "2026-08-03", session: "after-close", startDateTimeUtc: "2026-08-03T21:00:00Z", originalTime: "17:00", originalTimeZone: "ET", displayTime: "23:00 CEST", impliedMovePct: 10.32, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/PLTR/earnings", dateTimeSourceLabel: "Anuncio de Palantir: resultados Q2 2026 y webcast", dateTimeSourceHref: "https://www.nasdaq.com/press-release/palantir-announces-date-second-quarter-2026-earnings-release-and-webcast-2026-07-13", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Arista Networks", ticker: "ANET", reportDate: "2026-08-04", session: "after-close", startDateTimeUtc: "2026-08-04T20:30:00Z", originalTime: "16:30", originalTimeZone: "ET", displayTime: "22:30 CEST", impliedMovePct: 10.40, impliedMoveApproximate: true, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/ANET/earnings", dateTimeSourceLabel: "Anuncio de resultados de Arista", dateTimeSourceHref: "https://investors.arista.com/Communications/Press-Releases-and-Events/Press-Release-Detail/2026/Arista-Networks-to-Announce-Q2-2026-Financial-Results-on-Tuesday-August-4-2026/default.aspx", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Coupang", ticker: "CPNG", reportDate: "2026-08-04", session: "after-close", startDateTimeUtc: "2026-08-04T21:30:00Z", originalTime: "17:30", originalTimeZone: "ET", displayTime: "23:30 CEST", impliedMovePct: 10.23, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/CPNG/earnings", dateTimeSourceLabel: "Anuncio de resultados de Coupang", dateTimeSourceHref: "https://ir.aboutcoupang.com/news-events/news/news-details/2026/Coupang-to-Announce-Second-Quarter-2026-Results-on-August-4-2026/default.aspx", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Uber", ticker: "UBER", reportDate: "2026-08-05", session: "before-open", startDateTimeUtc: "2026-08-05T12:00:00Z", originalTime: "08:00", originalTimeZone: "ET", displayTime: "14:00 CEST", impliedMovePct: 7.36, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/UBER/earnings", dateTimeSourceLabel: "Anuncio de resultados de Uber", dateTimeSourceHref: "https://investor.uber.com/news-events/news/press-release-details/2026/Uber-Announces-Date-of-Second-Quarter-2026-Results-Conference-Call/default.aspx", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Duolingo", ticker: "DUOL", reportDate: "2026-08-05", session: "after-close", startDateTimeUtc: "2026-08-05T21:00:00Z", originalTime: "17:00", originalTimeZone: "ET", displayTime: "23:00 CEST", impliedMovePct: 16.45, impliedMoveApproximate: true, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/DUOL/earnings", dateTimeSourceLabel: "Anuncio de resultados de Duolingo", dateTimeSourceHref: "https://investors.duolingo.com/news-releases/news-release-details/duolingo-announce-second-quarter-2026-results-wednesday-august-5", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "LifeMD", ticker: "LFMD", reportDate: "2026-08-05", session: "time-tba", impliedMovePct: 23.44, impliedMoveApproximate: true, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/LFMD/earnings", dateTimeSourceLabel: "Página de IR de LifeMD (sin anuncio que confirme el evento)", dateTimeSourceHref: "https://ir.lifemd.com/", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "editorial-unconfirmed", timeConfirmationStatus: "unconfirmed" },
          { company: "Cloudflare", ticker: "NET", reportDate: "2026-08-06", session: "after-close", startDateTimeUtc: "2026-08-06T21:00:00Z", originalTime: "17:00", originalTimeZone: "ET", displayTime: "23:00 CEST", impliedMovePct: 11.60, impliedMoveApproximate: true, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/NET/earnings", dateTimeSourceLabel: "Anuncio de resultados de Cloudflare", dateTimeSourceHref: "https://www.cloudflare.net/news/news-details/2026/Cloudflare-Announces-Date-of-Second-Quarter-2026-Financial-Results/default.aspx", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Hims & Hers", ticker: "HIMS", reportDate: "2026-08-10", session: "after-close", startDateTimeUtc: "2026-08-10T21:00:00Z", originalTime: "17:00", originalTimeZone: "ET", displayTime: "23:00 CEST", impliedMovePct: 20.53, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/HIMS/earnings", dateTimeSourceLabel: "Anuncio de resultados de Hims & Hers", dateTimeSourceHref: "https://investors.hims.com/news/news-details/2026/Hims--Hers-to-Announce-Second-Quarter-2026-Financial-Results-on-August-10-2026/default.aspx", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Celsius Holdings", ticker: "CELH", reportDate: "2026-08-11", session: "time-tba", impliedMovePct: 11.55, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/CELH/earnings", dateTimeSourceLabel: "Página de IR de Celsius Holdings (sin anuncio que confirme el evento)", dateTimeSourceHref: "https://ir.celsiusholdingsinc.com/", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "editorial-unconfirmed", timeConfirmationStatus: "unconfirmed" },
        ],
      },
    },
    thesis:
      "La corrección de semiconductores y momentum fue extraordinaria, pero no equivale todavía a una ruptura general del mercado. El ajuste combinó una noticia sectorial, posiciones congestionadas y vehículos apalancados; al mismo tiempo, los rendimientos largos y el crédito de las grandes tecnológicas elevaron el coste de financiar la expansión de inteligencia artificial. Agosto puede amplificar movimientos en ambos sentidos: el escenario base sigue siendo un índice funcional con alta dispersión, condicionado a que resultados, márgenes y flujo de caja empiecen a justificar el gasto.",
    executiveSummary: [
      {
        title: "VOO",
        text: "El índice sigue funcional, pero su estabilidad depende de que la correlación permanezca contenida.",
      },
      {
        title: "GLD",
        text: "La tesis estructural mejora antes que la técnica: el precio todavía debe confirmar una recuperación.",
      },
      {
        title: "EWJ",
        text: "Japón conserva fortaleza relativa, pero tecnología, momentum, yen y tasas elevan la selectividad.",
      },
      {
        title: "FXI",
        text: "China resistió mejor que sus semiconductores; sigue siendo una lectura táctica que necesita catalizadores amplios.",
      },
      {
        title: "BTC / ETH",
        text: "Cripto conserva comportamiento de beta alta y sensibilidad a liquidez, dólar y volatilidad tecnológica.",
      },
      {
        title: "Stockpicking",
        text: "Resultados, márgenes, financiación y reacción durante las 3 a 5 sesiones posteriores importan más que el primer movimiento.",
      },
    ],
    transversalFactor: {
      label: "Factor transversal",
      title: "DXY / USD/COP",
      text:
        "La TRM certificada para el 1 al 3 de agosto fue 3.144,14 COP por dólar. La fortaleza del peso se desacopló del dólar global, pero petróleo, diferencial de tasas, flujos y riesgo local impiden atribuir el movimiento a una sola causa.",
    },
    whatHappened: [
      {
        title: "S&P 500: índice y estructura interna",
        summary: "El desempeño agregado del S&P 500 ocultó una rotación mucho más violenta bajo la superficie.",
        body:
          "La volatilidad se concentró primero en momentum, semiconductores e infraestructura de IA. La correlación entre las acciones del S&P 500 permaneció cerca de mínimos de varias décadas, de modo que ganadores y perdedores pudieron compensarse dentro del índice. Esa baja correlación no es bajista por sí misma: el riesgo aparece si sube al mismo tiempo que VIX y se deteriora la amplitud.",
      },
      {
        title: "Semiconductores y China",
        summary: "La noticia cambió la percepción de riesgo antes que la capacidad industrial.",
        body:
          "Distintas series institucionales sitúan la caída de cinco sesiones de semiconductores asiáticos en un rango aproximado de 9 % a 12 %, según el universo utilizado. El detonante fue el avance anunciado de China en litografía DUV, pero las fuentes todavía no demuestran producción comercial a escala, rendimiento industrial sostenido ni capacidad EUV. El shock fue sectorial: el índice amplio chino no acompañó la caída con la misma intensidad.",
      },
      {
        title: "IA, crédito y flujo de caja",
        summary: "El mercado dejó de premiar el gasto por sí solo y empezó a exigir retorno.",
        body:
          "La prueba de la IA pasó de cuánto invierten las grandes tecnológicas a cuánto ingreso, margen y flujo de caja produce esa inversión. Los diferenciales de crédito de varios grandes financiadores de IA se ampliaron frente a comparables, una señal de que el mercado de bonos empieza a cobrar más por sostener el CapEx. No confirma una crisis, pero reduce el margen para resultados o guías decepcionantes.",
      },
      {
        title: "Fed, petróleo y tasas",
        summary: "La Fed mantuvo tasas, pero la disidencia confirmó que el riesgo inflacionario sigue abierto.",
        body:
          "El 29 de julio la Fed mantuvo el rango objetivo en 3,50 %–3,75 %. Tres miembros prefirieron subir 25 puntos básicos y el comunicado volvió a destacar inflación elevada y choques de oferta ligados a energía. La cadena de riesgo para agosto es condicional: petróleo más alto puede elevar inflación esperada, volatilidad de tasas y coste de capital; una moderación del crudo rompería esa secuencia.",
      },
      {
        title: "Corea y Asia tecnológica",
        summary: "Beneficios fuertes y estructura frágil pueden coexistir.",
        body:
          "El material institucional muestra revisiones de beneficios muy fuertes en Corea, pero también una concentración excepcional en Samsung Electronics y SK Hynix. Los productos apalancados y sus rebalanceos amplificaron el movimiento. El mercado puede parecer barato sobre beneficios próximos y caro sobre beneficios normalizados: la diferencia depende de cuánto duren los márgenes extraordinarios de memoria y semiconductores.",
      },
      {
        title: "USD/COP",
        summary: "El peso se fortaleció más de lo que explica el dólar global por sí solo.",
        body:
          "La TRM fue 3.144,14 COP por dólar para la vigencia del 1 al 3 de agosto, mientras la tasa de política del Banco de la República se mantenía en 12 %. Petróleo y diferencial de tasas pueden apoyar al peso, pero no identifican por sí solos la contribución de política, fiscalidad, flujos de capital o cobertura empresarial. Después de un movimiento rápido, el escenario más prudente es un rango amplio, no una extrapolación lineal.",
      },
      {
        title: "Selección de compañías",
        summary: "La dispersión convirtió cada resultado en una prueba de valoración y financiación.",
        body:
          "Las reacciones empresariales recientes mostraron que un buen titular no basta cuando el posicionamiento está congestionado. Para la primera semana de agosto están confirmados resultados de Arista Networks el día 4, Duolingo el 5 y Cloudflare el 6, todos después del cierre estadounidense. El foco debe estar en ventas, márgenes, guía, retorno del CapEx, balance y persistencia de la reacción entre tres y cinco sesiones.",
      },
    ],
    assetReadings: [
      {
        asset: "VOO / S&P 500",
        headline: "El índice sigue en pie, pero la baja correlación está haciendo parte del trabajo.",
        badge: "funcional",
        story:
          "El S&P 500 absorbió una rotación violenta porque el daño se concentró en factores y compañías, no en todo el mercado al mismo tiempo. La calma del índice subestima la dificultad de operar debajo de la superficie.",
        changed:
          "La volatilidad empezó a pasar de acciones individuales hacia índices y aumentó la demanda de coberturas. Varias estrategias sistemáticas quedaron más cerca de niveles que podrían obligarlas a reducir exposición.",
        expected:
          "Escenario base: alta dispersión, rebotes y correcciones selectivas, con un índice todavía funcional si resultados y amplitud estructural resisten.",
        watch:
          "Correlación, VIX, amplitud a 20, 50 y 200 días, diferenciales de crédito, reacción de bancos a tasas largas y niveles de venta de estrategias sistemáticas.",
        reading:
          "VOO conserva función de núcleo, pero un índice estable no elimina el riesgo de concentración ni de transición hacia una venta más correlacionada.",
        timeline: {
          before: "El liderazgo de IA y momentum sostenía el índice con concentración elevada.",
          now: "La rotación interna es extrema y la correlación baja todavía amortigua el agregado.",
          next: "Resultados, amplitud y crédito dirán si el ajuste limpia excesos o alcanza al índice.",
        },
      },
      {
        asset: "GLD / Oro",
        headline: "La tesis estructural mejora antes que la señal técnica.",
        badge: "diversificador",
        story:
          "La debilidad técnica descrita en julio no desapareció por el aumento de incertidumbre. Dólar, tasas reales y posicionamiento siguen siendo los primeros filtros para la lectura táctica del oro.",
        changed:
          "El debate de largo plazo ganó apoyo por deuda pública, compras de bancos centrales y riesgo de oferta, pero esa tesis no sustituye la confirmación del precio.",
        expected:
          "Puede recuperar protagonismo si caen tasas reales o dólar y mejora su estructura técnica. Si los rendimientos largos siguen altos, la presión puede continuar.",
        watch:
          "Media de 200 días, tasas reales, DXY, compras de bancos centrales y presión de flujos en GLD.",
        reading:
          "Distinguir diversificación estructural de una entrada táctica: responden a horizontes y señales diferentes.",
        timeline: {
          before: "GLD acumuló una debilidad técnica prolongada durante julio.",
          now: "La narrativa estructural mejora, pero el precio todavía no la confirma.",
          next: "Tasas reales y recuperación de la media larga serán las señales principales.",
        },
      },
      {
        asset: "EWJ / Japón",
        headline: "Japón conserva fortaleza relativa, pero su liderazgo es más sensible a tecnología, yen y tasas.",
        badge: "selectivo",
        story:
          "Japón sigue ofreciendo una lectura distinta dentro de Asia desarrollada. La corrección global de momentum también alcanzó al mercado japonés y reveló una mayor dependencia de tecnología, inversión e inteligencia artificial.",
        changed:
          "La volatilidad de factores dejó de ser exclusivamente estadounidense. Al mismo tiempo, la normalización de rendimientos japoneses devuelve al yen y a la política monetaria un papel más importante en el retorno.",
        expected:
          "Escenario base: fortaleza relativa con más dispersión. La continuidad necesita beneficios defendibles, liderazgo más amplio y una divisa ordenada.",
        watch:
          "Yen, rendimientos japoneses, amplitud, concentración tecnológica, revisiones de beneficios y persistencia del momentum regional.",
        reading:
          "Separar retorno de las acciones y efecto cambiario. EWJ incorpora exposición al yen y no equivale a una versión cubierta de Japón.",
        timeline: {
          before: "Japón venía mostrando mejor tono relativo dentro de Asia desarrollada.",
          now: "La corrección de momentum expone concentración y devuelve peso al yen y a las tasas.",
          next: "Amplitud de beneficios y estabilidad cambiaria decidirán si conserva el liderazgo.",
        },
      },
      {
        asset: "FXI / China",
        headline: "China resistió mejor que sus semiconductores, pero todavía necesita un catalizador de mercado amplio.",
        badge: "táctico",
        story:
          "El día de la mayor presión en semiconductores asiáticos, el índice amplio chino mostró un comportamiento mucho más resistente. La divergencia indica que el anuncio sobre litografía fue un shock de cadena tecnológica, no una liquidación uniforme de China.",
        changed:
          "El avance anunciado en DUV introdujo una hipótesis de sustitución industrial de largo plazo, pero producción a escala, rendimiento comercial y capacidad EUV siguen sin demostrarse.",
        expected:
          "Escenario base: lectura táctica y dependiente de política, confianza, beneficios y flujos. El riesgo tecnológico no basta por sí solo para convertir a FXI en liderazgo sostenido.",
        watch:
          "Estímulo, crecimiento, confianza interna, flujos extranjeros, DXY, amplitud del mercado chino y evidencia industrial verificable en semiconductores.",
        reading:
          "No confundir la resistencia del índice amplio con una validación de toda la cadena tecnológica, ni valoraciones bajas con una tendencia confirmada.",
        timeline: {
          before: "FXI mantenía una lectura contrarian por rezago y valoración.",
          now: "El mercado amplio resiste mejor que los semiconductores, pero aún carece de liderazgo consistente.",
          next: "Política, beneficios y flujos deberán confirmar cualquier mejora más duradera.",
        },
      },
      {
        asset: "BTC / ETH",
        headline: "Cripto conserva su papel de beta alta, no de cobertura defensiva.",
        badge: "alta beta",
        story:
          "BTC y ETH siguen sensibles a liquidez, dólar y apetito por riesgo. La dispersión de tecnología y el endurecimiento del coste de capital reducen la utilidad de leer cripto como una narrativa aislada.",
        changed:
          "La atención pasa de precio spot a la combinación de flujos, apalancamiento y correlación con activos tecnológicos.",
        expected:
          "Mejor tono si se estabilizan momentum y VIX, cae DXY y regresan flujos. Mayor vulnerabilidad si crédito, tasas y ventas sistemáticas se conectan.",
        watch:
          "BTC y ETH spot, flujos de ETF de BTC, DXY, VIX, tecnología y condiciones de financiación.",
        reading:
          "No sustituir liquidez ni defensa por exposición cripto; su función en este mapa es medir beta y liquidez.",
        timeline: {
          before: "La liquidez explicaba buena parte del apetito por cripto.",
          now: "El mercado vuelve a exigir disciplina frente a dólar y volatilidad tecnológica.",
          next: "Flujos y estabilidad de riesgo marcarán la calidad de cualquier rebote.",
        },
      },
      {
        asset: "Stockpicking",
        detailsModule: "earnings",
        headline: "La reacción posterior importa más que acertar el primer movimiento.",
        badge: "selectivo",
        story:
          "La temporada reciente castigó varias compañías más de lo que sugería el movimiento implícito previo. Sin una marca temporal reproducible de opciones, esas comparaciones sirven como observación y no como estadística definitiva.",
        changed:
          "La pregunta ya no es solo quién crece, sino quién financia ese crecimiento, conserva márgenes y convierte el CapEx en flujo de caja. Semiconductores, Corea, infraestructura de IA y high beta pueden representar una misma exposición aunque aparezcan como compañías distintas.",
        expected:
          "Nueve compañías abren ventanas previstas entre el 3 y el 11 de agosto. La lectura útil combinará sorpresa, guía y reacción acumulada durante las 3 a 5 sesiones posteriores.",
        watch:
          "Ventas, márgenes, guía, retorno del CapEx, balance, financiación, movimiento implícito inmediatamente anterior y reacción después de 3 y 5 sesiones.",
        reading:
          "No confundir compañías distintas con factores distintos: semiconductores, IA, high beta y Asia tecnológica pueden duplicar la misma exposición.",
        timeline: {
          before: "El momentum permitía que varias compañías compartieran una misma narrativa.",
          now: "Resultados y coste de capital separan historias con caja de historias dependientes de valoración.",
          next: "La persistencia posterior a resultados distinguirá señal fundamental de ajuste inicial.",
        },
      },
      {
        asset: "DXY / USD/COP",
        headline: "La fortaleza del peso está confirmada; su descomposición causal no.",
        badge: "rango amplio",
        story:
          "La TRM certificada para el 1 al 3 de agosto fue 3.144,14 COP por dólar y la tasa de política colombiana se mantenía en 12 %. El peso mostró un desempeño que no se explica únicamente por DXY.",
        changed:
          "El diferencial de tasas, petróleo y factores políticos locales ganaron peso relativo. Atribuir el movimiento completo a elecciones, fiscalidad o energía excedería la evidencia disponible.",
        expected:
          "Escenario base: consolidación con movimientos amplios en ambos sentidos después de una apreciación rápida. La continuación exige petróleo firme, entradas de capital y menor prima local; la reversión puede acelerarse con DXY al alza, petróleo débil o tensión soberana.",
        watch:
          "DXY, Brent, tasa del Banco de la República, TES, prima soberana, flujos hacia Colombia y comparación con otras monedas exportadoras.",
        reading:
          "USD/COP requiere una tesis propia. La correlación con petróleo o monedas comparables no elimina los factores locales.",
        timeline: {
          before: "DXY servía como explicación dominante para buena parte de la variación cambiaria.",
          now: "El peso se fortaleció más que varios referentes globales y elevó el peso de factores locales.",
          next: "Flujos, petróleo y prima soberana dirán si la divergencia persiste o revierte.",
        },
      },
    ],
    calendar: [
      {
        id: "ism-manufacturing",
        dateLabel: "Lun. 3 agosto",
        dateStart: "2026-08-03",
        startDateTimeUtc: "2026-08-03T14:00:00Z",
        event: "ISM manufacturero de Estados Unidos",
        whyItMatters: "Abre la lectura de actividad, pedidos, empleo y presiones de precios de agosto.",
        category: "macro",
        originalTime: "10:00",
        originalTimeZone: "ET",
        displayTimeCest: "16:00 CEST",
        timeStatus: "confirmed",
        affectedAssets: ["VOO", "DXY", "Treasury", "Bancos"],
        sourceLabel: "Calendario oficial de ISM",
        sourceHref: "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/",
        trackingHref: "/dashboard",
        trackingLabel: "Seguir reacción del mercado",
      },
      {
        id: "jolts-june",
        dateLabel: "Mar. 4 agosto",
        dateStart: "2026-08-04",
        startDateTimeUtc: "2026-08-04T14:00:00Z",
        event: "JOLTS de junio",
        whyItMatters: "Mide vacantes, contrataciones y renuncias para precisar el equilibrio del mercado laboral estadounidense.",
        category: "macro",
        originalTime: "10:00",
        originalTimeZone: "ET",
        displayTimeCest: "16:00 CEST",
        timeStatus: "confirmed",
        affectedAssets: ["VOO", "DXY", "Treasury", "Fed"],
        sourceLabel: "Calendario oficial del BLS",
        sourceHref: "https://www.bls.gov/schedule/2026/08_sched.htm",
        trackingHref: "https://www.bls.gov/jlt/",
        trackingLabel: "Seguir JOLTS en BLS",
      },
      {
        id: "ism-services",
        dateLabel: "Mié. 5 agosto",
        dateStart: "2026-08-05",
        startDateTimeUtc: "2026-08-05T14:00:00Z",
        event: "ISM servicios de Estados Unidos",
        whyItMatters: "Ayuda a medir actividad, empleo y presiones de precios en la parte dominante de la economía.",
        category: "macro",
        originalTime: "10:00",
        originalTimeZone: "ET",
        displayTimeCest: "16:00 CEST",
        timeStatus: "confirmed",
        affectedAssets: ["VOO", "DXY", "Treasury", "Fed"],
        sourceLabel: "Calendario oficial de ISM",
        sourceHref: "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/",
        trackingHref: "/dashboard",
        trackingLabel: "Seguir reacción del mercado",
      },
      {
        id: "employment-july",
        dateLabel: "Vie. 7 agosto",
        dateStart: "2026-08-07",
        startDateTimeUtc: "2026-08-07T12:30:00Z",
        event: "Empleo de Estados Unidos de julio",
        whyItMatters: "Puede reajustar expectativas de crecimiento, inflación salarial y política monetaria.",
        category: "macro",
        originalTime: "08:30",
        originalTimeZone: "ET",
        displayTimeCest: "14:30 CEST",
        timeStatus: "confirmed",
        affectedAssets: ["VOO", "DXY", "Treasury", "Fed", "Oro"],
        sourceLabel: "Calendario oficial del BLS",
        sourceHref: "https://www.bls.gov/schedule/2026/08_sched.htm",
        trackingHref: "https://www.bls.gov/news.release/empsit.htm",
        trackingLabel: "Seguir empleo en BLS",
      },
      {
        id: "cpi-july",
        dateLabel: "Mié. 12 agosto",
        dateStart: "2026-08-12",
        startDateTimeUtc: "2026-08-12T12:30:00Z",
        event: "IPC de Estados Unidos de julio",
        whyItMatters: "Es la prueba principal para tasas reales, dólar, duración y valoración de crecimiento.",
        category: "macro",
        originalTime: "08:30",
        originalTimeZone: "ET",
        displayTimeCest: "14:30 CEST",
        timeStatus: "confirmed",
        affectedAssets: ["VOO", "GLD", "DXY", "Treasury", "BTC / ETH"],
        sourceLabel: "Calendario oficial del BLS",
        sourceHref: "https://www.bls.gov/schedule/2026/08_sched.htm",
        trackingHref: "https://www.bls.gov/cpi/",
        trackingLabel: "Seguir IPC en BLS",
      },
      {
        id: "retail-sales-july",
        dateLabel: "Vie. 14 agosto",
        dateStart: "2026-08-14",
        startDateTimeUtc: "2026-08-14T12:30:00Z",
        event: "Ventas minoristas de Estados Unidos de julio",
        whyItMatters: "Mide la resistencia del consumo después de señales mixtas de actividad e inflación.",
        category: "macro",
        originalTime: "08:30",
        originalTimeZone: "ET",
        displayTimeCest: "14:30 CEST",
        timeStatus: "confirmed",
        affectedAssets: ["VOO", "DXY", "Treasury", "Consumo"],
        sourceLabel: "Calendario oficial del U.S. Census Bureau",
        sourceHref: "https://www.census.gov/retail/release_schedule.html",
        trackingHref: "https://www.census.gov/retail/index.html",
        trackingLabel: "Seguir ventas minoristas",
      },
      {
        id: "fomc-minutes-july",
        dateLabel: "Mié. 19 agosto",
        dateStart: "2026-08-19",
        startDateTimeUtc: "2026-08-19T18:00:00Z",
        event: "Minutas de la Fed del 28 y 29 de julio",
        whyItMatters: "Aclararán el balance entre la mayoría que mantuvo tasas y los tres votos favorables a subirlas.",
        category: "central-bank",
        originalTime: "14:00",
        originalTimeZone: "ET",
        displayTimeCest: "20:00 CEST",
        timeStatus: "confirmed",
        affectedAssets: ["VOO", "GLD", "DXY", "Treasury", "BTC / ETH"],
        sourceLabel: "Calendario oficial de la Federal Reserve Board",
        sourceHref: "https://www.federalreserve.gov/newsevents/2026-august.htm",
        trackingHref: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
        trackingLabel: "Seguir minutas de la Fed",
      },
      {
        id: "monthly-options-expiry",
        dateLabel: "Vie. 21 agosto",
        dateStart: "2026-08-21",
        event: "Vencimiento mensual de opciones",
        whyItMatters: "Puede modificar coberturas, volumen y sensibilidad del índice alrededor de niveles relevantes.",
        category: "options",
        originalTime: "Hora por confirmar",
        originalTimeZone: "ET",
        displayTimeCest: "Hora por confirmar",
        timeStatus: "tba",
        affectedAssets: ["VOO", "VIX", "Opciones sobre índices"],
        sourceLabel: "Calendario de vencimientos 2026 de Cboe",
        sourceHref: "https://cdn.cboe.com/resources/options/Cboe2026OPTIONSCalendar.pdf",
        trackingHref: "/dashboard",
        trackingLabel: "Seguir VIX y régimen",
      },
      {
        id: "jackson-hole-2026",
        dateLabel: "27-29 agosto",
        dateStart: "2026-08-27",
        dateEnd: "2026-08-29",
        event: "Simposio de Jackson Hole",
        whyItMatters: "La comunicación de bancos centrales puede cambiar la lectura de tasas, dólar y liquidez global.",
        category: "central-bank",
        originalTime: "Hora por confirmar",
        originalTimeZone: "MDT",
        displayTimeCest: "Hora por confirmar",
        timeStatus: "tba",
        affectedAssets: ["VOO", "GLD", "DXY", "Treasury", "BTC / ETH"],
        sourceLabel: "Federal Reserve Bank of Kansas City",
        sourceHref: "https://www.kansascityfed.org/research/jackson-hole-economic-symposium/",
        trackingHref: "https://www.kansascityfed.org/research/jackson-hole-economic-symposium/",
        trackingLabel: "Seguir programa oficial",
      },
    ],
    scenarios: [
      {
        title: "Base",
        body:
          "Alta dispersión, rebotes violentos y correcciones selectivas, con un índice todavía funcional. El shock de semiconductores parece adelantado frente a la evidencia industrial, pero crédito y tasas impiden tratar toda caída como oportunidad automática.",
      },
      {
        title: "Positivo",
        body:
          "Resultados validan monetización de IA, márgenes y flujo de caja; el crédito se estabiliza, cae la demanda de coberturas y el liderazgo se amplía más allá de unas pocas compañías.",
      },
      {
        title: "Adverso",
        body:
          "Gasto creciente sin retorno visible, petróleo y tasas al alza, crédito más caro y correlación creciente activan ventas sistemáticas. La volatilidad deja de ser interna y alcanza al índice.",
      },
    ],
    watchlist: [
      {
        key: "mega-cap-credit",
        name: "Crédito de grandes tecnológicas",
        category: "rates-credit",
        status: "watch",
        statusLabel: "En tensión",
        whatLooksAt: "Diferenciales de crédito de los principales financiadores de infraestructura de IA frente al mercado general.",
        whyItMatters: "El mercado de bonos puede endurecer la financiación antes de que la renta variable reconozca el coste.",
        currentReading: "Las referencias institucionales muestran ampliación relativa durante la última parte de julio.",
        whatWouldChange: "Estabilización después de resultados apoyaría el escenario base; una nueva ampliación elevaría la alerta.",
        asOf: "31 de julio de 2026",
        source: "J.P. Morgan, Goldman Sachs y lectura editorial del informe.",
        href: "/dashboard",
        linkLabel: "Seguir riesgo agregado",
      },
      {
        key: "long-rates",
        name: "Tasas largas y bancos",
        category: "rates-credit",
        status: "stressed",
        statusLabel: "En tensión",
        whatLooksAt: "Treasury a treinta años, tasas reales y reacción de bancos a mayores rendimientos.",
        whyItMatters: "Si tasas altas dejan de favorecer a bancos y empiezan a debilitarlos, aumenta el riesgo de desapalancamiento.",
        currentReading: "Los rendimientos largos siguen siendo una restricción más importante para valoraciones y financiación.",
        whatWouldChange: "Una caída sostenida aliviaría presión; nuevos máximos con bancos débiles deteriorarían la tesis.",
        asOf: "31 de julio de 2026",
        source: "BofA, datos de mercado y lectura editorial del informe.",
        href: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_real_yield_curve&field_tdr_date_value=2026",
        linkLabel: "Seguir tasas reales del Treasury",
      },
      {
        key: "correlation-breadth",
        name: "Correlación y amplitud",
        category: "market-structure",
        status: "watch",
        statusLabel: "En observación",
        whatLooksAt: "Correlación realizada e implícita y porcentaje de acciones sobre medias de 20, 50 y 200 días.",
        whyItMatters: "La baja correlación permite que el índice absorba movimientos opuestos entre compañías.",
        currentReading: "La correlación permanece excepcionalmente baja mientras la amplitud corta se deteriora.",
        whatWouldChange: "Correlación, VIX y deterioro de amplitud subiendo juntos trasladarían el daño al índice.",
        asOf: "31 de julio de 2026",
        source: "Goldman Sachs, datos de amplitud y lectura editorial del informe.",
        href: "/niveles-estadisticos?asset=SPY",
        linkLabel: "Seguir niveles del S&P 500",
      },
      {
        key: "systematic-volatility",
        name: "VIX y flujos sistemáticos",
        category: "market-structure",
        status: "stressed",
        statusLabel: "En tensión",
        whatLooksAt: "VIX, convexidad de opciones, niveles CTA y estrategias de control de volatilidad.",
        whyItMatters: "Una ruptura puede transformar una rotación de factores en oferta mecánica de índices.",
        currentReading: "La demanda de protección aumentó y varios niveles de corto plazo ya fueron probados.",
        whatWouldChange: "Normalización de coberturas y estabilización alejarían el riesgo; nuevas rupturas lo aumentarían.",
        asOf: "31 de julio de 2026",
        source: "Goldman Sachs, Nomura y lectura editorial del informe.",
        href: "/dashboard",
        linkLabel: "Seguir VIX y régimen",
      },
      {
        key: "ai-return",
        name: "Retorno del gasto en IA",
        category: "technology-ai",
        status: "tba",
        statusLabel: "Por confirmar",
        whatLooksAt: "Ingresos, márgenes, flujo de caja, CapEx y guía de grandes tecnológicas y proveedores.",
        whyItMatters: "La productividad operativa solo crea valor financiero si se convierte en crecimiento o caja defendible.",
        currentReading: "La demanda existe, pero el retorno agregado todavía no está demostrado.",
        whatWouldChange: "Mejor conversión de inversión en ingresos y caja apoyaría la tesis; costes crecientes sin retorno la deteriorarían.",
        asOf: "31 de julio de 2026",
        source: "Resultados empresariales, Goldman Sachs y J.P. Morgan.",
      },
      {
        key: "china-lithography",
        name: "Litografía china",
        category: "technology-ai",
        status: "tba",
        statusLabel: "Por confirmar",
        whatLooksAt: "Producción verificable, rendimiento industrial, comercialización y capacidad EUV.",
        whyItMatters: "La evidencia industrial decide si el shock fue de percepción o un cambio estructural más rápido.",
        currentReading: "La escala descrita sigue siendo pequeña y la sustitución comercial de ASML no está demostrada.",
        whatWouldChange: "Envíos verificables, rendimiento sostenido o progreso EUV elevarían el riesgo estructural.",
        asOf: "31 de julio de 2026",
        source: "Goldman Sachs Asia Equity Strategy y J.P. Morgan Market Intelligence.",
      },
      {
        key: "fed-oil",
        name: "Fed, petróleo e inflación",
        category: "rates-credit",
        status: "watch",
        statusLabel: "En observación",
        whatLooksAt: "Petróleo, inflación esperada, volatilidad de tasas y comunicación de la Fed.",
        whyItMatters: "Energía puede endurecer tasas y coste de capital incluso sin una subida inmediata de la Fed.",
        currentReading: "La Fed mantuvo 3,50 %–3,75 % el 29 de julio; tres miembros prefirieron subir 25 puntos básicos.",
        whatWouldChange: "Moderación de energía rompería la cadena; una nueva aceleración reforzaría la presión.",
        asOf: "29 de julio de 2026",
        source: "Federal Reserve Board.",
        href: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260729a.htm",
        linkLabel: "Comunicado oficial de la Fed",
      },
      {
        key: "usd-cop",
        name: "USD/COP",
        category: "fx-commodities",
        status: "watch",
        statusLabel: "En observación",
        whatLooksAt: "TRM, DXY, Brent, tasa local, TES, prima soberana y flujos de capital.",
        whyItMatters: "El peso puede separarse del dólar global durante ventanas en las que dominan factores colombianos.",
        currentReading: "La TRM certificada fue 3.144,14 COP para la vigencia del 1 al 3 de agosto.",
        whatWouldChange: "Convergencia hacia monedas comparables reduciría el componente local; nueva divergencia exigiría una descomposición propia.",
        asOf: "1 de agosto de 2026",
        source: "Superintendencia Financiera de Colombia y Banco de la República.",
        href: "https://www.superfinanciera.gov.co/CargaDriver/index.jsp",
        linkLabel: "TRM certificada por la SFC",
      },
      {
        key: "korea-leverage",
        name: "Concentración y apalancamiento en Corea",
        category: "technology-ai",
        status: "stressed",
        statusLabel: "En tensión",
        whatLooksAt: "Peso de grandes fabricantes, vehículos apalancados, rebalanceos y flujos extranjeros y locales.",
        whyItMatters: "Una buena tesis de beneficios puede sufrir movimientos extremos si la estructura de posiciones es frágil.",
        currentReading: "Los beneficios se concentran mientras los vehículos apalancados amplificaron el ajuste.",
        whatWouldChange: "Menor peso de rebalanceos y liderazgo más amplio estabilizarían; nuevas ventas forzadas prolongarían la corrección.",
        asOf: "31 de julio de 2026",
        source: "Goldman Sachs Asia Equity Strategy.",
      },
      {
        key: "earnings-persistence",
        name: "Reacción entre 3 y 5 sesiones",
        category: "technology-ai",
        status: "tba",
        statusLabel: "Por confirmar",
        whatLooksAt: "Persistencia de la reacción después de resultados y diferencia frente al movimiento implícito previo.",
        whyItMatters: "El primer día puede reflejar coberturas y posicionamiento; la digestión posterior aporta una señal más limpia.",
        currentReading: "La primera semana de agosto concentra pruebas confirmadas en ANET, DUOL y NET.",
        whatWouldChange: "Reacciones persistentes y mejores guías ampliarían liderazgo; rebotes que se reviertan señalarían fragilidad.",
        asOf: "1 de agosto de 2026",
        source: "Relaciones con inversionistas de Arista Networks, Duolingo y Cloudflare.",
        href: "https://investors.arista.com/",
        linkLabel: "Seguir resultados corporativos",
      },
    ],
    sourcesNote:
      "Las lecturas combinan datos de mercado, cálculos propios y material institucional con cortes entre el 21 y el 31 de julio de 2026, incluyendo J.P. Morgan, Goldman Sachs, BofA y Nomura. El calendario macro usa Federal Reserve Board, Bureau of Labor Statistics, U.S. Census Bureau, Institute for Supply Management, Federal Reserve Bank of Kansas City y Cboe; USD/COP usa Banco de la República y Superintendencia Financiera de Colombia. Las fechas corporativas confirmadas proceden de SEC EDGAR, anuncios específicos de Vertiv, Coinbase, Reddit, Palantir, Arista Networks, Coupang, Uber, Duolingo, Cloudflare y Hims & Hers, además de páginas de relaciones con inversionistas de AngloGold Ashanti y Cameco. Las portadas de IR de LifeMD y Celsius Holdings se incluyen solo como páginas de seguimiento: no confirman sus fechas editoriales ni sus horas. Los movimientos implícitos proceden de páginas por ticker de Unusual Whales consultadas el 1 de agosto de 2026 a las 12:00 UTC. Las reacciones realizadas usan históricos por ticker de Yahoo Finance, salvo CCJ, calculada con Nasdaq Historical como variación entre cierres regulares del 30 y 31 de julio, redondeada a una decimal. Las fuentes informan el análisis; no organizan la estructura. Se excluyeron cifras, gráficos y atribuciones que el borrador marcaba como pendientes de verificación.",
    disclaimer:
      "Este documento tiene fines educativos e informativos. No constituye asesoría financiera, recomendación personalizada ni solicitud de compra o venta de activos. Los escenarios son condicionales, no predicciones. Las decisiones de inversión deben considerar objetivos, horizonte, liquidez, tolerancia al riesgo y situación financiera individual. Rentabilidades pasadas no garantizan resultados futuros.",
  },
  {
    id: "segundo-informe-agosto-2026",
    monthKey: "2026-08",
    monthLabel: "Agosto 2026",
    label: "Segundo informe de agosto",
    title: "El mercado vuelve al riesgo mientras la factura de la IA gana peso",
    subtitle:
      "Rotación interna, financiación de la IA, oro y política monetaria marcan una segunda mitad de agosto con menos margen para decepciones.",
    dateLabel: "Corte editorial: 16 de agosto de 2026 · Datos automáticos: 14 de agosto de 2026",
    publishedLabel: "16 de agosto de 2026",
    publishedAt: "2026-08-16",
    modifiedAt: "2026-08-16",
    editorialCutoffAt: "2026-08-16",
    automaticDataCutoffAt: "2026-08-14",
    summary:
      "Rotación interna, coste de financiar la IA, oro, política monetaria y stockpicking para la segunda mitad de agosto, con lecturas de mercado congeladas al 14 de agosto de 2026.",
    calendarHref: "/reports/segundo-informe-agosto-2026-calendar.ics",
    htmlHref: "/reports/segundo-informe-agosto-2026.html",
    markdownHref: "/reports/segundo-informe-agosto-2026.md",
    pdfHref: "/reports/segundo-informe-agosto-2026.pdf",
    status: "actual",
    presentation: {
      contextTitle: "Contexto general",
      calendarStyle: "monthly",
      watchlistStyle: "dashboard",
      sectionTitles: {
        assetReadings: "Lectura por activo",
        calendar: "Calendario de eventos",
        watchlist: "Lista de control",
        sources: "Fuentes y aviso educativo",
      },
      year: 2026,
      month: 8,
      localizedTitle: "Agosto de 2026",
      locale: "es-ES",
      primaryTimeZone: "America/New_York",
      displayTimeZones: ["America/New_York", "Europe/Madrid"],
    },
    whatHappened: [
      {
        title: "Un mercado más fuerte de lo que sugería julio",
        summary: "Los hedge funds reconstruyeron exposición en Norteamérica y las compras se ampliaron más allá de las grandes tecnológicas.",
        body:
          "La primera mitad de agosto dejó un mercado estadounidense más fuerte de lo que sugería la sacudida de finales de julio. Los hedge funds reconstruyeron exposición en Norteamérica y las compras se extendieron más allá de las grandes tecnológicas, una señal favorable para la amplitud del mercado.",
      },
      {
        title: "Rotación dentro del mercado, no retirada de capital",
        summary: "Varios líderes de momentum perdieron fuerza mientras compañías rezagadas recuperaron terreno.",
        body:
          "La mejora, sin embargo, llega con una composición distinta. Varias acciones que habían liderado por momentum perdieron fuerza mientras sectores y compañías rezagadas recuperaron terreno. Hasta el corte, el comportamiento encaja mejor con una rotación dentro del mercado que con una retirada general de capital.",
      },
      {
        title: "El posicionamiento es más exigente",
        summary: "El indicador Bull & Bear de Bank of America alcanzó 9,7 sobre 10, una zona de optimismo extremo.",
        body:
          "El posicionamiento también es más exigente. El indicador Bull & Bear de Bank of America alcanzó 9,7 sobre 10, una zona que la entidad considera de optimismo extremo. No anticipa por sí sola una caída, pero sí implica que hay menos margen para que una decepción pase desapercibida.",
      },
      {
        title: "La factura de la inteligencia artificial",
        summary: "El mercado empieza a mirar cómo se financia la expansión, no solo cuánto se invierte.",
        body:
          "La inteligencia artificial continúa concentrando inversión, aunque el mercado empieza a mirar una segunda variable: cómo se financia esa expansión. El aumento de emisiones de deuda asociadas a centros de datos e infraestructura, junto con mayores primas de crédito en varias grandes tecnológicas, sugiere que el coste financiero del ciclo de IA empieza a importar tanto como el crecimiento esperado. Si una parte mayor del flujo de caja se dirige a inversión y financiación, las recompras también podrían aportar menos apoyo marginal que en años anteriores.",
      },
      {
        title: "El oro recupera demanda y se acerca a resistencia",
        summary: "Vuelve a existir demanda sistemática, pero todavía debe atravesar una zona técnica relevante.",
        body:
          "El oro recuperó compradores sistemáticos después de su corrección, pero se aproxima a una zona técnica relevante. Esto deja una configuración menos simple que “alcista” o “bajista”: vuelve a existir demanda, pero todavía debe demostrarse que el precio puede atravesar una resistencia importante.",
      },
      {
        title: "Lo que decide la segunda mitad de agosto",
        summary: "Rendimientos largos y DXY vuelven a ser variables transversales frente a PCE, Jackson Hole, OPEX y resultados.",
        body:
          "Para la segunda mitad del mes, los rendimientos largos y el DXY vuelven a ser variables transversales. PCE, Jackson Hole, la expiración mensual de opciones y los resultados de FUTU y NVIDIA pueden modificar las expectativas sobre tipos, crecimiento y gasto en IA. La lectura de arranque es, por tanto, la de un mercado que todavía tiene argumentos para mantenerse funcional, pero menos espacio para equivocarse.",
      },
    ],
    assetReadings: [
      {
        asset: "S&P 500",
        headline: "La corrección no evolucionó hacia una liquidación general: el mercado encontró nuevos compradores.",
        badge: "funcional",
        story:
          "Después de la reducción de riesgo de finales de julio, los hedge funds volvieron a aumentar exposición en Estados Unidos. Morgan Stanley mostró compras en Norteamérica que se extendieron más allá de tecnología hacia materiales, salud, inmobiliario y otras áreas de la economía. El índice recuperó fortaleza mientras bajo la superficie se produjo una rotación intensa: varios antiguos líderes de momentum cedieron y compañías previamente castigadas rebotaron. Al cierre del 14 de agosto, la participación sectorial era amplia —9 de 11 sectores positivos y 8 de 11 sobre su media larga en el dashboard— aunque el equal weight todavía no superaba al índice ponderado por capitalización.",
        changed:
          "La principal diferencia frente al primer informe es que la corrección no evolucionó hacia una liquidación general. Al mismo tiempo, el riesgo cambió de forma. El Bull & Bear de BofA en 9,7/10, la rotación violenta de momentum y el aumento del coste de financiar infraestructura de IA reducen el margen para decepciones. La discusión ya no es solo crecimiento tecnológico: deuda, crédito, tipos largos y uso del flujo de caja empiezan a importar más.",
        expected:
          "El escenario base sigue siendo compatible con un S&P 500 funcional, pero con mayor dispersión entre sectores y compañías. La continuidad sería más saludable si la amplitud se mantiene y el liderazgo sigue ampliándose. Un repunte fuerte de rendimientos y DXY, un deterioro simultáneo de amplitud y crédito o una decepción importante en las grandes tecnológicas elevarían el riesgo de que la rotación se convierta en reducción general de exposición.",
      },
      {
        asset: "Oro",
        headline: "Reaparecieron compradores sistemáticos, pero la confirmación técnica todavía importa.",
        badge: "en confirmación",
        story:
          "Después de una corrección cercana al 27 % desde máximos, el oro rebotó y volvió a atraer demanda sistemática. Según el análisis de Charlie McElligott, la señal CTA pasó aproximadamente de -18 % corto a +15 % largo, con alrededor de 1.500 millones de dólares de compras estimadas en el giro. BTIG situó una zona de resistencia importante alrededor de 4.400–4.500 dólares, mientras el dashboard mostraba al 14 de agosto una presión de flujos en GLD compatible con entrada neta probable: +0,03 % en 1D, +0,59 % en 5D y +2,49 % en 20D.",
        changed:
          "La tesis táctica mejoró: ya no se trata solo de una narrativa estructural sobre deuda o diversificación; han reaparecido compradores sistemáticos y los flujos de GLD mejoraron. Pero la confirmación técnica todavía importa. McElligott identifica además un nivel condicional cercano a 5.056 dólares que, bajo su modelo, podría llevar a una exposición CTA mucho más larga. No es un objetivo de precio.",
        expected:
          "El escenario mejora si el oro consigue absorber la zona de 4.400–4.500 sin un fortalecimiento simultáneo del DXY o de las tasas reales. Un rechazo en resistencia acompañado por dólar y rendimientos más altos favorecería consolidación o retroceso. Una ruptura sostenida, especialmente con DXY y rendimientos contenidos, podría atraer demanda sistemática adicional.",
      },
      {
        asset: "China",
        headline: "Exportaciones fuertes y demanda interna débil: el contraste se volvió más explícito.",
        badge: "táctico",
        story:
          "La economía china siguió mostrando una brecha clara entre fortaleza externa y debilidad doméstica. En julio, las exportaciones crecieron aproximadamente 24 % interanual y el superávit comercial alcanzó unos 113.000 millones de dólares, mientras el crecimiento del PIB del segundo trimestre fue de 4,3 % y las ventas minoristas habían mostrado un tono mucho más débil. Beijing mantuvo una estrategia de apoyo selectivo y aceleración del gasto ya presupuestado, sin anunciar un gran programa nuevo de estímulo al consumo. La estacionalidad de agosto no aporta una señal direccional útil por sí sola: FXI terminó agosto en positivo en 5 de los últimos 10 años.",
        changed:
          "La resistencia del mercado amplio chino frente a episodios de presión tecnológica sigue siendo relevante, pero el contraste entre exportaciones fuertes y demanda interna débil se volvió más explícito. Eso limita una lectura demasiado optimista basada únicamente en valoraciones o política. El motor exportador es fuerte; el consumidor doméstico todavía no ofrece una confirmación equivalente.",
        expected:
          "La lectura sigue siendo táctica y mixta. Mejoras claras en confianza, consumo o estímulos dirigidos a demanda doméstica aumentarían la calidad de una recuperación. Por el contrario, un DXY más fuerte, mayores tensiones comerciales o persistencia de la debilidad interna mantendrían la dispersión y limitarían una tesis direccional más fuerte.",
      },
      {
        asset: "Japón",
        headline: "El yen volvió a ser la variable central de la lectura japonesa.",
        badge: "selectivo",
        story:
          "Japón siguió atrayendo interés institucional dentro de la rotación global, pero el yen volvió a convertirse en una variable central. Después de una intervención coordinada que llevó al yen desde un mínimo cercano a 163,99 por dólar hasta alrededor de 155,20, la divisa volvió a debilitarse hacia 159,5 al 14 de agosto. El diferencial de rendimientos entre Estados Unidos y Japón seguía siendo amplio y el mercado aumentó sus apuestas por una nueva subida del Banco de Japón en septiembre.",
        changed:
          "La debilidad del yen ya no funciona únicamente como apoyo para exportadores. Al acercarse de nuevo a 160, aumenta también el riesgo de intervención, inflación importada y una respuesta monetaria más rápida. Por eso, la lectura de Japón depende más que al inicio del mes de la interacción entre beneficios, divisa y política monetaria.",
        expected:
          "La fortaleza relativa puede continuar si la debilidad del yen se mantiene ordenada y el Banco de Japón normaliza tipos de forma gradual. Una nueva intervención cambiaria o un endurecimiento monetario más rápido podría fortalecer el yen y aumentar la dispersión entre sectores, especialmente en compañías con elevada sensibilidad exportadora.",
      },
      {
        asset: "Bitcoin",
        headline: "Sin ruptura clara al alza y con flujos de ETFs todavía mixtos.",
        badge: "alta beta",
        story:
          "Bitcoin llegó al corte alrededor de la zona de 63.000 dólares y no consiguió convertir unos datos macro algo más suaves en una ruptura clara al alza. El dashboard mostraba al 14 de agosto una señal de flujos de ETFs spot todavía mixta: último flujo de -123 M USD, -229 M USD en cinco días y una racha de dos días de salidas.",
        changed:
          "La lectura se apoya menos en una narrativa direccional y más en la combinación de liquidez, DXY, rendimientos y flujos de ETFs. La información fiable hasta el corte no justifica una tesis independiente más fuerte.",
        expected:
          "Un dólar y rendimientos más contenidos, acompañados por una mejora persistente de los flujos de ETFs, favorecerían un entorno más constructivo. Un endurecimiento de las condiciones financieras o nuevas salidas sostenidas mantendrían a Bitcoin como un activo de beta alta y sensible al apetito global por riesgo.",
      },
      {
        asset: "Ethereum",
        headline: "Sin señal institucional propia suficiente para separarlo del régimen general de cripto.",
        badge: "alta beta",
        story:
          "Ethereum compartió el entorno de volatilidad y sensibilidad a liquidez del mercado cripto. La información institucional específica disponible hasta el corte es menor que para Bitcoin y no aporta una señal independiente suficientemente fuerte para separar con confianza su dirección del régimen general de cripto.",
        changed:
          "No aparece una nueva tesis propia que invalide la lectura anterior: DXY, tipos, liquidez y apetito por riesgo siguen siendo los principales filtros macro.",
        expected:
          "El escenario mejora si se relajan las condiciones financieras y el mercado cripto recupera flujos y participación. Si dólar y rendimientos suben o se debilita el apetito por riesgo, ETH seguiría siendo vulnerable. No corresponde inferir fortaleza relativa frente a BTC sin una fuente específica.",
      },
      {
        asset: "DXY",
        headline: "Factor transversal: puede amplificar o aliviar a la vez la presión sobre oro, China y cripto.",
        badge: "factor transversal",
        story:
          "El dólar siguió actuando como transmisor entre las diferencias de tipos, la política monetaria y el comportamiento de otros activos. La tensión alrededor del yen mostró que los diferenciales de rendimientos siguen teniendo capacidad para mover divisas incluso después de intervención oficial.",
        changed:
          "Para la segunda mitad de agosto, PCE y Jackson Hole aumentan la sensibilidad del DXY a cualquier cambio en expectativas sobre la Fed. Su papel es más importante porque puede amplificar o aliviar simultáneamente presión sobre oro, China y cripto.",
        expected:
          "Una lectura de inflación más persistente o una Fed más restrictiva tendería a apoyar dólar y rendimientos. Una combinación de inflación más contenida y mayor confianza en desinflación podría producir el movimiento contrario. El DXY se usa aquí como factor transversal, no como activo recomendado.",
      },
      {
        asset: "Stockpicking",
        detailsModule: "earnings",
        headline: "Siete de nueve reacciones quedaron dentro del rango implícito; PLTR y CELH lo excedieron.",
        badge: "selectivo",
        story:
          "Las nueve publicaciones que el primer informe dejó bajo seguimiento ya reaccionaron. Siete se movieron dentro del rango que las opciones descontaban antes del evento y dos lo excedieron: PLTR al alza y CELH a la baja. En CELH, además, la fecha finalmente confirmada fue el 6 de agosto y no la fecha editorial sin confirmar que figuraba en el informe anterior.",
        changed:
          "La ventana de seguimiento se reduce a dos publicaciones con fecha oficial confirmada: FUTU el 20 de agosto y NVIDIA el 26. Además, la cadena de infraestructura óptica para centros de datos aparece como tema en observación dentro del análisis de compañías, sin que el mapa industrial permita por sí solo clasificar ninguna como selección.",
        expected:
          "En ambos casos la referencia será comprobar si la reacción del cierre regular permanece dentro del movimiento implícito registrado antes del evento o introduce una sorpresa de precio material. En NVIDIA, márgenes, guía y comentarios sobre demanda de centros de datos importan más allá de una sola acción como prueba del ciclo de inversión en IA.",
      },
    ],
    stockpicking: {
      earnings: {
        methodology:
          "Los movimientos implícitos esperados de la tabla retrospectiva son los congelados en el primer informe de agosto, procedentes de páginas por ticker de Unusual Whales consultadas el 1 de agosto de 2026 a las 12:00 UTC; no se actualizan con el valor posterior de las opciones. El movimiento ocurrido usa una única metodología: variación entre el cierre regular de la sesión de reacción y el cierre regular inmediatamente anterior, redondeada a una decimal. No se usan datos after-hours ni máximos o mínimos intradía.",
        publishedNote:
          "El primer informe dejó nueve publicaciones de resultados bajo seguimiento. Al comparar el movimiento que las opciones descontaban antes del evento con el cierre regular de la sesión de reacción, siete de las nueve compañías permanecieron dentro del rango esperado. PLTR y CELH lo excedieron. La comparación mide sorpresa de precio, no calidad empresarial: una acción puede presentar buenos resultados y aun así moverse menos de lo que el mercado ya había descontado.",
        upcomingNote:
          "Solo dos compañías del seguimiento publican resultados entre el 17 y el 31 de agosto, ambas con fecha oficial confirmada por sus páginas de relaciones con inversionistas. Los movimientos implícitos quedaron registrados en la consulta del 16 de agosto de 2026 y no se actualizan después de publicar.",
        published: [
          { company: "Palantir", ticker: "PLTR", reportDate: "2026-08-03", reactionDate: "2026-08-04", session: "after-close", impliedMovePct: 10.32, actualMovePct: 29.5, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/PLTR/earnings", dateTimeSourceLabel: "Anuncio de Palantir: resultados Q2 2026 y webcast", dateTimeSourceHref: "https://www.nasdaq.com/press-release/palantir-announces-date-second-quarter-2026-earnings-release-and-webcast-2026-07-13", actualMoveSourceLabel: "Stock Analysis — históricos de PLTR", actualMoveSourceHref: "https://stockanalysis.com/stocks/pltr/history/", actualMoveMethodology: "Cierre regular del 4 de agosto (162,66 USD) frente al cierre regular previo (125,65 USD): (162,66 / 125,65 - 1) × 100 = +29,5 %.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Arista Networks", ticker: "ANET", reportDate: "2026-08-04", reactionDate: "2026-08-05", session: "after-close", impliedMovePct: 10.40, impliedMoveApproximate: true, actualMovePct: 3.6, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/ANET/earnings", dateTimeSourceLabel: "Anuncio de resultados de Arista", dateTimeSourceHref: "https://investors.arista.com/Communications/Press-Releases-and-Events/Press-Release-Detail/2026/Arista-Networks-to-Announce-Q2-2026-Financial-Results-on-Tuesday-August-4-2026/default.aspx", actualMoveSourceLabel: "Stock Analysis — históricos de ANET", actualMoveSourceHref: "https://stockanalysis.com/stocks/anet/history/", actualMoveMethodology: "Cierre regular del 5 de agosto (197,31 USD) frente al cierre regular previo (190,51 USD): (197,31 / 190,51 - 1) × 100 = +3,6 %.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Coupang", ticker: "CPNG", reportDate: "2026-08-04", reactionDate: "2026-08-05", session: "after-close", impliedMovePct: 10.23, actualMovePct: -4.6, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/CPNG/earnings", dateTimeSourceLabel: "Anuncio de resultados de Coupang", dateTimeSourceHref: "https://ir.aboutcoupang.com/news-events/news/news-details/2026/Coupang-to-Announce-Second-Quarter-2026-Results-on-August-4-2026/default.aspx", actualMoveSourceLabel: "Stock Analysis — históricos de CPNG", actualMoveSourceHref: "https://stockanalysis.com/stocks/cpng/history/", actualMoveMethodology: "Cierre regular del 5 de agosto (16,00 USD) frente al cierre regular previo (16,78 USD): (16,00 / 16,78 - 1) × 100 = -4,6 %.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Uber", ticker: "UBER", reportDate: "2026-08-05", reactionDate: "2026-08-05", session: "before-open", impliedMovePct: 7.36, actualMovePct: -5.3, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/UBER/earnings", dateTimeSourceLabel: "Anuncio de resultados de Uber", dateTimeSourceHref: "https://investor.uber.com/news-events/news/press-release-details/2026/Uber-Announces-Date-of-Second-Quarter-2026-Results-Conference-Call/default.aspx", actualMoveSourceLabel: "Stock Analysis — históricos de UBER", actualMoveSourceHref: "https://stockanalysis.com/stocks/uber/history/", actualMoveMethodology: "Cierre regular del 5 de agosto (68,18 USD) frente al cierre regular previo (71,99 USD): (68,18 / 71,99 - 1) × 100 = -5,3 %.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Duolingo", ticker: "DUOL", reportDate: "2026-08-05", reactionDate: "2026-08-06", session: "after-close", impliedMovePct: 16.45, impliedMoveApproximate: true, actualMovePct: -9.4, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/DUOL/earnings", dateTimeSourceLabel: "Resultados Q2 2026 de Duolingo", dateTimeSourceHref: "https://investors.duolingo.com/news-releases/news-release-details/duolingo-reports-second-quarter-2026-results", actualMoveSourceLabel: "Stock Analysis — históricos de DUOL", actualMoveSourceHref: "https://stockanalysis.com/stocks/duol/history/", actualMoveMethodology: "Cierre regular del 6 de agosto (122,58 USD) frente al cierre regular previo (135,32 USD): (122,58 / 135,32 - 1) × 100 = -9,4 %. Algunos titulares describieron caídas mayores en after-hours o intradía; el informe no las utiliza.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "LifeMD", ticker: "LFMD", reportDate: "2026-08-05", reactionDate: "2026-08-06", impliedMovePct: 23.44, impliedMoveApproximate: true, actualMovePct: -7.6, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/LFMD/earnings", dateTimeSourceLabel: "Página de IR de LifeMD (sin anuncio que confirme el evento)", dateTimeSourceHref: "https://ir.lifemd.com/", actualMoveSourceLabel: "Stock Analysis — históricos de LFMD", actualMoveSourceHref: "https://stockanalysis.com/stocks/lfmd/history/", actualMoveMethodology: "Cierre regular del 6 de agosto (3,40 USD) frente al cierre regular previo (3,68 USD): (3,40 / 3,68 - 1) × 100 = -7,6 %.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "editorial-unconfirmed", timeConfirmationStatus: "not-recorded" },
          { company: "Cloudflare", ticker: "NET", reportDate: "2026-08-06", reactionDate: "2026-08-07", session: "after-close", impliedMovePct: 11.60, impliedMoveApproximate: true, actualMovePct: 5.6, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/NET/earnings", dateTimeSourceLabel: "Anuncio de resultados de Cloudflare", dateTimeSourceHref: "https://www.cloudflare.net/news/news-details/2026/Cloudflare-Announces-Date-of-Second-Quarter-2026-Financial-Results/default.aspx", actualMoveSourceLabel: "Stock Analysis — históricos de NET", actualMoveSourceHref: "https://stockanalysis.com/stocks/net/history/", actualMoveMethodology: "Cierre regular del 7 de agosto (300,27 USD) frente al cierre regular previo (284,43 USD): (300,27 / 284,43 - 1) × 100 = +5,6 %. El +16 % citado en algunos titulares corresponde a after-hours y no a esta metodología.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Hims & Hers", ticker: "HIMS", reportDate: "2026-08-10", reactionDate: "2026-08-11", session: "after-close", impliedMovePct: 20.53, actualMovePct: -4.0, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/HIMS/earnings", dateTimeSourceLabel: "Anuncio de resultados de Hims & Hers", dateTimeSourceHref: "https://investors.hims.com/news/news-details/2026/Hims--Hers-to-Announce-Second-Quarter-2026-Financial-Results-on-August-10-2026/default.aspx", actualMoveSourceLabel: "Stock Analysis — históricos de HIMS", actualMoveSourceHref: "https://stockanalysis.com/stocks/hims/history/", actualMoveMethodology: "Cierre regular del 11 de agosto (30,51 USD) frente al cierre regular previo (31,77 USD): (30,51 / 31,77 - 1) × 100 = -4,0 %.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "Celsius Holdings", ticker: "CELH", reportDate: "2026-08-06", reactionDate: "2026-08-06", impliedMovePct: 11.55, actualMovePct: -18.5, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/CELH/earnings", dateTimeSourceLabel: "Resultados Q2 2026 de Celsius Holdings", dateTimeSourceHref: "https://ir.celsiusholdingsinc.com/news/news-details/2026/Celsius-Holdings-Reports-Second-Quarter-2026-Financial-Results/default.aspx", actualMoveSourceLabel: "Stock Analysis — históricos de CELH", actualMoveSourceHref: "https://stockanalysis.com/stocks/celh/history/", actualMoveMethodology: "La fecha finalmente confirmada fue el 6 de agosto; el primer informe había dejado el 11 de agosto como fecha editorial no confirmada. Cierre regular del 6 de agosto (23,77 USD) frente al cierre regular previo (29,15 USD): (23,77 / 29,15 - 1) × 100 = -18,5 %.", consultedAt: "2026-08-01T12:00:00Z", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "not-recorded" },
        ],
        upcoming: [
          { company: "Futu Holdings", ticker: "FUTU", reportDate: "2026-08-20", session: "before-open", startDateTimeUtc: "2026-08-20T11:30:00Z", originalTime: "07:30", originalTimeZone: "ET", displayTime: "13:30 CEST", impliedMovePct: 7.04, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/FUTU/options-flow-history", dateTimeSourceLabel: "Futu Investor Relations — conferencia de resultados Q2 2026", dateTimeSourceHref: "https://ir.futuholdings.com/events/event-details/futu-holdings-ltd-second-quarter-2026-earnings-conference-call/", consultedAt: "2026-08-16", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
          { company: "NVIDIA", ticker: "NVDA", reportDate: "2026-08-26", session: "after-close", startDateTimeUtc: "2026-08-26T21:00:00Z", originalTime: "17:00", originalTimeZone: "ET", displayTime: "23:00 CEST", impliedMovePct: 6.18, impliedMoveProvider: "Unusual Whales", impliedMoveProviderHref: "https://unusualwhales.com/stock/NVDA/earnings", dateTimeSourceLabel: "NVIDIA Investor Relations — resultados Q2 FY27", dateTimeSourceHref: "https://investor.nvidia.com/events-and-presentations/events-and-presentations/event-details/2026/NVIDIA-2nd-Quarter-FY27-Financial-Results/default.aspx", consultedAt: "2026-08-16", dateConfirmationStatus: "confirmed", timeConfirmationStatus: "confirmed" },
        ],
      },
      themes: [
        {
          label: "Oportunidad en consideración",
          title: "Infraestructura óptica para IA",
          body:
            "El crecimiento de la IA no termina en los chips. Cada nueva generación de centros de datos necesita mover más información entre procesadores, servidores y centros de procesamiento, lo que eleva la importancia de la infraestructura óptica: transceptores, láseres, módulos ópticos, fibra, packaging y testing. Lumentum, Coherent, Broadcom y Marvell aparecen en distintos puntos de esa cadena, junto con varios proveedores asiáticos. El mapa industrial justifica mantener el tema bajo observación, pero por sí solo no permite clasificar ninguna compañía como selección: valoración, márgenes, concentración de clientes y expectativas ya descontadas siguen siendo determinantes.",
          examples: [
            { ticker: "LITE", company: "Lumentum" },
            { ticker: "COHR", company: "Coherent" },
            { ticker: "AVGO", company: "Broadcom" },
            { ticker: "MRVL", company: "Marvell" },
          ],
          note:
            "Las compañías se citan como ejemplos de la cadena industrial descrita en la infografía aportada, no como selección aprobada ni recomendación de compra.",
        },
      ],
    },
    calendar: [
      {
        id: "monthly-options-expiry-august",
        dateLabel: "Vie. 21 agosto",
        dateStart: "2026-08-21",
        event: "Expiración mensual de opciones (OPEX)",
        whyItMatters: "Puede alterar coberturas, flujos y volatilidad de corto plazo; no implica una dirección determinada.",
        category: "options",
        originalTime: "Hora por confirmar",
        originalTimeZone: "ET",
        displayTimeCest: "Hora por confirmar",
        timeStatus: "tba",
        affectedAssets: ["S&P 500", "VIX", "Opciones sobre índices"],
        sourceLabel: "Calendario de expiraciones de la OCC",
        sourceHref: "https://www.theocc.com/clearance-and-settlement/expiration-calendars",
        trackingHref: "/dashboard",
        trackingLabel: "Seguir VIX y régimen",
      },
      {
        id: "pce-july",
        dateLabel: "Mié. 26 agosto",
        dateStart: "2026-08-26",
        startDateTimeUtc: "2026-08-26T12:30:00Z",
        event: "Personal Income & Outlays / PCE de julio",
        whyItMatters: "Puede modificar expectativas sobre la Fed, los rendimientos y el DXY para el resto del mes.",
        category: "macro",
        originalTime: "08:30",
        originalTimeZone: "ET",
        displayTimeCest: "14:30 CEST",
        timeStatus: "confirmed",
        affectedAssets: ["S&P 500", "Oro", "DXY", "Treasury", "BTC / ETH"],
        sourceLabel: "Calendario oficial de publicaciones del BEA",
        sourceHref: "https://www.bea.gov/news/schedule",
        trackingHref: "https://www.bea.gov/data/personal-consumption-expenditures-price-index",
        trackingLabel: "Seguir el índice PCE en el BEA",
      },
      {
        id: "jackson-hole-2026",
        dateLabel: "27-29 agosto",
        dateStart: "2026-08-27",
        dateEnd: "2026-08-29",
        event: "Simposio de Jackson Hole",
        whyItMatters:
          "Comunicación de bancos centrales; el tema oficial de 2026 es “Financial Innovation: Implications for Payments and Policy”. La agenda con la hora del discurso del presidente de la Fed no está publicada al corte.",
        category: "central-bank",
        originalTime: "Hora por confirmar",
        originalTimeZone: "MDT",
        displayTimeCest: "Hora por confirmar",
        timeStatus: "tba",
        affectedAssets: ["S&P 500", "Oro", "DXY", "Treasury", "BTC / ETH"],
        sourceLabel: "Federal Reserve Bank of Kansas City",
        sourceHref: "https://www.kansascityfed.org/research/jackson-hole-economic-symposium/",
        trackingHref: "https://www.kansascityfed.org/research/jackson-hole-economic-symposium/jackson-hole-faqs/",
        trackingLabel: "Seguir programa oficial",
      },
    ],
    probableRoutes: {
      title: "Rutas probables",
      note: "Estas rutas no son predicciones. Sirven para reconocer qué combinación de señales está ganando peso a medida que avanza la segunda mitad del mes.",
      scenarios: [
        {
          title: "Ruta base — mercado funcional con rotación",
          body:
            "El S&P 500 mantiene una estructura razonablemente firme, pero el liderazgo continúa rotando. La amplitud evita una venta generalizada, rendimientos y DXY no se desordenan y el oro prueba resistencia sin una ruptura inmediata del régimen. PCE y Jackson Hole generan volatilidad, pero no cambian de forma abrupta las expectativas monetarias. NVIDIA confirma demanda elevada por infraestructura de IA, aunque el mercado sigue prestando más atención al coste de financiarla.",
        },
        {
          title: "Ruta favorable — amplitud, desinflación y menor presión de tasas",
          body:
            "Una lectura de inflación más contenida y una comunicación menos restrictiva reducen presión sobre rendimientos y DXY. La participación del S&P 500 continúa ampliándose y la rotación deja de depender de unos pocos líderes. NVIDIA valida crecimiento y márgenes suficientes para sostener el gasto en IA sin empeorar la preocupación por financiación. El oro supera su resistencia con apoyo de compradores sistemáticos y las condiciones de liquidez favorecen una mejora de los flujos cripto.",
        },
        {
          title: "Ruta adversa — tasas y dólar convierten la rotación en reducción de riesgo",
          body:
            "Inflación o comunicación de la Fed obligan al mercado a descontar tipos altos durante más tiempo. Suben rendimientos y DXY, se amplían los diferenciales de crédito y la debilidad deja de concentrarse en antiguos líderes. El S&P 500 pierde amplitud, el oro no logra sostenerse sobre resistencia ante un dólar más fuerte y BTC/ETH sufren nuevas salidas o menor apetito de riesgo. Una decepción de NVIDIA podría amplificar la revisión de expectativas sobre IA.",
        },
      ],
    },
    watchlist: [
      {
        key: "spx-breadth",
        name: "Amplitud del S&P 500",
        category: "market-structure",
        status: "watch",
        statusLabel: "En observación",
        whatLooksAt: "Número de sectores que acompañan al índice y comportamiento relativo de RSP/SPY e IWM/SPY.",
        whyItMatters: "Un índice firme con amplitud deteriorada suele describir una subida sostenida por pocos líderes.",
        currentReading: "Al 14 de agosto, 9 de 11 sectores cerraron la semana en positivo y 8 de 11 quedaron sobre su media larga, pero RSP/SPY (-1,1 pp) e IWM/SPY (-1,7 pp) siguieron por detrás del índice.",
        whatWouldChange: "Señal de alerta: índice firme con amplitud, crédito y antiguos líderes deteriorándose al mismo tiempo. La lectura mejoraría si RSP/SPY e IWM/SPY dejan de deteriorarse.",
        asOf: "14 de agosto de 2026",
        source: "Dashboard propio, snapshot del 14 de agosto de 2026.",
        href: "/dashboard",
        linkLabel: "Ver amplitud en el Dashboard",
      },
      {
        key: "us-yields",
        name: "Rendimientos estadounidenses",
        category: "rates-credit",
        status: "watch",
        statusLabel: "En observación",
        whatLooksAt: "Treasury a 10 años y, cuando el componente exista, tasas reales.",
        whyItMatters: "Los rendimientos largos condicionan valoración, coste de capital y el atractivo relativo de otros activos.",
        currentReading: "Los rendimientos largos vuelven a ser una variable transversal para la segunda mitad del mes, con PCE y Jackson Hole como referencias principales.",
        whatWouldChange: "Señal de alerta: una subida rápida que coincida con ampliación de los diferenciales de crédito.",
        asOf: "16 de agosto de 2026",
        source: "Lectura editorial del informe y datos públicos del Treasury.",
        href: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_real_yield_curve&field_tdr_date_value=2026",
        linkLabel: "Seguir tasas reales del Treasury",
      },
      {
        key: "ai-credit",
        name: "Crédito y financiación de la IA",
        category: "rates-credit",
        status: "stressed",
        statusLabel: "En tensión",
        whatLooksAt: "Diferenciales de las grandes tecnológicas, nueva emisión de deuda y comentarios de CapEx.",
        whyItMatters: "Si una parte mayor del flujo de caja se dirige a inversión y financiación, las recompras aportan menos apoyo marginal.",
        currentReading: "El aumento de emisiones ligadas a centros de datos y las mayores primas de crédito sugieren que el coste financiero del ciclo empieza a pesar tanto como el crecimiento esperado.",
        whatWouldChange: "Una estabilización de diferenciales apoyaría el escenario base; una nueva ampliación junto con más emisión elevaría la alerta.",
        asOf: "16 de agosto de 2026",
        source: "Bank of America, Morgan Stanley y lectura editorial del informe.",
      },
      {
        key: "dxy",
        name: "DXY",
        category: "fx-commodities",
        status: "watch",
        statusLabel: "En observación",
        whatLooksAt: "Reacción del dólar a PCE y a la comunicación de Jackson Hole.",
        whyItMatters: "Un dólar más fuerte endurece simultáneamente la lectura de oro, China y cripto; uno más débil puede aliviarla.",
        currentReading: "El dólar sigue actuando como transmisor entre diferenciales de tipos, política monetaria y el resto de activos del universo.",
        whatWouldChange: "Una inflación más persistente o una Fed más restrictiva apoyarían dólar y rendimientos; mayor confianza en desinflación produciría el movimiento contrario.",
        asOf: "16 de agosto de 2026",
        source: "Lectura editorial del informe.",
      },
      {
        key: "gold-levels",
        name: "Oro: resistencia y demanda sistemática",
        category: "fx-commodities",
        status: "watch",
        statusLabel: "En observación",
        whatLooksAt: "Zona técnica de 4.400–4.500 dólares y el nivel condicional cercano a 5.056 del material de McElligott.",
        whyItMatters: "La demanda sistemática ya regresó, pero la confirmación del precio sigue pendiente.",
        currentReading: "Al 14 de agosto el proxy de presión de flujos en GLD era compatible con entrada neta probable: +0,03 % en 1D, +0,59 % en 5D y +2,49 % en 20D.",
        whatWouldChange: "El nivel de 5.056 no debe tratarse como objetivo de precio: es un umbral condicional del modelo citado. Un rechazo en 4.400–4.500 con dólar y tasas al alza favorecería consolidación.",
        asOf: "14 de agosto de 2026",
        source: "BTIG, Charlie McElligott y dashboard propio, snapshot del 14 de agosto de 2026.",
        href: "/dashboard",
        linkLabel: "Ver presión de flujos en el Dashboard",
      },
      {
        key: "nvda-earnings",
        name: "NVIDIA",
        category: "stockpicking",
        status: "tba",
        statusLabel: "Por confirmar",
        whatLooksAt: "Movimiento implícito previo, reacción del cierre regular posterior, márgenes, guía y comentarios de demanda de centros de datos.",
        whyItMatters: "El evento funciona como prueba transversal del ciclo de inversión en IA, más allá de una sola acción.",
        currentReading: "Resultados el 26 de agosto con conferencia a las 17:00 ET. El movimiento implícito rondaba 6,18 % (aproximadamente ±13,94 dólares) en la consulta del 16 de agosto.",
        whatWouldChange: "Una reacción dentro del rango implícito mantendría la lectura; una sorpresa material de precio o una guía débil obligarían a revisar expectativas sobre gasto en IA.",
        asOf: "16 de agosto de 2026",
        source: "NVIDIA Investor Relations y Unusual Whales.",
        href: "https://investor.nvidia.com/events-and-presentations/events-and-presentations/event-details/2026/NVIDIA-2nd-Quarter-FY27-Financial-Results/default.aspx",
        linkLabel: "Seguir resultados de NVIDIA",
      },
      {
        key: "futu-earnings",
        name: "FUTU",
        category: "stockpicking",
        status: "tba",
        statusLabel: "Por confirmar",
        whatLooksAt: "Movimiento implícito previo y reacción del cierre regular posterior.",
        whyItMatters: "Permite comparar de nuevo lo descontado por las opciones con la reacción efectiva del mercado.",
        currentReading: "Resultados el 20 de agosto antes de la apertura estadounidense, con conferencia a las 07:30 ET. El movimiento implícito era 7,04 % (aproximadamente ±7,42 dólares) en la consulta del 16 de agosto.",
        whatWouldChange: "No conviene extrapolar una sola sesión como tesis de largo plazo, dentro o fuera del rango.",
        asOf: "16 de agosto de 2026",
        source: "Futu Investor Relations y Unusual Whales.",
        href: "https://ir.futuholdings.com/",
        linkLabel: "Seguir resultados de FUTU",
      },
      {
        key: "japan-yen-boj",
        name: "Japón, yen y Banco de Japón",
        category: "macro-global",
        status: "watch",
        statusLabel: "En observación",
        whatLooksAt: "Yen alrededor de 160, riesgo de intervención y expectativas de subida del BOJ.",
        whyItMatters: "Conviene diferenciar la mejora bursátil del efecto divisa antes de leer la fortaleza relativa japonesa.",
        currentReading: "Tras la intervención que llevó al yen desde ~163,99 hasta ~155,20, la divisa volvió a debilitarse hacia 159,5 al 14 de agosto.",
        whatWouldChange: "Una nueva intervención o un endurecimiento monetario más rápido fortalecerían el yen y aumentarían la dispersión entre sectores exportadores.",
        asOf: "14 de agosto de 2026",
        source: "Reuters, 13 y 14 de agosto de 2026.",
      },
      {
        key: "china-domestic",
        name: "China y demanda doméstica",
        category: "macro-global",
        status: "watch",
        statusLabel: "En observación",
        whatLooksAt: "Consumo y confianza interna, estímulos dirigidos a demanda, exportaciones, tensiones comerciales, DXY y flujos extranjeros.",
        whyItMatters: "El motor exportador es fuerte, pero el consumidor doméstico todavía no ofrece una confirmación equivalente.",
        currentReading: "Exportaciones de julio en torno a +24 % interanual y superávit cercano a 113.000 millones de dólares, con PIB del segundo trimestre en 4,3 % y ventas minoristas más débiles.",
        whatWouldChange: "Estímulos dirigidos al consumo mejorarían la calidad de una recuperación; un DXY más fuerte o mayores tensiones comerciales la limitarían.",
        asOf: "14 de agosto de 2026",
        source: "Reuters, entre el 30 de julio y el 12 de agosto de 2026.",
      },
      {
        key: "btc-etf-flows",
        name: "Bitcoin: flujos de ETFs spot",
        category: "crypto",
        status: "watch",
        statusLabel: "En observación",
        whatLooksAt: "Flujos de ETFs spot, DXY y rendimientos, además de la confirmación de cualquier ruptura.",
        whyItMatters: "La lectura depende menos de una narrativa direccional y más de liquidez, dólar, tasas y flujos.",
        currentReading: "Al 14 de agosto: -123 M USD en el último día disponible, -229 M USD en cinco sesiones y una racha de dos días de salidas.",
        whatWouldChange: "Una mejora persistente de los flujos con dólar y rendimientos contenidos favorecería un entorno más constructivo; conviene confirmar rupturas, no solo reacciones intradía.",
        asOf: "14 de agosto de 2026",
        source: "Dashboard propio, snapshot del 14 de agosto de 2026.",
        href: "/dashboard",
        linkLabel: "Ver flujos de ETFs en el Dashboard",
      },
      {
        key: "eth-liquidity",
        name: "Ethereum y liquidez cripto",
        category: "crypto",
        status: "tba",
        statusLabel: "Por confirmar",
        whatLooksAt: "Liquidez general del mercado cripto, relación con BTC y apetito por riesgo.",
        whyItMatters: "La información fiable disponible hasta el corte no sostiene una lectura direccional propia separada del régimen general de cripto.",
        currentReading: "No hay una señal institucional específica suficiente para separar con confianza la dirección de ETH del conjunto del mercado cripto.",
        whatWouldChange: "No conviene atribuir catalizadores específicos sin una fuente que los sostenga.",
        asOf: "16 de agosto de 2026",
        source: "Lectura editorial del informe.",
      },
    ],
    sourcesNote:
      "Las lecturas combinan datos de mercado, cálculos propios y material institucional parafraseado: Morgan Stanley, HF Highlights, 12 de agosto de 2026; Charlie McElligott, Cross-Asset Strategy, 12 de agosto de 2026; BTIG, A Divergent Breakout, 11 de agosto de 2026; Goldman Sachs, US TMT, 11 de agosto de 2026; Bank of America, The Flow Show, 10 de agosto de 2026; infografía de cadena óptica global, 11 de agosto de 2026, y tabla de estacionalidad de Carson aportada por el editor. El calendario usa fuentes oficiales: BEA para el PCE del 26 de agosto, OCC para la expiración mensual del 21 de agosto y Federal Reserve Bank of Kansas City para Jackson Hole del 27 al 29 de agosto, cuyo tema de 2026 es “Financial Innovation: Implications for Payments and Policy”. Las fechas corporativas proceden de Futu Investor Relations y NVIDIA Investor Relations; la corrección de la fecha de Celsius Holdings al 6 de agosto procede de su comunicado de resultados. Los movimientos implícitos de la tabla retrospectiva son los congelados en el primer informe de agosto, consultados en Unusual Whales el 1 de agosto de 2026 a las 12:00 UTC; los de FUTU y NVIDIA se consultaron en Unusual Whales el 16 de agosto de 2026 y quedan congelados en esta publicación. Las reacciones realizadas usan históricos por ticker de Stock Analysis con la misma metodología de cierre regular contra cierre regular. El contexto de Japón y China procede de Reuters entre el 30 de julio y el 14 de agosto de 2026, y los flujos de BTC y la presión de flujos en GLD proceden del dashboard propio con corte al 14 de agosto de 2026. La estacionalidad aporta contexto, no una señal: el tramo agosto-septiembre ha sido históricamente menos favorable en series largas, pero durante la última década el S&P 500 terminó agosto en positivo siete veces.",
    disclaimer:
      "Este informe organiza información pública, datos de mercado y análisis de terceros con fines exclusivamente educativos e informativos. No constituye asesoría financiera personalizada, recomendación de inversión ni instrucción para comprar, vender o mantener activos. Las rutas descritas son escenarios condicionales, no predicciones. Posicionamiento, estacionalidad, análisis técnico, flujos y movimientos implícitos de opciones pueden ayudar a interpretar el contexto, pero no garantizan resultados futuros. Las lecturas automáticas de este informe están congeladas al cierre del 14 de agosto de 2026 para preservar la fotografía histórica con la que fue publicado. El Dashboard continúa actualizándose con los datos más recientes disponibles y puede mostrar valores distintos.",
  },
];

export const activeMarketReport = marketReports.find((report) => report.status === "actual") ?? marketReports[0];

export function getReportsByMonth(monthKey: string) {
  return marketReports.filter((report) => report.monthKey === monthKey);
}

export function getMarketReportBySlug(slug: string) {
  return marketReports.find((report) => report.id === slug);
}

export function reportDisplayName(report: MarketReport) {
  return report.label ?? report.title;
}

function normalizedTitlePart(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export function reportMetadataTitle(report: MarketReport) {
  const parts = [reportDisplayName(report), report.title].filter(
    (part, index, values) =>
      values.findIndex((candidate) => normalizedTitlePart(candidate) === normalizedTitlePart(part)) === index,
  );
  return parts.join(" | ");
}

export function reportHref(report: MarketReport) {
  return `/informes/${report.id}`;
}

export function getAdjacentReports(reportId: string) {
  const index = marketReports.findIndex((report) => report.id === reportId);

  return {
    previousReport: index > 0 ? marketReports[index - 1] : null,
    nextReport: index >= 0 && index < marketReports.length - 1 ? marketReports[index + 1] : null,
  };
}
