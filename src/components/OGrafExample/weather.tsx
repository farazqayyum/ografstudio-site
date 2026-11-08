import {useEffect, useState, type ComponentProps} from 'react';
import type OGrafExample from './index';
import {FEED_EVENT, type FeedNews} from './weatherNews';
import styles from './weather.module.css';

const clock = (at: number) => new Date(at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

/** Says the forecast is the real one, and when this browser fetched it. */
function LiveForecast() {
  const [at, setAt] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const hear = (event: Event) => {
      const news = (event as CustomEvent<FeedNews>).detail;
      if ('at' in news) setAt(news.at);
      setFailed('failed' in news);
    };
    window.addEventListener(FEED_EVENT, hear);
    return () => window.removeEventListener(FEED_EVENT, hear);
  }, []);
  let text;
  if (at === null && failed) text = <>Open-Meteo didn't answer, so this is a saved forecast. Trying again in a minute.</>;
  else if (at === null) text = <>Fetching today's real forecast now.</>;
  else
    text = (
      <>
        Today's real forecast, fetched by your browser at {clock(at)}, and again every 15 minutes
        {failed ? ". The last try didn't get through" : ''}.
      </>
    );
  return (
    <>
      <span className={styles.live}>
        <span className={styles.dot} aria-hidden="true" />
        Live
      </span>
      {text}
    </>
  );
}

const SOURCES = (
  <>
    <LiveForecast /> From <a href="https://open-meteo.com/">Open-Meteo</a>, under{' '}
    <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Map from{' '}
    <a href="https://www.naturalearthdata.com/">Natural Earth</a>.
  </>
);

/** How the Europe weather sequence plays: on the live forecast, with the outlook city to choose. */
export const WEATHER: Partial<ComponentProps<typeof OGrafExample>> = {
  feed: 'weather',
  formFields: ['featured', 'tour'],
  lockedBy: {featured: 'tour'},
  landscapeFullscreen: true,
  sources: SOURCES,
};

/** How the weather strap plays: on the same forecast, with its city and time to choose. */
export const WEATHER_STRAP: Partial<ComponentProps<typeof OGrafExample>> = {
  feed: 'weather',
  formFields: ['city', 'when'],
  landscapeFullscreen: true,
  sources: SOURCES,
};
