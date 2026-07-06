const displayByTicker: Record<string, { ticker: string; name: string }> = {
  BTCUSD: { ticker: "BTC/USDT", name: "Bitcoin spot" },
  BTCUSDT: { ticker: "BTC/USDT", name: "Bitcoin spot" },
  ETHUSD: { ticker: "ETH/USDT", name: "Ethereum spot" },
  ETHUSDT: { ticker: "ETH/USDT", name: "Ethereum spot" },
};

const canonicalTickerByAlias: Record<string, string> = {
  "BTC/USDT": "BTCUSD",
  BTCUSDT: "BTCUSD",
  "ETH/USDT": "ETHUSD",
  ETHUSDT: "ETHUSD",
};

export function canonicalStatTicker(ticker: string) {
  return canonicalTickerByAlias[ticker.toUpperCase()] ?? ticker.toUpperCase();
}

export function displayStatTicker(ticker: string) {
  return displayByTicker[ticker.toUpperCase()]?.ticker ?? ticker;
}

export function displayStatName(ticker: string, name: string) {
  return displayByTicker[ticker.toUpperCase()]?.name ?? name;
}
