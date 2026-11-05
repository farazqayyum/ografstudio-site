/**
 * The Media slide's sound. A coordinated OGraf set can't carry audio (export rejects audio layers
 * and Media Cues, and Media fills are always muted), so the page plays it in step with the slide.
 * Web Audio is used because, once a click has unlocked it, it keeps working when the reel advances
 * by itself, which an <audio> element doesn't in every browser.
 */
export interface ReelSoundUrls {
  in: string;
  out: string;
  film: string;
}

const FILM_GAIN = 0.75;
const FADE_SECONDS = 0.35;
const MAX_DRIFT_SECONDS = 0.15;
const SYNC_EVERY_MS = 250;
const FILM_DELAY_MS = 500;

interface Film {
  source: AudioBufferSourceNode;
  gain: GainNode;
  startedAt: number;
  offset: number;
  length: number;
}

/** Finds a video inside the player's shadow roots and same-origin frames. */
function findVideo(root: ParentNode | null): HTMLVideoElement | null {
  if (!root) return null;
  for (const node of root.querySelectorAll('*')) {
    if (node instanceof HTMLVideoElement) return node;
    if (node.shadowRoot) {
      const found = findVideo(node.shadowRoot);
      if (found) return found;
    }
    if (node instanceof HTMLIFrameElement) {
      try {
        const found = findVideo(node.contentDocument);
        if (found) return found;
      } catch {
        // A cross-origin frame can't hold the reel's video.
      }
    }
  }
  return null;
}

export class ReelSound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers: Promise<Record<keyof ReelSoundUrls, AudioBuffer>> | null = null;
  private film: Film | null = null;
  private enabled = false;
  private onMedia = false;
  private video: HTMLVideoElement | null = null;
  private timer: number | undefined;
  private filmNotBefore = 0;

  constructor(
    private readonly urls: ReelSoundUrls,
    private readonly getRoot: () => ParentNode | null,
  ) {}

  /** Call from the click itself, because browsers only unlock audio during a user gesture. */
  enable(): Promise<unknown> {
    this.context ??= new AudioContext();
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    void this.context.resume();
    this.enabled = true;
    const loaded = this.load();
    if (this.onMedia) this.startMedia();
    return loaded;
  }

  disable(): void {
    this.enabled = false;
    this.stopMedia();
  }

  /** Tells the sound which slide is on air, whether or not it's enabled yet. */
  setOnMedia(onMedia: boolean): void {
    if (onMedia === this.onMedia) return;
    this.onMedia = onMedia;
    if (!this.enabled) return;
    if (onMedia) {
      this.startMedia();
    } else {
      this.stopMedia();
      void this.playOnce('out');
    }
  }

  private startMedia(): void {
    void this.playOnce('in');
    this.video = null;
    this.filmNotBefore = performance.now() + FILM_DELAY_MS;
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => void this.followVideo(), SYNC_EVERY_MS);
    void this.followVideo();
  }

  private stopMedia(): void {
    window.clearInterval(this.timer);
    this.timer = undefined;
    this.stopFilm();
  }

  /** The reel left the screen, or the tab was hidden. */
  setAudible(audible: boolean): void {
    if (!this.context || this.context.state === 'closed') return;
    void (audible ? this.context.resume() : this.context.suspend());
  }

  dispose(): void {
    window.clearInterval(this.timer);
    this.film = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
    this.master = null;
  }

  private load() {
    this.buffers ??= (async () => {
      const decode = async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        return this.context!.decodeAudioData(await response.arrayBuffer());
      };
      const [incoming, outgoing, film] = await Promise.all([
        decode(this.urls.in),
        decode(this.urls.out),
        decode(this.urls.film),
      ]);
      return {in: incoming, out: outgoing, film};
    })();
    return this.buffers;
  }

  private async playOnce(name: 'in' | 'out'): Promise<void> {
    const buffers = await this.load();
    if (!this.enabled || !this.context || !this.master) return;
    const source = this.context.createBufferSource();
    source.buffer = buffers[name];
    source.connect(this.master);
    source.start();
  }

  /** Starts the film sound when the picture is really moving, and holds the two together. */
  private async followVideo(): Promise<void> {
    if (!this.onMedia || !this.enabled) return;
    // Until the audio device has started the clock stands still, which would read as drift.
    if (this.context?.state !== 'running' || this.context.currentTime === 0) return;
    // A slide coming back can briefly leave its old video in place, so let the Take get going.
    if (performance.now() < this.filmNotBefore) return;
    if (!this.video?.isConnected) this.video = findVideo(this.getRoot());
    const video = this.video;
    if (!video || video.paused || video.readyState < 2 || !this.context) return;
    const length = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
    const buffers = await this.load();
    if (!this.onMedia || !this.enabled) return;
    const loopLength = Math.min(length ?? buffers.film.duration, buffers.film.duration);
    const position = video.currentTime % loopLength;
    if (this.film) {
      const elapsed = this.context.currentTime - this.film.startedAt;
      const heard = (this.film.offset + elapsed) % this.film.length;
      const apart = Math.abs(heard - position);
      if (Math.min(apart, this.film.length - apart) <= MAX_DRIFT_SECONDS) return;
      this.stopFilm(0.03);
    }
    this.startFilm(buffers.film, position, loopLength);
  }

  private startFilm(buffer: AudioBuffer, offset: number, length: number): void {
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopEnd = length;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(FILM_GAIN, context.currentTime + FADE_SECONDS);
    source.connect(gain);
    gain.connect(this.master!);
    source.start(0, offset);
    this.film = {source, gain, startedAt: context.currentTime, offset, length};
  }

  private stopFilm(fade = FADE_SECONDS): void {
    const film = this.film;
    this.film = null;
    if (!film || !this.context) return;
    const now = this.context.currentTime;
    film.gain.gain.cancelScheduledValues(now);
    film.gain.gain.setValueAtTime(film.gain.gain.value, now);
    film.gain.gain.linearRampToValueAtTime(0, now + fade);
    film.source.stop(now + fade + 0.02);
  }
}
