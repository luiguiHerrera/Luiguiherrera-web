import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { calculateWeeklyReviewMetrics } from '../../scripts/report-weekly-review.mjs';
import { firstSeptember2026AutomaticReadings as snapshot } from './historical-automatic-readings.ts';

const base = 'lib/reports/snapshots/primer-informe-septiembre-2026/';
const read = (name: string) => JSON.parse(gunzipSync(readFileSync(base + name)).toString());
const original = read('prices-evidence.json.gz');
const evidence = read('weekly-review-evidence.json.gz');
const saved = evidence.metrics;
const prices = Object.fromEntries(Object.keys(saved.returns).map(ticker => [ticker, evidence.additionalPrices[ticker] ?? original[ticker]]));
const options = { asOf: '2026-09-04', weekBaseDate: '2026-08-28', ytdBaseDate: '2025-12-31' };
type PriceRow = { date: string; close: number; adjustedClose: number };

test('weekly and YTD returns, all sector ranks, seven megacaps and VIX reproduce from exact frozen closes', () => {
  assert.deepEqual(calculateWeeklyReviewMetrics(prices, evidence.cboeVix.rows, options), saved);
  assert.deepEqual(saved.sectors.map((s: {ticker: string}) => s.ticker), ['XLE','XLK','XLU','XLV','XLF','XLC','XLP','XLI','XLRE','XLB','XLY']);
  assert.equal(saved.returns.XLF.weeklyReturnPct, 0);
  assert.deepEqual(saved.megacaps.map((s: {ticker: string}) => s.ticker), ['META','NVDA','TSLA','AAPL','GOOGL','MSFT','AMZN']);
  assert(saved.returns.IWM.ytdReturnPct > saved.returns.QQQ.ytdReturnPct && saved.returns.QQQ.ytdReturnPct > saved.returns.SPY.ytdReturnPct);
  assert.equal(saved.vix.close, 14.53);
  assert.equal(saved.returns['^VIX'].close, saved.vix.close);
  for (const source of Object.values(prices)) {
    assert(source.rows.every((r: PriceRow) => r.date <= options.asOf));
    assert.equal(source.rows.filter((r: PriceRow) => r.date > options.weekBaseDate).length, 5);
  }
  for (const sector of [...snapshot.sectors.leaders, ...snapshot.sectors.laggards]) {
    assert(Math.abs(saved.returns[sector.ticker].weeklyReturnPct - sector.return1w) < 0.00001);
  }
});

test('published editorial numbers agree with the audit, including weekly versus YTD scope', () => {
  const review = snapshot.weeklyReview!;
  const weekly = (ticker: string) => saved.returns[ticker].weeklyReturnPct.toFixed(2).replace('.', ',');
  for (const ticker of ['XLE','META','NVDA','AMZN','MSFT','GOOGL']) {
    assert([...review.support, ...review.caution].join(' ').includes(`${ticker} ${saved.returns[ticker].weeklyReturnPct > 0 ? '+' : ''}${weekly(ticker)} %`));
  }
  for (const ticker of ['IWM','SPY','QQQ']) assert(review.support[3].includes(`${ticker} +${saved.returns[ticker].ytdReturnPct.toFixed(2).replace('.', ',')} %`));
  assert(review.support[0].includes(`+${weekly('XLV')} %`));
  assert(review.support[0].includes(`+${saved.returns.XLV.ytdReturnPct.toFixed(2).replace('.', ',')} % YTD`));
  assert(review.support[0].includes(`+${weekly('XLK')} %`));
  assert(review.support[2].includes(`+${weekly('USO')} %`));
  assert(review.caution[0].includes(`XLY ${weekly('XLY')} %`));
  for (const ticker of ['XLB','XLRE']) assert(review.caution[0].includes(`${Math.abs(saved.returns[ticker].weeklyReturnPct).toFixed(2).replace('.', ',')} %`));
  assert(review.caution[1].includes(saved.megacapDispersionPp.toFixed(2).replace('.', ',')));
  assert(review.caution[2].includes(`${saved.spxCalm.consecutiveSessions} sesiones`));
  assert(review.caution[2].includes(saved.vix.close.toFixed(2).replace('.', ',')));
  assert(review.caution[2].includes(saved.vix.weeklyChangePoints.toFixed(2).replace('.', ',')));
});

