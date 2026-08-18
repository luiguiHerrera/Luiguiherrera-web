const WIDTH = 1040;
const HEIGHT = 300;
const BASELINE = 250;
const LEFT = 10;
const RIGHT = 1030;

function envelope(progress: number) {
  const plateau = 1 - 0.16 * progress;
  const collapse = 1 / (1 + Math.exp((progress - 0.68) * 13));
  const texture = 0.055 * Math.sin(progress * 21) + 0.035 * Math.sin(progress * 8.5 + 1.2);
  return Math.max(0, plateau * collapse + texture * collapse);
}

function ribbonGeometry(samples: number) {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const progress = index / samples;
    const amplitude = envelope(progress);
    const x = LEFT + progress * (RIGHT - LEFT);
    const center = BASELINE - amplitude * 196;
    const spread = 7 + amplitude * 34;
    return { x, center, high: center - spread, low: Math.min(BASELINE + 5, center + spread) };
  });
}

export function decayRibbonSvg() {
  const points = ribbonGeometry(150);
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.center.toFixed(1)}`)
    .join(" ");
  const band = `${points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.high.toFixed(1)}`)
    .join(" ")} ${[...points]
    .reverse()
    .map((point) => `L${point.x.toFixed(1)} ${point.low.toFixed(1)}`)
    .join(" ")} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="fill" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#0B3436" stop-opacity="0.26"/>
      <stop offset="58%" stop-color="#6F8F82" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#9A7A44" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="stroke" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#0B3436"/>
      <stop offset="62%" stop-color="#3F6058"/>
      <stop offset="100%" stop-color="#9A7A44"/>
    </linearGradient>
  </defs>
  <line x1="${LEFT}" x2="${RIGHT}" y1="${BASELINE}" y2="${BASELINE}" stroke="#C9C2B6" stroke-width="1.4"/>
  <path d="${band}" fill="url(#fill)"/>
  <path d="${line}" fill="none" stroke="url(#stroke)" stroke-width="3.4" stroke-linecap="round"/>
</svg>`;
}

export function decayRibbonDataUri() {
  return `data:image/svg+xml;base64,${Buffer.from(decayRibbonSvg()).toString("base64")}`;
}

export const ogImageSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";
