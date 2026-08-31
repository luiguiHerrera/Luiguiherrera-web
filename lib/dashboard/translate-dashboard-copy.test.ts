import assert from "node:assert/strict";
import test from "node:test";
import { translateDashboardText } from "./translate-dashboard-copy.ts";

test("translates dynamic dashboard copy without leaving mixed-language fragments", () => {
  const cases = [
    ["Automático con fuente pública: 2026-08-28", "Automated from public source: 2026-08-28"],
    [
      "La lectura cuantitativa muestra fragilidad baja. Estos modelos estiman condiciones estadísticas de riesgo bajo supuestos históricos; no implican dirección futura del mercado.",
      "The quantitative reading shows low fragility. These models estimate statistical risk conditions under historical assumptions; they do not imply future market direction.",
    ],
    [
      "La ventana reciente muestra demanda neta positiva; historial insuficiente para 20D.",
      "The recent window shows positive net demand; there is not enough history for the 20D reading.",
    ],
    ["Entradas sostenidas", "Sustained inflows"],
    ["Racha de 3 días de entradas", "3-day inflow streak"],
    ["Entorno de volatilidad contenido.", "Contained volatility environment."],
    ["ETFs sectoriales como proxies", "Sector ETFs used as proxies"],
    ["Incompleto", "Incomplete"],
    [
      "Lectura compuesta no disponible: falta el pilar gobernado de rotación sectorial. No se renormalizan los pesos restantes.",
      "Composite read unavailable: the governed sector-rotation pillar is missing. Remaining weights are not renormalized.",
    ],
    [
      "Lectura compuesta de volatilidad, rotación y flujos. Ponderación actual: rotación sectorial 45%, VIX 40% y BTC ETF flows 15%.",
      "Composite read of volatility, rotation, and flows. Current weighting: sector rotation 45%, VIX 40%, and BTC ETF flows 15%.",
    ],
    ["Baja-normal: presión de volatilidad contenida.", "Low-normal: contained volatility pressure."],
    [
      "Entradas sostenidas favorecen apetito por riesgo cripto/institucional.",
      "Sustained inflows support crypto and institutional risk appetite.",
    ],
    ["Último cierre disponible: 27 de ago de 2026", "Latest available close: Aug 27, 2026"],
    [
      "No es una recomendación de inversión, no elige activos y no anticipa retornos futuros.",
      "It is not investment advice, does not select assets, and does not forecast future returns.",
    ],
    [
      "Cálculo propio con datos diarios de NAV, participaciones y activos netos publicados por State Street. No representa flujos oficiales reportados por el fondo.",
      "Own calculation using daily NAV, shares outstanding, and net assets published by State Street. It does not represent official flows reported by the fund.",
    ],
  ] as const;

  for (const [source, expected] of cases) {
    assert.equal(translateDashboardText(source), expected);
  }
});

test("translates the real-sector regime support signal", () => {
  assert.equal(
    translateDashboardText("Sectores growth/cíclicos lideran y defensivos quedan rezagados."),
    "Growth/cyclical sectors lead while defensives lag.",
  );
});
