import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import graphics from '@site/src/data/graphics.json';
import {BackdropCamera, BackdropPicker, useBackdropStyle} from '../PlayerBackdrop';
import type {OGrafPlayer} from './ograf-player';
import styles from './styles.module.css';

type PlayerModule = typeof import('./ograf-player');
type FieldValue = string | number | boolean;
type Status = 'waiting' | 'loading' | 'off-air' | 'on-air' | 'busy' | 'error';

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
}

const STATUS_TEXT: Record<Status, string> = {
  waiting: 'Waiting',
  loading: 'Loading',
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
function operatorActions(slug: string, actions: OperatorAction[] | undefined): OperatorAction[] {
  if (slug === 'clock' || !actions) return [];
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

function LivePlayer({
  slug,
  label,
  autoPlay = true,
  showData = true,
  reserveFields = 0,
  reserveActions = 0,
}: Props): ReactNode {
  const entry = graphics[slug];
  const playerUrl = useBaseUrl('/player/ograf-player.js');
  const manifestUrl = useBaseUrl(entry.manifest);
  const downloadUrl = useBaseUrl(entry.download);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<OGrafPlayer | null>(null);
  const updateTimer = useRef<number | undefined>(undefined);
  const sentValues = useRef<Record<string, FieldValue>>({});
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Status>('waiting');
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Array<[string, FieldSchema]>>([]);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [actions, setActions] = useState<OperatorAction[]>([]);
  const [stepCount, setStepCount] = useState(1);
  const [step, setStep] = useState(0);
  const backdrop = useBackdropStyle();

  // Load the graphic only when it is about to scroll into view.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {rootMargin: '200px'},
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !viewportRef.current) return undefined;
    const container = viewportRef.current;
    const abort = new AbortController();
    let disposed = false;
    let mounted: OGrafPlayer | null = null;
    setStatus('loading');
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
        const editable = editableFields(mounted.manifest.schema);
        const defaults = (module.dataFromSchemaDefaults(mounted.manifest.schema) ?? {}) as Record<string, FieldValue>;
        sentValues.current = defaults;
        setFields(editable);
        setValues(defaults);
        setActions(operatorActions(slug, mounted.manifest.customActions));
        setStepCount(Number(mounted.manifest.stepCount ?? 1));
        setStep(0);
        setStatus('off-air');
        if (autoPlay) {
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
      window.clearTimeout(updateTimer.current);
      playerRef.current = null;
      void mounted?.dispose().catch(() => undefined);
    };
  }, [visible, playerUrl, manifestUrl, autoPlay, slug]);

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

  const change = (key: string, value: FieldValue) => {
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

  const lastStep = step >= stepCount - 1;
  const ready = status === 'on-air' || status === 'off-air';
  const sizeMb = (entry.bytes / 1024 / 1024).toFixed(1);

  return (
    <figure className={styles.example} aria-label={label ?? `${entry.name}, live OGraf graphic`}>
      <div ref={frameRef} className={styles.frame} style={backdrop}>
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
      </div>
      <div className={styles.controls}>
        <div className={styles.buttons}>
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
          <fieldset className={styles.data} disabled={status === 'error' || status === 'loading'}>
            <legend>{DATA_LEGEND}</legend>
            {(actions.length > 0 || stepCount > 1) && (
              <div className={styles.actions}>
                {stepCount > 1 && (
                  <button
                    type="button"
                    className="button button--primary button--sm"
                    disabled={status !== 'on-air' || lastStep}
                    onClick={() => {
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
              </div>
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
            {fields.length === 0 && actions.length === 0 && stepCount === 1 && (status === 'on-air' || status === 'off-air' || status === 'busy') && (
              <p className={styles.noData}>
                This graphic has no operator data. Use Take in and Take out to control it.
              </p>
            )}
          </fieldset>
        </div>
      )}
      <figcaption className={styles.caption}>
        The exported OGraf package running in your browser with the OGraf web player.{' '}
        <a href={downloadUrl} download>
          Download .ograf.zip
        </a>{' '}
        ({sizeMb} MB)
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
