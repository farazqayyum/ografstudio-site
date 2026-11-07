import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {OriginDetails} from '@site/src/components/ExampleOrigin';
import graphics from '@site/src/data/graphics.json';
import {REEL_ORIGIN} from '@site/src/data/reelOrigin';
import {BackdropCamera, BackdropPicker, useBackdropStyle, useMonitorCamera} from '../PlayerBackdrop';
import type {OGrafPlayer} from '../OGrafExample/ograf-player';
import {defineReelCameraSource, setReelCameraStream} from './reelCamera';
import {ReelSound} from './reelSound';
import styles from './styles.module.css';

type PlayerModule = typeof import('../OGrafExample/ograf-player');
type Status = 'loading' | 'on-air' | 'parked' | 'error';
/** Reasons the rundown is holding on the current slide. */
type Hold = 'pointer' | 'touch' | 'paused' | 'offscreen' | 'hidden' | 'reduced-motion';

// IDs are the lane and state IDs in carousel/build.mjs.
const LANE = 'reel';
const TICKER_LANE = 'ticker';
const TICKER_STATE = 'ticker-on';
const SLIDES = [
  {
    id: 'studio',
    number: '01',
    name: 'The editor',
    short: 'Editor',
    line: 'A tour of Studio itself: the canvas, the timeline, the Transitions pane and data and rules.',
    dwell: 15000,
  },
  {
    id: 'transitions',
    number: '02',
    name: 'Transition Logic',
    short: 'Logic',
    line: 'Lanes, takes and morphs. The surface gliding between these slides is one shared element.',
    dwell: 11000,
  },
  {
    id: 'shaders',
    number: '03',
    name: 'Shaders',
    short: 'Shaders',
    line: 'Live GLSL on text, outlines, shapes and images, with its controls exposed as operator fields.',
    dwell: 9000,
  },
  {
    id: 'touch',
    number: '04',
    name: 'Touch controls',
    short: 'Touch',
    line: 'Hover and tap the tabs in the graphic. Those rules ship inside the exported package.',
    dwell: 11000,
  },
  {
    id: 'media',
    number: '05',
    name: 'Media',
    short: 'Media',
    line: 'Video, images, masks, SVG and Lottie on the canvas. Turn the sound on to hear the clip and its effects.',
    dwell: 9000,
  },
  {
    id: 'charts',
    number: '06',
    name: 'Charts',
    short: 'Charts',
    line: 'Bars, doughnuts and area charts bound to data. They morph when values change, and a shader can paint the marks.',
    dwell: 12000,
  },
  {
    id: 'ai',
    number: '07',
    name: 'AI and MCP',
    short: 'AI',
    line: 'An assistant inside Studio, an MCP server for your own agents and a skill that teaches them Studio. This reel was built with it.',
    dwell: 11000,
  },
  {
    id: 'community',
    number: '08',
    name: 'Join the community',
    short: 'Join',
    line: 'The OGraf Studio Community on LinkedIn. Ask questions and share what you make.',
    dwell: 11000,
  },
];
const MEDIA_INDEX = SLIDES.findIndex((slide) => slide.id === 'media');
const MONITOR_SLIDE = SLIDES.findIndex((slide) => slide.id === 'transitions');
const COMMUNITY_SLIDE = SLIDES.findIndex((slide) => slide.id === 'community');
const LINKEDIN_GROUP = 'https://www.linkedin.com/groups/40618425/';
// JOIN_BUTTON in carousel/build.mjs, on the 1920x1080 canvas: x, y, width, height.
const JOIN_BUTTON = [96, 672, 590, 112];
const PARK_AFTER_MS = 4000;
const TOUCH_HOLD_MS = 15000;
const FOLD_KEY = 'ograf-reel-menu-folded';
const BAR_IDLE_MS = 2500;

