import type {ComponentProps} from 'react';
import type OGrafExample from './index';

/** How Live markets plays, on its own page and on the homepage: on its feed, with no form to type into. */
export const LIVE_MARKETS: Partial<ComponentProps<typeof OGrafExample>> = {
  feed: 'markets',
  formFields: [],
  landscapeFullscreen: true,
  sources: (
    <>
      Live prices from <a href="https://docs.cdp.coinbase.com/exchange/docs/welcome">Coinbase Exchange</a>. Daily
      exchange rates from the European Central Bank through <a href="https://frankfurter.dev">Frankfurter</a>.
    </>
  ),
};
