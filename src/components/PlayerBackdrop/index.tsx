import {useEffect, useRef, useSyncExternalStore, type ChangeEvent, type CSSProperties, type ReactNode} from 'react';
import styles from './styles.module.css';

interface Choice {
  id: 'checker-dark' | 'custom' | 'webcam' | 'image';
  color: string;
}

const STORAGE_KEY = 'ograf-player-backdrop';
const DEFAULT_COLOR = '#2352c3';
const NOTE_MS = 6000;
// Long enough for one page's players to unmount and the next page's to mount.
const CAMERA_RELEASE_MS = 500;

const DARK_CHECKER: CSSProperties = {
  backgroundColor: '#2a2d36',
  backgroundImage: 'conic-gradient(#1d2028 25%, #2a2d36 0 50%, #1d2028 0 75%, #2a2d36 0)',
  backgroundSize: '24px 24px',
  backgroundPosition: '0 0',
};

// Every style sets the image too, so it replaces the checker a player's stylesheet paints first.
const solid = (color: string): CSSProperties => ({backgroundColor: color, backgroundImage: 'none'});

// One choice shared by every player: set it once and it follows the visitor around the site.
let stored: Choice | null | undefined;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function readChoice(): Choice | null {
  if (stored !== undefined) return stored;
  stored = null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Choice | null;
    // Only a custom colour is worth keeping; anything else saved earlier falls back to the default.
    if (parsed?.id === 'custom' && /^#[0-9a-f]{6}$/i.test(parsed.color)) stored = parsed;
  } catch {
    // Blocked or malformed storage just means the default background.
  }
  return stored;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useChoice(): Choice | null {
  return useSyncExternalStore(subscribe, readChoice, () => null);
}

// The visitor's camera and image stay in this page: neither is uploaded or remembered.
let cameraStream: MediaStream | null = null;
let beforeCamera: Choice | null = null;
let cameraRequest = 0;
let cameraUsers = 0;
let releaseTimer: number | undefined;
// The reel can show the camera on its monitor without it being the background as well.
let monitorWantsCamera = false;
let imageUrl: string | null = null;
let note = '';
let noteTimer: number | undefined;

function setNote(text: string): void {
  note = text;
  window.clearTimeout(noteTimer);
  if (text) noteTimer = window.setTimeout(() => setNote(''), NOTE_MS);
  notify();
}

function stopCamera(): void {
  cameraRequest++;
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
}

/** The background has stopped using the camera, which keeps running if the monitor still is. */
function releaseBackgroundCamera(): void {
  if (!monitorWantsCamera) stopCamera();
}

async function openCamera(request: number): Promise<boolean> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {width: {ideal: 1280}, height: {ideal: 720}, facingMode: 'user'},
  });
  if (request !== cameraRequest) {
    stream.getTracks().forEach((track) => track.stop());
    return false;
  }
  cameraStream = stream;
  return true;
}

function cameraMessage(error: unknown): string {
  const denied = error instanceof DOMException && error.name === 'NotAllowedError';
  return denied ? 'Camera blocked. Allow it in your browser to use it here.' : 'No camera available.';
}

/** Frees the visitor's image, unless it's what the next choice is going to show. */
function releaseImage(keep?: string): void {
  if (imageUrl && imageUrl !== keep) URL.revokeObjectURL(imageUrl);
  imageUrl = keep ?? null;
}

function chooseDefault(): void {
  releaseBackgroundCamera();
  releaseImage();
  stored = {id: 'checker-dark', color: stored?.color ?? DEFAULT_COLOR};
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage only means nothing was saved to remove.
  }
  notify();
}

function chooseColor(color: string): void {
  releaseBackgroundCamera();
  releaseImage();
  stored = {id: 'custom', color};
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // The choice still applies until the page is closed.
  }
  notify();
}

async function chooseImage(file: File, color: string): Promise<void> {
  const url = URL.createObjectURL(file);
  try {
    // Loading it first means a bad file leaves the current background alone.
    await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
  } catch {
    URL.revokeObjectURL(url);
    setNote("That file couldn't be opened as an image.");
    return;
  }
  releaseBackgroundCamera();
  releaseImage(url);
  stored = {id: 'image', color};
  setNote('');
}

/** Puts back whatever was showing before the camera, without touching what's stored. */
function leaveBackgroundCamera(): void {
  releaseBackgroundCamera();
  if (stored?.id === 'webcam') stored = beforeCamera;
  notify();
}

/** Turns the camera off everywhere. */
function leaveCamera(): void {
  monitorWantsCamera = false;
  leaveBackgroundCamera();
}

async function startCamera(color: string): Promise<void> {
  if (stored?.id === 'webcam') return;
  beforeCamera = readChoice();
  setNote('');
  stored = {id: 'webcam', color};
  notify();
  if (cameraStream) return;
  const request = ++cameraRequest;
  try {
    if (!(await openCamera(request))) return;
    releaseImage(beforeCamera?.id === 'image' ? (imageUrl ?? undefined) : undefined);
    notify();
  } catch (error) {
    if (request !== cameraRequest) return;
    leaveCamera();
    setNote(cameraMessage(error));
  }
}

