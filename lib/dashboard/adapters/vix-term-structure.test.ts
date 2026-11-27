import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildDataFromContracts,
  parseCboeDailyPublications,
  getVixTermStructureData,
  parseCboeSettlements,
  selectMonthlyVixContracts,
  type CboeSettlementRow,
} from "./vix-term-structure.ts";

const monthlyRows: CboeSettlementRow[] = [
  ["VX/U6", "2026-09-16"],
  ["VX/V6", "2026-10-21"],
  ["VX/X6", "2026-11-18"],
  ["VX/Z6", "2026-12-16"],
  ["VX/F7", "2027-01-20"],
  ["VX/G7", "2027-02-17"],
  ["VX/H7", "2027-03-17"],
  ["VX/J7", "2027-04-21"],
  ["VX/K7", "2027-05-18"],
  ["VX/M7", "2027-06-16"],
  ["VX/N7", "2027-07-21"],
  ["VX/Q7", "2027-08-18"],
].map(([symbol, expirationDate], index) => ({
  expirationDate,
  price: 17 + index,
  product: "VX",
  symbol,
}));

test("A: selects exactly the first nine standard monthly contracts", () => {
  const selected = selectMonthlyVixContracts(monthlyRows, "2026-08-28");
  assert.equal(selected.length, 9);
  assert.deepEqual(
    selected.map((row) => row.symbol),
    monthlyRows.slice(0, 9).map((row) => row.symbol),
  );

  const data = buildDataFromContracts(selected, "2026-08-28");
  assert.deepEqual(data.points.map((point) => point.label), [
    "VX1", "VX2", "VX3", "VX4", "VX5", "VX6", "VX7", "VX8", "VX9",
  ]);
});

test("B: rolls forward automatically when the front monthly contract expires", () => {
  const expiredAndCurrent = [
    { product: "VX", symbol: "VX/Q6", expirationDate: "2026-08-19", price: 16 },
    ...monthlyRows,
  ];
  const beforeExpiry = selectMonthlyVixContracts(expiredAndCurrent, "2026-09-15");
  const onExpiry = selectMonthlyVixContracts(expiredAndCurrent, "2026-09-16");

  assert.equal(beforeExpiry[0]?.symbol, "VX/U6");
  assert.equal(onExpiry[0]?.symbol, "VX/V6");
});

test("C: excludes weekly VX contracts while retaining standard monthlies", () => {
  const rows = [
    { product: "VX", symbol: "VX35/U6", expirationDate: "2026-09-02", price: 16.2 },
    { product: "VX", symbol: "VX36/U6", expirationDate: "2026-09-09", price: 16.4 },
    monthlyRows[0],
    { product: "VX", symbol: "VX38/U6", expirationDate: "2026-09-23", price: 17.1 },
    monthlyRows[1],
  ];

  assert.deepEqual(
    selectMonthlyVixContracts(rows, "2026-08-28").map((row) => row.symbol),
    ["VX/U6", "VX/V6"],
  );
});

test("D: sorts mixed input and removes duplicate symbols and expirations", () => {
  const rows: CboeSettlementRow[] = [
    monthlyRows[2],
    { ...monthlyRows[1], price: null },
    monthlyRows[0],
    monthlyRows[1],
    { product: "VX", symbol: "VX/Z6", expirationDate: monthlyRows[2].expirationDate, price: 99 },
    { product: "VXT", symbol: "VX/F7", expirationDate: "2027-01-20", price: 20 },
  ];
  const selected = selectMonthlyVixContracts(rows, "2026-08-28");

  assert.deepEqual(selected.map((row) => row.symbol), ["VX/U6", "VX/V6", "VX/X6"]);
  assert.equal(selected[1]?.price, monthlyRows[1].price);
});

