import {useState, type ComponentProps, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {LevelTag} from '@site/src/components/ExampleTags';
import HeroReel from '@site/src/components/HeroReel';
import OGrafExample from '@site/src/components/OGrafExample';
import {examples} from '@site/src/data/examples';
import graphics from '@site/src/data/graphics.json';
import info from '@site/src/data/importInfo.json';
import styles from './index.module.css';

const DOWNLOAD_URL = 'https://github.com/zerodensity/ograf-studio/releases/latest';
const REPOSITORY_URL = 'https://github.com/zerodensity/ograf-studio';

const FEATURES = [
  {
    title: 'Visual authoring',
    text: 'Compose text, images, shapes, editable vector paths and Lottie animations in a dockable workspace with multi-monitor support.',
  },
  {
    title: 'Animation and effects',
    text: 'Independent property tracks, easing, seamless loops, gradients, masks and composable effects, including GPU shaders.',
  },
  {
    title: 'Live data',
    text: 'Bind text, images and colours to operator fields, with structured GDD objects, arrays and runtime collections.',
  },
  {
    title: 'AI with operator control',
    text: 'The built-in assistant and external MCP agents use revision-checked operations. You review each proposal, and the result stays editable.',
  },
  {
    title: 'Reusable designs',
    text: 'Brand Kits, style packs, components and procedural patterns keep every graphic in a package consistent.',
  },
  {
    title: 'Template sets',
    text: 'Save one template or a whole package as .ogs, with shared controls and assets, inherited canvas defaults and a scene explorer.',
  },
  {
    title: 'Cropping',
    text: 'Trim layers, image and video sources, and output canvases while keeping assets and animation editable.',
  },
  {
    title: 'Portable OGraf output',
    text: 'Export standard OGraf packages with realtime playback and deterministic non-realtime seeking, checked before every save and export.',
  },
];

// Studio's own lifecycle: every graphic runs Start, Step, End.
const STEPS = [
  {
    marker: 'Start',
    title: 'Design',
    text: 'Start from a recipe or a blank canvas. Lay out text, shapes, images and shaders, and animate them on the timeline.',
    link: '/guides/first-lower-third',
    label: 'Make a lower third',
  },
  {
    marker: 'Step',
    title: 'Connect data',
    text: 'Add the fields operators fill in at playout, and bind them to text, images and colours.',
    link: '/guides/bind-data',
    label: 'Connect operator data',
  },
  {
    marker: 'End',
    title: 'Play out',
    text: 'Export a checked .ograf.zip and play it in any OGraf-compatible renderer, in realtime or frame by frame.',
    link: '/guides/export',
    label: 'Export a package',
  },
];

function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroHead}>
          <div>
            <p className={styles.eyebrow}>The open-source editor for EBU OGraf</p>
            <Heading as="h1" className={styles.heroTitle}>
              Broadcast graphics, designed for EBU's OGraf Standard
            </Heading>
          </div>
          <div>
            <p className={styles.heroLead}>
              Animated, data-driven lower thirds, scoreboards, tickers and full-screen graphics,
              built visually or with AI and exported as portable OGraf packages.
            </p>
            <div className={styles.actions}>
              <Link className={styles.buttonPrimary} href={DOWNLOAD_URL}>
                Download{info.latestRelease ? ` ${info.latestRelease}` : ''}
              </Link>
              <Link className={styles.buttonGhost} to="/guides/install">
                Get started
              </Link>
            </div>
          </div>
        </div>
        <HeroReel />
      </div>
    </header>
  );
}

function Proof(): ReactNode {
  return (
    <section className={styles.proof} aria-label="At a glance">
      <div className={styles.proofInner}>
        <Link to="/announcements/best-of-show-ibc-2026" className={styles.proofAward}>
          <img
            src={useBaseUrl('/img/tvbeurope-best-of-show-ibc-2026.png')}
            alt=""
            width={64}
            height={56}
          />
          <span>
            <strong>Winner</strong>
            TVBEurope Best of Show, IBC 2026
          </span>
        </Link>
        <p>
          <strong>Standard output</strong>
          EBU OGraf packages
        </p>
        <p>
          <strong>Free</strong>
          Open source under AGPL-3.0
        </p>
        <p>
          <strong>One file</strong>
          Windows and Linux, nothing to install
        </p>
      </div>
    </section>
  );
}

function SectionHead({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <div>
      <p className={styles.sectionLabel}>{label}</p>
      <Heading as="h2" className={styles.sectionTitle}>
        {title}
      </Heading>
      {children && <p className={styles.sectionLead}>{children}</p>}
    </div>
  );
}

