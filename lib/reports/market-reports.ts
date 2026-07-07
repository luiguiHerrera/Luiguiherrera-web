export type MarketReportSectionBlock = {
  title: string;
  body: string;
};

export type MarketReportAssetReading = {
  asset: string;
  headline: string;
  badge: string;
  story: string;
  changed: string;
  expected: string;
  watch: string;
  reading: string;
  timeline: {
    before: string;
    now: string;
    next: string;
  };
};

export type MarketReportCalendarItem = {
  dateLabel: string;
  dateStart?: string;
  dateEnd?: string;
  event: string;
  whyItMatters: string;
};

export type MarketReportScenario = {
  title: string;
  body: string;
};

export type MarketReportWatchItem = {
  key: string;
  name: string;
  whatLooksAt: string;
  whyItMatters: string;
  reference?: {
    label: string;
    href: string;
  };
};

export type MarketReport = {
  id: string;
  monthKey: string;
  monthLabel: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  calendarHref?: string;
  pdfHref: string;
  status: "actual" | "archivado";
  thesis: string;
  executiveSummary: Array<{ title: string; text: string }>;
  whatHappened: MarketReportSectionBlock[];
  assetReadings: MarketReportAssetReading[];
  calendar: MarketReportCalendarItem[];
  scenarios: MarketReportScenario[];
  watchlist: MarketReportWatchItem[];
  sourcesNote: string;
  disclaimer: string;
};

export const marketReports: MarketReport[] = [
  {
    id: "primer-informe-julio-2026",
    monthKey: "2026-07",
    monthLabel: "Julio 2026",
    title: "Primer informe de julio",
    subtitle: "IA, flujos y concentración: un mercado fuerte, pero más mecánico",
    dateLabel: "Primera lectura de julio de 2026",
    calendarHref: "/reports/primer-informe-julio-2026-calendar.ics",
    pdfHref: "/reports/primer-informe-julio-2026.pdf",
    status: "actual",
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
        body:
          "El mercado mantiene apetito por riesgo, pero de forma desigual. Tecnología, IA, momentum y flujos sostienen el índice, mientras la concentración elevada obliga a mirar debajo de la superficie.",
      },
      {
        title: "Flujos y estructura",
        body:
          "Los flujos hacia tecnología siguen siendo fuertes. La inversión pasiva y los ETF actúan como compradores estructurales, la participación retail continúa activa y las opciones de muy corto plazo aumentan la mecánica del mercado. En ese entorno, el precio puede moverse por flujos antes que por narrativa fundamental.",
      },
      {
        title: "IA e infraestructura",
        body:
          "La inversión en IA pasa de narrativa a infraestructura. Centros de datos, chips, memoria, energía, software, ciberseguridad e industriales forman parte de una misma cadena. No basta con comprar cualquier empresa que mencione IA: importan beneficios, márgenes, valoración y ejecución.",
      },
      {
        title: "Riesgo",
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
        reference: {
          label: "CME FedWatch",
          href: "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html",
        },
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
];

export const activeMarketReport = marketReports.find((report) => report.status === "actual") ?? marketReports[0];

export function getReportsByMonth(monthKey: string) {
  return marketReports.filter((report) => report.monthKey === monthKey);
}
