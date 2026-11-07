import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import graphics from '@site/src/data/graphics.json';
import {BackdropCamera, BackdropPicker, useBackdropStyle} from '../PlayerBackdrop';
import type {OGrafPlayer} from './ograf-player';
import styles from './styles.module.css';

type PlayerModule = typeof import('./ograf-player');
type FieldValue = string | number | boolean;
/** `returning`: unmounted for being off screen, or on its way back, so nothing can be pressed yet. */
type Status = 'waiting' | 'loading' | 'returning' | 'off-air' | 'on-air' | 'busy' | 'error';

interface FieldSchema {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  maxLength?: number;
  gddType?: string;
  gddOptions?: {labels?: Record<string, string>};
  v_ografShaderParameter?: unknown;
}

interface OperatorAction {
  id: string;
  name: string;
  description?: string;
}

interface Props {
  /** Package name in graphics/, without .ograf.zip. */
  slug: keyof typeof graphics;
  /** Accessible description of the graphic. */
  label?: string;
  /** Take the graphic in as soon as it has loaded. Defaults to true. */
  autoPlay?: boolean;
  /** Show the operator data form. Defaults to true. */
  showData?: boolean;
  /** Keep room for a form with this many fields, for pages that switch `slug` in place. */
  reserveFields?: number;
  /** Keep room for this many action buttons, for the same pages. */
  reserveActions?: number;
  /** Which fields the form offers, when a package has fields a visitor shouldn't type into. */
  formFields?: string[];
  /** Keep the graphic supplied with live data while it's mounted. */
  feed?: 'markets';
  /** In fullscreen on a phone, show the graphic in landscape however the phone is held. */
  landscapeFullscreen?: boolean;
  /** Where a graphic's data comes from, under the player. */
  sources?: ReactNode;
}

const STATUS_TEXT: Record<Status, string> = {
  waiting: 'Waiting',
  loading: 'Loading',
  returning: 'Playing…',
  'off-air': 'Off air',
  'on-air': 'On air',
  busy: 'Playing…',
  error: 'Unavailable',
};

/** Fields the form can edit: plain values, not objects or lists. */
function editableFields(schema: unknown): Array<[string, FieldSchema]> {
  const properties = (schema as {properties?: Record<string, FieldSchema>} | undefined)?.properties;
  if (!properties) return [];
  return Object.entries(properties).filter(([, field]) =>
    ['string', 'number', 'integer', 'boolean'].includes(field.type ?? ''),
  );
}

/**
 * The buttons a package offers. A clock's timer commands are always published but do nothing on a
 * running time-of-day clock, so its form leaves them out.
 */
function operatorActions(slug: string, all: OperatorAction[] | undefined): OperatorAction[] {
  if (slug === 'clock' || !all) return [];
  const actions = slug === 'live-markets' ? all.filter((action) => !action.name.startsWith('Local clock: ')) : all;
  const prefix = actions[0]?.name.split(': ')[0];
  const shared = actions.length > 0 && actions.every((action) => action.name.startsWith(`${prefix}: `));
  // "Countdown timer: Start" reads as just "Start" when every button belongs to the same timer.
  return shared ? actions.map((action) => ({...action, name: action.name.slice(prefix!.length + 2)})) : actions;
}

/**
 * An action with the id `add:<field>:<step>` changes that field inside the graphic. It tells no one,
 * so the form moves its own copy to match.
 */
function fieldStep(actionId: string): [string, number] | null {
  const match = /^add:([^:]+):(-?\d+)$/.exec(actionId);
  return match ? [match[1]!, Number(match[2])] : null;
}

function isColor(field: FieldSchema): boolean {
  return field.type === 'string' && /^color/.test(field.gddType ?? '');
}