test("E: the UI consumes every selected point for both chart marks and table rows", () => {
  const data = buildDataFromContracts(
    selectMonthlyVixContracts(monthlyRows, "2026-08-28"),
    "2026-08-28",
  );
  const componentSource = readFileSync(new URL(
    "../../../components/dashboard/VixTermStructureModule.tsx",
    import.meta.url,
  ), "utf8");

  assert.equal(data.points.length, 9);
  assert.match(componentSource, /plottedPoints\.map/);
  assert.match(componentSource, /data\.points\.map/);
  assert.match(componentSource, /formatAxisExpiration\(point/);
  assert.doesNotMatch(componentSource, /VX1 \/ VX2 \/ VX3/);
  assert.doesNotMatch(componentSource, /slice\(0,\s*3\)/);
});

test("E2: VIX chart points expose a 24px target around the unchanged 16px marker", () => {
  const componentSource = readFileSync(new URL(
    "../../../components/dashboard/VixTermStructureModule.tsx",
    import.meta.url,
  ), "utf8");

  assert.match(componentSource, /data-vix-point=\{point\.label\}/);
  assert.match(componentSource, /inline-flex h-6 w-6/);
  assert.match(componentSource, /block h-4 w-4 rounded-full/);
  assert.match(componentSource, /data-vix-point-marker/);
});

test("F: exposes the corrected public Cboe settlement link", () => {
  const data = buildDataFromContracts(monthlyRows.slice(0, 3), "2026-08-28");
  assert.equal(
    data.sourceUrl,
    "https://www.cboe.com/markets/us/futures/market-statistics/settlement/futures/daily/",
  );

  const adapterSource = readFileSync(new URL("./vix-term-structure.ts", import.meta.url), "utf8");
  assert.doesNotMatch(
    adapterSource,
    /https:\/\/www\.cboe\.com\/us\/futures\/market_statistics\/settlement\/futures\/daily\//,
  );
});

test("G: keeps a monthly contract with a missing settlement as null", () => {
  const csv = [
    "Product,Symbol,Expiration Date,Price",
    "VX,VX/U6,2026-09-16,16.90",
    "VX,VX/V6,2026-10-21,",
    "VX,VX/X6,2026-11-18,19.10",
  ].join("\n");
  const selected = selectMonthlyVixContracts(parseCboeSettlements(csv), "2026-08-28");
  const data = buildDataFromContracts(selected, "2026-08-28");

  assert.equal(selected.length, 3);
  assert.equal(data.points[1]?.value, null);
  assert.equal(data.m1m2Spread, null);
  assert.equal(data.m1m3Spread, 19.1 - 16.9);
  assert.equal(data.classification, "Pendiente");
});

test("H: shows only the real available monthly contracts when fewer than nine exist", () => {
  const selected = selectMonthlyVixContracts(monthlyRows.slice(0, 2), "2026-08-28");
  const data = buildDataFromContracts(selected, "2026-08-28");

  assert.equal(data.points.length, 2);
  assert.deepEqual(data.points.map((point) => point.label), ["VX1", "VX2"]);
  assert.equal(data.points.some((point) => point.symbol === null), false);
});

test("preserves VX1-VX2 classification and VX1-VX3 metrics after extending the curve", () => {
  const selected = selectMonthlyVixContracts(monthlyRows, "2026-08-28");
  const shortCurve = buildDataFromContracts(selected.slice(0, 3), "2026-08-28");
  const fullCurve = buildDataFromContracts(selected, "2026-08-28");

  assert.equal(fullCurve.classification, shortCurve.classification);
  assert.equal(fullCurve.m1m2Spread, shortCurve.m1m2Spread);
  assert.equal(fullCurve.m1m2SlopePct, shortCurve.m1m2SlopePct);
  assert.equal(fullCurve.m1m3Spread, shortCurve.m1m3Spread);
  assert.equal(fullCurve.m1m3SlopePct, shortCurve.m1m3SlopePct);
});

function datedPublication(date:string,linkDate=date) {
  const rows=[['VX48/Z6','2026-12-01',25.0258],['VX/Z6','2026-12-16',25.0258],['VX/F7','2027-01-20',24.2921],['VX/G7','2027-02-17',23.9679]];
  return `<h3>Settlement Prices for <!-- -->${date}</h3>
    <a href="https://www-api.cboe.com/us/futures/market_statistics/settlement/csv?dt=${linkDate}">Download this as CSV</a>
    <h4>VX<!-- --> - <!-- -->Cboe Volatility Index (VX) Futures</h4>
    <table><tbody><tr><th>Symbol - Expiration Date</th><th>Settlement Price</th></tr>
    ${rows.map(([symbol,expiry,price])=>`<tr><td>${symbol}<!-- --> - <!-- -->${expiry}</td><td>${price}</td></tr>`).join('')}</tbody></table>`;
}

test('the effective date belongs to the official publication, independently of query day and unchanged prices',()=>{
  const publications=parseCboeDailyPublications(datedPublication('2026-11-25')+datedPublication('2026-11-24'),'2026-11-27T02:00:00Z');
  assert.deepEqual(publications.map(p=>p.settlementDate),['2026-11-25','2026-11-24']);
  const model=buildDataFromContracts(selectMonthlyVixContracts(publications[0].rows,publications[0].settlementDate),'2026-11-25','2026-11-27T02:00:00Z');
  assert.equal(model.settlementDate,'2026-11-25');assert.equal(model.retrievedAt,'2026-11-27T02:00:00Z');
  assert.equal(model.points[0].value,25.0258);assert.equal(model.points[1].value,24.2921);
  assert.match(model.lastUpdated!,/25/);assert.doesNotMatch(model.lastUpdated!,/27/);
});
test('future, invalid or mismatched publication dates are not accepted',()=>{
  const asOf='2026-11-27T02:00:00Z';
  assert.deepEqual(parseCboeDailyPublications(datedPublication('2026-11-28'),asOf),[]);
  assert.deepEqual(parseCboeDailyPublications(datedPublication('2026-02-30'),asOf),[]);
  assert.deepEqual(parseCboeDailyPublications(datedPublication('2026-11-27','2026-11-25'),asOf),[]);
  assert.deepEqual(parseCboeDailyPublications(datedPublication('2026-11-25').replace('www-api.cboe.com','example.com'),asOf),[]);
});
test('the actual adapter uses the dated publication rather than probing CSVs with invented dates',async t=>{
  const calls:string[]=[];
  t.mock.method(globalThis,'fetch',async(url:string|URL|Request)=>{
    calls.push(String(url));return new Response(datedPublication('2026-11-25'),{headers:{'Content-Type':'text/html'}});
  });
  const model=await getVixTermStructureData();
  assert.equal(model.settlementDate,'2026-11-25');assert.ok(model.retrievedAt);
  assert.equal(calls.length,1);assert.equal(calls[0],'https://www.cboe.com/markets/us/futures/market-statistics/settlement/futures/daily/');
});