const TOGGLE_ICONS = {
  ticker: 'M3 8.5A1.500 1.500 0 0 1 4.500 7h15A1.500 1.500 0 0 1 21 8.500v7a1.500 1.500 0 0 1-1.500 1.500h-15A1.500 1.500 0 0 1 3 15.500zM6 11v2h7v-2zm9 0v2h3v-2z',
  sound:
    'M4 9.500v5A1.500 1.500 0 0 0 5.500 16H8l4.600 3.700a.9.9 0 0 0 1.400-.7V5a.9.9 0 0 0-1.400-.7L8 8H5.500A1.500 1.500 0 0 0 4 9.500zm13.300-2.600a1 1 0 0 0-1.300 1.500 5.400 5.400 0 0 1 0 7.200 1 1 0 0 0 1.500 1.300 7.400 7.400 0 0 0-.2-10z',
  pause: 'M7 5h3.500v14H7zm6.500 0H17v14h-3.500z',
  resume: 'M8 5.500v13a.8.8 0 0 0 1.200.7l10-6.500a.8.8 0 0 0 0-1.400l-10-6.500A.8.8 0 0 0 8 5.500z',
  webcam:
    'M3 7.500A2.500 2.500 0 0 1 5.500 5h8A2.500 2.500 0 0 1 16 7.500v1.700l3.700-2.200a.9.9 0 0 1 1.300.8v8.400a.9.9 0 0 1-1.300.8L16 14.800v1.700a2.500 2.500 0 0 1-2.500 2.500h-8A2.500 2.500 0 0 1 3 16.500z',
  fullscreen: 'M4 9V4h5v2H6v3zm11-5h5v5h-2V6h-3zM4 15h2v3h3v2H4zm14 0h2v5h-5v-2h3z',
  package: 'M11 4h2v8.200l3-3 1.400 1.400L12 16l-5.400-5.400L8 9.200l3 3zM5 18h14v2H5z',
  source: 'M4 17.200V20h2.800L17.600 9.200l-2.800-2.800zM19.700 7.100a1 1 0 0 0 0-1.400l-1.400-1.400a1 1 0 0 0-1.400 0l-1.100 1.100 2.800 2.800z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-1 8h2v6h-2zm0-4h2v2h-2z',
};

/**
 * A button in the reel's controls: a word, or just an icon when the menu is folded. A switch passes
 * `on` and also gets a light.
 */
