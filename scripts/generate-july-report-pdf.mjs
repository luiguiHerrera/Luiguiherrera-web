import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportsDir = path.join(root, "public", "reports");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "lib", "statistical-levels", "generated", "manifest.json"), "utf8"));

const htmlPath = path.join(reportsDir, "primer-informe-julio-2026.html");
const mdPath = path.join(reportsDir, "primer-informe-julio-2026.md");
const pdfPath = path.join(reportsDir, "primer-informe-julio-2026.pdf");

const jpmUrl = "https://www.tradingview.com/script/IwGynP3T-JPM-Collar-Levels-SPX/";
const coverQuestion = "¿Qué sostiene el mercado?";
const coverQuote =
  "Cuando el mercado sube, no basta con mirar el precio. Hay que entender quién empuja, quién acompaña y qué parte del movimiento sigue sana.";
const thesisCallout =
  "El mercado mantiene una estructura constructiva, pero exige leer más allá del índice. Una cartera no necesita adivinar todo; necesita entender qué la puede mover.";

const pageData = {
  btcFlows: {
    latest: "+32 M USD",
    rolling5d: "-1220 M USD",
    streak: "Racha de entradas",
    reading: "presión de salidas",
  },
  ethFlows: "ETH ETF flows: pendiente de automatización.",
  options: {
    total: "0.79",
    index: "0.97",
    equity: "0.53",
    spxSpxw: "1.07",
  },
  breadth: {
    rspVsSpy1w: "Plano",
    iwmVsSpy1w: "-2.9 pp",
    sectorsPositive: "7 positivos / 4 negativos",
    sectorsAboveLongAverage: "10 de 11 sectores sobre media larga",
  },
};

function asset(ticker) {
  const row = manifest.summaries.find((item) => item.ticker === ticker);
  if (!row) throw new Error(`Missing statistical summary for ${ticker}`);
  return row;
}

function pct(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Pendiente";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function num(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Pendiente";
  return value.toFixed(digits);
}

function statLine(ticker) {
  const row = asset(ticker);
  return {
    ticker,
    name: row.name,
    lastDate: row.lastDate,
    close: row.lastClose,
    oneWeek: pct(row.returns?.["1W"]),
    oneMonth: pct(row.returns?.["1M"]),
    ma200: pct(row.distanceToMovingAverages?.ma200),
    z: num(row.extension?.zScore5Y, 2),
    percentile: num(row.extension?.percentile5Y, 1),
    drawdown: pct(row.extension?.currentDrawdownFull),
  };
}

const stats = Object.fromEntries(
  ["SPY", "VOO", "RSP", "IWM", "GLD", "EWJ", "FXI", "BTCUSD", "ETHUSD", "USO", "UUP", "SMH", "XLF", "XLK"].map((ticker) => [ticker, statLine(ticker)]),
);

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function p(text) {
  return `<p>${esc(text)}</p>`;
}

function metric(label, value, note = "") {
  return `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong>${note ? `<em>${esc(note)}</em>` : ""}</div>`;
}

function card(title, body, eyebrow = "") {
  return `<article class="card">${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ""}<h3>${esc(title)}</h3>${p(body)}</article>`;
}

const assetReadings = [
  {
    title: "VOO / S&P 500",
    badge: "Núcleo",
    body: "El S&P 500 puede seguir subiendo y, aun así, exigir una lectura más fina. Lo importante es identificar cuántas piezas sostienen el movimiento y qué tan dependiente está de pocos motores.",
    expect: "Sesgo constructivo mientras flujos, beneficios y amplitud se mantengan alineados.",
    watch: "Concentración, VIX, amplitud, resultados y niveles JPM/SPX.",
    metrics: [`SPY 1W ${stats.SPY.oneWeek}`, `SPY media larga ${stats.SPY.ma200}`, `percentil ${stats.SPY.percentile}`],
  },
  {
    title: "GLD / Oro",
    badge: "Defensa",
    body: "El oro cumple mejor su papel cuando se lo evalúa como diversificador, no como una carrera diaria contra el índice. Su valor aparece cuando el resto del portafolio se mueve demasiado al mismo ritmo.",
    expect: "Puede seguir pausado si domina el apetito por riesgo, pero conserva valor si suben tensiones de tasas, dólar o inflación.",
    watch: "Dólar, tasas reales, inflación, estrés financiero y liquidez.",
    metrics: [`1W ${stats.GLD.oneWeek}`, `media larga ${stats.GLD.ma200}`, `percentil ${stats.GLD.percentile}`],
  },
  {
    title: "EWJ / Japón",
    badge: "Selectivo",
    body: "Japón sigue siendo una lectura interesante porque combina mercado desarrollado, exposición internacional y una historia distinta a la de Estados Unidos.",
    expect: "Puede funcionar como diversificación geográfica con momentum si el apetito por riesgo global se mantiene.",
    watch: "Yen, tasas japonesas, flujos internacionales y continuidad del liderazgo regional.",
    metrics: [`1W ${stats.EWJ.oneWeek}`, `media larga ${stats.EWJ.ma200}`, `percentil ${stats.EWJ.percentile}`],
  },
  {
    title: "FXI / China",
    badge: "Táctico",
    body: "China puede parecer barata muchas veces antes de estar lista. Por eso la leo como posición táctica, no como confirmación automática de tendencia.",
    expect: "Necesita catalizador macro, político o de flujos para cambiar la lectura.",
    watch: "Datos chinos, dólar, flujo extranjero y reacción de emergentes.",
    metrics: [`1W ${stats.FXI.oneWeek}`, `media larga ${stats.FXI.ma200}`, `percentil ${stats.FXI.percentile}`],
  },
  {
    title: "BTC/USDT",
    badge: "Beta",
    body: "En este informe, cripto se lee como beta, liquidez y apetito por riesgo. Por eso separo precio spot de flujos ETF: son señales relacionadas, pero no equivalentes.",
    expect: "Mejor tono si se mantiene la búsqueda de riesgo; vulnerable si sube VIX o se enfría tecnología.",
    watch: "BTC spot, dólar, VIX, condiciones financieras y ETF flows.",
    metrics: [`1W ${stats.BTCUSD.oneWeek}`, `media larga ${stats.BTCUSD.ma200}`, `percentil ${stats.BTCUSD.percentile}`],
  },
  {
    title: "ETH/USDT",
    badge: "Beta",
    body: "ETH comparte la lectura de liquidez, pero conviene separarlo del bloque de flujos ETF. Precio spot y flows son dos señales distintas.",
    expect: "Puede acelerar con apetito por riesgo, pero sigue sensible a tecnología, dólar y liquidez.",
    watch: "ETH spot, BTC, spreads de riesgo y actualización de ETF flows.",
    metrics: [`1W ${stats.ETHUSD.oneWeek}`, `media larga ${stats.ETHUSD.ma200}`, `percentil ${stats.ETHUSD.percentile}`],
  },
  {
    title: "Stockpicking",
    badge: "Dispersión",
    body: "Cuando baja la correlación y sube la dispersión, el stockpicking vuelve a importar. El índice deja de contar toda la historia y la selección exige más trabajo.",
    expect: "Mejor entorno para selección, siempre que beneficios y márgenes confirmen la narrativa.",
    watch: "Valoración, guidance, márgenes, capex, balance y exceso de momentum.",
    metrics: ["Lectura cualitativa", "Lectura por compañías", "Mayor exigencia"],
  },
];

