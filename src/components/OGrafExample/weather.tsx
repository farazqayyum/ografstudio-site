import type {ComponentProps} from 'react';
import type OGrafExample from './index';

const SOURCES = (
  <>
    Live forecast from <a href="https://open-meteo.com/">Open-Meteo</a>, under{' '}
    <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Map from{' '}
    <a href="https://www.naturalearthdata.com/">Natural Earth</a>.
  </>
);

/** How the Europe weather sequence plays: on the live forecast, with the outlook city to choose. */
export const WEATHER: Partial<ComponentProps<typeof OGrafExample>> = {
  feed: 'weather',
  formFields: ['featured'],
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