test('SPX calm streak counts regular trading sessions and includes a decline of exactly 1% as a break', () => {
  assert.equal(saved.spxCalm.consecutiveSessions, 27);
  assert.equal(saved.spxCalm.firstSession, '2026-07-30');
  assert.equal(saved.spxCalm.lastQualifyingDeclineDate, '2026-07-29');
  const dates = (rows: PriceRow[]) => rows.filter(r => r.date >= '2026-07-29' && r.date <= options.asOf).map(r => r.date);
  assert.deepEqual(dates(prices['^GSPC'].rows), dates(prices.SPY.rows));
  const altered = structuredClone(prices);
  altered['^GSPC'].rows.at(-2).close = 100;
  altered['^GSPC'].rows.at(-1).close = 99;
  const boundary = calculateWeeklyReviewMetrics(altered, evidence.cboeVix.rows, options).spxCalm;
  assert.equal(boundary.consecutiveSessions, 0);
  assert.equal(boundary.firstSession, null);
  assert.equal(boundary.lastQualifyingDeclineDate, options.asOf);
});

test('future market rows cannot change the audit; missing exact anchors fail instead of choosing a different window', () => {
  const futurePrices = structuredClone(prices);
  for (const source of Object.values(futurePrices)) source.rows.push({ date: '2026-09-08', close: 999999, adjustedClose: 999999 });
  const futureVix = [...evidence.cboeVix.rows, { date: '2026-09-08', close: 99 }];
  assert.deepEqual(calculateWeeklyReviewMetrics(futurePrices, futureVix, options), saved);
  for (const date of [options.asOf, options.weekBaseDate, options.ytdBaseDate]) {
    const missing = structuredClone(prices);
    missing.SPY.rows = missing.SPY.rows.filter((r: PriceRow) => r.date !== date);
    assert.throws(() => calculateWeeklyReviewMetrics(missing, evidence.cboeVix.rows, options), /Missing valid close/);
  }
});

test('the addendum is deeply frozen and leaves all original snapshot files and numeric breadth values intact', () => {
  assert.equal(snapshot.weeklyReview?.asOf, options.asOf);
  assert.throws(() => snapshot.weeklyReview!.support.push('future data'), TypeError);
  assert.throws(() => { snapshot.weeklyReview!.sources[0].href = 'https://example.org'; }, TypeError);
  // Pins from the original reviewed capture. The semantic-source branch need not
  // exist in a fresh clone of the production integration's own Git ancestry.
  const originalHashes = {
    'automatic.json': '945692213bc501f8ade3a2ea2da008d7f279b32376099d38baf4a36d8082f879',
    'statistical.json': 'a93c1e9c97b5925a5ce6b9aa795a340795a26967ef2544e7da7953dab60d6e6b',
    'dashboard-evidence.json': 'e86698edf44aaa0aa67e1d7124b10c89ab128b1787585c08fa6e1df5ebfee524',
    'prices-evidence.json.gz': 'faef2218ab59a796786e90696a93ddf0005de681bf1cf29a33feb57d67e18387',
    'btc-source.json': '228a63f829b28af82d891ac7d5d046799eba358910e5b528470e50c85575ef23',
  };
  for (const [file, hash] of Object.entries(originalHashes)) {
    assert.equal(createHash('sha256').update(readFileSync(base + file)).digest('hex'), hash, file);
  }
  const old = JSON.parse(readFileSync(base + 'automatic.json', 'utf8'));
  for (const key of ['rspVsSpy1wPp','iwmVsSpy1wPp','qqqVsSpy1wPp','sectorsOverLongAverage','sectorsOverLongAverageTotal'] as const) assert.equal(snapshot.breadth![key], old.breadth[key]);
  const windowReturn = (ticker: string) => {
    const rows = prices[ticker].rows as PriceRow[];
    return (rows.find(r => r.date === options.asOf)!.adjustedClose / rows.find(r => r.date === '2026-08-31')!.adjustedClose - 1) * 100;
  };
  for (const [ticker, key] of [['RSP','rspVsSpy1wPp'],['IWM','iwmVsSpy1wPp'],['QQQ','qqqVsSpy1wPp']] as const) {
    assert.equal((windowReturn(ticker) - windowReturn('SPY')).toFixed(2), snapshot.breadth![key]!.toFixed(2));
  }
  assert.equal(snapshot.breadth?.windowLabel, '31/08–04/09');
});
