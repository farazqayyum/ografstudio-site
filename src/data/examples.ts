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
  /** Reachable only by its link: not on /examples. Pair it with `unlisted: true` in the page's front matter. */
  unlisted?: boolean;
  origin: ExampleOrigin;
}

/** Update this when a template is rebuilt from a new prompt. */
export interface ExampleOrigin {
  model: string;
  /** Writing and building only, estimated from the session records. */
  generationTime: string;
  /** In the order they were given. */
  prompts: string[];
  /** The prompt was written afterwards, because the template came from a wider brief. */
  writtenAfterwards?: boolean;
}

export const MODEL = 'Claude Opus 5.5';

const afterwards = (generationTime: string, prompt: string): ExampleOrigin => ({
  model: MODEL,
  generationTime,
  prompts: [prompt],
  writtenAfterwards: true,
});

export const examples: Example[] = [
  {
    slug: 'lower-third',
    title: 'Lower third',
    summary: 'A name strap with one Style field that restyles it for news, breaking or sport.',
    image: '/img/examples/lower-third.png',
    level: 'Basic',
    tags: ['Recipe', 'Value maps', 'Rules'],
    origin: afterwards(
      'About 1 minute',
      "Build a lower third with a name and a role. Add one Style field that changes the accent, the tag colour and the tag text for news, breaking and sport, and a switch for the live tag.",
    ),
  },
  {
    slug: 'scoreboard',
    title: 'Scoreboard',
    summary: 'Goal buttons, a match clock and a leader highlight that all run inside the graphic.',
    image: '/img/examples/scoreboard.png',
    level: 'Intermediate',
    tags: ['Recipe', 'Custom actions', 'Sport'],
    origin: afterwards(
      'About 1 minute',
      "Build a sports scoreboard for two teams, with a match clock and the current period. Add Home +1 and Away +1 buttons that update the score inside the graphic, and turn the leader's score gold. Expose the team names, scores, team colours and period.",
    ),
  },
  {
    slug: 'ticker',
    title: 'Ticker',
    summary: 'A native crawl with speed, direction, right-to-left text and update timing on the form.',
    image: '/img/examples/ticker.png',
    level: 'Basic',
    tags: ['Recipe', 'Native ticker'],
    origin: afterwards(
      'About 1 minute',
      "Build a news ticker with Studio's native crawl. Expose the label, headlines, scroll speed, crawl direction, text direction for right-to-left languages and when updates apply. Add a Breaking switch that restyles the label.",
    ),
  },
  {
    slug: 'countdown',
    title: 'Countdown',
    summary: 'Start, Pause, Reset and Restart buttons, overtime, and an alarm the graphic fires itself.',
    image: '/img/examples/countdown.png',
    level: 'Intermediate',
    tags: ['Recipe', 'Timer', 'Alarms'],
    origin: afterwards(
      'About 1.5 minutes',
      "Build a 30-second countdown with Start, Pause, Reset and Restart buttons. Expose the title, the duration and whether it runs into overtime. Add a five-second warning that the graphic fires itself, with an on/off switch and a colour.",
    ),
  },
  {
    slug: 'clock',
    title: 'Clock',
    summary: 'A live clock an operator or feed can switch between UTC and any time zone, on air.',
    image: '/img/examples/clock.png',
    level: 'Basic',
    tags: ['Recipe', 'Clock'],
    origin: afterwards(
      'About 1 minute',
      "Build an on-air clock that an operator or a data feed can switch between UTC, local time and other time zones while it is on air. Expose the time zone, the 12- or 24-hour format and whether to show seconds, and make the label follow the time zone.",
    ),
  },
  {
    slug: 'bug',
    title: 'Bug / DOG',
    summary: 'A channel identifier with a channel list and a pulsing live indicator.',
    image: '/img/examples/bug.png',
    level: 'Basic',
    tags: ['Recipe', 'Branding'],
    origin: afterwards(
      'About 1 minute',
      "Build a channel bug for the top-right corner, with a list of channels to choose from (OGraf 1, OGraf News and OGraf Sport) and a pulsing live indicator that can be turned off.",
    ),
  },
  {
    slug: 'rankings',
    title: 'Rankings',
    summary: 'A jury vote for a TV show: juries give points, and the board scores and reranks itself.',
    image: '/img/examples/rankings.png',
    level: 'Advanced',
    tags: ['Function', 'Runtime collection', 'Game show'],
    origin: {
      model: MODEL,
      generationTime: 'About 20 minutes',
      prompts: [
        'Refine the Rankings example into a jury vote like that of a well-known song contest, as a good TV game show example. Start with a list of contestants. Each jury then gives them points, and the ranking recalculates automatically whenever a contestant receives points. Use a different background colour for the top three positions, and add up and down arrows.',
      ],
    },
  },
  {
    slug: 'live-markets',
    title: 'Live markets',
    summary: 'A markets dashboard playing real prices from a public feed, with a chart you can click and read.',
    image: '/img/examples/live-markets.png',
    level: 'Advanced',
    tags: ['Live data', 'Function', 'Interactive'],
    origin: {
      model: MODEL,
      generationTime: 'About 15 minutes',
      prompts: [
        'Build an advanced live data example on finance: a dashboard that gets real-time data from an external data source while being interactive and attractive in design.',
        'Show local time instead of UTC by default. Write the exchange rates as EUR/USD, CHF/USD and GBP/USD, with USD second. In fullscreen on a phone, show it in landscape however the phone is held.',
        'Make the data sources more visible, besides the ticker, with an icon: live data from Coinbase.',
        'On the ticker, add up and down arrows to the currencies, showing whether each is going up or down.',
      ],
    },
  },
  {
    slug: 'shader-background',
    title: 'Shader background',
    summary: 'Animated GLSL light streaks with speed, tint and glow controls for the operator.',
    image: '/img/examples/shader-background.png',
    level: 'Intermediate',
    tags: ['Shader', 'Background'],
    origin: afterwards(
      'About 1 minute',
      "Build a full-frame animated background from a GLSL shader of moving light streaks, with Speed, Tint and Glow fields for the operator.",
    ),
  },
  {
    slug: 'lottie-pulse',
    title: 'Lottie pulse',
    summary: 'A small looping Lottie animation for checking your playout environment.',
    image: '/img/examples/lottie-pulse.png',
    level: 'Basic',
    tags: ['Lottie', 'Loop'],
    origin: afterwards(
      'Under 1 minute',
      "Build a small looping graphic from a Lottie pulse animation, for checking that a playout environment plays Lottie correctly.",
    ),
    notOnHomepage: true,
  },
];
