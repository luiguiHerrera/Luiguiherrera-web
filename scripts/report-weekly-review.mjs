// Offline verification only. Rendering and exports consume the persisted result.
export function calculateWeeklyReviewMetrics(prices, cboeVixRows, { asOf, weekBaseDate, ytdBaseDate }) {
  const rowsAtCut = (rows) => {
    const filtered = rows.filter(row => row.date <= asOf);
    if (filtered.some((row, i) => i && row.date <= filtered[i - 1].date)) {
      throw new Error('Dates must be unique and ascending');
    }
    return filtered;
  };
  const exact = (rows, date) => {
    const row = rows.find(row => row.date === date);
    if (!row || !Number.isFinite(row.close) || row.close <= 0) throw new Error(`Missing valid close: ${date}`);
    return row;
  };
  const returns = {};
  for (const [ticker, source] of Object.entries(prices)) {
    const rows = rowsAtCut(source.rows);
    const end = exact(rows, asOf);
    const week = exact(rows, weekBaseDate);
    const year = exact(rows, ytdBaseDate);
    for (const row of [end, week, year]) {
      if (!Number.isFinite(row.adjustedClose) || row.adjustedClose <= 0) throw new Error(`${ticker}: invalid adjusted close`);
    }
    returns[ticker] = {
      asOf, weekBaseDate, ytdBaseDate,
      close: end.adjustedClose,
      weekBaseClose: week.adjustedClose,
      ytdBaseClose: year.adjustedClose,
      weeklyReturnPct: (end.adjustedClose / week.adjustedClose - 1) * 100,
      ytdReturnPct: (end.adjustedClose / year.adjustedClose - 1) * 100,
    };
  }
  const rank = tickers => tickers.map(ticker => ({ ticker, weeklyReturnPct: returns[ticker].weeklyReturnPct }))
    .sort((a, b) => b.weeklyReturnPct - a.weeklyReturnPct);
  const sectors = rank(['XLK','XLF','XLV','XLE','XLY','XLP','XLI','XLB','XLU','XLRE','XLC']);
  const megacaps = rank(['AAPL','MSFT','AMZN','GOOGL','META','NVDA','TSLA']);
  const spx = rowsAtCut(prices['^GSPC'].rows);
  exact(spx, asOf);
  let boundary = spx.length - 1;
  // Price index, regular close to regular close. Equality at -1% breaks the streak.
  while (boundary > 0 && spx[boundary].close > spx[boundary - 1].close * 0.99) boundary--;
  if (boundary === 0) throw new Error('Insufficient history to locate the last daily decline of at least 1%');
  const vix = rowsAtCut(cboeVixRows);
  const vixEnd = exact(vix, asOf), vixStart = exact(vix, weekBaseDate);
  return {
    asOf, weekBaseDate, ytdBaseDate, returns, sectors, megacaps,
    megacapDispersionPp: megacaps[0].weeklyReturnPct - megacaps.at(-1).weeklyReturnPct,
    spxCalm: {
      symbol: '^GSPC', thresholdPct: -1,
      consecutiveSessions: spx.length - 1 - boundary,
      firstSession: spx[boundary + 1]?.date ?? null,
      lastSession: asOf,
      lastQualifyingDeclineDate: spx[boundary].date,
      lastQualifyingDeclinePct: (spx[boundary].close / spx[boundary - 1].close - 1) * 100,
    },
    vix: { asOf, close: vixEnd.close, weekBaseClose: vixStart.close, weeklyChangePoints: vixEnd.close - vixStart.close },
  };
}