const calendar = [
  ["Semana del 6 al 10 de julio", "Servicios, actas FOMC, crédito al consumo, desempleo e inflación China.", "La semana ayuda a leer crecimiento, liquidez y sensibilidad de tasas."],
  ["Próximos días / semana del 13 de julio", "Inicio de temporada de resultados, con bancos al frente.", "Los bancos dan señales tempranas sobre crédito, márgenes, provisiones y apetito por riesgo."],
  ["Próxima ventana de vencimientos", "Vencimientos de opciones.", "Puede alterar coberturas, flujos y volatilidad cerca de niveles relevantes."],
  ["Durante julio", "Resultados de semiconductores y tecnología.", "La narrativa de IA necesita seguir pasando de precio a beneficios, guidance y márgenes."],
];

const scenarios = [
  ["Base", "Mercado constructivo, pero selectivo. Tecnología y flujos sostienen la tendencia, con episodios de volatilidad y una amplitud que hay que seguir de cerca."],
  ["Alcista", "Resultados validan beneficios, flujos hacia tecnología continúan, volatilidad se mantiene controlada y la subida se ensancha."],
  ["Bajista", "Reversión de flujos, Fed/tasas más duras, decepción en resultados o deterioro de amplitud activa toma de beneficios."],
];

const watchItems = [
  "VIX y estructura de futuros",
  "Dólar / UUP",
  "Petróleo / USO",
  "Tasas y FedWatch",
  "Amplitud: RSP/SPY, IWM/SPY y sectores",
  "Semiconductores / SMH",
  "BTC/USDT y ETH/USDT spot",
  "BTC/ETH ETF flows",
  "Niveles JPM/SPX",
  "Resultados bancarios y semiconductores",
];

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Primer informe de julio - Luigui Herrera</title>
  <style>
    @page { size: A4; margin: 18mm 17mm 19mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f7f4ec;
      color: #1f2328;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      font-size: 10.2pt;
      line-height: 1.55;
    }
    a { color: #0b3436; text-decoration: none; border-bottom: 0.5pt solid rgba(11,52,54,0.35); }
    .page { min-height: 260mm; page-break-after: always; position: relative; }
    .page:last-child { page-break-after: auto; }
    .cover {
      display: grid;
      min-height: 260mm;
      grid-template-rows: auto 1fr auto;
      padding: 3mm 0 0;
    }
    .kicker, .eyebrow {
      color: #9a7a45;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .brandline {
      display: flex;
      justify-content: space-between;
      border-bottom: 0.6pt solid #d8d2c6;
      padding-bottom: 8mm;
      color: #6e7471;
      font-size: 8.5pt;
    }
    h1, h2, h3 { margin: 0; color: #1f2328; font-weight: 650; letter-spacing: 0; }
    h1 { max-width: 150mm; font-size: 42pt; line-height: 0.98; }
    h2 { font-size: 21pt; line-height: 1.08; margin-bottom: 5mm; }
    h3 { font-size: 12pt; line-height: 1.25; margin-bottom: 2.5mm; }
    p { margin: 0 0 4mm; }
    .subtitle { max-width: 145mm; margin-top: 7mm; font-size: 18pt; line-height: 1.2; color: #0b3436; }
    .cover-question {
      margin-top: 12mm;
      color: #1f2328;
      font-size: 17pt;
      line-height: 1.24;
      font-weight: 650;
    }
    .editorial-quote {
      max-width: 132mm;
      margin-top: 8mm;
      padding-left: 6mm;
      border-left: 1.4pt solid #9a7a45;
      color: #414844;
      font-size: 14pt;
      line-height: 1.45;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      border-top: 0.6pt solid #d8d2c6;
      padding-top: 5mm;
      color: #6e7471;
      font-size: 8.5pt;
    }
    .section {
      break-inside: avoid;
      margin-bottom: 11mm;
      padding-top: 2mm;
    }
    .lead {
      max-width: 160mm;
      color: #414844;
      font-size: 12.2pt;
      line-height: 1.62;
    }
    .rule { height: 0.6pt; background: #d8d2c6; margin: 7mm 0; }
    .grid { display: grid; gap: 5mm; }
    .grid.two { grid-template-columns: 1fr 1fr; }
    .grid.three { grid-template-columns: repeat(3, 1fr); }
    .grid.four { grid-template-columns: repeat(4, 1fr); }
    .card, .metric, .asset-card, .story-block {
      background: rgba(239,234,224,0.72);
      border: 0.65pt solid #d8d2c6;
      padding: 5.8mm;
      break-inside: avoid;
    }
    .card p, .asset-card p, .story-block p { color: #555d58; }
    .metric { min-height: 18mm; }
    .metric span {
      display: block;
      color: #6e7471;
      font-size: 7.6pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .metric strong {
      display: block;
      margin-top: 1.5mm;
      color: #0b3436;
      font-size: 12pt;
      line-height: 1.2;
    }
    .metric em {
      display: block;
      margin-top: 1.5mm;
      color: #6e7471;
      font-size: 8pt;
      font-style: normal;
    }
    .asset-card h3 {
      display: flex;
      justify-content: space-between;
      gap: 3mm;
    }
    .badge {
      color: #9a7a45;
      font-size: 7.5pt;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .asset-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 2mm;
      margin-top: 3mm;
      color: #6e7471;
      font-size: 8pt;
    }
    .pill {
      border: 0.55pt solid #d8d2c6;
      background: #f7f4ec;
      padding: 1.2mm 2mm;
    }
    .callout {
      margin: 5mm 0 7mm;
      padding: 5mm 6mm;
      border-left: 1.6pt solid #9a7a45;
      background: rgba(239,234,224,0.72);
      color: #414844;
      font-size: 11.3pt;
      line-height: 1.62;
    }
    .story-block { border-left: 1.5pt solid #0b3436; }
    .numbered {
      display: grid;
      grid-template-columns: 8mm 1fr;
      gap: 3mm;
      margin-bottom: 3.5mm;
    }
    .num {
      width: 8mm;
      height: 8mm;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0.7pt solid rgba(154,122,69,0.55);
      color: #9a7a45;
      font-weight: 700;
      font-size: 8pt;
    }
    .small { color: #6e7471; font-size: 8.6pt; line-height: 1.5; }
    .disclaimer {
      margin-top: 10mm;
      padding-top: 5mm;
      border-top: 0.7pt solid #d8d2c6;
      color: #6e7471;
      font-size: 8.8pt;
    }
  </style>
</head>
<body>
  <section class="page cover">
    <div class="brandline"><span>Informes de mercado · Julio 2026</span><span>Luigui Herrera · Market Lab</span></div>
    <div style="align-self:center">
      <h1>Primer informe de julio</h1>
      <div class="subtitle">IA, flujos y concentración: un mercado fuerte, pero más mecánico</div>
      <div class="cover-question">${esc(coverQuestion)}</div>
      <div class="editorial-quote">${esc(coverQuote)}</div>
    </div>
    <div class="footer"><span>Documento educativo e informativo.</span><span>Julio 2026</span></div>
  </section>

  <section class="page">
    <div class="section">
      <div class="eyebrow">Tesis ejecutiva</div>
      <h2>Fuerte por arriba, más exigente por dentro</h2>
      <p class="lead">Julio arranca con un mercado que todavía se ve fuerte por arriba, pero cuya estructura depende cada vez más de pocos motores: IA, flujos, concentración, opciones y liquidez. La lectura pide calma, detalle y menos ingenuidad.</p>
      <div class="callout">${esc(thesisCallout)}</div>
      <div class="grid three">
        ${card("Precio", "El índice mantiene tono constructivo, pero la lectura cambia cuando se separa índice de amplitud.", "01")}
        ${card("Flujo", "Los ETF, la inversión pasiva y la participación retail siguen funcionando como soporte mecánico.", "02")}
        ${card("Riesgo", "Volatilidad contenida no significa ausencia de fragilidad. A veces solo significa que el ajuste todavía no empezó.", "03")}
      </div>
    </div>
    <div class="section">
      <div class="eyebrow">Mapa rápido</div>
      <h2>Activos principales</h2>
      <div class="grid two">
        ${assetReadings.map((item) => `<article class="asset-card">
            <h3><span>${esc(item.title)}</span><span class="badge">${esc(item.badge)}</span></h3>
            ${p(item.body)}
            <p><strong>Qué esperamos:</strong> ${esc(item.expect)}</p>
            <p><strong>Qué vigilar:</strong> ${esc(item.watch)}</p>
            <div class="asset-meta">${item.metrics.map((m) => `<span class="pill">${esc(m)}</span>`).join("")}</div>
          </article>`).join("")}
      </div>
    </div>
    <div class="section">
      <div class="eyebrow">Activo por activo</div>
      <h2>Qué pasó / Qué esperamos / Qué vigilar</h2>
      <p class="lead">La lectura central del informe está en separar precio, expectativa y riesgo de cambio de opinión para cada bloque.</p>
      <div class="grid two">
        ${assetReadings.slice(0, 6).map((item) => `<article class="asset-card">
            <h3><span>${esc(item.title)}</span><span class="badge">${esc(item.badge)}</span></h3>
            <p><strong>Qué pasó:</strong> ${esc(item.body)}</p>
            <p><strong>Qué esperamos:</strong> ${esc(item.expect)}</p>
            <p><strong>Qué vigilar:</strong> ${esc(item.watch)}</p>
            <div class="asset-meta">${item.metrics.map((m) => `<span class="pill">${esc(m)}</span>`).join("")}</div>
          </article>`).join("")}
      </div>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <div class="eyebrow">La historia del mercado</div>
      <h2>El mercado sube por varias fuerzas a la vez</h2>
      <p class="lead">Cuando demasiadas piezas apuntan hacia el mismo lado, el movimiento puede durar más de lo que parece razonable. El problema es que también se vuelve más mecánico.</p>
      <div class="grid two">
        ${card("IA y semiconductores", "La narrativa de IA ya no vive solo en titulares. Pasa por chips, capex, memoria, centros de datos, energía, software y márgenes. SMH ayuda a seguir esa presión de forma más precisa que tecnología amplia.")}
        ${card("Concentración", "Un índice puede subir con pocos líderes. Eso sostiene la foto general, pero vuelve más importante medir amplitud y dispersión.")}
        ${card("Flujos", "La inversión pasiva, los ETF y el retail pueden empujar precio antes de que la narrativa fundamental se ordene. El flujo mueve el mercado incluso antes de convertirse en tesis.")}
        ${card("Opciones", "Las opciones pueden modificar el movimiento aunque no lo anticipen. A veces basta con que obliguen a cubrir más rápido.")}
        ${card("Liquidez", "BTC, ETH, tecnología y activos de beta alta siguen sensibles a condiciones financieras. Cripto aquí se lee como apetito por riesgo.")}
        ${card("Resultados", "El mercado ya no solo necesita historias. Necesita beneficios, guidance y márgenes que sostengan múltiplos exigentes.")}
      </div>
    </div>
    <div class="section">
      <div class="eyebrow">Lecturas automáticas</div>
      <h2>Datos que acompañan la narrativa</h2>
      <div class="grid three">
        ${metric("Régimen", "Neutral / mixto", "Lectura compuesta de volatilidad, rotación y flujos.")}
        ${metric("SPY", `${stats.SPY.oneWeek} 1W`, `z-score ${stats.SPY.z}; media larga ${stats.SPY.ma200}`)}
        ${metric("SMH", `${stats.SMH.percentile} percentil`, `z-score ${stats.SMH.z}; media larga ${stats.SMH.ma200}`)}
        ${metric("GLD", `${stats.GLD.oneWeek} 1W`, `media larga ${stats.GLD.ma200}`)}
        ${metric("BTC/USDT", `${stats.BTCUSD.oneWeek} 1W`, `spot; BTCUSD como base de niveles`)}
        ${metric("ETH/USDT", `${stats.ETHUSD.oneWeek} 1W`, `spot; flows ETF separados`)}
      </div>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <div class="eyebrow">Flujos de capital</div>
      <h2>BTC/ETH ETF flows</h2>
      <p class="lead">Los flujos ETF ayudan a leer presión marginal de demanda y complementan la lectura spot de BTC/USDT y ETH/USDT.</p>
      <div class="grid four">
      </div>
      <div class="grid three">
        ${metric("BTC último día", pageData.btcFlows.latest)}
        ${metric("BTC ETF 5D", pageData.btcFlows.rolling5d)}
        ${metric("Racha BTC", pageData.btcFlows.streak)}
      </div>
      <div class="callout"><p><strong>Lectura BTC:</strong> ${esc(pageData.btcFlows.reading)}.</p><p>${esc(pageData.ethFlows)}</p></div>
    </div>
    <div class="section">
      <div class="eyebrow">Amplitud</div>
      <h2>La salud interna importa</h2>
      <p class="lead">La amplitud importa porque un índice puede verse sano mientras cada vez menos acciones hacen el trabajo pesado.</p>
      <div class="grid two">
        ${metric("RSP/SPY", pageData.breadth.rspVsSpy1w, "Proxy de equal weight frente a capitalización.")}
        ${metric("IWM/SPY", pageData.breadth.iwmVsSpy1w, "Small caps frente al S&P 500.")}
        ${metric("Sectores", pageData.breadth.sectorsPositive)}
        ${metric("Media larga", pageData.breadth.sectorsAboveLongAverage)}
      </div>
      <p class="small">Lectura proxy de amplitud con ETFs líquidos; complementa el advance/decline oficial por componente.</p>
    </div>
    <div class="section">
      <div class="eyebrow">0DTE / opciones</div>
      <h2>Opciones como amplificador, no como oráculo</h2>
      <p>Lectura proxy de opciones. La señal 0DTE real queda pendiente hasta tener datos por vencimiento/serie.</p>
      <div class="grid four">
        ${metric("Total put/call", pageData.options.total)}
        ${metric("Index put/call", pageData.options.index)}
        ${metric("Equity put/call", pageData.options.equity)}
        ${metric("SPX + SPXW", pageData.options.spxSpxw)}
      </div>
      <p class="small">Fuente proxy: Cboe Daily Market Statistics. La integración 0DTE real queda pendiente hasta tener datos por vencimiento o serie.</p>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <div class="eyebrow">Dólar, petróleo y semiconductores</div>
      <h2>Tres piezas que pueden cambiar la lectura</h2>
      <div class="grid three">
        ${card("Dólar / UUP", `UUP funciona como proxy líquido del dólar. Retorno 1W ${stats.UUP.oneWeek}; distancia a media larga ${stats.UUP.ma200}. Si el dólar aprieta, las condiciones financieras fuera de Estados Unidos suelen endurecerse.`)}
        ${card("Petróleo / USO", `USO funciona como proxy líquido de petróleo, sin equivaler al spot exacto ni a futuros individuales. Percentil ${stats.USO.percentile}, z-score ${stats.USO.z}, distancia a media larga ${stats.USO.ma200}. Importa por inflación, energía y tasas.`)}
        ${card("Semiconductores / SMH", `SMH es el proxy principal para semiconductores. Percentil ${stats.SMH.percentile}, z-score ${stats.SMH.z}, distancia a media larga ${stats.SMH.ma200}. La narrativa de IA depende de capex, márgenes, guidance e inventarios.`)}
      </div>
    </div>
    <div class="section">
      <div class="eyebrow">Niveles JPM/SPX</div>
      <h2>Una referencia estructural, no un nivel propio del ETF</h2>
      <div class="story-block">
        <p>SPY: percentil ${stats.SPY.percentile}, z-score ${stats.SPY.z}, distancia a media larga ${stats.SPY.ma200}.</p>
        <p>Pendiente de carga manual de niveles vigentes. Son niveles sobre SPX; se muestran junto al S&P 500 como referencia estructural, no como niveles propios de SPY o VOO.</p>
        <p>Referencia pública: <a href="${jpmUrl}">Indicador TradingView JPM Collar Levels SPX</a></p>
      </div>
    </div>
    <div class="section">
      <div class="eyebrow">Calendario</div>
      <h2>Fechas que pueden mover la lectura</h2>
      <div class="grid two">
        ${calendar.map(([date, event, why]) => `<article class="card"><div class="eyebrow">${esc(date)}</div><h3>${esc(event)}</h3>${p(why)}</article>`).join("")}
      </div>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <div class="eyebrow">Escenarios</div>
      <h2>Tres caminos posibles para ordenar la lectura</h2>
      <div class="grid three">
        ${scenarios.map(([title, body]) => card(title, body)).join("")}
      </div>
    </div>
    <div class="section">
      <div class="eyebrow">Lista final de vigilancia</div>
      <h2>Lo que miraría antes de cambiar de opinión</h2>
      <p class="lead">La lectura cambia cuando varias piezas empiezan a decir lo mismo: precio, flujo, amplitud, volatilidad y beneficios.</p>
      <div class="grid two">
        ${watchItems.map((item, index) => `<div class="numbered"><span class="num">${index + 1}</span><p>${esc(item)}</p></div>`).join("")}
      </div>
    </div>
    <div class="section">
      <div class="eyebrow">Cierre</div>
      <h2>Leer con calma también es una decisión</h2>
      <p class="lead">El mercado puede seguir fuerte. También puede volverse más sensible a flujos, opciones y resultados. La diferencia está en no confundir movimiento con salud interna, ni precio con tesis completa.</p>
      <p class="disclaimer">Este documento es educativo e informativo. No constituye asesoría financiera, recomendación de inversión ni invitación a comprar o vender activos. Las lecturas combinan datos de mercado, cálculos propios y referencias públicas disponibles al momento de preparación.</p>
    </div>
    <div class="footer"><span>Luigui Herrera · Market Lab</span><span>Primer informe de julio · Julio 2026</span></div>
  </section>
</body>
</html>`;

const markdown = `# Primer informe de julio

IA, flujos y concentración: un mercado fuerte, pero más mecánico

${coverQuestion}

${coverQuote}

Julio arranca con un mercado que todavía se ve fuerte por arriba, pero cuya estructura depende cada vez más de pocos motores: IA, flujos, concentración, opciones y liquidez. La lectura pide calma, detalle y menos ingenuidad.

${thesisCallout}

## Datos usados

- SPY 1W ${stats.SPY.oneWeek}; media larga ${stats.SPY.ma200}; percentil ${stats.SPY.percentile}.
- SMH percentil ${stats.SMH.percentile}; z-score ${stats.SMH.z}; media larga ${stats.SMH.ma200}.
- BTC ETF flows: último día ${pageData.btcFlows.latest}; 5D ${pageData.btcFlows.rolling5d}; lectura BTC: ${pageData.btcFlows.reading}.
- ${pageData.ethFlows}
- Cboe put/call: total ${pageData.options.total}; index ${pageData.options.index}; equity ${pageData.options.equity}; SPX + SPXW ${pageData.options.spxSpxw}.

Fuente visual editable: public/reports/primer-informe-julio-2026.html
`;

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(htmlPath, html);
fs.writeFileSync(mdPath, markdown);

const colors = {
  paper: [0.969, 0.957, 0.925],
  panel: [0.937, 0.918, 0.878],
  petrol: [0.043, 0.204, 0.212],
  ink: [0.122, 0.137, 0.157],
  muted: [0.431, 0.455, 0.443],
  brass: [0.604, 0.478, 0.271],
  line: [0.847, 0.824, 0.776],
  white: [1, 1, 1],
};

function sanitizePdfText(value) {
  return String(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

function escapePdfText(value) {
  return sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function rgb([r, g, b]) {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function wrapText(text, maxWidth, fontSize) {
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  const charWidth = fontSize * 0.49;
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length * charWidth <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

class PdfDoc {
  constructor() {
    this.width = 595.28;
    this.height = 841.89;
    this.pages = [];
    this.ops = [];
    this.pageNumber = 0;
  }

  addPage({ footer = true } = {}) {
    if (this.ops.length) this.finishPage();
    this.pageNumber += 1;
    this.ops = [];
    this.fillRect(0, 0, this.width, this.height, colors.paper);
    if (footer) this.footer();
  }

  finishPage() {
    this.pages.push(this.ops.join("\n"));
    this.ops = [];
  }

  fillRect(x, y, w, h, color) {
    this.ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  strokeRect(x, y, w, h, color = colors.line, lineWidth = 0.7) {
    this.ops.push(`${lineWidth.toFixed(2)} w ${rgb(color)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  }

  line(x1, y1, x2, y2, color = colors.line, lineWidth = 0.7) {
    this.ops.push(`${lineWidth.toFixed(2)} w ${rgb(color)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  text(value, x, y, size = 10, color = colors.ink, font = "F1") {
    this.ops.push(`BT /${font} ${size.toFixed(2)} Tf ${rgb(color)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(value)}) Tj ET`);
  }

  paragraph(value, x, y, maxWidth, size = 10, color = colors.muted, leading = size * 1.42) {
    const lines = wrapText(value, maxWidth, size);
    lines.forEach((line, index) => this.text(line, x, y - index * leading, size, color));
    return y - lines.length * leading;
  }

  eyebrow(value, x, y) {
    this.text(value.toUpperCase(), x, y, 7.7, colors.brass, "F2");
  }

  h1(value, x, y, maxWidth, size = 36) {
    const lines = wrapText(value, maxWidth, size);
    lines.forEach((line, index) => this.text(line, x, y - index * size * 1.03, size, colors.ink, "F2"));
    return y - lines.length * size * 1.03;
  }

  h2(value, x, y, maxWidth, size = 22) {
    const lines = wrapText(value, maxWidth, size);
    lines.forEach((line, index) => this.text(line, x, y - index * size * 1.12, size, colors.ink, "F2"));
    return y - lines.length * size * 1.12 - 8;
  }

  sectionTitle(eyebrow, title, y) {
    this.eyebrow(eyebrow, 48, y);
    return this.h2(title, 48, y - 24, 500);
  }

  footer() {
    this.line(48, 38, 547, 38);
    this.text("Luigui Herrera · Market Lab", 48, 23, 8.2, colors.muted);
    this.text(`Primer informe de julio · ${this.pageNumber}`, 455, 23, 8.2, colors.muted);
  }

  card(x, y, w, h, title, body, kicker = "") {
    this.fillRect(x, y - h, w, h, colors.panel);
    this.strokeRect(x, y - h, w, h, colors.line);
    if (kicker) this.eyebrow(kicker, x + 14, y - 19);
    this.text(title, x + 14, y - (kicker ? 38 : 23), 11.2, colors.ink, "F2");
    this.paragraph(body, x + 14, y - (kicker ? 56 : 42), w - 28, 8.7, colors.muted, 12.4);
  }

  metric(x, y, w, h, label, value, note = "") {
    this.fillRect(x, y - h, w, h, colors.panel);
    this.strokeRect(x, y - h, w, h, colors.line);
    this.text(label.toUpperCase(), x + 12, y - 17, 7.3, colors.muted, "F2");
    this.paragraph(value, x + 12, y - 35, w - 24, 12.2, colors.petrol, 14);
    if (note) this.paragraph(note, x + 12, y - h + 12, w - 24, 7.7, colors.muted, 10);
  }

  assetCard(x, y, w, h, item) {
    this.fillRect(x, y - h, w, h, colors.panel);
    this.strokeRect(x, y - h, w, h, colors.line);
    this.text(item.title, x + 14, y - 19, 11.3, colors.ink, "F2");
    this.text(item.badge.toUpperCase(), x + w - 68, y - 19, 7, colors.brass, "F2");
    let cursor = this.paragraph(`Qué pasó: ${item.body}`, x + 14, y - 41, w - 28, 8.2, colors.muted, 11.8);
    cursor -= 6;
    cursor = this.paragraph(`Qué esperamos: ${item.expect}`, x + 14, cursor, w - 28, 8.1, colors.ink, 11.6);
    cursor -= 5;
    this.paragraph(`Qué vigilar: ${item.watch}`, x + 14, cursor, w - 28, 8.1, colors.muted, 11.6);
  }

  miniAssetCard(x, y, w, h, item) {
    this.fillRect(x, y - h, w, h, colors.panel);
    this.strokeRect(x, y - h, w, h, colors.line);
    this.text(item.title, x + 12, y - 17, 10.2, colors.ink, "F2");
    this.text(item.badge.toUpperCase(), x + w - 60, y - 17, 6.8, colors.brass, "F2");
    this.paragraph(item.expect, x + 12, y - 35, w - 24, 7.4, colors.muted, 10);
    this.text(item.metrics.slice(0, 2).join(" · "), x + 12, y - h + 11, 7.2, colors.petrol);
  }

  assetNarrativeBlock(x, y, w, h, item) {
    this.fillRect(x, y - h, w, h, colors.panel);
    this.strokeRect(x, y - h, w, h, colors.line);
    this.text(item.title, x + 16, y - 21, 13, colors.ink, "F2");
    this.text(item.badge.toUpperCase(), x + w - 85, y - 21, 7.1, colors.brass, "F2");
    let cursor = y - 48;
    this.eyebrow("Qué pasó", x + 16, cursor);
    cursor = this.paragraph(item.body, x + 16, cursor - 16, w - 32, 9.1, colors.muted, 13);
    cursor -= 8;
    this.eyebrow("Qué esperamos", x + 16, cursor);
    cursor = this.paragraph(item.expect, x + 16, cursor - 16, w - 32, 9.1, colors.ink, 13);
    cursor -= 8;
    this.eyebrow("Qué vigilar", x + 16, cursor);
    this.paragraph(item.watch, x + 16, cursor - 16, w - 32, 9.1, colors.muted, 13);
  }
}

function buildPdf() {
  const pdf = new PdfDoc();

  pdf.addPage({ footer: false });
  pdf.line(48, 794, 547, 794);
  pdf.text("Informes de mercado · Julio 2026", 48, 810, 8.5, colors.muted);
  pdf.text("Luigui Herrera · Market Lab", 438, 810, 8.5, colors.muted);
  let y = pdf.h1("Primer informe de julio", 48, 565, 440, 43);
  y = pdf.paragraph("IA, flujos y concentración: un mercado fuerte, pero más mecánico", 48, y - 12, 420, 17, colors.petrol, 22);
  pdf.text(coverQuestion, 48, y - 34, 17, colors.ink, "F2");
  pdf.fillRect(48, y - 112, 4, 62, colors.brass);
  pdf.paragraph(coverQuote, 66, y - 58, 405, 13.5, colors.ink, 19);
  pdf.line(48, 62, 547, 62);
  pdf.text("Documento educativo e informativo.", 48, 45, 8.5, colors.muted);
  pdf.text("Julio 2026", 496, 45, 8.5, colors.muted);

  pdf.addPage();
  y = pdf.sectionTitle("Tesis ejecutiva", "Fuerte por arriba, más exigente por dentro", 775);
  y = pdf.paragraph("Julio arranca con un mercado que todavía se ve fuerte por arriba, pero cuya estructura depende cada vez más de pocos motores: IA, flujos, concentración, opciones y liquidez. La lectura pide calma, detalle y menos ingenuidad.", 48, y, 500, 12, colors.ink, 17);
  pdf.fillRect(48, y - 70, 500, 52, colors.panel);
  pdf.fillRect(48, y - 70, 4, 52, colors.brass);
  pdf.paragraph(thesisCallout, 64, y - 35, 456, 11.4, colors.ink, 16);
  y -= 95;
  pdf.card(48, y, 158, 88, "Precio", "El índice mantiene tono constructivo, pero la lectura cambia cuando se separa índice de amplitud.", "01");
  pdf.card(219, y, 158, 88, "Flujo", "Los ETF, la inversión pasiva y la participación retail siguen funcionando como soporte mecánico.", "02");
  pdf.card(390, y, 158, 88, "Riesgo", "Volatilidad contenida no significa ausencia de fragilidad. A veces solo significa que el ajuste todavía no empezó.", "03");
  y -= 125;
  pdf.eyebrow("Mapa rápido", 48, y);
  y = pdf.h2("Activos principales", 48, y - 24, 500);
  const assetPositions = assetReadings.map((_, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return [48 + col * 260, y - row * 78, 240, 64];
  });
  assetReadings.forEach((item, index) => pdf.miniAssetCard(...assetPositions[index], item));

  pdf.addPage();
  y = pdf.sectionTitle("Activo por activo", "Qué pasó / Qué esperamos / Qué vigilar", 775);
  y = pdf.paragraph("La lectura central del informe está en separar precio, expectativa y riesgo de cambio de opinión para cada bloque.", 48, y, 500, 11.3, colors.ink, 16);
  y -= 22;
  pdf.assetNarrativeBlock(48, y, 500, 160, assetReadings[0]);
  pdf.assetNarrativeBlock(48, y - 182, 500, 160, assetReadings[1]);
  pdf.assetNarrativeBlock(48, y - 364, 500, 160, assetReadings[2]);

  pdf.addPage();
  y = pdf.sectionTitle("Activo por activo", "Riesgo táctico y beta de liquidez", 775);
  y = pdf.paragraph("China, BTC y ETH exigen una lectura más táctica: pueden acelerar con apetito por riesgo, pero cambian rápido si se endurece la liquidez.", 48, y, 500, 11.3, colors.ink, 16);
  y -= 22;
  pdf.assetNarrativeBlock(48, y, 500, 160, assetReadings[3]);
  pdf.assetNarrativeBlock(48, y - 182, 500, 160, assetReadings[4]);
  pdf.assetNarrativeBlock(48, y - 364, 500, 160, assetReadings[5]);

  pdf.addPage();
  y = pdf.sectionTitle("La historia del mercado", "El mercado sube por varias fuerzas a la vez", 775);
  y = pdf.paragraph("Cuando demasiadas piezas apuntan hacia el mismo lado, el movimiento puede durar más de lo que parece razonable. El problema es que también se vuelve más mecánico.", 48, y, 500, 12, colors.ink, 17);
  y -= 18;
  const stories = [
    ["IA y semiconductores", "La narrativa de IA pasa por chips, capex, memoria, centros de datos, energía, software y márgenes. SMH permite seguir esa presión de forma más precisa que tecnología amplia."],
    ["Concentración", "Un índice puede subir con pocos líderes. Eso sostiene la foto general, pero vuelve más importante medir amplitud y dispersión."],
    ["Flujos", "La inversión pasiva, los ETF y el retail pueden empujar precio antes de que la narrativa fundamental se ordene. El flujo mueve mercado incluso antes de convertirse en tesis."],
    ["Opciones", "Las opciones pueden modificar el movimiento aunque no lo anticipen. A veces basta con que obliguen a cubrir más rápido."],
    ["Liquidez", "BTC, ETH, tecnología y activos de beta alta siguen sensibles a condiciones financieras. Cripto aquí se lee como apetito por riesgo."],
    ["Resultados", "El mercado ya no solo necesita historias. Necesita beneficios, guidance y márgenes que sostengan múltiplos exigentes."],
  ];
  stories.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    pdf.card(48 + col * 260, y - row * 122, 240, 104, item[0], item[1]);
  });

  pdf.addPage();
  y = pdf.sectionTitle("Lecturas automáticas", "Datos que acompañan la narrativa", 775);
  const metrics = [
    ["Régimen", "Neutral / mixto", "Volatilidad, rotación y flujos."],
    ["SPY", `${stats.SPY.oneWeek} 1W`, `z-score ${stats.SPY.z}; media larga ${stats.SPY.ma200}`],
    ["SMH", `Percentil ${stats.SMH.percentile}`, `z-score ${stats.SMH.z}; media larga ${stats.SMH.ma200}`],
    ["GLD", `${stats.GLD.oneWeek} 1W`, `media larga ${stats.GLD.ma200}`],
    ["BTC/USDT", `${stats.BTCUSD.oneWeek} 1W`, "Spot; BTCUSD como base de niveles."],
    ["ETH/USDT", `${stats.ETHUSD.oneWeek} 1W`, "Spot; flows ETF separados."],
  ];
  metrics.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    pdf.metric(48 + col * 170, y - row * 78, 154, 62, item[0], item[1], item[2]);
  });
  y -= 185;
  pdf.eyebrow("Flujos de capital", 48, y);
  y = pdf.h2("BTC/ETH ETF flows", 48, y - 24, 500);
  y = pdf.paragraph("Los flujos ETF ayudan a leer presión marginal de demanda y complementan la lectura spot de BTC/USDT y ETH/USDT.", 48, y, 500, 11, colors.ink, 15);
  y -= 20;
  pdf.metric(48, y, 154, 58, "BTC último día", pageData.btcFlows.latest);
  pdf.metric(219, y, 154, 58, "BTC ETF 5D", pageData.btcFlows.rolling5d);
  pdf.metric(390, y, 154, 58, "Racha BTC", pageData.btcFlows.streak);
  y -= 86;
  pdf.fillRect(48, y - 58, 500, 50, colors.panel);
  pdf.fillRect(48, y - 58, 4, 50, colors.brass);
  pdf.paragraph(`Lectura BTC: ${pageData.btcFlows.reading}.`, 64, y - 22, 458, 10.6, colors.ink, 14);
  pdf.paragraph(pageData.ethFlows, 64, y - 40, 458, 10.6, colors.ink, 14);

  pdf.addPage();
  y = pdf.sectionTitle("Amplitud", "La salud interna importa", 775);
  y = pdf.paragraph("La amplitud importa porque un índice puede verse sano mientras cada vez menos acciones hacen el trabajo pesado. Lectura proxy con ETFs líquidos; complementa el advance/decline oficial por componente.", 48, y, 500, 10.8, colors.ink, 15);
  y -= 30;
  pdf.metric(48, y, 240, 68, "RSP/SPY", pageData.breadth.rspVsSpy1w, "Equal weight frente a capitalización.");
  pdf.metric(308, y, 240, 68, "IWM/SPY", pageData.breadth.iwmVsSpy1w, "Small caps frente al S&P 500.");
  pdf.metric(48, y - 92, 240, 68, "Sectores", pageData.breadth.sectorsPositive);
  pdf.metric(308, y - 92, 240, 68, "Media larga", pageData.breadth.sectorsAboveLongAverage);

  pdf.addPage();
  y = pdf.sectionTitle("0DTE / opciones", "Opciones como amplificador, no como oráculo", 775);
  y = pdf.paragraph("Lectura proxy de opciones. La señal 0DTE real queda pendiente hasta tener datos por vencimiento o serie. Las opciones pueden modificar el movimiento aunque no lo anticipen; a veces basta con que obliguen a cubrir más rápido.", 48, y, 500, 11.2, colors.ink, 15.8);
  y -= 20;
  pdf.metric(48, y, 115, 55, "Total put/call", pageData.options.total);
  pdf.metric(177, y, 115, 55, "Index put/call", pageData.options.index);
  pdf.metric(306, y, 115, 55, "Equity put/call", pageData.options.equity);
  pdf.metric(435, y, 115, 55, "SPX + SPXW", pageData.options.spxSpxw);
  y -= 95;
  pdf.eyebrow("Dólar, petróleo y semiconductores", 48, y);
  y = pdf.h2("Tres piezas que pueden cambiar la lectura", 48, y - 24, 500);
  pdf.card(48, y, 154, 120, "Dólar / UUP", `UUP funciona como proxy líquido del dólar. Retorno 1W ${stats.UUP.oneWeek}; distancia a media larga ${stats.UUP.ma200}. Si el dólar aprieta, las condiciones financieras fuera de Estados Unidos suelen endurecerse.`);
  pdf.card(219, y, 154, 120, "Petróleo / USO", `USO funciona como proxy líquido de petróleo. Percentil ${stats.USO.percentile}, z-score ${stats.USO.z}, distancia a media larga ${stats.USO.ma200}. Importa por inflación, energía y tasas.`);
  pdf.card(390, y, 154, 120, "Semiconductores / SMH", `SMH es el proxy principal. Percentil ${stats.SMH.percentile}, z-score ${stats.SMH.z}, distancia a media larga ${stats.SMH.ma200}. La narrativa de IA depende de capex, márgenes, guidance e inventarios.`);
  y -= 158;
  pdf.eyebrow("Niveles JPM/SPX", 48, y);
  y = pdf.h2("Una referencia estructural, no un nivel propio del ETF", 48, y - 24, 500);
  pdf.fillRect(48, y - 94, 500, 82, colors.panel);
  pdf.strokeRect(48, y - 94, 500, 82);
  pdf.paragraph(`SPY: percentil ${stats.SPY.percentile}, z-score ${stats.SPY.z}, distancia a media larga ${stats.SPY.ma200}. Pendiente de carga manual de niveles vigentes. Son niveles sobre SPX; se muestran junto al S&P 500 como referencia estructural, no como niveles propios de SPY o VOO.`, 64, y - 30, 456, 10, colors.ink, 14);
  pdf.text("Referencia: TradingView JPM Collar Levels SPX", 64, y - 76, 8.2, colors.petrol);
  pdf.text(jpmUrl, 64, y - 88, 7.6, colors.petrol);

  pdf.addPage();
  y = pdf.sectionTitle("Calendario", "Fechas que pueden mover la lectura", 775);
  calendar.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    pdf.card(48 + col * 260, y - row * 105, 240, 88, item[1], item[2], item[0]);
  });
  y -= 240;
  pdf.eyebrow("Escenarios", 48, y);
  y = pdf.h2("Tres caminos posibles para ordenar la lectura", 48, y - 24, 500);
  scenarios.forEach((item, index) => pdf.card(48 + index * 170, y, 154, 106, item[0], item[1]));
  y -= 145;
  pdf.eyebrow("Lista final de vigilancia", 48, y);
  y = pdf.h2("Lo que miraría antes de cambiar de opinión", 48, y - 24, 500);
  pdf.paragraph("La lectura cambia cuando varias piezas empiezan a decir lo mismo: precio, flujo, amplitud, volatilidad y beneficios.", 48, y, 500, 11, colors.ink, 15);
  y -= 32;
  watchItems.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 48 + col * 260;
    const yy = y - row * 30;
    pdf.fillRect(x, yy - 17, 18, 18, colors.panel);
    pdf.strokeRect(x, yy - 17, 18, 18, colors.brass);
    pdf.text(String(index + 1), x + 6, yy - 11, 8, colors.brass, "F2");
    pdf.paragraph(item, x + 27, yy - 4, 205, 9.1, colors.ink, 12);
  });

  pdf.addPage();
  y = pdf.sectionTitle("Cierre", "Leer con calma también es una decisión", 775);
  y = pdf.paragraph("El mercado puede seguir fuerte. También puede volverse más sensible a flujos, opciones y resultados. La diferencia está en no confundir movimiento con salud interna, ni precio con tesis completa.", 48, y, 500, 13, colors.ink, 19);
  y -= 28;
  pdf.fillRect(48, y - 120, 500, 96, colors.panel);
  pdf.fillRect(48, y - 120, 4, 96, colors.brass);
  pdf.paragraph("Este documento es educativo e informativo. No constituye asesoría financiera, recomendación de inversión ni invitación a comprar o vender activos. Las lecturas combinan datos de mercado, cálculos propios y referencias públicas disponibles al momento de preparación.", 64, y - 50, 456, 10.4, colors.ink, 15);
  pdf.paragraph("Fuentes usadas: datos de mercado procesados en niveles estadísticos, lectura de /informes, Cboe como proxy de opciones, Bitbo/BitcoinTreasuries para BTC ETF flows cuando está disponible, y referencia pública del indicador JPM Collar Levels SPX.", 64, y - 117, 456, 8.6, colors.muted, 12);
  pdf.text("Luigui Herrera · Market Lab", 48, 240, 18, colors.petrol, "F2");
  pdf.paragraph("La idea es llegar con mejores preguntas antes de que el mercado obligue a hacerlas deprisa.", 48, 210, 455, 13, colors.ink, 19);

  pdf.finishPage();
  return pdf.pages;
}

function writePdf(filePath, pages) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontRegular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageRefs = [];
  const pageBodies = [];

  pages.forEach((content) => {
    const stream = Buffer.from(content, "latin1");
    const contentRef = add(`<< /Length ${stream.length + 1} >>\nstream\n${content}\nendstream`);
    const pageRef = objects.length + 1;
    pageRefs.push(pageRef);
    pageBodies.push({ pageRef, contentRef });
    add("");
  });

  const pagesRef = objects.length + 1;
  pageBodies.forEach(({ pageRef, contentRef }) => {
    objects[pageRef - 1] = `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentRef} 0 R >>`;
  });
  add(`<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);
  const catalogRef = add(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f\n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n\n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  fs.writeFileSync(filePath, Buffer.from(pdf, "latin1"));
}

const pdfPages = buildPdf();
writePdf(pdfPath, pdfPages);

if (process.env.REPORT_PREVIEW_DIR) {
  fs.mkdirSync(process.env.REPORT_PREVIEW_DIR, { recursive: true });
  pdfPages.forEach((page, index) => {
    writePdf(path.join(process.env.REPORT_PREVIEW_DIR, `page-${String(index + 1).padStart(2, "0")}.pdf`), [page]);
  });
}

console.log(`Wrote ${path.relative(root, htmlPath)}`);
console.log(`Wrote ${path.relative(root, mdPath)}`);
console.log(`Wrote ${path.relative(root, pdfPath)} (${pdfPages.length} pages)`);
