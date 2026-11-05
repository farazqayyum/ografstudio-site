/**
 * Makes the Media slide's sound. The effects are synthesised here, so they carry no licence; the
 * film audio is the same excerpt as the clip. Needs ffmpeg on PATH.
 *
 *   node carousel/sound/build-sound.mjs [--film <path to bbb_sunflower_1080p_30fps_normal.mp4>]
 *
 * Without --film, only the effects are rebuilt.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(siteRoot, 'static', 'audio');
const workDir = mkdtempSync(path.join(tmpdir(), 'reel-sound-'));
const RATE = 44100;
// The clip in carousel/assets is this excerpt of the film; see carousel/README.md.
const FILM_START = 77.9;
const FILM_SECONDS = 16.3;

// Repeatable noise, so a rebuild doesn't change the files for no reason.
function noiseSource(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2147483648 - 1;
  };
}

function buffer(seconds) {
  const length = Math.ceil(seconds * RATE);
  return [new Float32Array(length), new Float32Array(length)];
}

const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Noise through a band-pass whose centre follows `frequency(t)`, panned by `pan(t)` (-1 to 1). */
function addWhoosh(mix, { start, seconds, gain, frequency, envelope, pan, seed, q = 0.9 }) {
  const noises = [noiseSource(seed), noiseSource(seed + 7919)];
  const states = [
    { low: 0, band: 0 },
    { low: 0, band: 0 },
  ];
  const first = Math.floor(start * RATE);
  const count = Math.floor(seconds * RATE);
  for (let i = 0; i < count; i++) {
    const t = i / RATE;
    const u = t / seconds;
    const f = 2 * Math.sin((Math.PI * Math.min(frequency(u), RATE / 6)) / RATE);
    const level = gain * envelope(u);
    const angle = ((pan(u) + 1) * Math.PI) / 4;
    const pans = [Math.cos(angle), Math.sin(angle)];
    for (let channel = 0; channel < 2; channel++) {
      // Mostly shared noise, with enough difference between the channels to feel wide.
      const input = noises[0]() * 0.8 + noises[1]() * (channel ? 0.5 : -0.5);
      const state = states[channel];
      state.low += f * state.band;
      const high = input - state.low - q * state.band;
      state.band += f * high;
      mix[channel][first + i] += state.band * level * pans[channel];
    }
  }
}

/** A falling sine with a short click on top: the weight of the picture landing. */
function addImpact(mix, { start, gain }) {
  const noise = noiseSource(4242);
  const first = Math.floor(start * RATE);
  const count = Math.floor(0.7 * RATE);
  let phase = 0;
  for (let i = 0; i < count; i++) {
    const t = i / RATE;
    const frequency = 42 + 78 * Math.exp(-t / 0.045);
    phase += (2 * Math.PI * frequency) / RATE;
    const body = Math.sin(phase) * Math.exp(-t / 0.17) * smooth(0, 0.002, t);
    const click = noise() * Math.exp(-t / 0.006) * 0.35;
    const value = (body + click) * gain;
    mix[0][first + i] += value;
    mix[1][first + i] += value;
  }
}

/** A small bell-like tick for each tile arriving. */
function addTick(mix, { start, frequency, gain, pan, decay = 0.085 }) {
  const first = Math.floor(start * RATE);
  const count = Math.floor(decay * 6 * RATE);
  const angle = ((pan + 1) * Math.PI) / 4;
  const pans = [Math.cos(angle), Math.sin(angle)];
  for (let i = 0; i < count; i++) {
    const t = i / RATE;
    const tone =
      Math.sin(2 * Math.PI * frequency * t) +
      0.32 * Math.sin(2 * Math.PI * frequency * 2.76 * t) * Math.exp(-t / 0.03);
    const value = tone * Math.exp(-t / decay) * smooth(0, 0.0015, t) * gain;
    mix[0][first + i] += value * pans[0];
    mix[1][first + i] += value * pans[1];
  }
}

/** A small room around the effects: parallel combs into series all-passes, per channel. */
function addRoom(mix, wet) {
  const combs = [1116, 1188, 1277, 1356];
  const allPasses = [556, 441];
  mix.forEach((channel, side) => {
    const spread = side * 23;
    const out = new Float32Array(channel.length);
    for (const delay of combs) {
      const size = delay + spread;
      const line = new Float32Array(size);
      let index = 0;
      let damped = 0;
      for (let i = 0; i < channel.length; i++) {
        const delayed = line[index];
        damped = delayed * 0.72 + damped * 0.28;
        line[index] = channel[i] + damped * 0.8;
        index = (index + 1) % size;
        out[i] += delayed / combs.length;
      }
    }
    for (const delay of allPasses) {
      const size = delay + spread;
      const line = new Float32Array(size);
      let index = 0;
      for (let i = 0; i < out.length; i++) {
        const delayed = line[index];
        const input = out[i];
        line[index] = input + delayed * 0.5;
        out[i] = delayed - input;
        index = (index + 1) % size;
      }
    }
    for (let i = 0; i < channel.length; i++) channel[i] += out[i] * wet;
  });
}

