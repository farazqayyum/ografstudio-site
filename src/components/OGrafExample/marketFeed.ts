// The live data behind the Live markets example. A graphic doesn't fetch anything itself: whoever
// plays it sends it data, and on this page that's the code here. It listens to Coinbase Exchange's
// public feed and passes on what it hears a few times a second. The graphic does the rest, including
// everything a visitor clicks, so this sends every market and range and lets the graphic choose.
import {ASSETS, RANGES, SOCKET, fetchCandles, fetchMarket, fetchRates} from '@site/src/data/marketData.mjs';

type Sender = {update(data: Record<string, unknown>): Promise<unknown>};
type Market = {
  id: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  bid: number;
  ask: number;
};
type Trade = {id: string; sym: string; price: number; size: number; side: string; time: string};
type Range = keyof typeof RANGES;

const SEND_EVERY_MS = 500;
const TRADES_KEPT = 9;
/** One market gets one row of the trade list this often, or the busiest would fill it. */
const TRADE_GAP_MS = 1200;
/** Smaller trades than this stay out of the list, where they'd only say "<$1". */
const TRADE_MIN_USD = 25;
const RECONNECT_MAX_MS = 30_000;
/** With the socket down, prices still arrive this often. */
const POLL_MS = 15_000;
const REFRESH_MS: Record<Range, number> = {'1H': 60_000, '24H': 300_000, '7D': 900_000};
/** Coinbase allows ten public requests a second. */
const REQUEST_GAP_MS = 130;

export function startMarketFeed(player: Sender, signal: AbortSignal): void {
  const markets = new Map<string, Market>();
  const history: Record<string, Record<string, unknown>> = {};
  const lastTradeRow = new Map<string, number>();
  const timers = new Set<number>();
  let trades: Trade[] = [];
  let asOf = '';
  let status = 'connecting';
  let pending: Record<string, unknown> = {feed_status: status};
  let sending = false;
  let socket: WebSocket | null = null;
  let attempt = 0;

  const later = (work: () => void, ms: number) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (!signal.aborted) work();
    }, ms);
    timers.add(timer);
  };
  const setStatus = (next: string) => {
    if (next === status) return;
    status = next;
    pending.feed_status = next;
  };

  /** Only a full list: the watchlist's rows follow its order. */
  const queueMarkets = () => {
    if (ASSETS.every(({id}) => markets.has(id))) pending.markets = ASSETS.map(({id}) => markets.get(id));
  };

  const send = async () => {
    if (sending || document.hidden || Object.keys(pending).length === 0) return;
    const batch = pending;
    pending = {};
    sending = true;
    try {
      await player.update(batch);
    } catch {
      // The graphic is on its way out, or this update was overtaken by the next one.
    } finally {
      sending = false;
    }
  };
  const sender = window.setInterval(() => void send(), SEND_EVERY_MS);

  const hear = (message: Record<string, string>) => {
    if (message.type !== 'ticker') return;
    const id = message.product_id?.split('-')[0];
    const asset = ASSETS.find((item) => item.id === id);
    if (!asset || !id) return;
    markets.set(id, {
      id,
      name: asset.name,
      price: Number(message.price),
      open: Number(message.open_24h),
      high: Number(message.high_24h),
      low: Number(message.low_24h),
      volume: Number(message.volume_24h),
      bid: Number(message.best_bid),
      ask: Number(message.best_ask),
    });
    queueMarkets();
    setStatus('live');
    if (message.time) {
      // The graphic's clock is this machine's, which can run a little behind the exchange's. A trade
      // shouldn't look like it happened in the future.
      const clock = new Date().toISOString();
      asOf = message.time < clock ? message.time : clock;
      pending.as_of = asOf;
    }
    const now = Date.now();
    const worth = Number(message.price) * Number(message.last_size);
    if (message.trade_id && worth >= TRADE_MIN_USD && now - (lastTradeRow.get(id) ?? 0) >= TRADE_GAP_MS) {
      lastTradeRow.set(id, now);
      trades = [
        {
          id: `${id}-${message.trade_id}`,
          sym: id,
          price: Number(message.price),
          size: Number(message.last_size),
          side: message.side,
          time: message.time,
        },
        ...trades,
      ].slice(0, TRADES_KEPT);
      pending.trades = trades;
    }
  };

  const connect = () => {
    socket = new WebSocket(SOCKET);
    socket.onopen = () => {
      attempt = 0;
      socket?.send(
        JSON.stringify({
          type: 'subscribe',
          product_ids: ASSETS.map(({id}) => `${id}-USD`),
          channels: ['ticker'],
        }),
      );
    };
    socket.onmessage = (event) => {
      try {
        hear(JSON.parse(String(event.data)) as Record<string, string>);
      } catch {
        // One unreadable message isn't worth stopping for.
      }
    };
    socket.onclose = () => {
      if (signal.aborted) return;
      setStatus('reconnecting');
      attempt += 1;
      later(connect, Math.min(RECONNECT_MAX_MS, 1000 * 2 ** (attempt - 1)));
    };
  };

  /** A network that blocks the socket can still reach the same prices over plain requests. */
  const poll = async () => {
    if (status !== 'live') {
      try {
        const latest = await Promise.all(ASSETS.map((asset) => fetchMarket(asset, signal)));
        for (const market of latest) markets.set(market.id, market as Market);
        queueMarkets();
      } catch {
        // Try again next time.
      }
    }
    later(() => void poll(), POLL_MS);
  };

  const fetchRange = async (range: Range) => {
    for (const {id} of ASSETS) {
      if (signal.aborted) return;
      try {
        (history[id] ??= {})[range] = await fetchCandles(id, range, signal);
      } catch {
        // The graphic keeps the candles it has for this one.
      }
      await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS));
    }
    if (ASSETS.every(({id}) => history[id]?.['24H'])) pending.history = JSON.stringify(history);
    later(() => void fetchRange(range), REFRESH_MS[range]);
  };

  signal.addEventListener('abort', () => {
    window.clearInterval(sender);
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
  });

  connect();
  later(() => void poll(), POLL_MS);
  // The ranges the first screen needs come first, one after the other.
  void fetchRange('24H').then(() => fetchRange('1H')).then(() => fetchRange('7D'));
  void fetchRates(signal)
    .then((fx) => {
      pending.fx = fx;
    })
    .catch(() => undefined);
}
