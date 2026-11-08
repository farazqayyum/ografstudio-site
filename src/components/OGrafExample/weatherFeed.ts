// The live forecast behind the Weather examples. A graphic doesn't fetch anything itself: whoever
// plays it sends it data, and on this page that's the code here. It asks Open-Meteo for all twelve
// cities when the graphic loads and again every quarter of an hour, and sends the answer as one
// update. The graphic does the rest, including the city the visitor picks.
import {fetchForecast} from '@site/src/data/weatherData.mjs';
import {FEED_EVENT, type FeedNews} from './weatherNews';

type Sender = {update(data: Record<string, unknown>): Promise<unknown>};

const tell = (news: FeedNews) => window.dispatchEvent(new CustomEvent<FeedNews>(FEED_EVENT, {detail: news}));

/** Open-Meteo refreshes its forecasts hourly, so this is plenty. */
const REFRESH_MS = 15 * 60_000;
/** After a failed request the graphic keeps what it shows, and this asks again sooner. */
const RETRY_MS = 60_000;

export function startWeatherFeed(player: Sender, signal: AbortSignal): void {
  let timer: number | undefined;
  const run = async () => {
    if (signal.aborted) return;
    let next = REFRESH_MS;
    try {
      // A tab in the background waits; the forecast it would fetch is the one it gets on return.
      if (document.hidden) next = RETRY_MS;
      else {
        const cities = await fetchForecast(signal);
        if (!signal.aborted) {
          await player.update({cities});
          tell({at: Date.now()});
        }
      }
    } catch {
      next = RETRY_MS;
      if (!signal.aborted) tell({failed: true});
    }
    if (!signal.aborted) timer = window.setTimeout(run, next);
  };
  signal.addEventListener('abort', () => window.clearTimeout(timer));
  void run();
}