/** Peak-normalises, rounds off any overs, and fades the very end so the file can't click. */
function finish(mix, peakDb) {
  const fade = Math.floor(0.03 * RATE);
  const target = 10 ** (peakDb / 20);
  let peak = 0;
  for (const channel of mix) for (const value of channel) peak = Math.max(peak, Math.abs(value));
  const scale = target / Math.max(peak, 1e-6);
  for (const channel of mix)
    for (let i = 0; i < channel.length; i++) {
      const tail = Math.min(1, (channel.length - 1 - i) / fade);
      channel[i] = Math.tanh(channel[i] * scale) * tail;
    }
}

function encode(mix, name) {
  const length = mix[0].length;
  const wav = Buffer.alloc(44 + length * 4);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + length * 4, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(RATE, 24);
  wav.writeUInt32LE(RATE * 4, 28);
  wav.writeUInt16LE(4, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(length * 4, 40);
  for (let i = 0; i < length; i++) {
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[0][i])) * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[1][i])) * 32767), 46 + i * 4);
  }
  const source = path.join(workDir, `${name}.wav`);
  writeFileSync(source, wav);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', source, '-c:a', 'libmp3lame', '-b:a', '128k', path.join(outDir, `${name}.mp3`)]);
  console.log(`Wrote static/audio/${name}.mp3`);
}

/**
 * The slide arriving. Times follow the `reel-morph` recipe and the Media template in build.mjs:
 * the surface glides for about 1.1 s, the video lands near 0.95 s, then the three tiles at
 * 0.92, 1.02 and 1.12 s, and the sound strip after them.
 */
function mediaIn() {
  const mix = buffer(2.4);
  addWhoosh(mix, {
    start: 0,
    seconds: 1.15,
    gain: 1.1,
    seed: 11,
    frequency: (u) => 260 * (5200 / 260) ** smooth(0, 0.62, u) * (1 - 0.72 * smooth(0.62, 1, u)),
    envelope: (u) => smooth(0, 0.56, u) ** 2 * (1 - smooth(0.6, 1, u)),
    pan: (u) => 0.75 - 1.1 * u,
  });
  addImpact(mix, { start: 0.9, gain: 0.8 });
  addTick(mix, { start: 0.9, frequency: 880, gain: 0.2, pan: -0.45 });
  addTick(mix, { start: 1.0, frequency: 1174.66, gain: 0.2, pan: 0.1 });
  addTick(mix, { start: 1.1, frequency: 1567.98, gain: 0.2, pan: 0.6 });
  // The strip of sound levels switching on.
  addTick(mix, { start: 1.26, frequency: 2093, gain: 0.065, pan: 0.25, decay: 0.26 });
  addTick(mix, { start: 1.26, frequency: 2637.02, gain: 0.05, pan: -0.25, decay: 0.3 });
  addRoom(mix, 0.2);
  finish(mix, -5);
  encode(mix, 'reel-media-in');
}

/** The slide leaving, quieter than it arrived. */
function mediaOut() {
  const mix = buffer(0.9);
  addWhoosh(mix, {
    start: 0,
    seconds: 0.55,
    gain: 1,
    seed: 23,
    frequency: (u) => 3800 * (320 / 3800) ** u,
    envelope: (u) => smooth(0, 0.25, u) * (1 - smooth(0.3, 1, u)),
    pan: (u) => -0.2 + 0.8 * u,
  });
  addRoom(mix, 0.18);
  finish(mix, -13);
  encode(mix, 'reel-media-out');
}

function film(source) {
  execFileSync('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    String(FILM_START),
    '-t',
    String(FILM_SECONDS),
    '-i',
    source,
    '-map',
    '0:a:0',
    '-af',
    'loudnorm=I=-21:TP=-2:LRA=11,afade=t=in:d=0.02,areverse,afade=t=in:d=0.02,areverse',
    '-ac',
    '2',
    '-ar',
    String(RATE),
    '-c:a',
    'libmp3lame',
    '-b:a',
    '112k',
    path.join(outDir, 'reel-media-film.mp3'),
  ]);
  console.log('Wrote static/audio/reel-media-film.mp3');
}

try {
  execFileSync(process.platform === 'win32' ? 'cmd' : 'mkdir', process.platform === 'win32' ? ['/c', 'mkdir', outDir] : ['-p', outDir], { stdio: 'ignore' });
} catch {
  // Already there.
}
mediaIn();
mediaOut();
const filmFlag = process.argv.indexOf('--film');
if (filmFlag >= 0) film(process.argv[filmFlag + 1]);
rmSync(workDir, { recursive: true, force: true });