function FieldInput({
  id,
  field,
  value,
  onChange,
}: {
  id: string;
  field: FieldSchema;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}): ReactNode {
  if (field.type === 'boolean') {
    return (
      <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
    );
  }
  if (field.enum) {
    return (
      <select id={id} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {field.enum.map((option) => (
          <option key={String(option)} value={String(option)}>
            {field.gddOptions?.labels?.[String(option)] ?? String(option)}
          </option>
        ))}
      </select>
    );
  }
  if (isColor(field)) {
    // The colour picker edits #rrggbb; keep any alpha the field carries (#rrggbbaa).
    const text = String(value);
    const alpha = field.gddType === 'color-rrggbbaa' ? text.slice(7, 9) || 'ff' : '';
    return (
      <input
        id={id}
        type="color"
        value={text.slice(0, 7)}
        onChange={(e) => onChange(`${e.target.value.toLowerCase()}${alpha}`)}
      />
    );
  }
  if (field.type === 'number' || field.type === 'integer') {
    const step = field.type === 'integer' ? 1 : (field.multipleOf ?? 'any');
    const parse = (text: string) => (field.type === 'integer' ? parseInt(text, 10) : parseFloat(text));
    const ranged = field.minimum !== undefined && field.maximum !== undefined && field.maximum - field.minimum <= 100;
    return (
      <div className={styles.range}>
        {ranged && (
          <input
            type="range"
            aria-hidden="true"
            tabIndex={-1}
            min={field.minimum}
            max={field.maximum}
            step={step}
            value={Number(value)}
            onChange={(e) => onChange(parse(e.target.value))}
          />
        )}
        <input
          id={id}
          type="number"
          min={field.minimum}
          max={field.maximum}
          step={step}
          value={Number.isFinite(Number(value)) ? Number(value) : ''}
          onChange={(e) => {
            const next = parse(e.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
        />
      </div>
    );
  }
  return (
    <input
      id={id}
      type="text"
      value={String(value)}
      maxLength={field.maxLength}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const DATA_LEGEND = 'Operator controls — changes update the graphic live';
const BAR_IDLE_MS = 2500;
/** Share of the frame on screen that loads the graphic without any scrolling. */
const LOAD_WHEN_SEEN = 0.25;
/** Share of the graphic and its form that counts as on screen. */
const ON_SCREEN = 0.1;
const PARK_AFTER_MS = 4000;
/** A graphic on a feed starts over after a failed function, but no more often than this. */
const RESTART_GAP_MS = 10_000;

function FullscreenIcon({exit}: {exit: boolean}): ReactNode {
  return (
    <svg className={styles.fullscreenIcon} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={
          exit
            ? 'M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5'
            : 'M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5'
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function SignalIcon(): ReactNode {
  return (
    <svg className={styles.signalIcon} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="3.4" fill="currentColor" />
      <path
        d="M10.3 10.3a8 8 0 0 0 0 11.4M21.7 10.3a8 8 0 0 1 0 11.4M6 6a14.1 14.1 0 0 0 0 20M26 6a14.1 14.1 0 0 1 0 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LivePlayer({
  slug,
  label,
  autoPlay = true,
  showData = true,
  reserveFields = 0,
  reserveActions = 0,
  formFields,
  feed,
  landscapeFullscreen = false,
  sources,
}: Props): ReactNode {
  const entry = graphics[slug];
  // A list written in a page is a new array on every render, so the mount follows its contents.
  const formFieldsKey = formFields ? formFields.join(',') || ' ' : '';
  const playerUrl = useBaseUrl('/player/ograf-player.js');
  const manifestUrl = useBaseUrl(entry.manifest);
  const downloadUrl = useBaseUrl(entry.download);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<OGrafPlayer | null>(null);
  const updateTimer = useRef<number | undefined>(undefined);
  const sentValues = useRef<Record<string, FieldValue>>({});
  const figureRef = useRef<HTMLElement>(null);
  /** The visitor changed this graphic, so it keeps running when it's off screen. */
  const touched = useRef(false);
  /** The next mount brings back a graphic that was on air before it went to sleep. */
  const waking = useRef(false);
  const [offscreen, setOffscreen] = useState(false);
  /** Unmounted for being off screen. */
  const [asleep, setAsleep] = useState(false);
  /** Counts the times a graphic on a feed has started over. */
  const [restarts, setRestarts] = useState(0);
  const lastRestart = useRef(0);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Status>('waiting');
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Array<[string, FieldSchema]>>([]);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [actions, setActions] = useState<OperatorAction[]>([]);
  const [stepCount, setStepCount] = useState(1);
  const [step, setStep] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  /** The browser couldn't turn the screen to landscape, so the picture turns instead. */
  const [turned, setTurned] = useState(false);
  const [barAwake, setBarAwake] = useState(true);
  const barTimer = useRef<number | undefined>(undefined);
  const sourceUrl = useBaseUrl(entry.source ?? '');
  const backdrop = useBackdropStyle();

  // Esc and the browser's own controls can leave fullscreen too, so follow the browser.
  useEffect(() => {
    const follow = () => {
      const entered = document.fullscreenElement === frameRef.current;
      setFullscreen(entered);
      if (!entered) setTurned(false);
    };
    document.addEventListener('fullscreenchange', follow);
    return () => {
      document.removeEventListener('fullscreenchange', follow);
      window.clearTimeout(barTimer.current);
    };
  }, []);

  // The bar gets out of the picture until the pointer moves.
  const wakeBar = useCallback(() => {
    setBarAwake(true);
    window.clearTimeout(barTimer.current);
    barTimer.current = window.setTimeout(() => setBarAwake(false), BAR_IDLE_MS);
  }, []);

  useEffect(() => {
    if (fullscreen) wakeBar();
  }, [fullscreen, wakeBar]);

  const onPhone = landscapeFullscreen && window.matchMedia('(pointer: coarse)').matches;

  // Android browsers can turn the screen during fullscreen, and give it back when fullscreen ends.
  const turnToLandscape = async () => {
    if (!onPhone) return;
    try {
      await screen.orientation.lock('landscape');
    } catch {
      setTurned(true);
    }
  };

  const toggleFullscreen = () => {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : frameRef.current?.requestFullscreen().then(turnToLandscape);
    request?.catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  };

  // Load the graphic once it's really on screen, or once the visitor scrolls towards it. On the homepage
  // it sits just under the fold, so being close doesn't count until they start to scroll.
  useEffect(() => {
    const frame = frameRef.current;
    if (visible) return undefined;
    if (!frame || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const seen = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.intersectionRatio >= LOAD_WHEN_SEEN)) setVisible(true);
      },
      {threshold: [0, LOAD_WHEN_SEEN]},
    );
    const nearby = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      {rootMargin: '200px'},
    );
    const scrolled = () => nearby.observe(frame);
    seen.observe(frame);
    window.addEventListener('scroll', scrolled, {once: true, passive: true});
    return () => {
      seen.disconnect();
      nearby.disconnect();
      window.removeEventListener('scroll', scrolled);
    };
  }, [visible]);

  // Whether the graphic or its form is on screen. The form counts: nobody should type into a stopped graphic.
  useEffect(() => {
    const figure = figureRef.current;
    if (!visible || !figure || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setOffscreen(entry!.intersectionRatio < ON_SCREEN),
      {threshold: [0, ON_SCREEN, 0.5]},
    );
    observer.observe(figure);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || asleep || !viewportRef.current) return undefined;
    const container = viewportRef.current;
    const abort = new AbortController();
    let disposed = false;
    let mounted: OGrafPlayer | null = null;
    const wakingUp = waking.current;
    waking.current = false;
    touched.current = false;
    setStatus(wakingUp ? 'returning' : 'loading');
    // A failed function stays failed, and the graphic just stops changing with nothing to show for it. On
    // a feed the next update has everything back, so starting over loses nothing but the visitor's market.
    let restartTimer: number | undefined;
    const restart = () => {
      if (restartTimer !== undefined) return;
      restartTimer = window.setTimeout(
        () => {
          lastRestart.current = Date.now();
          waking.current = true;
          setRestarts((count) => count + 1);
        },
        Math.max(0, lastRestart.current + RESTART_GAP_MS - Date.now()),
      );
    };
    if (feed) container.addEventListener('ograf-function-error', restart);
    (async () => {
      try {
        // The player imports each graphic's main.js itself, so it must stay out of the bundle.
        const module = (await import(/* webpackIgnore: true */ playerUrl)) as PlayerModule;
        mounted = await module.mountOGrafGraphic({container, manifestUrl, signal: abort.signal});
        if (disposed) {
          await mounted.dispose();
          return;
        }
        playerRef.current = mounted;
        const editable = editableFields(mounted.manifest.schema).filter(
          ([key]) => !formFieldsKey || formFieldsKey.split(',').includes(key),
        );
        const defaults = (module.dataFromSchemaDefaults(mounted.manifest.schema) ?? {}) as Record<string, FieldValue>;
        sentValues.current = defaults;
        setFields(editable);
        setValues(defaults);
        setActions(operatorActions(slug, mounted.manifest.customActions));
        setStepCount(Number(mounted.manifest.stepCount ?? 1));
        setStep(0);
        if (!wakingUp) setStatus('off-air');
        if (feed === 'markets') {
          const {startMarketFeed} = await import('./marketFeed');
          // It ends with the mount, so a graphic parked off screen stops listening too.
          if (!abort.signal.aborted) startMarketFeed(mounted, abort.signal);
        }
        if (autoPlay || wakingUp) {
          setStatus('busy');
          await mounted.play();
          if (!disposed) setStatus('on-air');
        }
      } catch (cause) {
        if (disposed) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('error');
      }
    })();
    return () => {
      disposed = true;
      abort.abort();
      window.clearTimeout(restartTimer);
      container.removeEventListener('ograf-function-error', restart);
      window.clearTimeout(updateTimer.current);
      playerRef.current = null;
      void mounted?.dispose().catch(() => undefined);
    };
  }, [visible, asleep, restarts, playerUrl, manifestUrl, autoPlay, slug, feed, formFieldsKey]);

  const run = useCallback(async (action: (player: OGrafPlayer) => Promise<unknown>, after: Status) => {
    const player = playerRef.current;
    if (!player) return;
    setStatus('busy');
    try {
      await action(player);
      // The homepage can switch to another package while this one is still finishing.
      if (playerRef.current === player) setStatus(after);
    } catch (cause) {
      if (playerRef.current !== player) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus('error');
    }
  }, []);

  // Fullscreen lifts the frame out of the page, so where the figure sits says nothing then.
  const away = offscreen && !fullscreen;

  // Off screen a graphic only burns CPU, and its frame loop keeps going even off air, so after a moment it
  // unmounts and comes back in when the visitor does. Only one nobody has changed: starting over would
  // lose a running timer or a score.
  useEffect(() => {
    if (!away) {
      setAsleep(false);
      return undefined;
    }
    if (status !== 'on-air' || touched.current) return undefined;
    const timer = window.setTimeout(() => {
      waking.current = true;
      setAsleep(true);
      setStatus('returning');
    }, PARK_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [away, status]);

  const change = (key: string, value: FieldValue) => {
    touched.current = true;
    const next = {...values, [key]: value};
    setValues(next);
    window.clearTimeout(updateTimer.current);
    updateTimer.current = window.setTimeout(() => {
      // Only what changed: Studio's runtime transitions every bound layer named in an update, even
      // when its value is the same, so sending the whole form would blink the whole graphic.
      const changed = Object.entries(next).filter(([name, item]) => item !== sentValues.current[name]);
      if (changed.length === 0) return;
      sentValues.current = next;
      // A running shader just takes its new parameters, so a slider doesn't fade its panel in and out.
      const shaderOnly = changed.every(([name]) =>
        fields.some(([field, schema]) => field === name && schema.v_ografShaderParameter),
      );
      void playerRef.current
        ?.update(Object.fromEntries(changed), {skipAnimation: shaderOnly})
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : String(cause));
        });
    }, 200);
  };

  const runAction = (id: string) => {
    const player = playerRef.current;
    if (!player) return;
    touched.current = true;
    const stepped = fieldStep(id);
    if (stepped) {
      const [key, by] = stepped;
      const next = Number(values[key] ?? 0) + by;
      setValues((current) => ({...current, [key]: next}));
      sentValues.current = {...sentValues.current, [key]: next};
    }
    player.action(id).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  };

  const sourcesLine = sources && (
    <p className={styles.sources}>
      <SignalIcon />
      <span>{sources}</span>
    </p>
  );
  const lastStep = step >= stepCount - 1;
  const ready = status === 'on-air' || status === 'off-air';
  const sizeMb = (entry.bytes / 1024 / 1024).toFixed(1);
  const sourceSize =
    entry.sourceBytes < 1024 * 1024
      ? `${Math.max(1, Math.round(entry.sourceBytes / 1024))} KB`
      : `${(entry.sourceBytes / 1024 / 1024).toFixed(1)} MB`;

  const takeButtons = (
    <>
      <button
        type="button"
        className="button button--primary button--sm"
        disabled={status !== 'off-air'}
        onClick={() => {
          setStep(0);
          void run((p) => p.play(), 'on-air');
        }}>
        ▶ Take in
      </button>
      <button
        type="button"
        className="button button--secondary button--sm"
        disabled={status !== 'on-air'}
        onClick={() => void run((p) => p.stop(), 'off-air')}>
        ■ Take out
      </button>
      <button
        type="button"
        className="button button--secondary button--sm"
        disabled={!ready}
        onClick={() => {
          setStep(0);
          void run(async (p) => {
            await p.stop({skipAnimation: true});
            await p.play();
          }, 'on-air');
        }}>
        ↻ Replay
      </button>
    </>
  );

  const actionButtons = (
    <>
      {stepCount > 1 && (
        <button
          type="button"
          className="button button--primary button--sm"
          disabled={status !== 'on-air' || lastStep}
          onClick={() => {
            touched.current = true;
            setStep((current) => current + 1);
            void run((p) => p.next(), 'on-air');
          }}>
          Next step ({Math.min(step + 1, stepCount)}/{stepCount})
        </button>
      )}
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="button button--secondary button--sm"
          disabled={status !== 'on-air'}
          title={action.description}
          onClick={() => runAction(action.id)}>
          {action.name}
        </button>
      ))}
    </>
  );

  return (
    <figure ref={figureRef} className={styles.example} aria-label={label ?? `${entry.name}, live OGraf graphic`}>
      <div
        ref={frameRef}
        className={styles.frame}
        style={backdrop}
        data-bar-awake={barAwake}
        data-turned={turned}
        data-letterbox={landscapeFullscreen}
        onPointerDown={fullscreen ? wakeBar : undefined}
        onPointerMove={fullscreen ? wakeBar : undefined}>
        <BackdropCamera />
        <div ref={viewportRef} className={styles.viewport} />
        {status === 'loading' && (
          <div className={styles.overlay}>
            <p>Loading graphic…</p>
          </div>
        )}
        {status === 'error' && (
          <div className={styles.overlay}>
            <p>
              <strong>This graphic couldn't play in your browser.</strong>
              <br />
              {error}
            </p>
          </div>
        )}
        {fullscreen && (
          <div className={styles.fullscreenBar}>
            {/* On a phone the bar would cover half the graphic, which has its own controls. */}
            {!onPhone && takeButtons}
            {!onPhone && actionButtons}
            <button
              type="button"
              className="button button--secondary button--sm"
              onClick={toggleFullscreen}>
              <FullscreenIcon exit /> Exit fullscreen
            </button>
          </div>
        )}
      </div>
      {reserveFields === 0 && sourcesLine}
      <div className={styles.controls}>
        <div className={styles.buttons}>
          {takeButtons}
          {/* iPhones can't put an element in fullscreen, so they don't get the button. */}
          {document.fullscreenEnabled && (
            <button
              type="button"
              className="button button--secondary button--sm"
              onClick={toggleFullscreen}>
              <FullscreenIcon exit={false} /> Fullscreen
            </button>
          )}
        </div>
        <BackdropPicker />
        <span className={styles.status} data-status={status} role="status">
          {STATUS_TEXT[status]}
        </span>
      </div>
      {showData && (fields.length > 0 || actions.length > 0 || reserveFields > 0) && (
        <div className={styles.dataStack}>
          {/* Invisible, and only here to hold the height of the longest form. */}
          {reserveFields > 0 && (
            <fieldset className={`${styles.data} ${styles.dataSizer}`} aria-hidden="true" disabled>
              <legend>{DATA_LEGEND}</legend>
              {reserveActions > 0 && (
                <div className={styles.actions}>
                  {Array.from({length: reserveActions}, (_, index) => (
                    <button key={index} type="button" className="button button--secondary button--sm">
                      Match clock: Restart
                    </button>
                  ))}
                </div>
              )}
              {Array.from({length: reserveFields}, (_, index) => (
                <div key={index} className={styles.field}>
                  <label>Field</label>
                  <input type="text" />
                </div>
              ))}
            </fieldset>
          )}
          <fieldset className={styles.data} disabled={status === 'error' || status === 'loading' || status === 'returning'}>
            <legend>{DATA_LEGEND}</legend>
            {(actions.length > 0 || stepCount > 1) && (
              <div className={styles.actions}>{actionButtons}</div>
            )}
            {fields.map(([key, field]) => {
              const id = `${slug}-${key}`;
              return (
                <div key={key} className={styles.field}>
                  <label htmlFor={id} title={field.description}>
                    {field.title ?? key}
                  </label>
                  <FieldInput id={id} field={field} value={values[key] ?? ''} onChange={(v) => change(key, v)} />
                </div>
              );
            })}
            {fields.length === 0 && actions.length === 0 && stepCount === 1 && (status === 'on-air' || status === 'off-air' || status === 'busy' || status === 'returning') && (
              <p className={styles.noData}>
                This graphic has no operator data. Use Take in and Take out to control it.
              </p>
            )}
            {/* Where the page keeps room for a form, this goes in that room, so switching doesn't move the page. */}
            {reserveFields > 0 && sourcesLine}
          </fieldset>
        </div>
      )}
      <figcaption className={styles.caption}>
        The exported OGraf package running in your browser with the OGraf web player.{' '}
        <a href={downloadUrl} download>
          Download .ograf.zip
        </a>{' '}
        ({sizeMb} MB)
        {entry.source && (
          <>
            {' · '}
            <a href={sourceUrl} download>
              Download .ogs
            </a>{' '}
            ({sourceSize}), the editable project. It needs OGraf Studio 0.30 or later.
          </>
        )}
      </figcaption>
    </figure>
  );
}

/** A live, interactive OGraf graphic from graphics/, played with the OGraf web player. */
export default function OGrafExample(props: Props): ReactNode {
  return (
    <BrowserOnly fallback={<div className={styles.frame} />}>{() => <LivePlayer {...props} />}</BrowserOnly>
  );
}
