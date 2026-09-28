import type { MarketReport, MarketReportCalendarItem, MarketReportWatchItem } from './market-reports';
import type { HistoricalAutomaticReadingsSnapshot } from './historical-automatic-readings';
import { secondSeptemberSourceLinks, boundedRegime } from './second-september-source-policy.ts';
import statistics from './snapshots/segundo-informe-septiembre-2026/statistical.json' with { type: 'json' };
import automatic from './snapshots/segundo-informe-septiembre-2026/automatic.json' with { type: 'json' };
import { statisticalPanels, SEASONALITY_DISCLAIMER } from './report-statistical-panels.ts';

// Founder-approved edition; source and quantitative evidence remain frozen.
const reportId = 'segundo-informe-septiembre-2026';
const quant = (ticker: keyof typeof statistics.assets) => statisticalPanels(statistics.assets[ticker]);
const number = (value: number, digits = 2) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const pct = (value: number) => `${value > 0 ? '+' : ''}${number(value * 100)} %`;
function freeze<T extends object>(value: T): T {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}
export const secondSeptember2026AutomaticReadings: HistoricalAutomaticReadingsSnapshot = freeze({ ...automatic, sourceNote: automatic.sourceNote.replace('No se publica régimen, score ni confianza V1 del 18/09: no existe evidencia suficiente del estado histórico del adaptador.', 'La clasificación V1 se presenta como replay acotado condicionado a sectores y VIX reconciliados; no como captura exacta del motor. No se publica score ni confianza puntuales.'), regime: { ...automatic.regime, ...boundedRegime }, dispersionUnit: automatic.dispersionUnit === 'pp' ? 'pp' : undefined });
const fed = 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm';
const h15 = 'https://www.federalreserve.gov/releases/h15/';
const bea = 'https://www.bea.gov/news/schedule/full';
const event = (date: string, title: string, why: string): MarketReportCalendarItem => ({
  id: `${date}-${title}`, dateLabel: `${Number(date.slice(-2))} de septiembre`, dateStart: date,
  event: title, whyItMatters: why, category: 'macro', originalTime: '08:30', originalTimeZone: 'ET',
  displayTimeCest: '14:30 CEST', startDateTimeUtc: `${date}T12:30:00Z`, timeStatus: 'confirmed',
  dateConfirmationStatus: 'confirmed', sourceLabel: 'Bureau of Economic Analysis · calendario consultado el 21/09/2026',
  sourceHref: bea, trackingHref: bea, trackingLabel: 'Consultar fuente oficial', affectedAssets: ['S&P 500', 'Oro', 'BTC / ETH', 'Dólar'],
});
const watch: Array<[string, string, string, string, MarketReportWatchItem['category'], string, string]> = [
  [
    "breadth",
    "Amplitud del S&P",
    "Sectores positivos y sectores sobre su media de 200 sesiones.",
    "Una recuperación sostenida desde 2/11 y 4/11 reforzaría el respaldo interno.",
    "market-structure",
    "/dashboard",
    "Ver Dashboard"
  ],
  [
    "rsp",
    "RSP / SPY",
    "Participación del S&P equiponderado frente al ponderado por capitalización.",
    "Que RSP deje de rezagarse reduciría la dependencia de las mayores compañías.",
    "market-structure",
    "/dashboard",
    "Ver Dashboard"
  ],
  [
    "iwm",
    "IWM / SPY",
    "Pequeñas compañías frente a las grandes.",
    "Una mejora relativa persistente confirmaría que la recuperación alcanza empresas más sensibles a financiación.",
    "market-structure",
    "/dashboard",
    "Ver Dashboard"
  ],
  [
    "ust10",
    "Treasury 10Y",
    "Nivel y velocidad de cambio del rendimiento a diez años.",
    "Estabilidad aliviaría valoración; un salto rápido exigiría más beneficios para sostener precios.",
    "rates-credit",
    "https://www.federalreserve.gov/releases/h15/",
    "Ver Fed H.15"
  ],
  [
    "ust30",
    "Treasury 30Y",
    "Demanda por duración y rendimiento a treinta años.",
    "Un aumento desacoplado del tramo corto apuntaría a más presión sobre financiación de largo plazo.",
    "rates-credit",
    "https://www.federalreserve.gov/releases/h15/",
    "Ver Fed H.15"
  ],
  [
    "move",
    "MOVE",
    "Volatilidad implícita de los bonos del Tesoro.",
    "Un salto junto con yields y pérdidas de amplitud convertiría el coste del dinero en una tensión más inmediata.",
    "rates-credit",
    "#fuentes-y-aviso",
    "Ver fuente y metodología"
  ],
  [
    "credit",
    "Crédito corporativo",
    "Diferencial exigido a empresas frente al Treasury comparable.",
    "Una ampliación persistente indicaría que la presión ya afecta al riesgo de financiación empresarial.",
    "rates-credit",
    "https://fred.stlouisfed.org/series/BAMLH0A0HYM2",
    "Ver spread High Yield en FRED"
  ],
  [
    "energy",
    "Petróleo y transporte",
    "Brent, WTI, rutas disponibles y fletes de petroleros.",
    "Menores costes de entrega aliviarían inflación; barril y transporte al alza prolongarían la presión.",
    "fx-commodities",
    "https://www.eia.gov/outlooks/steo/",
    "Ver perspectivas de energía EIA"
  ],
  [
    "dxy",
    "DXY",
    "Fortaleza del dólar frente a su cesta de divisas.",
    "Una aceleración simultánea con yields endurecería el entorno de oro, Asia y cripto.",
    "fx-commodities",
    "#usd-cop",
    "Ver contexto del dólar"
  ],
  [
    "gold",
    "GLD y demanda de oro",
    "Participaciones de GLD y toneladas de ETF globales, con sus fechas distintas.",
    "Demanda persistente durante caídas apoyaría la lectura; salidas sostenidas la debilitarían.",
    "fx-commodities",
    "https://www.gold.org/goldhub/research/gold-etfs-holdings-and-flows/2026/09",
    "Ver World Gold Council"
  ],
  [
    "china",
    "China: consumidor e inmobiliario",
    "Precios reales residenciales y transmisión al gasto doméstico.",
    "Estabilización inmobiliaria acompañada de consumo más firme daría contenido a la tesis de valoración.",
    "macro-global",
    "https://fred.stlouisfed.org/series/QCNR628BIS",
    "Ver datos FRED/BIS"
  ],
  [
    "japan",
    "BOJ, yen y JGB",
    "Aplicación de la decisión del BOJ, divisa y bonos japoneses.",
    "Un ajuste brusco de yen o JGB elevaría el riesgo de transmisión a exportadores y financiación global.",
    "macro-global",
    "https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf",
    "Ver BOJ"
  ],
  [
    "btcflows",
    "Flujos ETF de Bitcoin",
    "Saldo de cinco sesiones completas y continuidad de entradas.",
    "Entradas repartidas en más sesiones darían más respaldo que un cierre semanal apenas positivo.",
    "crypto",
    "https://farside.co.uk/bitcoin-etf-flow-all-data/",
    "Ver Farside"
  ],
  [
    "ethbtc",
    "ETH / BTC",
    "Cociente de cierres diarios UTC en la misma fuente.",
    "Fortaleza relativa sostenida, junto con liquidez, apoyaría una ampliación del rally cripto.",
    "crypto",
    "#ethereum",
    "Ver bloque de Ethereum"
  ],
  [
    "semis",
    "Semiconductores y concentración de posiciones",
    "Liderazgo relativo y exposición muy concurrida según BofA.",
    "Resultados fuertes con participación más amplia reducirían vulnerabilidad; pérdida de líderes la aumentaría.",
    "technology-ai",
    "#fuentes-y-aviso",
    "Ver fuente y metodología"
  ],
  [
    "capex",
    "CAPEX de IA frente a FCF",
    "Inversión de capital frente al flujo de caja libre y necesidad de deuda.",
    "Más inversión financiada con caja y retornos observables reforzaría la sostenibilidad del ciclo.",
    "technology-ai",
    "#ia-tecnologia",
    "Ver bloque de IA"
  ],
  [
    "software",
    "Monetización del software",
    "Uso convertido en ingresos, FCF por acción e ingresos por empleado.",
    "Mejor caja por acción sin depender de dilución distinguiría adopción tecnológica de creación de valor.",
    "technology-ai",
    "#ia-tecnologia",
    "Ver bloque de IA"
  ],
  [
    "cop",
    "USD / COP: factores regionales",
    "Prima fiscal, instituciones, petróleo, tasas de BanRep y apetito por LatAm.",
    "Mejoras locales con entorno externo favorable reducirían presión; deterioro simultáneo la elevaría.",
    "macro-global",
    "https://www.alianza.com.co/",
    "Ver Alianza"
  ]
];

