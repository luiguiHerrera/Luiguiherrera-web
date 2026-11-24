// Local, file-only import. Download the original files through the issuers' public controls.
// No network requests, credentials, production storage or scheduled-task mutations.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { pathToFileURL } from 'node:url';
import { aggregateFundFlows, buildFundFlows, compareRevisions, flowWindow, interpretFlows } from '../../lib/dashboard/sp500-etf-flows.mjs';

const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
export function sourceDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  let match = /^(\d{2})-([A-Z][a-z]{2})-(\d{4})$/.exec(String(value));
  if (match && MONTHS[match[2]]) return `${match[3]}-${MONTHS[match[2]]}-${match[1]}`;
  match = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/.exec(String(value));
  if (match && MONTHS[match[1]]) return `${match[3]}-${MONTHS[match[1]]}-${match[2].padStart(2, '0')}`;
  return null;
}
export async function parseStateStreetNav(buffer, ticker = 'SPY') {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet('navhist');
  if (!sheet || String(sheet.getCell('B2').value).replace(/[®™]/g, '').trim() !== ticker) throw new Error(`Unexpected ${ticker} workbook`);
  const headers = ['Date', 'NAV', 'Shares Outstanding', 'Total Net Assets'];
  if (headers.some((header, i) => sheet.getRow(4).getCell(i + 1).value !== header)) throw new Error('SPY schema changed');
  const rows = [];
  sheet.eachRow((row, i) => {
    if (i <= 4) return;
    const date = sourceDate(row.getCell(1).value);
    if (date) rows.push({ date, nav: row.getCell(2).value, shares: row.getCell(3).value, assets: row.getCell(4).value });
  });
  return rows;
}
export const parseSpy = buffer => parseStateStreetNav(buffer, 'SPY');
function unescapeXml(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
export function parseIvv(buffer) {
  const xml = buffer.toString('utf8');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || !xml.includes('iShares Core S&amp;P 500 ETF') && !xml.includes('iShares Core S&P 500 ETF')) throw new Error('Unexpected IVV workbook');
  const historical = /<ss:Worksheet ss:Name="Historical">([\s\S]*?)<\/ss:Worksheet>/.exec(xml)?.[1];
  if (!historical) throw new Error('IVV Historical worksheet missing');
  const rows = [...historical.matchAll(/<ss:Row(?:\s[^>]*)?>([\s\S]*?)<\/ss:Row>/g)].map(match => {
    const cells = [];
    for (const cell of match[1].matchAll(/<ss:Cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/ss:Cell>)/g)) {
      const index = /ss:Index="(\d+)"/.exec(cell[1]);
      if (index) while (cells.length < Number(index[1]) - 1) cells.push(null);
      const data = /<ss:Data ss:Type="(String|Number|DateTime)">([\s\S]*?)<\/ss:Data>/.exec(cell[2] ?? '');
      cells.push(!data ? null : data[1] === 'Number' ? Number(data[2]) : unescapeXml(data[2]));
    }
    return cells;
  });
  if (JSON.stringify(rows[0]) !== JSON.stringify(['As Of', 'NAV per Share', 'Ex-Dividends', 'Shares Outstanding'])) throw new Error('IVV schema changed');
  return rows.slice(1).map(row => ({ date: sourceDate(row[0]), nav: row[1], shares: row[3] })).filter(row => row.date);
}

export async function importPreview(spyFile, ivvFile, outputDirectory = '/tmp/sp500-etf-flows-preview') {
  const asOf = new Date().toISOString();
  const sources = [
    { ticker: 'SPY', issuer: 'State Street', file: spyFile, parse: parseSpy,
      url: 'https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy',
      download: 'https://www.ssga.com/us/en/individual/library-content/products/fund-data/etfs/us/navhist-us-en-spy.xlsx' },
    { ticker: 'IVV', issuer: 'iShares · BlackRock', file: ivvFile, parse: parseIvv,
      url: 'https://www.ishares.com/us/products/239726/ishares-core-sp-500-etf',
      download: 'https://www.blackrock.com/varnish-api/blk-one01-product-data/product-data/api/v1/get-fund-document?appType=PRODUCT_PAGE&appSubType=ISHARES&targetSite=us-ishares&locale=en_US&portfolioId=239726&component=fundDownload&userType=individual' },
  ];
  let previous = null;
  try { previous = JSON.parse(await fs.readFile(path.join(outputDirectory, 'data.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const imported = [];
  for (const source of sources) {
    const buffer = await fs.readFile(source.file);
    if (buffer.length > 12_000_000) throw new Error('Unexpectedly large issuer workbook');
    const raw = (await source.parse(buffer)).sort((a, b) => a.date.localeCompare(b.date));
    const fund = buildFundFlows(source.ticker, raw, { asOf });
    if (fund.points.length < 21) throw new Error(`${source.ticker}: insufficient verified history`);
    const revisions = previous ? compareRevisions(previous.funds.find(fund => fund.ticker === source.ticker)?.points ?? [], fund.points) : null;
    imported.push({ ...fund, issuer: source.issuer, url: source.url, download: source.download,
      filename: path.basename(source.file), sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      fileDownloadedAt: (await fs.stat(source.file)).mtime.toISOString(),
      history: { firstNav: raw[0]?.date, firstShares: raw.find(row => Number.isSafeInteger(row.shares) && row.shares > 0)?.date,
        last: raw.at(-1)?.date, sourceRows: raw.length }, revisions });
  }
  const included = imported.map(fund => fund.ticker);
  const aggregate = aggregateFundFlows(imported, included);
  const data = { version: 1, asOf, included, funds: imported, ...aggregate,
    excluded: [{ ticker: 'VOO', reason: 'Histórico diario conjunto de participaciones y NAV no validado. Las conversiones desde otras clases del fondo requieren una comprobación adicional.' }],
    publication: 'pending-permission', automation: 'not-enabled' };
  await fs.mkdir(outputDirectory, { recursive: true });
  // Keep previous imports and issuer notices; no source file enters public/ or the checkout.
  if (previous) await fs.writeFile(path.join(outputDirectory, `previous-${Date.now()}.json`), JSON.stringify(previous));
  for (const source of sources) await fs.copyFile(source.file, path.join(outputDirectory, path.basename(source.file)));
  await fs.writeFile(path.join(outputDirectory, 'data.json'), JSON.stringify(data));
  const summary = { cutoff: data.cutoffDate, included, sources: imported.map(fund => ({ ticker: fund.ticker, history: fund.history,
    rows: fund.points.length, audit: fund.audit, latest: fund.points.at(-1), revisions: fund.revisions })),
    windows: [1, 5, 20].map(n => flowWindow(data.points, n)), interpretation: [5, 20].map(n => interpretFlows(data.points, n)) };
  await fs.writeFile(path.join(outputDirectory, 'verification.json'), JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: node scripts/research/sp500-etf-flows-preview.mjs SPY.xlsx IVV.xls [output-dir]');
  console.log(JSON.stringify(await importPreview(process.argv[2], process.argv[3], process.argv[4]), null, 2));
}