/** The longest example's form, so switching examples doesn't change the page's height. */
const controls = examples.filter((item) => !item.notOnHomepage);
const MOST_ACTIONS = Math.max(
  ...controls.map((item) => graphics[item.slug as keyof typeof graphics].actions),
);
const LONGEST_FORM = Math.max(
  ...controls.map((item) => graphics[item.slug as keyof typeof graphics].fields),
);

function LiveDemo(): ReactNode {
  const [example, setExample] = useState(controls[0]);
  return (
    <section className={`${styles.section} ${styles.sectionTight} ${styles.sectionDark}`}>
      <div className={`${styles.container} ${styles.live}`}>
        <div>
          <SectionHead label="Your turn" title="Take the controls">
            Each of these was exported from Studio and it's running in your browser. Pick one, take
            it in and out like an operator, then change its data and watch it update on air.
          </SectionHead>
          {/* Every summary is laid out, so the longest holds the height when the layout is stacked. */}
          <div className={styles.liveNowStack}>
            {controls.map((item) => (
              <p
                key={item.slug}
                className={item === example ? styles.liveNow : `${styles.liveNow} ${styles.liveNowSizer}`}>
                <strong>{item.title}</strong> <LevelTag level={item.level} /> {item.summary}
              </p>
            ))}
          </div>
          <Link className={styles.textLink} to={`/examples/${example.slug}`}>
            Make this one yours →
          </Link>
        </div>
        <div>
          <div className={styles.sources} role="group" aria-label="Choose an example">
            {controls.map((item) => (
              <button
                key={item.slug}
                type="button"
                className={styles.source}
                aria-pressed={item === example}
                onClick={() => setExample(item)}>
                <i aria-hidden="true" />
                {item.title}
              </button>
            ))}
          </div>
          <OGrafExample
            slug={example.slug as ComponentProps<typeof OGrafExample>['slug']}
            reserveFields={LONGEST_FORM}
            reserveActions={MOST_ACTIONS}
          />
        </div>
      </div>
    </section>
  );
}

function Features(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={`${styles.container} ${styles.spec}`}>
        <div className={styles.specHead}>
          <SectionHead label="Running order" title="Everything a package needs">
            From a single strap to a full channel package, with the data model, reuse and checks
            that playout depends on.
          </SectionHead>
          <Link className={styles.textLink} to="/docs">
            Read the documentation →
          </Link>
        </div>
        <ol className={styles.specList}>
          {FEATURES.map((feature, index) => (
            <li key={feature.title}>
              <span className={styles.specNumber}>{String(index + 1).padStart(2, '0')}</span>
              <Heading as="h3">{feature.title}</Heading>
              <p>{feature.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Workflow(): ReactNode {
  return (
    <section className={`${styles.section} ${styles.sectionDark}`}>
      <div className={styles.container}>
        <SectionHead label="Timeline" title="From design to playout" />
        <ol className={styles.timeline}>
          {STEPS.map((step) => (
            <li key={step.title}>
              <span className={styles.timelineKey}>
                <i aria-hidden="true" />
                {step.marker}
              </span>
              <Heading as="h3">{step.title}</Heading>
              <p>{step.text}</p>
              <Link className={styles.textLink} to={step.link}>
                {step.label} →
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function News(): ReactNode {
  const items = [
    {
      kicker: 'Latest release',
      title: `OGraf Studio ${info.latestPrerelease ?? info.latestRelease}`,
      to: `/releases/${info.latestPrerelease ?? info.latestRelease}`,
    },
    {
      kicker: 'Award',
      title: 'Best of Show at IBC 2026',
      to: '/announcements/best-of-show-ibc-2026',
    },
    {kicker: 'History', title: 'Every release since 0.01', to: '/releases'},
  ];
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <SectionHead label="Newsroom" title="What's new" />
        <ul className={styles.news}>
          {items.map((item) => (
            <li key={item.to}>
              <Link to={item.to}>
                <span className={styles.newsKicker}>{item.kicker}</span>
                <strong>{item.title}</strong>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CallToAction(): ReactNode {
  return (
    <section className={styles.cta}>
      <div className={styles.container}>
        <Heading as="h2" className={styles.ctaTitle}>
          Make your first graphic in minutes
        </Heading>
        <p>Download one file, run it, and open Studio in your browser.</p>
        <div className={styles.actions}>
          <Link className={styles.buttonPrimary} href={DOWNLOAD_URL}>
            Download
          </Link>
          <Link className={styles.buttonGhost} href={REPOSITORY_URL}>
            View on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Broadcast graphics, designed for EBU's OGraf Standard"
      description="OGraf Studio is an open-source, browser-based editor for EBU OGraf-compatible broadcast graphics: lower thirds, scoreboards, tickers and full-screen graphics.">
      <div className={styles.home}>
        <Hero />
        <main>
          <Proof />
          <LiveDemo />
          <Features />
          <Workflow />
          <News />
          <CallToAction />
        </main>
      </div>
    </Layout>
  );
}
