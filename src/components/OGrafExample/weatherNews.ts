// What the weather feed tells the page after each try, on `window`, so the page can say when the
// forecast came. Kept apart so the page doesn't load the feed's code to listen.
export const FEED_EVENT = 'ograf-weather-feed';
export type FeedNews = {at: number} | {failed: true};
