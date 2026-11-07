// What the Live markets example shows and where it comes from. The feed on the site and the script
// that saves the graphic's sample data both read this.
export const SOURCE = 'Coinbase Exchange';
export const API = 'https://api.exchange.coinbase.com';
export const SOCKET = 'wss://ws-feed.exchange.coinbase.com';
const FX_API = 'https://api.frankfurter.dev/v1';
/** Far enough back to find the last two days with rates, over any holiday weekend. */
const FX_DAYS_BACK = 7;
/** These read as dollars for one unit: EUR/USD, not USD/EUR. */
const USD_SECOND = ['EUR', 'GBP', 'CHF'];
const USD_FIRST = ['JPY', 'TRY'];

export const ASSETS = [
  {id: 'BTC', name: 'Bitcoin'},
  {id: 'ETH', name: 'Ethereum'},
  {id: 'SOL', name: 'Solana'},
  {id: 'XRP', name: 'XRP'},
  {id: 'DOGE', name: 'Dogecoin'},
  {id: 'ADA', name: 'Cardano'},
  {id: 'AVAX', name: 'Avalanche'},
  {id: 'LINK', name: 'Chainlink'},
];

/** Each range: the candle size Coinbase serves, how many of those make one of ours, and how far back. */
export const RANGES = {
  '1H': {granularity: 60, merge: 1, span: 3600},
  '24H': {granularity: 900, merge: 2, span: 86400},
  '7D': {granularity: 3600, merge: 3, span: 604800},
};

// A Function takes at most 64 KiB of input, and the feed's other fields need room too. Eight markets at
// three ranges come to about 45 KB like this, and five digits are plenty to draw a chart.
const round = (value, digits = 5) => Number(Number(value).toPrecision(digits));

/** One market's candles for one range, oldest first: rows of [open, high, low, close, volume]. */
export async function fetchCandles(id, range, signal) {
  const {granularity, merge, span} = RANGES[range];
  const end = new Date();
  const start = new Date(end.getTime() - span * 1000);
  const query = `granularity=${granularity}&start=${start.toISOString()}&end=${end.toISOString()}`;
  const response = await fetch(`${API}/products/${id}-USD/candles?${query}`, {signal});
  if (!response.ok) throw new Error(`Candles ${id} ${range}: ${response.status}`);
  // Newest first, as [time, low, high, open, close, volume].
  const rows = (await response.json()).reverse();
  const merged = [];
  // The newest candle keeps its own group, so the chart ends at the latest price.
  for (let end = rows.length; end > 0; end -= merge) {
    const group = rows.slice(Math.max(0, end - merge), end);
    merged.unshift({
      time: group[group.length - 1][0],
      open: group[0][3],
      high: Math.max(...group.map((row) => row[2])),
      low: Math.min(...group.map((row) => row[1])),
      close: group[group.length - 1][4],
      volume: group.reduce((sum, row) => sum + row[5], 0),
    });
  }
  return {
    s: granularity * merge,
    t: merged[merged.length - 1].time,
    r: merged.map((row) => [
      round(row.open),
      round(row.high),
      round(row.low),
      round(row.close),
      round(row.volume, 2),
    ]),
  };
}

/** One market right now, over the last 24 hours. */
export async function fetchMarket({id, name}, signal) {
  const [stats, ticker] = await Promise.all(
    [`${API}/products/${id}-USD/stats`, `${API}/products/${id}-USD/ticker`].map(async (url) => {
      const response = await fetch(url, {signal});
      if (!response.ok) throw new Error(`Market ${id}: ${response.status}`);
      return response.json();
    }),
  );
  return {
    id,
    name,
    price: Number(ticker.price ?? stats.last),
    open: Number(stats.open),
    high: Number(stats.high),
    low: Number(stats.low),
    volume: Number(stats.volume),
    bid: Number(ticker.bid),
    ask: Number(ticker.ask),
  };
}

/** Daily reference rates, as [{pair, rate, previous}], where `previous` is the last day's before that. */
export async function fetchRates(signal) {
  const from = new Date(Date.now() - FX_DAYS_BACK * 86_400_000).toISOString().slice(0, 10);
  const symbols = [...USD_SECOND, ...USD_FIRST].join(',');
  const response = await fetch(`${FX_API}/${from}..?base=USD&symbols=${symbols}`, {signal});
  if (!response.ok) throw new Error(`Rates: ${response.status}`);
  // The source quotes everything per dollar, one set of rates for each working day.
  const {rates} = await response.json();
  const days = Object.keys(rates).sort();
  const latest = rates[days[days.length - 1]] ?? {};
  const before = rates[days[days.length - 2]] ?? {};
  return [
    ...USD_SECOND.map((currency) => ({
      pair: `${currency}/USD`,
      rate: round(1 / latest[currency]),
      previous: round(1 / before[currency]),
    })),
    ...USD_FIRST.map((currency) => ({
      pair: `USD/${currency}`,
      rate: latest[currency],
      previous: before[currency],
    })),
  ].filter(({rate}) => Number.isFinite(rate));
}
