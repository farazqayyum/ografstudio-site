/**
 * Saves real prices for the Live markets example, so the graphic has something true to show before
 * any feed reaches it: on Studio's canvas, in thumbnails, or in a controller that sends no data.
 *
 *   node examples-src/live-markets-snapshot.mjs
 */
import { writeFileSync } from 'node:fs';
import { API, ASSETS, RANGES, fetchCandles, fetchMarket, fetchRates } from '../src/data/marketData.mjs';

const markets = await Promise.all(ASSETS.map((asset) => fetchMarket(asset)));

const history = {};
for (const { id } of ASSETS) {
  history[id] = {};
  for (const range of Object.keys(RANGES)) {
    history[id][range] = await fetchCandles(id, range);
    await new Promise((resolve) => setTimeout(resolve, 120)); // Coinbase allows ten requests a second.
  }
}

const trades = [];
for (const { id } of ASSETS.slice(0, 4)) {
  const rows = await (await fetch(`${API}/products/${id}-USD/trades?limit=100`)).json();
  // Three that are worth listing, as the feed on the site does.
  for (const row of rows.filter((item) => Number(item.price) * Number(item.size) >= 25).slice(0, 3))
    trades.push({
      id: `${id}-${row.trade_id}`,
      sym: id,
      price: Number(row.price),
      size: Number(row.size),
      // Coinbase names the resting order's side here; the socket names the side that traded into it.
      side: row.side === 'buy' ? 'sell' : 'buy',
      time: row.time,
    });
}
trades.sort((a, b) => b.time.localeCompare(a.time));

const fx = await fetchRates();
const snapshot = { taken: new Date().toISOString(), markets, history, trades, fx };
writeFileSync(new URL('live-markets-snapshot.json', import.meta.url), `${JSON.stringify(snapshot)}\n`);
console.log(`Saved ${markets.length} markets, ${JSON.stringify(history).length} bytes of history.`);