export const secondSeptember2026Report: MarketReport = freeze({
  id: reportId, monthKey: '2026-09', monthLabel: 'Septiembre 2026', label: 'Segundo informe de septiembre',
  title: 'El índice resiste, pero el mercado se estrecha',
  subtitle: 'La Fed volvió a subir tasas y el Treasury a 10 años superó el 5 %. El S&P 500 resistió, pero debajo del índice la participación se deterioró: menos sectores avanzan, menos permanecen sobre sus medias de largo plazo y el liderazgo vuelve a concentrarse en tecnología.',
  publishedAt: '2026-09-21', modifiedAt: '2026-09-21', editorialCutoffAt: '2026-09-21', automaticDataCutoffAt: '2026-09-18',
  dateLabel: 'Corte editorial: 21 de septiembre de 2026 · Datos automáticos: 18 de septiembre de 2026',
  publishedLabel: '21 de septiembre de 2026', status: 'actual',
  summary: 'El índice cambió poco; la calidad interna del mercado se deterioró. Beneficios y tecnología sostienen el equilibrio frente a yields elevados, energía más cara y menor amplitud.',
  calendarHref: `/reports/${reportId}-calendar.ics`,
  htmlHref: `/reports/${reportId}.html`,
  markdownHref: `/reports/${reportId}.md`,
  pdfHref: `/reports/${reportId}.pdf`,
  presentation: {
    assetReadingsStartNewPage: true,
    marketReadingsLayout: "vix-flows",
    linksOpenNewTab: true,
    sourceLinks: secondSeptemberSourceLinks,
    calendarView: "remaining", calendarStartDate: "2026-09-21",
    contextTitle: 'Contexto general', contextStyle: 'prose', openingLine: 'El índice cambió poco; la calidad interna del mercado se deterioró.',
    prospectivePeriod: 'Desde el 21 de septiembre de 2026 hasta la siguiente publicación del informe.', calendarStyle: 'monthly',
    sectionTitles: { assetReadings: 'Lectura por activo', calendar: 'Calendario de eventos', watchlist: 'Lista de control', sources: 'Fuentes y metodología' },
    year: 2026, month: 9, localizedTitle: 'Septiembre de 2026', locale: 'es-ES', primaryTimeZone: 'America/New_York', displayTimeZones: ['America/New_York', 'Europe/Madrid'],
  },
  whatHappened: [
  {
    "title": "Del riesgo al hecho",
    "summary": "",
    "body": "En el Primer Informe, unos rendimientos largos elevados eran el riesgo que las acciones debían absorber. Ahora hay hechos: la Fed subió 25 puntos básicos el 16/09, hasta 3,75–4,00 %, y el Treasury a diez años superó el 5 %. Los rendimientos —yields— aumentaron el coste de financiación; el ajuste bursátil apareció sobre todo debajo del índice. [B1–B2]"
  },
  {
    "title": "Qué cambió desde el Primer Informe",
    "summary": "",
    "body": "Los sectores positivos pasaron de 4/11 a 2/11 y los situados sobre su media de 200 sesiones (MA200), de 8/11 a 4/11. La amplitud —cuántas partes del mercado participan— perdió respaldo. Los fondos cotizados (ETF) permiten contrastar grandes compañías, pequeñas y tecnología. La tabla compara ventanas homogéneas de cinco sesiones y seis cierres; no mide la rentabilidad acumulada entre cortes. [C1]"
  },
  {
    "title": "El cambio en las preocupaciones",
    "summary": "",
    "body": "El BofA FMS de septiembre, encuestado del 4 al 10/09, sitúa una subida desordenada de rendimientos como principal riesgo extremo, por delante de IA. Frente al marco de agosto, se modera la exposición a acciones y aumenta ligeramente el efectivo. Es la percepción de los gestores, no una predicción del próximo movimiento. [A1]"
  },
  {
    "title": "Claves para leer las tablas",
    "summary": "",
    "body": "Dos términos de las tablas: contango indica que los futuros más lejanos cotizan por encima de los cercanos; Midterm identifica los años de elecciones legislativas de mitad de mandato en EE. UU. Ninguno determina la dirección del mercado."
  }
],
  assetReadings: [
    { id: 'sp500', asset: 'S&P 500', headline: "El índice aguanta con menos mercado detrás", badge: "bonos, beneficios y amplitud",
      story: "SPY cerró en 761,69 USD. Entre las dos ventanas, la desventaja de RSP frente a SPY pasa de −0,88 a −1,11 puntos porcentuales; la de IWM, de −0,02 a −1,31. QQQ amplía su ventaja de +0,24 a +1,01. RSP da igual peso a las compañías; IWM sigue pequeñas empresas. El contraste muestra dónde falta participación. Los recuentos sobre MA200 son sectoriales: no describen el porcentaje de las 500 compañías. [C1]",
      changed: "AAII ofrece otro contraste: en la semana terminada el 16/09, el 53,3 % de los encuestados era bajista, el 28,8 % alcista y el 17,9 % neutral. El pesimismo del inversor individual es mayor de lo que sugiere el índice; no basta para inferir una señal de compra. [B3]",
      expected: "Detrick mantuvo una lectura constructiva tras la subida de la Fed del 16/09. Es una opinión externa; aquí la confirmación exige que RSP e IWM dejen de rezagarse y que MOVE, la volatilidad implícita de los bonos del Tesoro, no señale un ajuste desordenado. [B20]",
      quantitativePanels: [{
        title: 'Goldman: beneficios antes que múltiplos',
        intro: 'Dos referencias primarias de Goldman Sachs Research, con fechas distintas. Las previsiones de mayo no se presentan como una revisión de septiembre. [B13, B18]',
        headers: ['Referencia del 28/05/2026', 'Previsión de Goldman'],
        rows: [['S&P 500 · cierre de 2026', '8.000 puntos'], ['Beneficio por acción (EPS) · 2026', '340 USD'], ['Beneficio por acción (EPS) · 2027', '385 USD']],
        notes: ['En mayo, Goldman atribuía el rally a beneficios, no a una valoración creciente, y vinculaba aproximadamente la mitad del crecimiento de beneficios de 2026 a proveedores y beneficiarios de infraestructura de IA. Son previsiones externas, no objetivos del informe. [B13]', 'El 15/09, Goldman documenta que el forward P/E —precio respecto al beneficio esperado a doce meses— había bajado de unas 22 a 19 veces en 2026. La valoración relativa frente a bonos seguía aproximadamente estable. Deuda fija y vencimientos largos amortiguan el impacto inmediato de tasas en grandes compañías; mayor crecimiento puede compensar parte de la presión sobre su valoración. [B18]', 'La lectura exige beneficios que se materialicen: la protección del balance da tiempo, no elimina el riesgo. Además, el S&P pondera por capitalización; no replica al hogar ni a la empresa promedio. El consumo sigue importando aunque su peso económico difiera del bursátil. [B14]'],
      }, ...quant('SPY'), {
        title: 'Contraste propio: septiembre, octubre y noviembre Midterm',
        intro: 'SPY · All · ocho ciclos Midterm completos anteriores a 2026. Cálculos propios; win rate significa proporción de meses positivos.',
        headers: ['Mes', 'Retorno promedio', 'Win rate', 'N real'],
        rows: statistics.spyMidtermAutumn.map(row => [[9, 10, 11].includes(row.month) ? ({9:'Septiembre',10:'Octubre',11:'Noviembre'} as Record<number,string>)[row.month] : String(row.month), pct(row.averageReturn), `${number(row.winRate * 100, 1)} %`, String(row.sampleSize)]),
        notes: ['Detrick señaló el 31/08 la debilidad histórica de septiembre, pero consideró que 2026 podía apartarse de ella. Esa opinión no sustituye nuestras muestras: octubre y noviembre son cálculos propios de Statistical Levels, no cifras de Carson. [B19]', SEASONALITY_DISCLAIMER],
      }],
    },
    { id: 'oro', asset: 'Oro', headline: "Demanda persistente, precio en extensión alta", badge: "ETF, dólar y yields reales",
      story: "GLD cerró en 401,17 USD, por encima de WAHE (398,23) y cerca de WSHE (404,19): una extensión estadística alta desde la apertura semanal. Sus participaciones aumentaron aproximadamente un 0,93 % en cinco sesiones. Ese indicador indirecto de demanda no equivale a entradas monetarias oficiales. [C1–C2]",
      changed: "El World Gold Council aporta una escala distinta: agosto sumó 18.000 millones de dólares y 121 toneladas en ETF globales de oro, hasta un récord de 4.189 toneladas. La demanda persistió durante las correcciones. Son datos mensuales hasta el 31/08; no se suman al cambio semanal de GLD. [B4]",
      expected: "La siguiente prueba es si las tenencias resisten una corrección con dólar firme y rendimientos reales —descontada la inflación— elevados. Ventas persistentes de los fondos debilitarían la lectura de demanda; estabilidad de sus posiciones la sostendría.", quantitativePanels: quant('GLD'),
    },
    { id: 'china', asset: 'China', headline: "Lo barato sigue necesitando confirmación", badge: "riqueza doméstica y consumo",
      story: "FXI cerró en 34,32 USD. La tesis del Primer Informe sigue abierta: el descuento de valoración necesita traducirse en demanda interna. La serie BIS publicada por FRED sitúa los precios residenciales reales en 85,13 en el primer trimestre de 2026, frente a 91,61 un año antes (2010=100). Es una referencia trimestral de debilidad inmobiliaria, no un dato de septiembre. [B5]",
      changed: "La vivienda añade una restricción concreta a la tesis de valoración: su caída puede debilitar la riqueza percibida y llevar a los hogares a aplazar gasto. Esa transmisión doméstica merece más atención que una posible rotación global hacia Asia.",
      expected: "La señal útil sería una estabilización inmobiliaria acompañada de mayor gasto de los hogares. Un repunte aislado de FXI no resolvería esa prueba.", quantitativePanels: quant('FXI'),
    },
    { id: 'japon', asset: 'Japón', headline: "El BOJ confirma otro paso de normalización", badge: "decisión, yen y JGB",
      story: "El 18/09 el Banco de Japón decidió elevar el tipo del mercado monetario a alrededor del 1,25 %, desde el 1,00 %, con efecto el 24/09. El aumento de 25 puntos básicos fue aprobado por siete votos contra dos. EWJ cerró el 18/09 en 97,00 USD. La reunión ya es un hecho; la aplicación del nuevo tipo es posterior al corte de mercado. [B6]",
      changed: "La pregunta ya no es qué decidirá el BOJ, sino cómo absorberán su aplicación los JGB —bonos del Gobierno japonés— y el yen. La deuda que se refinancie y la conversión de beneficios al exterior son dos canales a vigilar; no se atribuye aquí una reacción de mercado no verificada.",
      expected: "Tras el 24/09, conviene separar la respuesta de la bolsa local de su conversión a dólares en EWJ. Una dislocación simultánea de bonos y divisa exigiría revisar la lectura, aunque el ETF por sí solo pareciera estable.", quantitativePanels: quant('EWJ'),
    },
    { id: 'bitcoin', asset: 'Bitcoin', headline: "Precio, flujos y calendario cuentan historias distintas", badge: "tres lentes de corto plazo",
      story: "Precio: Bitcoin cerró el día UTC del 18/09 en 80.901,46 USD, cerca de WAHE (82.260,60). El cierre se sitúa en la parte alta del recorrido semanal medio; esa proximidad no convierte la extensión en resistencia ni asegura continuidad. [C2]",
      changed: "Flujos: Farside registra +6,1 millones de dólares del 14 al 18/09, frente a +986,7 millones en las cinco sesiones del Primer Informe. Jueves y viernes devolvieron el saldo a terreno apenas positivo. La mejora final no reproduce la acumulación de comienzos de mes. [B7]",
      expected: "Estacionalidad: las tablas Midterm y 2020–2025 responden a muestras distintas. Octubre ofrece un antecedente favorable, pero seis observaciones no prueban un patrón robusto. La referencia River usa años, no semanas, y no justifica una lectura táctica del precio.",
      quantitativePanels: [...quant('BTCUSD'), {
        title: 'Bitcoin: segunda lente 2020–2025', intro: 'Observación separada de Midterm · seis años completos, sin incluir 2026.',
        headers: ['Mes', 'Retorno promedio', 'Meses positivos', 'N real'],
        rows: statistics.btc2020.months.map(row => [row.month === 9 ? 'Septiembre' : 'Octubre', pct(row.averageReturn), `${statistics.btc2020.observations.filter(o => o.month === row.month && o.returnValue > 0).length} / ${row.sampleSize}`, String(row.sampleSize)]),
        notes: ['Desde 2020, octubre ha sido especialmente fuerte en esta muestra. Septiembre, en cambio, ha sido prácticamente neutral en promedio. Lo llamativo es más reciente: septiembre fue positivo en 2023, 2024 y 2025, y 2026 volvía a estar positivo al corte.', statistics.btc2020.methodology, `Septiembre de 2026 al 18/09: ${number(statistics.btc2020.currentSeptemberReturn)} %, mes incompleto, excluido de los promedios.`, SEASONALITY_DISCLAIMER],
      }, {
        title: 'Bitcoin · referencia estructural de largo plazo',
        intro: 'River · Sam Baker · 02/09/2026. Horizonte de años; no valida entradas tácticas ni flujos semanales. [B15]',
        headers: ['Horizonte de River', 'Rango de escenario'],
        rows: [['Próximos 3–5 años (2029–2031)', '250.000–840.000 USD por BTC']],
        notes: ['River parte de entradas acumuladas de 1,3–5,3 billones de dólares y supone que cada dólar de entrada añade tres dólares a la capitalización. El rango depende de esos supuestos y de la continuidad de relaciones históricas; no es un intervalo de confianza, una predicción propia ni una fecha objetivo única en 2031.'],
      }],
    },
    { id: 'ethereum', asset: 'Ethereum', headline: "¿Se amplía el rally más allá de Bitcoin?", badge: "recuperación sin confirmación sostenida",
      story: "Ethereum cerró en 2.611,35 USD, cerca de WAHE (2.691,48). El rebote en dólares necesita contrastarse con BTC para saber si cripto está ganando participación más allá de su principal activo. [C2]",
      changed: "ETH/BTC gana un 4,71 % entre el 04 y el 18/09, pero cede un 0,94 % en la última semana. Los cierres UTC homogéneos de la tabla muestran una recuperación entre cortes que todavía no es sostenida. [C4]",
      expected: "La prueba será encadenar fortaleza relativa en ETH/BTC, con liquidez suficiente. Si el cociente vuelve a caer mientras ETH sube en dólares, el rebote no confirmará una ampliación del rally.", quantitativePanels: [...quant('ETHUSD'), {
        title: 'ETH/BTC: confirmación relativa', intro: 'Cociente ETHUSD / BTCUSD, cierres diarios UTC de la misma autoridad. [C4]',
        headers: ['Fecha', 'BTC por ETH'], rows: [['04/09/2026', '0,03083'], ['11/09/2026', '0,03259'], ['18/09/2026', '0,03228']],
        notes: ['Variaciones calculadas antes del redondeo: +4,71 % entre el 04 y el 18/09; −0,94 % entre el 11 y el 18/09. No equivale a flujos ni a actividad de red.'],
      }],
    },
    { id: 'ia-tecnologia', asset: 'IA / Tecnología', headline: "Liderazgo fuerte, una exigencia mayor de caja", badge: "bloque especial",
      story: "BofA septiembre sigue señalando las posiciones compradoras en semiconductores globales como una operación muy concurrida. Ese crowding —muchos inversores en la misma posición— hace que buenos resultados y vulnerabilidad a ventas simultáneas puedan coexistir. La ventaja relativa de QQQ no elimina ese riesgo. [A1, C1]",
      changed: "La hipótesis de software de J.P. Morgan del 19/08 sigue abierta. Esta edición concreta cómo contrastarla: CAPEX —inversión en equipos e infraestructura— financiable y más uso convertido en flujo de caja libre (FCF) por acción. La tabla distingue adopción de creación de valor. [A2]",
      expected: "Indeed Hiring Lab encuentra mayor crecimiento del salario anunciado en ocupaciones expuestas a IA, en parte por vacantes de mayor nivel. La asociación es compatible con una prima para trabajos complementarios a la tecnología; no prueba causalidad ni salarios efectivamente pagados. Monetizar IA también puede exigir más gasto laboral. [B8]",
      quantitativePanels: [{
        title: 'Software: del uso a la caja por acción', intro: 'Preguntas para contrastar la hipótesis de agosto; no clasificación ni recomendación de compañías.',
        headers: ['Qué contrastar', 'Qué aportaría evidencia'],
        rows: [
          ['Crecimiento y monetización', 'Uso o consumo de IA que se convierta en ingresos y retención, no solo pruebas gratuitas.'],
          ['FCF y FCF por acción', 'Caja tras inversión y su evolución por acción, considerando dilución.'],
          ['Rule of 40 / Rule of X', 'Crecimiento de ingresos más margen de FCF; Rule of X pondera de forma distinta el crecimiento. Exigir fórmula y periodos comparables antes de puntuar.'],
          ['Ingresos por empleado', 'Productividad acompañada de márgenes y servicio sostenibles; no inferirla solo de recortes de plantilla.'],
        ], notes: ['Rule of 40 usa 40 puntos como referencia de suma, no como garantía de valor. No se asigna un peso universal a Rule of X ni se calcula un ranking sin metodología homogénea.'],
      }],
    },
    { id: 'energia-petroleo', asset: 'Energía / petróleo', headline: "El shock no termina en el precio del barril", badge: "oferta física, fletes e inflación",
      story: "La EIA incorpora las interrupciones de Oriente Medio y las restricciones de Hormuz a su escenario de septiembre. En sus series spot, la última observación disponible es el 15/09: Brent 130,80 USD/barril y WTI 107,02. Son precios físicos, no futuros ni cierres del 18/09. [B9–B11]",
      changed: "Baltic Exchange documenta el 18/09 nuevos aumentos de fletes de grandes petroleros hacia China. El shock encarece tanto el crudo como su entrega. Mirar solo el barril deja fuera una parte del coste que llega a empresas y consumidores. [B12]",
      expected: "El canal para este informe es guerra e interrupciones → barril y transporte → inflación → Fed y yields → valoración bursátil. Si persiste, presiona márgenes y dificulta el alivio monetario. Normalizar rutas y fletes reduciría esa presión, sin garantizar un giro de la Fed.",
    },
    { id: 'usd-cop', asset: 'USD/COP', headline: "La prima local también necesita confirmación", badge: "recuadro regional",
      story: "Alianza Research / Alianza Valores y Felipe Campos quedan como referencias de seguimiento. El marco separa tres etapas del ciclo político: expectativas preelectorales, reacción al resultado y evaluación del gobierno. Son etapas analíticas, no tres eventos pendientes ni una predicción electoral. [A3]",
      changed: "El petróleo puede aumentar el ingreso exportador mientras un shock global fortalece el dólar y reduce el apetito por LatAm. La prima fiscal e institucional y las tasas del Banco de la República condicionan cuál de esas fuerzas pesa más sobre USD/COP.",
      expected: "Menor incertidumbre fiscal e institucional, con condiciones externas favorables, podría reducir la prima exigida al peso. Tensiones locales y dólar fuerte podrían elevarla. El marco no asigna rangos, preferencias políticas ni un resultado electoral.",
    },
  ],
  calendar: [
    event('2026-09-24', 'Posición de inversión y transacciones internacionales de EE. UU. · segundo trimestre', 'Permite contextualizar financiación y flujos internacionales.'),
    event('2026-09-30', 'PIB · tercera estimación del segundo trimestre y beneficios corporativos', 'Contrasta crecimiento y beneficios con el aumento del coste del capital.'),
    event('2026-09-30', 'PCE, ingresos y gasto personal de agosto', 'Referencia de inflación y consumo para evaluar la persistencia de la presión de tipos.'),
  ],
  probableRoutes: { title: 'Rutas probables', note: 'Condiciones hasta la siguiente publicación, sin probabilidades asignadas. El peligro no es únicamente que el mercado pierda amplitud: es que pierda amplitud y líderes al mismo tiempo.', scenarios: [
    { title: 'Ruta base · Equilibrio con participación estrecha', body: 'Beneficios firmes y rendimientos altos pero ordenados permiten sostener el equilibrio. La participación sigue estrecha, aunque deja de empeorar con rapidez. La principal prueba será que los líderes mantengan resultados y caja.' },
    { title: 'Ruta favorable · Vuelve la participación', body: 'RSP e IWM recuperan participación, los flujos se reparten y petróleo y transporte dejan de añadir inflación. Con rendimientos estables o descendentes, el avance necesitaría menos compensación de unas pocas compañías.' },
    { title: 'Ruta adversa · Fallan amplitud y líderes', body: 'Un salto de yields y MOVE coincide con crédito más caro y otra aceleración energética. Los rezagados siguen cayendo y también fallan los líderes tecnológicos. El deterioro interno pasa a afectar al índice agregado.' },
  ] },
  watchlist: watch.map(([key, name, whatLooksAt, whatWouldChange, category, href, linkLabel]) => ({ key, href, linkLabel, name, whatLooksAt, whatWouldChange, category, status: 'watch', statusLabel: 'Seguimiento condicional', whyItMatters: whatWouldChange, currentReading: whatLooksAt, asOf: '2026-09-21', source: 'Lectura editorial; datos automáticos congelados al 18/09 con las salvedades documentadas.' })),
  sourceGroups: [
    { title: 'A. Investigación institucional', entries: [
      { label: '[A1] BofA · Global Fund Manager Survey · septiembre de 2026', note: 'Encuesta 4–10/09. Riesgos, semiconductores, exposición a acciones y efectivo: material aportado por el editor, sin URL pública y sin extrapolar agosto.' },
      { label: '[A2] J.P. Morgan · Software — Industry Thoughts and Rank Order / AI Disruption · 19/08/2026', note: 'Marco histórico del Primer Informe, utilizado como hipótesis de seguimiento. Material institucional aportado por el editor, sin URL pública.' },
      { label: '[A3] Alianza Research / Alianza Valores · Felipe Campos', note: 'Material institucional identificado por el editor, sin documento público fechado. Los escenarios numéricos no se incorporan: falta el documento fechado. El recuadro desarrolla factores y etapas de seguimiento, no atribuye un pronóstico cuantitativo.' },
    ] },
    { title: 'B. Fuentes oficiales y públicas', entries: [
      { label: '[B1] Federal Reserve · FOMC · 16/09/2026', href: fed },
      { label: '[B2] Federal Reserve / Treasury · H.15 · publicado el 18/09', href: h15, note: 'Diez años: 5,01 % el 16/09; no se presenta como cierre del 18/09.' },
      { label: '[B3] AAII · semana terminada el 16/09/2026', href: 'https://www.aaii.com/sentimentsurvey' },
      { label: '[B4] World Gold Council · Global demand drives record holdings · agosto de 2026', href: 'https://www.gold.org/goldhub/research/gold-etfs-holdings-and-flows/2026/09', note: 'Datos hasta el 31/08: +121 t, entradas de 18.000 M USD y tenencias de 4.189 t.' },
      { label: '[B5] FRED / BIS · precios residenciales reales de China · QCNR628BIS', href: 'https://fred.stlouisfed.org/series/QCNR628BIS', note: 'Fuentes nacionales / BIS Residential Property Price database. Trimestral, 2010=100, sin ajuste estacional; último dato: primer trimestre de 2026.' },
      { label: '[B6] Bank of Japan · Statement on Monetary Policy · 18/09/2026', href: 'https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf', note: 'Tipo alrededor de 1,25 %, con efecto el 24/09.' },
      { label: 'BOJ · referencia oficial: aumento desde 1,00 %', href: 'https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918b.pdf' },
      { label: '[B7] Farside · Bitcoin ETF flows · 14–18/09', href: 'https://farside.co.uk/bitcoin-etf-flow-all-data/', note: 'Cinco sesiones completas; se excluye la fila incompleta del 21/09.' },
      { label: '[B8] Indeed Hiring Lab · AI Exposure Isn’t Squeezing Advertised Pay in the US — It’s Boosting It · 17/09/2026', href: 'https://hiringlab.indeed.com/2026/09/17/ai-exposure-isnt-squeezing-advertised-pay-in-the-us-its-boosting-it/' },
      { label: '[B9] EIA · Short-Term Energy Outlook · 09/09/2026', href: 'https://www.eia.gov/outlooks/steo/', note: 'Información hasta el 03/09.' },
      { label: '[B10] EIA · Europe Brent Spot Price FOB · observación 15/09', href: 'https://www.eia.gov/dnav/pet/hist/RBRTED.htm' },
      { label: '[B11] EIA · Cushing WTI Spot Price FOB · observación 15/09', href: 'https://www.eia.gov/dnav/pet/hist/RWTCd.htm' },
      { label: '[B12] Baltic Exchange · Tanker report, week 38 · 18/09/2026', href: 'https://www.balticexchange.com/en/data-services/WeeklyRoundup/tanker/news/2026/tanker-report-week-38.html' },
      { label: '[B13] Goldman Sachs Research · The S&P 500 Is Forecast to Climb as Earnings Growth Powers Stocks Higher · 28/05/2026', href: 'https://www.goldmansachs.com/insights/articles/s-and-p-500-forecast-to-climb-as-earnings-growth-powers-stocks-higher' },
      { label: '[B14] S&P DJI · S&P U.S. Indices Methodology', href: 'https://www.spglobal.com/spdji/en/methodology/article/sp-us-indices-methodology/' },
      { label: '[B15] River / Sam Baker · The Case for a 10% Bitcoin Allocation · 02/09/2026', href: 'https://river.com/content/the-case-for-a-10-bitcoin-allocation' },
      { label: '[B16] BEA · calendario oficial consultado el 21/09/2026', href: bea },
      { label: '[B17] State Street · participaciones de GLD', href: 'https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-gld.xlsx' },
      { label: '[B18] Goldman Sachs Research · Can the S&P 500 Rally as Treasury Yields Rise? · 15/09/2026', href: 'https://www.goldmansachs.com/insights/articles/can-the-s-and-p-500-rally-as-treasury-yields-rise' },
      { label: '[B19] Ryan Detrick / Carson · Why The Worst Month of the Year Likely Won’t Bring Rain · 31/08/2026', href: 'https://www.carsongroup.com/insights/blog/why-the-worst-month-of-the-year-likely-wont-bring-rain/' },
      { label: '[B20] Ryan Detrick / Carson · A Dove In Hawk’s Clothing? · 17/09/2026', href: 'https://www.carsongroup.com/insights/blog/a-dove-in-hawks-clothing/' },
      { label: '[B21] FRED / ICE BofA · US High Yield Option-Adjusted Spread', href: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2', note: 'Destino de seguimiento del crédito; no aporta una observación nueva al cierre congelado.' },
      { label: '[B22] Alpha Vantage · TIME_SERIES_DAILY', href: 'https://www.alphavantage.co/documentation/#daily', note: 'Cierres sin ajustar para los 11 ETF sectoriales y el radar; series congeladas del informe.' },
      { label: '[B23] FRED / CBOE · VIXCLS', href: 'https://fred.stlouisfed.org/series/VIXCLS', note: 'VIX spot del 17/09; fuente del adapter V1.' },
      { label: '[B24] Bitbo / BitcoinTreasuries · Bitcoin ETF flows', href: 'https://bitbo.io/treasuries/etf-flows/', note: 'Fuente primaria del adapter V1; tabla histórica y caché no preservadas al corte. No sustituye Farside en los flujos independientes.' },
      { label: '[B25] Alianza · referencia institucional pública', href: 'https://www.alianza.com.co/', note: 'Identificación de la institución y seguimiento. No es fuente de escenarios numéricos de Felipe Campos; véase A3.' },
      { label: '[B26] Banco de la República · tasa de política monetaria', href: 'https://suameca.banrep.gov.co/estadisticas-economicas/informacionSerie/59/tasas_interes_politica_monetaria', note: 'Referencia institucional para el marco de seguimiento de USD/COP; no se añade una cifra al informe.' },
    ] },
    { title: 'C. Datos y cálculos propios', entries: [
      { label: '[C1] Dashboard y comparación 04/09 → 18/09', href: '/dashboard', note: 'Cinco sesiones / seis cierres por ventana. Radar: Alpha Vantage. VIX: 17/09. Enlace vivo; captura congelada.' },
      { label: '[C2] Statistical Levels · autoridad del 19/09; cierres admitidos hasta el 18/09', href: '/methodology/segundo-informe-septiembre-2026-datos.html', note: 'Yahoo Finance: series históricas, con enlaces por activo en la metodología. Cripto: cierre UTC. Midterm excluye 2026, con N real; SPY otoño: ocho ciclos.' },
      { label: '[C3] Bitcoin 2020–2025 · segunda muestra propia', note: 'Seis años completos; 2026 parcial excluido.' },
      { label: '[C4] ETH/BTC · cálculo editorial sobre cierres congelados', note: 'Misma serie UTC; variaciones antes del redondeo. Evidencia conservada.' },
      { label: '[C5] Replay acotado del Régimen V1 · deployment del 18/09/2026 · commit 4ee6adb006f360fea13837db5f7d45815f297b55', href: '/methodology/segundo-informe-septiembre-2026-regimen.html', note: '6.049 casos; categoría invariante y rango 70–77, condicionados a sectores del 18/09 y VIX del 17/09 recuperados el 21/09. No identifica la caché histórica exacta ni publica confianza puntual.' },
      { label: '[C6] Primer Informe de septiembre · referencia editorial e histórica', href: '/informes/primer-informe-septiembre-2026' },
    ] },
  ],
  sourcesNote: 'Mercado al 18/09; edición y consulta de fuentes al 21/09. Cada serie conserva fecha y convención. Diez métricas comparables; clasificación V1 reconstruida mediante replay acotado, condicionado a sectores y VIX reconciliados. Niveles desde apertura semanal y muestras estacionales separadas. Referencias externas atribuidas, no objetivos propios.',
  disclaimer: 'Contenido educativo, sin asesoría personalizada ni recomendaciones. Escenarios condicionales; la estacionalidad no garantiza resultados. Niveles: extensiones históricas, no soportes, resistencias ni objetivos.',
} satisfies MarketReport);
