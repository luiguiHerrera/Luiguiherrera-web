import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const browsers = require(process.env.DEBT_QA_HOME + "/node_modules/playwright");
const origin = process.env.DEBT_QA_ORIGIN;
const layouts = [1440, 1920, 768, 375, 390];
const neutral = value => value.replace(/\s+/g, " ");
const copy = {
  es: { path: "/deudas", empty: "Introduce tus datos para empezar.", load: "Cargar ejemplo", reset: "Restablecer",
    income: "Ingreso mensual neto", expenses: "Gastos ordinarios sin estas deudas", capacity: "Estrategia para observar la capacidad",
    lab: "Estrategia aplicada a ambos escenarios", source: "Origen del abono", relation: "¿El fondo está incluido en los activos líquidos declarados?",
    currency: "Moneda", noDebt: "Confirmo que no tengo deudas pendientes", none: "Has confirmado que no tienes deudas pendientes.",
    snowballFees: "bola de nieve devenga menos comisiones", fundingWarning: "deja menos de tres meses", unknown: "sin origen declarado",
    before: "12.000,00 €", after: "10.800,00 €", shortfall: "financiación adicional", decimal: "más decimales",
    balance: "Saldo pendiente", settled: "Todas las deudas registradas tienen saldo cero.",
    methodLink: "Comparación de estrategias", about: "Sobre esta herramienta",
  },
  en: { path: "/en/debt", empty: "Enter your figures to get started.", load: "Load example", reset: "Reset",
    income: "Net monthly income", expenses: "Ordinary expenses excluding these debts", capacity: "Strategy for the capacity analysis",
    lab: "Strategy used for both scenarios", source: "Source of the lump sum", relation: "Is the emergency fund included in reported liquid assets?",
    currency: "Currency", noDebt: "I confirm I have no outstanding debts", none: "You confirmed that you have no outstanding debts.",
    snowballFees: "Snowball incurs lower fees", fundingWarning: "leaves less than the three-month", unknown: "no reported source",
    before: "$12,000.00", after: "$10,800.00", shortfall: "additional funding", decimal: "more decimal places",
    balance: "Outstanding balance", settled: "All recorded debts have a zero balance.",
    methodLink: "Repayment strategy comparison", about: "About this tool",
  },
};

async function verify(engine, lang) {
  const browser = await browsers[engine].launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const t = copy[lang];
  const errors = [];
  const unexpectedWrites = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /hydration|react error/i.test(message.text())) errors.push(message.text()); });
  page.on("request", request => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) || /3197\.31|3197%2C31/.test(request.url()) || request.postData()?.includes("3197.31")) unexpectedWrites.push(request.url());
  });
  const select = label => page.getByRole("combobox", { name: label, exact: true });
  const input = label => page.getByRole("textbox", { name: label, exact: true });
  const choose = (label, value) => select(label).selectOption(value);
  const click = name => page.getByRole("button", { name, exact: true }).click();
  const contain = async (locator, text) => assert.ok(neutral(await locator.innerText()).toLowerCase().includes(text.toLowerCase()), text);
  const area = id => page.locator(id);
  const impact = page.locator("#debt-liquidity-title").locator("..");
  const current = page.locator("#capacidad [role=status]");

  try {
    await page.goto(origin + t.path);
    await contain(current, t.empty);
    assert.equal(await area("#estrategias").locator("figure").count(), 0);
    await page.locator("summary").filter({ hasText: t.about }).focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("summary").filter({ hasText: t.about }).evaluate(node => node.parentElement.open), true);
    await click(t.load);
    await contain(impact, t.before);
    await contain(impact, t.after);
    await contain(impact, t.fundingWarning);
    await contain(area("#estrategias"), t.snowballFees);
    await choose(t.capacity, "snowball");
    assert.equal(await select(t.lab).inputValue(), "snowball");
    await choose(t.lab, "avalanche");
    assert.equal(await select(t.capacity).inputValue(), "avalanche");
    await select(t.source).first().selectOption("unknown");
    await contain(impact, t.unknown);
    await select(t.source).first().selectOption("reserve");
    await choose(t.relation, "separate");
    const totalRow = impact.getByRole("row").nth(3);
    assert.notEqual(neutral(await totalRow.innerText()).includes(t.before), true);
    await choose(t.relation, "included");
    await input(t.income).fill(lang === "es" ? "3197,31" : "3197.31");
    await click(t.load, page.once("dialog", dialog => dialog.dismiss()));
    assert.equal(await input(t.income).inputValue(), lang === "es" ? "3197,31" : "3197.31");
    await input(t.expenses).fill("4000");
    await input(t.expenses).fill("1500");
    for (const width of layouts) {
      await page.setViewportSize({ width, height: 860 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `${engine}/${lang} overflow at ${width}`);
    }
    await page.getByRole("link", { name: t.methodLink, exact: true }).click();
    assert.match(page.url(), /#estrategias$/);
    await choose(t.currency, "JPY");
    await input(t.income).fill(lang === "es" ? "3197,31" : "3197.31");
    await contain(area("#estructura"), t.decimal);
    assert.deepEqual(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage), document.cookie]), [[], [], ""]);
    assert.deepEqual(unexpectedWrites, []);
    page.once("dialog", dialog => dialog.accept());
    await click(t.reset);
    await contain(current, t.empty);
    await page.getByLabel(t.noDebt, { exact: true }).check();
    await contain(current, t.none);
    await page.getByLabel(t.noDebt, { exact: true }).uncheck();
    await input(t.balance).fill("0");
    await contain(current, t.settled);
    await page.reload();
    await contain(current, t.empty);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ engine, lang, widths: layouts, status: "passed", errors, unexpectedWrites }));
  } finally {
    await browser.close();
  }
}

for (const engine of ["chromium", "firefox", "webkit"]) {
  for (const lang of ["es", "en"]) await verify(engine, lang);
}
