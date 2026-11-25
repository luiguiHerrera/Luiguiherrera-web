import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const dates = ["2026-11-19", "2026-11-20", "2026-11-23"];
const walk = (element, predicate) => {
  if (!element || typeof element !== "object") return undefined;
  if (predicate(element)) return element;
  for (const child of [element.props?.children].flat(Infinity)) {
    const found = walk(child, predicate);
    if (found) return found;
  }
};

/** Execute the real component handlers; replace only hook storage and DOM targets. */
function harness({ missing = false, locale = "es" } = {}) {
  let instance, hook = 0, context;
  const instances = new Map(), listeners = new Set(), pending = [];
  const originalDocument = globalThis.document;
  globalThis.document = {
    addEventListener: (type, listener) => { if (type === "pointerdown") listeners.add(listener); },
    removeEventListener: (type, listener) => { if (type === "pointerdown") listeners.delete(listener); },
  };
  const state = () => instances.get(instance);
  const react = {
    createContext: value => ({ defaultValue: value, Provider: "inspection-provider" }),
    useContext: value => context ?? value.defaultValue,
    useState: initial => {
      const slots = state(), index = hook++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef: initial => { const slots = state(), index = hook++; return slots[index] ??= { current: initial }; },
    useMemo: callback => callback(),
    useCallback: callback => callback,
    useEffect: (callback, dependencies) => {
      const slots = state(), index = hook++, previous = slots[index];
      if (previous && dependencies?.every((value, i) => Object.is(value, previous.dependencies?.[i]))) return;
      pending.push(() => { previous?.cleanup?.(); slots[index] = { dependencies, cleanup: callback() }; });
    },
  };
  const exports = {};
  const source = readFileSync(new URL("../../components/dashboard/PriceParticipationChart.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "exports", code)(name => name === "react" ? react : name.endsWith(".module.css")
    ? { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) } : require(name), exports);
  const groupTarget = { contains: target => target === "ramo" || target === "rasi" };
  const target = name => ({ contains: node => node === name, getBoundingClientRect: () => ({ left: 0, width: 1000 }) });
  const chartProps = (name, values) => ({ id: name, title: name.toUpperCase(), locale,
    unit: name === "ramo" ? "puntos del oscilador" : "puntos del índice de suma", reference: 0,
    series: [{ key: name, label: name.toUpperCase(), points: dates.map((date, i) => ({ date, value: values[i] })) }],
  });
  let group, ramo, rasi, spy;
  const render = (key, component, props, selection) => {
    instance = key; hook = 0; context = selection;
    if (!instances.has(key)) instances.set(key, []);
    const element = component(props);
    while (pending.length) pending.shift()();
    return element;
  };
  const canvas = chart => walk(chart, node => node.props?.["data-price-participation-chart"]);
  const refresh = () => {
    const provider = render("group", exports.SynchronizedPriceParticipationCharts, { children: null });
    context = provider.props.value;
    group = walk(provider, node => node.type === "div" && node.props?.ref);
    group.props.ref.current = groupTarget;
    ramo = render("ramo", exports.default, chartProps("ramo", [-2, missing ? null : 0, 1]), context);
    rasi = render("rasi", exports.default, chartProps("rasi", [350, 10, 90]), context);
    spy = render("spy", exports.default, chartProps("spy", [100, 101, 102]), null);
    for (const [name, chart] of [["ramo", ramo], ["rasi", rasi], ["spy", spy]]) canvas(chart).props.ref.current = target(name);
  };
  const choose = (name, index, type = "onPointerMove", immediateFocus = false) => {
    const time = dates.map(date => Date.parse(date));
    const x = 18 + (time[index] - time[0]) / (time[2] - time[0]) * 964;
    const current = canvas(name === "ramo" ? ramo : rasi);
    current.props[type]({ pointerType: "mouse", clientX: x, currentTarget: target(name) });
    // Pointerdown focuses the same slider before React renders the next frame.
    if (immediateFocus) current.props.onFocus();
    refresh();
  };
  const key = (name, key) => { canvas(name === "ramo" ? ramo : rasi).props.onKeyDown({ key, preventDefault() {} }); refresh(); };
  const selection = () => [ramo, rasi].map(chart => canvas(chart).props["data-selected-date"]);
  refresh();
  return {
    choose, key, selection,
    get charts() { return { ramo, rasi, spy }; },
    get group() { return group; },
    canvas,
    leaveChart: name => { canvas(name === "ramo" ? ramo : rasi).props.onPointerLeave(); refresh(); },
    leave: () => { group.props.onPointerLeave(); refresh(); },
    blur: relatedTarget => { group.props.onBlur({ currentTarget: groupTarget, relatedTarget }); refresh(); },
    outside: target => { for (const listener of [...listeners]) listener({ target }); refresh(); },
    dispose: () => { for (const slots of instances.values()) for (const slot of slots) slot?.cleanup?.(); globalThis.document = originalDocument; },
  };
}

test("hover in either breadth chart synchronizes the same calendar date without changing other charts", () => {
  const h = harness();
  try {
    h.choose("ramo", 1);
    assert.deepEqual(h.selection(), [dates[1], dates[1]]);
    h.leaveChart("ramo");
    assert.deepEqual(h.selection(), [dates[1], dates[1]], "crossing the gap to the sibling keeps the comparison date");
    h.choose("rasi", 0);
    assert.deepEqual(h.selection(), [dates[0], dates[0]]);
    assert.equal(h.canvas(h.charts.spy).props["data-selected-date"], undefined);
    h.leave();
    assert.deepEqual(h.selection(), [undefined, undefined]);
  } finally { h.dispose(); }
});

test("a pin is shared, sibling clicks do not clear it, and outside clicks clear both", () => {
  const h = harness();
  try {
    h.choose("ramo", 1, "onPointerDown", true);
    assert.deepEqual(h.selection(), [dates[1], dates[1]], "focus must not overwrite the date just clicked");
    h.outside("ramo");
    h.leave(); h.choose("rasi", 0);
    assert.deepEqual(h.selection(), [dates[1], dates[1]]);
    h.choose("rasi", 2, "onPointerDown");
    h.outside("rasi");
    assert.deepEqual(h.selection(), [dates[2], dates[2]]);
    h.outside("outside");
    assert.deepEqual(h.selection(), [undefined, undefined]);
  } finally { h.dispose(); }
});

test("keyboard navigation and focus moving within the pair preserve synchronization", () => {
  const h = harness();
  try {
    h.key("ramo", "Home");
    assert.deepEqual(h.selection(), [dates[0], dates[0]]);
    h.blur("rasi");
    assert.deepEqual(h.selection(), [dates[0], dates[0]]);
    h.key("rasi", "ArrowRight");
    assert.deepEqual(h.selection(), [dates[1], dates[1]]);
    h.key("ramo", "Escape");
    assert.deepEqual(h.selection(), [undefined, undefined]);
    h.key("rasi", "Home"); h.blur("outside");
    assert.deepEqual(h.selection(), [undefined, undefined]);
  } finally { h.dispose(); }
});

test("shared dates keep missing readings unavailable and preserve each chart's geometry", () => {
  const h = harness({ missing: true });
  try {
    const before = [h.charts.ramo, h.charts.rasi].map(chart => walk(chart, node => node.type === "path" && node.props.className === "chartLine").props.d);
    h.choose("rasi", 1);
    assert.deepEqual(h.selection(), [dates[1], dates[1]]);
    assert.match(h.canvas(h.charts.ramo).props["aria-valuetext"], /No disponible/);
    assert.match(h.canvas(h.charts.rasi).props["aria-valuetext"], /10,0/);
    const after = [h.charts.ramo, h.charts.rasi].map(chart => walk(chart, node => node.type === "path" && node.props.className === "chartLine").props.d);
    assert.deepEqual(after, before);
    assert.notEqual(after[0], after[1]);
  } finally { h.dispose(); }
});
