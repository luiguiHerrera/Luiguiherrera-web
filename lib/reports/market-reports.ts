export type MarketReportSectionBlock = {
  title: string;
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
  watch: string;
  reading: string;
  timeline: {
    before: string;
    now: string;
    next: string;
  };
  figures?: MarketReportFigure[];
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
  summary: string;
  calendarHref?: string;
  htmlHref?: string;
  markdownHref?: string;
  pdfHref?: string;
  status: "actual" | "archivado";
  thesis: string;
  executiveSummary: Array<{ title: string; text: string }>;
  transversalFactor?: {
    label?: string;
    title: string;
    text: string;
  };
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
    publishedLabel: "Julio de 2026",
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
  {
    id: "segundo-informe-julio-2026",
    monthKey: "2026-07",
    monthLabel: "Julio 2026",
    label: "Segundo informe de julio",
    title: "El índice aguanta, pero por dentro el mercado ya cambió",
    subtitle: "Resultados, rotación, dólar y la prueba real de la inteligencia artificial.",
    dateLabel: "Corte: 17 de julio de 2026 · Publicado: 20 de julio de 2026",
    publishedLabel: "20 de julio de 2026",
    summary: "Momentum, resultados, dólar y dispersión interna en una cartera multi-activo.",
    htmlHref: "/reports/segundo-informe-julio-2026.html",
    markdownHref: "/reports/segundo-informe-julio-2026.md",
    pdfHref: "/reports/segundo-informe-julio-2026.pdf",
    status: "actual",
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
        body:
          "El índice resistió mejor que sus antiguos líderes. La corrección se concentró en momentum, acciones que venían subiendo por inercia y liderazgo reciente, semiconductores e infraestructura de IA, sin una venta indiscriminada. Cerca del 68 % de los componentes sigue sobre su media de 200 días, una señal de amplitud estructural todavía razonable, aunque la amplitud de corto plazo se deterioró especialmente en tecnología. La volatilidad de acciones individuales está cerca de niveles extremos y la correlación del índice se acerca a mínimos históricos: unas acciones suben mientras otras caen. La temporada de resultados será el siguiente catalizador.",
      },
      {
        title: "GLD",
        body:
          "El oro acumula más de 30 sesiones por debajo de su media de 200 días, la racha más prolongada desde 2022. No funcionó como refugio durante la corrección del momentum porque dólar firme, rendimientos elevados y posicionamiento sistemático débil presionaron el precio. La debilidad es técnica y real, no una fluctuación aislada. Aun así, su función estructural de diversificación no depende de liderar cada semana. SLV sirve solo como comparación: la plata mezcla sensibilidad monetaria con ciclo industrial. JNUG debe leerse aparte: es un instrumento táctico y apalancado, no una posición estructural en oro.",
      },
      {
        title: "EWJ",
        body:
          "Japón mantiene fortaleza relativa entre mercados desarrollados, con liderazgo más concentrado en tecnología, inversión y activos ligados a IA. SoftBank superó a Toyota por capitalización por segunda vez en la serie mostrada; la primera coincidió con la burbuja tecnológica de 2000. La comparación sirve como advertencia de concentración narrativa, no como predicción automática de colapso. A la vez, los rendimientos japoneses se acercan a los de Alemania y Estados Unidos, por lo que normalización monetaria y yen vuelven a importar. EWJ mantiene exposición al yen; HEWJ sirve como referencia para entender cuánto puede cambiar la lectura al cubrir ese riesgo cambiario.",
      },
      {
        title: "FXI",
        body:
          "Los gestores institucionales redujeron exposición a mercados emergentes y China todavía no recupera liderazgo sostenido. Las valoraciones bajas no han sido suficientes para atraer un flujo consistente. FXI conserva carácter táctico y contrarian: puede diversificar la concentración estadounidense, pero necesita catalizadores propios para dejar de ser solo una historia barata.",
      },
      {
        title: "BTC / ETH",
        body:
          "BTC y ETH se comportaron como activos de beta alta: activos que suelen amplificar el apetito por riesgo, tanto al alza como a la baja. No funcionaron como liquidez ni como cobertura defensiva durante la corrección de tecnología y momentum. La fortaleza del dólar redujo apetito por riesgo y recordó que cripto sigue dependiendo de liquidez, flujos, tasas y DXY. BTC suele conservar mayor fortaleza relativa; ETH puede mostrar más sensibilidad a desapalancamiento y cambios de narrativa.",
      },
      {
        title: "Stockpicking",
        body:
          "La dispersión elevada, diferencias grandes entre ganadores y perdedores, favorece selección activa, pero también aumenta la posibilidad de pérdidas grandes por acción. La baja correlación permite que compañías distintas tengan resultados muy diferentes. La corrección del momentum mostró que varias posiciones aparentemente distintas podían depender del mismo factor: semiconductores estadounidenses, Taiwán, Corea, IA y high beta pueden ser una sola apuesta disfrazada de diversificación. La temporada de resultados mueve el foco desde expectativas hacia ventas, márgenes, guidance, la guía que entrega la empresa, retorno del CapEx, inversión de capital, financiación y capacidad de convertir IA en beneficios.",
      },
      {
        title: "DXY y USD/COP",
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
