/** How much a graphic asks of whoever opens it in Studio, simplest first. */
export const EXAMPLE_LEVELS = ['Basic', 'Intermediate', 'Advanced'] as const;
export type ExampleLevel = (typeof EXAMPLE_LEVELS)[number];

export interface Example {
  /** Page path under /examples. */
  slug: string;
  title: string;
  summary: string;
  /** Screenshot under static/img/examples. */
  image: string;
  level: ExampleLevel;
  /** The features it shows. */
  tags: string[];
  /** Keep it on /examples, but leave it out of the homepage's "Take the controls". */
  notOnHomepage?: boolean;
}

export const examples: Example[] = [
  {
    slug: 'lower-third',
    title: 'Lower third',
    summary: 'A name strap with one Style field that restyles it for news, breaking or sport.',
    image: '/img/examples/lower-third.png',
    level: 'Basic',
    tags: ['Recipe', 'Value maps', 'Rules'],
  },
  {
    slug: 'scoreboard',
    title: 'Scoreboard',
    summary: 'Goal buttons, a match clock and a leader highlight that all run inside the graphic.',
    image: '/img/examples/scoreboard.png',
    level: 'Intermediate',
    tags: ['Recipe', 'Custom actions', 'Sport'],
  },
  {
    slug: 'ticker',
    title: 'Ticker',
    summary: 'A native crawl with speed, direction, right-to-left text and update timing on the form.',
    image: '/img/examples/ticker.png',
    level: 'Basic',
    tags: ['Recipe', 'Native ticker'],
  },
  {
    slug: 'countdown',
    title: 'Countdown',
    summary: 'Start, Pause, Reset and Restart buttons, overtime, and an alarm the graphic fires itself.',
    image: '/img/examples/countdown.png',
    level: 'Intermediate',
    tags: ['Recipe', 'Timer', 'Alarms'],
  },
  {
    slug: 'clock',
    title: 'Clock',
    summary: 'A live clock an operator or feed can switch between UTC and any time zone, on air.',
    image: '/img/examples/clock.png',
    level: 'Basic',
    tags: ['Recipe', 'Clock'],
  },
  {
    slug: 'bug',
    title: 'Bug / DOG',
    summary: 'A channel identifier with a channel list and a pulsing live indicator.',
    image: '/img/examples/bug.png',
    level: 'Basic',
    tags: ['Recipe', 'Branding'],
  },
  {
    slug: 'rankings',
    title: 'Rankings',
    summary: 'A jury vote for a TV show: juries give points, and the board scores and reranks itself.',
    image: '/img/examples/rankings.png',
    level: 'Advanced',
    tags: ['Function', 'Runtime collection', 'Game show'],
  },
  {
    slug: 'shader-background',
    title: 'Shader background',
    summary: 'Animated GLSL light streaks with speed, tint and glow controls for the operator.',
    image: '/img/examples/shader-background.png',
    level: 'Intermediate',
    tags: ['Shader', 'Background'],
  },
  {
    slug: 'lottie-pulse',
    title: 'Lottie pulse',
    summary: 'A small looping Lottie animation for checking your playout environment.',
    image: '/img/examples/lottie-pulse.png',
    level: 'Basic',
    tags: ['Lottie', 'Loop'],
    notOnHomepage: true,
  },
];