function canUseCamera(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

/** Turns the camera on for the reel's monitor alone, leaving the background as it is. */
async function startMonitorCamera(): Promise<void> {
  monitorWantsCamera = true;
  setNote('');
  if (cameraStream) {
    notify();
    return;
  }
  const request = ++cameraRequest;
  try {
    if (await openCamera(request)) notify();
  } catch (error) {
    if (request !== cameraRequest) return;
    monitorWantsCamera = false;
    setNote(cameraMessage(error));
  }
}

/**
 * The camera's stream and switch for a player that shows it inside its graphic. The graphic shows
 * the camera whenever it's on, including when the camera was turned on as the background.
 */
export function useMonitorCamera(): {
  available: boolean;
  on: boolean;
  stream: MediaStream | null;
  note: string;
  toggle: () => void;
} {
  const stream = useSyncExternalStore(subscribe, () => cameraStream, () => null);
  const background = useChoice()?.id === 'webcam';
  const wanted = useSyncExternalStore(subscribe, () => monitorWantsCamera, () => false);
  const message = useSyncExternalStore(subscribe, () => note, () => '');
  const on = background || wanted;

  // Another page's player has no monitor, so the camera mustn't outlive this one.
  useEffect(
    () => () => {
      monitorWantsCamera = false;
      if (stored?.id !== 'webcam') stopCamera();
      notify();
    },
    [],
  );

  return {
    available: canUseCamera(),
    on,
    stream,
    note: message,
    toggle: () => (on ? leaveCamera() : void startMonitorCamera()),
  };
}

/** Style for the element behind a player. */
export function useBackdropStyle(): CSSProperties {
  const choice = useChoice();
  if (choice?.id === 'custom') return solid(choice.color);
  if (choice?.id === 'webcam') return solid('#000000');
  if (choice?.id === 'image' && imageUrl) {
    return {
      backgroundColor: '#000000',
      backgroundImage: `url("${imageUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return DARK_CHECKER;
}

/**
 * The visitor's camera, mirrored, for a player to place behind its viewport. It renders nothing
 * unless the camera is on, and the camera stops once no player on the page is left to show it.
 */
export function BackdropCamera(): ReactNode {
  const camera = useSyncExternalStore(subscribe, () => cameraStream, () => null);
  // The camera can also be on just for the reel's monitor, which isn't the background.
  const stream = useChoice()?.id === 'webcam' ? camera : null;
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    cameraUsers++;
    window.clearTimeout(releaseTimer);
    return () => {
      cameraUsers--;
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => {
        if (cameraUsers === 0) leaveCamera();
      }, CAMERA_RELEASE_MS);
    };
  }, []);

  useEffect(() => {
    if (!video.current || !stream) return;
    video.current.srcObject = stream;
    void video.current.play().catch(() => undefined);
  }, [stream]);

  if (!stream) return null;
  return <video ref={video} className={styles.camera} muted playsInline autoPlay aria-hidden="true" />;
}

/** Swatches that change what shows through the transparent parts of every graphic. */
export function BackdropPicker({compact = false}: {compact?: boolean}): ReactNode {
  const choice = useChoice();
  const active = choice?.id ?? 'checker-dark';
  const color = choice?.color ?? DEFAULT_COLOR;
  const message = useSyncExternalStore(subscribe, () => note, () => '');

  const onImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clearing it lets the same file be picked again later.
    event.target.value = '';
    if (file) void chooseImage(file, color);
  };

  return (
    <div
      className={`${styles.picker} ${compact ? styles.compact : ''}`}
      role="group"
      aria-label="Background behind the graphic">
      <span className={styles.label} aria-hidden="true">
        Background
      </span>
      <button
        type="button"
        className={styles.swatch}
        style={{...DARK_CHECKER, backgroundSize: '10px 10px'}}
        title="Dark checker"
        aria-label="Dark checker"
        aria-pressed={active === 'checker-dark'}
        onClick={chooseDefault}
      />
      <label
        className={`${styles.swatch} ${styles.custom} ${active === 'custom' ? styles.active : ''}`}
        style={active === 'custom' ? {background: color} : undefined}
        title="Custom colour">
        <input
          type="color"
          aria-label="Custom colour"
          value={color}
          // Clicking also returns to the last custom colour, which fires no change event.
          onClick={() => chooseColor(color)}
          onChange={(event) => chooseColor(event.target.value)}
        />
      </label>
      {canUseCamera() && (
        <button
          type="button"
          className={`${styles.swatch} ${styles.icon}`}
          title="Your webcam. It stays in your browser and is never sent anywhere."
          aria-label="Webcam"
          aria-pressed={active === 'webcam'}
          onClick={() => (active === 'webcam' ? leaveBackgroundCamera() : void startCamera(color))}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M3 7.5A2.5 2.5 0 0 1 5.5 5h8A2.5 2.5 0 0 1 16 7.5v1.7l3.7-2.2a.9.9 0 0 1 1.3.8v8.4a.9.9 0 0 1-1.3.8L16 14.8v1.7a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 3 16.5z"
            />
          </svg>
        </button>
      )}
      <label
        className={`${styles.swatch} ${styles.icon} ${styles.image} ${active === 'image' ? styles.active : ''}`}
        style={active === 'image' && imageUrl ? {backgroundImage: `url("${imageUrl}")`} : undefined}
        title="Load your image. It stays in your browser and is never sent anywhere.">
        <input type="file" accept="image/*" aria-label="Load your image" onChange={onImage} />
        {active !== 'image' && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M5.5 4h13A2.5 2.5 0 0 1 21 6.500v11a2.500 2.500 0 0 1-2.500 2.500h-13A2.500 2.500 0 0 1 3 17.500v-11A2.500 2.500 0 0 1 5.500 4zM8 10.500a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-3 7h14l-4.700-6.300a.8.8 0 0 0-1.300 0l-3 4-1.600-1.800a.8.8 0 0 0-1.200 0z"
            />
          </svg>
        )}
      </label>
      {message && (
        <span className={styles.note} role="status">
          {message}
        </span>
      )}
    </div>
  );
}