function Toggle({
  icon,
  label,
  on,
  title,
  onClick,
}: {
  icon: keyof typeof TOGGLE_ICONS;
  label: string;
  on?: boolean;
  title: string;
  onClick: () => void;
}): ReactNode {
  return (
    <button type="button" className={styles.toggle} onClick={onClick} aria-pressed={on} title={title}>
      {on !== undefined && <i aria-hidden="true" />}
      <svg className={styles.toggleIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d={TOGGLE_ICONS[icon]} />
      </svg>
      <span className={styles.toggleLabel}>{label}</span>
    </button>
  );
}

/** A download in the reel's controls, laid out like the buttons beside it. */
function DownloadLink({
  icon,
  label,
  href,
  title,
}: {
  icon: keyof typeof TOGGLE_ICONS;
  label: string;
  href: string;
  title: string;
}): ReactNode {
  return (
    <a className={styles.toggle} href={href} download title={title}>
      <svg className={styles.toggleIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d={TOGGLE_ICONS[icon]} />
      </svg>
      <span className={styles.toggleLabel}>{label}</span>
    </a>
  );
}

/** Time of day as HH:MM:SS:FF at 25 fps, written straight to the DOM to skip React renders. */
function useTimecode(ref: React.RefObject<HTMLElement | null>, running: boolean): void {
  useEffect(() => {
    if (!running) return undefined;
    const pad = (value: number) => String(value).padStart(2, '0');
    const paint = () => {
      const now = new Date();
      const frames = Math.floor(now.getMilliseconds() / 40);
      if (ref.current)
        ref.current.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}:${pad(frames)}`;
    };
    paint();
    const timer = window.setInterval(paint, 40);
    return () => window.clearInterval(timer);
  }, [ref, running]);
}

function Reel(): ReactNode {
  const entry = graphics['feature-reel'];
  const playerUrl = useBaseUrl('/player/ograf-player.js');
  const manifestUrl = useBaseUrl(entry.manifest);
  const downloadUrl = useBaseUrl(entry.download);
  const sourceUrl = useBaseUrl(entry.source ?? '');
  const posterUrl = useBaseUrl('/img/feature-reel-poster.webp');
  const soundIn = useBaseUrl('/audio/reel-media-in.mp3');
  const soundOut = useBaseUrl('/audio/reel-media-out.mp3');
  const soundFilm = useBaseUrl('/audio/reel-media-film.mp3');

  const shellRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDialogElement>(null);
  const barTimer = useRef<number | undefined>(undefined);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const timecodeRef = useRef<HTMLSpanElement>(null);
  const playerRef = useRef<OGrafPlayer | null>(null);
  const activeRef = useRef(0);
  const tickerRef = useRef(true);
  const soundRef = useRef<ReelSound | null>(null);

  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [started, setStarted] = useState(false);
  const [held, setHeld] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ticker, setTicker] = useState(true);
  const [sound, setSound] = useState(false);
  const [folded, setFolded] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [barAwake, setBarAwake] = useState(true);
  const backdrop = useBackdropStyle();
  const camera = useMonitorCamera();

  useTimecode(timecodeRef, status === 'on-air');

  // The monitor on the Transition Logic slide reads its picture from here.
  useEffect(() => {
    setReelCameraStream(camera.stream);
    return () => setReelCameraStream(null);
  }, [camera.stream]);

  // Remembered per browser, as a convenience: nothing else depends on it.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(FOLD_KEY)) setFolded(true);
    } catch {
      // Blocked storage just means the menu starts open.
    }
  }, []);

  const toggleFold = useCallback(() => {
    setFolded((value) => {
      try {
        if (value) window.localStorage.removeItem(FOLD_KEY);
        else window.localStorage.setItem(FOLD_KEY, '1');
      } catch {
        // The fold still applies until the page is closed.
      }
      return !value;
    });
  }, []);

  // Dwell timer: it stops while anything holds the rundown, and resumes where it left off.
  const holds = useRef(new Set<Hold>());
  const dwell = useRef({timer: undefined as number | undefined, remaining: SLIDES[0].dwell, since: 0});

  const take = useCallback((index: number) => {
    activeRef.current = index;
    setActive(index);
    setProgressKey((key) => key + 1);
    dwell.current.remaining = SLIDES[index].dwell;
    soundRef.current?.setOnMedia(index === MEDIA_INDEX);
    // A newer Take supersedes one still running, and that rejection isn't a failure.
    playerRef.current
      ?.action('transition.take', {slotId: LANE, stateId: SLIDES[index].id})
      .catch(() => undefined);
  }, []);

  const startDwell = useCallback(() => {
    window.clearTimeout(dwell.current.timer);
    if (holds.current.size > 0 || !playerRef.current) return;
    dwell.current.since = performance.now();
    dwell.current.timer = window.setTimeout(() => {
      take((activeRef.current + 1) % SLIDES.length);
      startDwell();
    }, dwell.current.remaining);
  }, [take]);

  const stopDwell = useCallback(() => {
    if (dwell.current.timer === undefined) return;
    window.clearTimeout(dwell.current.timer);
    dwell.current.timer = undefined;
    dwell.current.remaining = Math.max(
      600,
      dwell.current.remaining - (performance.now() - dwell.current.since),
    );
  }, []);

  const setHold = useCallback(
    (reason: Hold, on: boolean) => {
      const had = holds.current.size > 0;
      if (on) holds.current.add(reason);
      else holds.current.delete(reason);
      const has = holds.current.size > 0;
      if (has !== had) {
        setHeld(has);
        if (has) stopDwell();
        else startDwell();
      }
      soundRef.current?.setAudible(!holds.current.has('offscreen') && !holds.current.has('hidden'));
    },
    [startDwell, stopDwell],
  );

  const choose = useCallback(
    (index: number) => {
      setStarted(true);
      if (index === activeRef.current && playerRef.current) return;
      take(index);
      window.clearTimeout(dwell.current.timer);
      dwell.current.timer = undefined;
      startDwell();
    },
    [take, startDwell],
  );

  const togglePause = useCallback(() => {
    setPaused((value) => {
      setHold('paused', !value);
      return !value;
    });
  }, [setHold]);

  const toggleTicker = useCallback(() => {
    const on = !tickerRef.current;
    tickerRef.current = on;
    setTicker(on);
    playerRef.current
      ?.action(
        on ? 'transition.take' : 'transition.out',
        on ? {slotId: TICKER_LANE, stateId: TICKER_STATE} : {slotId: TICKER_LANE},
      )
      .catch(() => undefined);
  }, []);

  // Only the Media slide has sound, so turning it on goes there: otherwise the click sounds broken.
  const toggleSound = useCallback(() => {
    if (sound) {
      soundRef.current?.disable();
      setSound(false);
      return;
    }
    soundRef.current ??= new ReelSound({in: soundIn, out: soundOut, film: soundFilm}, () => viewportRef.current);
    const reelSound = soundRef.current;
    reelSound.setOnMedia(activeRef.current === MEDIA_INDEX);
    setSound(true);
    reelSound.enable().catch((error: unknown) => {
      console.error('Feature reel sound failed to load', error);
      reelSound.disable();
      setSound(false);
    });
    choose(MEDIA_INDEX);
  }, [sound, soundIn, soundOut, soundFilm, choose]);
  useEffect(() => () => soundRef.current?.dispose(), []);

  // Honour reduced motion: nothing moves until the visitor asks for it.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      holds.current.add('reduced-motion');
      setHeld(true);
    } else setStarted(true);
  }, []);

  // Mount the real package once, and take the first slide.
  useEffect(() => {
    if (!started) return undefined;
    const abort = new AbortController();
    let player: OGrafPlayer | null = null;
    (async () => {
      defineReelCameraSource();
      const module = (await import(/* webpackIgnore: true */ playerUrl)) as PlayerModule;
      player = await module.mountOGrafGraphic({
        container: viewportRef.current!,
        manifestUrl,
        signal: abort.signal,
      });
      if (abort.signal.aborted) return;
      playerRef.current = player;
      // Play takes every lane to its first state, so the ticker comes in with the first slide.
      await player.play();
      if (activeRef.current !== 0) take(activeRef.current);
      if (!tickerRef.current) void player.action('transition.out', {slotId: TICKER_LANE}).catch(() => undefined);
      setStatus('on-air');
      setProgressKey((key) => key + 1);
      startDwell();
    })().catch((error: unknown) => {
      if (abort.signal.aborted) return;
      console.error('Feature reel failed to start', error);
      setStatus('error');
    });
    return () => {
      abort.abort();
      window.clearTimeout(dwell.current.timer);
      playerRef.current = null;
      void player?.dispose().catch(() => undefined);
    };
  }, [started, playerUrl, manifestUrl, startDwell, take]);

  // Off screen the GPU work stops: the lane goes off, and comes back in when the reel returns.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    let parkTimer: number | undefined;
    let parked = false;
    const observer = new IntersectionObserver(
      ([visible]) => {
        if (visible.intersectionRatio < 0.25) {
          setHold('offscreen', true);
          window.clearTimeout(parkTimer);
          parkTimer = window.setTimeout(() => {
            if (!playerRef.current) return;
            parked = true;
            setStatus('parked');
            for (const slotId of [LANE, TICKER_LANE])
              playerRef.current.action('transition.clear', {slotId}, {skipAnimation: true}).catch(() => undefined);
          }, PARK_AFTER_MS);
        } else {
          window.clearTimeout(parkTimer);
          if (parked && playerRef.current) {
            parked = false;
            setStatus('on-air');
            setProgressKey((key) => key + 1);
            dwell.current.remaining = SLIDES[activeRef.current].dwell;
            playerRef.current
              .action('transition.take', {slotId: LANE, stateId: SLIDES[activeRef.current].id})
              .catch(() => undefined);
            if (tickerRef.current)
              playerRef.current
                .action('transition.take', {slotId: TICKER_LANE, stateId: TICKER_STATE})
                .catch(() => undefined);
          }
          setHold('offscreen', false);
        }
      },
      {threshold: [0, 0.25, 0.5]},
    );
    observer.observe(stage);
    return () => {
      observer.disconnect();
      window.clearTimeout(parkTimer);
    };
  }, [setHold]);

  useEffect(() => {
    const change = () => setHold('hidden', document.hidden);
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, [setHold]);

  // Esc and the browser's own controls can leave fullscreen too, so follow the browser. The pointer is
  // always over the picture in fullscreen, so hovering stops holding the slide or the reel would stick.
  useEffect(() => {
    const follow = () => {
      const on = document.fullscreenElement === shellRef.current;
      setFullscreen(on);
      setHold('pointer', false);
    };
    document.addEventListener('fullscreenchange', follow);
    return () => {
      document.removeEventListener('fullscreenchange', follow);
      window.clearTimeout(barTimer.current);
    };
  }, [setHold]);

  // The bar gets out of the picture until the pointer moves.
  const wakeBar = useCallback(() => {
    setBarAwake(true);
    window.clearTimeout(barTimer.current);
    barTimer.current = window.setTimeout(() => setBarAwake(false), BAR_IDLE_MS);
  }, []);

  useEffect(() => {
    if (fullscreen) wakeBar();
  }, [fullscreen, wakeBar]);

  const toggleFullscreen = useCallback(() => {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : shellRef.current?.requestFullscreen();
    request?.catch((error: unknown) => console.error('Feature reel fullscreen failed', error));
  }, []);

  // A touch has no hover, so a tap on the stage holds the slide for a while.
  const touchTimer = useRef<number | undefined>(undefined);
  const onStagePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      setHold('touch', true);
      window.clearTimeout(touchTimer.current);
      touchTimer.current = window.setTimeout(() => setHold('touch', false), TOUCH_HOLD_MS);
    },
    [setHold],
  );
  useEffect(() => () => window.clearTimeout(touchTimer.current), []);

  // Coordinated sets take the pointer on rule layers but don't show a hand cursor over them yet.
  // Every other layer ignores the pointer, so anything inside the player's shadow root is a control.
  const onStagePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.nativeEvent.composedPath()[0];
    const overControl = target instanceof Node && target.getRootNode() instanceof ShadowRoot;
    event.currentTarget.style.cursor = overControl ? 'pointer' : '';
  }, []);

  const onAir = status === 'on-air';
  return (
    <div className={styles.reel}>
      <div className={`${styles.deck} ${folded ? styles.deckFolded : ''}`}>
        <div className={styles.console}>
          <div className={styles.consoleHead}>
            <span className={styles.consoleTitle} aria-hidden="true">
              Features
            </span>
            <span className={styles.onAir}>
              <span className={`${styles.tally} ${onAir ? styles.tallyOn : ''}`}>
                <i aria-hidden="true" />
                {onAir ? 'On air' : status === 'error' ? 'Unavailable' : status === 'parked' ? 'Standby' : 'Loading'}
              </span>
              <span ref={timecodeRef} className={styles.timecode} aria-hidden="true">
                --:--:--:--
              </span>
            </span>
            <button
              type="button"
              className={styles.fold}
              onClick={toggleFold}
              aria-expanded={!folded}
              aria-label={folded ? 'Unfold the menu' : 'Fold the menu to the left'}
              title={folded ? 'Unfold the menu' : 'Fold the menu to the left'}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.400"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={folded ? 'M9.500 5.500 16 12l-6.500 6.500' : 'M14.500 5.500 8 12l6.500 6.500'}
                />
              </svg>
            </button>
          </div>
          <ol className={styles.rundown} aria-label="Features in the reel">
            {SLIDES.map((slide, index) => {
              const isActive = index === active;
              return (
                <li key={slide.id} className={isActive ? styles.rowActive : undefined}>
                  <button
                    type="button"
                    className={`${styles.cue} ${isActive ? styles.cueActive : ''}`}
                    aria-current={isActive ? 'true' : undefined}
                    title={folded ? slide.name : undefined}
                    onClick={() => choose(index)}>
                    <span className={styles.cueNumber}>{slide.number}</span>
                    <span className={styles.cueName}>
                      <span className={styles.cueLong}>{slide.name}</span>
                      <span className={styles.cueShort}>{slide.short}</span>
                    </span>
                    <span className={styles.cueLine}>{slide.line}</span>
                    {isActive && onAir && (
                      <span
                        key={progressKey}
                        className={styles.cueProgress}
                        style={{
                          animationDuration: `${slide.dwell}ms`,
                          animationPlayState: held ? 'paused' : 'running',
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className={styles.controls} role="group" aria-label="Reel controls">
            <div className={styles.toggles}>
              <Toggle
                icon="ticker"
                label="Ticker"
                on={ticker}
                title="Takes the ticker lane in and out"
                onClick={toggleTicker}
              />
              <Toggle
                icon="sound"
                label="Sound"
                on={sound}
                title="Plays on the Media slide. This page plays the sound, because OGraf template sets can't carry audio yet."
                onClick={toggleSound}
              />
              <Toggle
                icon={paused ? 'resume' : 'pause'}
                label={paused ? 'Resume' : 'Pause'}
                on={paused}
                title="Holds the reel on this slide"
                onClick={togglePause}
              />
              {camera.available && (
                <Toggle
                  icon="webcam"
                  label="Webcam"
                  on={camera.on}
                  title="Puts your webcam on the monitor in the Transition Logic slide. It stays in your browser and is never sent anywhere."
                  onClick={camera.toggle}
                />
              )}
            </div>
            <div className={styles.actions}>
              {/* iPhones can't put an element in fullscreen, so they don't get the button. */}
              {document.fullscreenEnabled && (
                <Toggle
                  icon="fullscreen"
                  label="Fullscreen"
                  title="Shows the reel fullscreen"
                  onClick={toggleFullscreen}
                />
              )}
              <Toggle
                icon="info"
                label="How it was made"
                title="The prompts, the model and the generation time behind this reel"
                onClick={() => originRef.current?.showModal()}
              />
              <DownloadLink
                icon="package"
                label="↓ Zip"
                href={downloadUrl}
                title="Download the certified OGraf package and run it yourself"
              />
              {entry.source && (
                <DownloadLink
                  icon="source"
                  label="↓ Ogs"
                  href={sourceUrl}
                  title={`Download the editable project, ${(entry.sourceBytes / 1024 / 1024).toFixed(1)} MB. It needs OGraf Studio 0.23 or later.`}
                />
              )}
            </div>
            <div className={styles.backgrounds}>
              <BackdropPicker compact />
            </div>
          </div>
        </div>

        {/* What goes fullscreen. The stage inside stays 16:9, so everything placed on it stays lined up. */}
        <div
          ref={shellRef}
          className={styles.stageShell}
          style={fullscreen ? backdrop : undefined}
          data-bar-awake={barAwake}
          onPointerMove={fullscreen ? wakeBar : undefined}>
        <div
          ref={stageRef}
          className={styles.stage}
          style={backdrop}
          role="group"
          aria-label={`OGraf Studio feature reel, showing ${SLIDES[active].name}`}
          onPointerEnter={(event) => event.pointerType === 'mouse' && !fullscreen && setHold('pointer', true)}
          onPointerLeave={(event) => event.pointerType === 'mouse' && setHold('pointer', false)}
          onPointerMove={onStagePointerMove}
          onPointerDown={onStagePointerDown}>
          <img
            className={`${styles.poster} ${onAir ? styles.posterHidden : ''}`}
            src={posterUrl}
            alt=""
            width={1600}
            height={900}
          />
          <BackdropCamera />
          <div ref={viewportRef} className={styles.viewport} />
          {onAir && active === MEDIA_INDEX && !sound && (
            <button type="button" className={`${styles.stageChip} ${styles.soundChip}`} onClick={toggleSound}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d={TOGGLE_ICONS.sound} />
              </svg>
              Turn on sound
            </button>
          )}
          {onAir && active === MONITOR_SLIDE && camera.available && !camera.on && (
            <button
              type="button"
              className={`${styles.stageChip} ${styles.cameraChip}`}
              title="Your webcam stays in your browser and is never sent anywhere."
              aria-label="Put your webcam on air"
              onClick={camera.toggle}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d={TOGGLE_ICONS.webcam} />
              </svg>
              <span className={styles.chipLong}>Put your webcam on air</span>
              <span className={styles.chipShort}>Webcam</span>
            </button>
          )}
          {/* OGraf rules can't open a page, so the button drawn in the graphic gets a real link on top. */}
          {onAir && active === COMMUNITY_SLIDE && (
            <a
              className={styles.joinLink}
              href={LINKEDIN_GROUP}
              target="_blank"
              rel="noopener noreferrer"
              title="Opens the group on LinkedIn in a new tab"
              aria-label="Join the OGraf Studio Community on LinkedIn (opens in a new tab)"
              style={{
                left: `${(JOIN_BUTTON[0] / 1920) * 100}%`,
                top: `${(JOIN_BUTTON[1] / 1080) * 100}%`,
                width: `${(JOIN_BUTTON[2] / 1920) * 100}%`,
                height: `${(JOIN_BUTTON[3] / 1080) * 100}%`,
              }}
            />
          )}
          {folded && camera.note && <p className={styles.errorNote}>{camera.note}</p>}
          <span className={`${styles.corner} ${styles.cornerTL}`} aria-hidden="true" />
          <span className={`${styles.corner} ${styles.cornerTR}`} aria-hidden="true" />
          <span className={`${styles.corner} ${styles.cornerBL}`} aria-hidden="true" />
          <span className={`${styles.corner} ${styles.cornerBR}`} aria-hidden="true" />
          {!started && (
            <button type="button" className={styles.playOverlay} onClick={() => choose(0)}>
              ▶ Play the reel
            </button>
          )}
          {status === 'error' && (
            <p className={styles.errorNote}>
              This browser couldn't start the live reel. It needs WebGL 2.
            </p>
          )}
        </div>
          {fullscreen && (
            <div className={styles.fullscreenBar} role="group" aria-label="Reel controls">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-current={index === active ? 'true' : undefined}
                  onClick={() => choose(index)}>
                  {slide.short}
                </button>
              ))}
              <span className={styles.barGap} aria-hidden="true" />
              <button type="button" aria-pressed={ticker} onClick={toggleTicker}>
                Ticker
              </button>
              <button type="button" aria-pressed={sound} onClick={toggleSound}>
                Sound
              </button>
              <button type="button" aria-pressed={paused} onClick={togglePause}>
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={toggleFullscreen}>
                Exit fullscreen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* The rundown's description folds away on small screens, so it repeats here. */}
      <p className={styles.mobileLine} aria-live="off">
        {SLIDES[active].line}
        {active === COMMUNITY_SLIDE && (
          <>
            {' '}
            <a href={LINKEDIN_GROUP} target="_blank" rel="noopener noreferrer">
              Join on LinkedIn
            </a>
          </>
        )}
      </p>

      <dialog
        ref={originRef}
        className={styles.origin}
        aria-labelledby="reel-origin-title"
        onClick={(event) => {
          // A click on the dimmed area lands on the dialog itself, and closes it.
          if (event.target === originRef.current) originRef.current.close();
        }}>
        <div className={styles.originBody}>
          <div className={styles.originHead}>
            <h2 id="reel-origin-title">How this reel was made</h2>
            <button type="button" className={styles.statusButton} onClick={() => originRef.current?.close()}>
              Close
            </button>
          </div>
          <p className={styles.originNote}>
            Not a video! One certified OGraf package, playing in your browser.{' '}
            <a href={downloadUrl} download>
              Download to run!
            </a>
            {entry.source && (
              <>
                {' · '}
                <a href={sourceUrl} download>
                  Download .ogs
                </a>
              </>
            )}
          </p>
          <OriginDetails origin={REEL_ORIGIN} />
        </div>
      </dialog>
    </div>
  );
}

export default function HeroReel(): ReactNode {
  return (
    <BrowserOnly fallback={<div className={styles.fallback} />}>{() => <Reel />}</BrowserOnly>
  );
}
