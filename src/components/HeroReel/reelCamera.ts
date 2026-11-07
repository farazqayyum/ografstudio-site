/**
 * Feeds the visitor's webcam into the reel's Transition Logic monitor.
 *
 * A live Media fill in an OGraf graphic asks its renderer for frames through a `zd-ograf-media`
 * element, by source tag. This page is the renderer here, so it defines that element. Until the
 * camera is on, getFrame returns nothing and the graphic shows the fill's fallback image.
 */

// The tag on the fill in carousel/build.mjs.
const CAMERA_TAG = 'reel-camera';
const LIVE_MEDIA_ELEMENT = 'zd-ograf-media';
// The picture sits 10% inside a transparent frame, as carousel/assets/monitor-still.webp does, so the
// glitch has a see-through margin to tear into. See "The webcam on the monitor" in carousel/README.md.
const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 720;
const INSET = 0.1;

let video: HTMLVideoElement | null = null;
let frame: HTMLCanvasElement | null = null;

/** The latest camera picture, flipped so it behaves like a mirror, as the webcam background does. */
function cameraFrame(): HTMLCanvasElement | null {
  if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
  if (!frame) {
    frame = document.createElement('canvas');
    frame.width = FRAME_WIDTH;
    frame.height = FRAME_HEIGHT;
  }
  const context = frame.getContext('2d');
  if (!context) return null;
  const pictureWidth = FRAME_WIDTH * (1 - INSET * 2);
  const pictureHeight = FRAME_HEIGHT * (1 - INSET * 2);
  const scale = Math.max(pictureWidth / video.videoWidth, pictureHeight / video.videoHeight);
  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;
  context.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  context.save();
  context.beginPath();
  context.rect(FRAME_WIDTH * INSET, FRAME_HEIGHT * INSET, pictureWidth, pictureHeight);
  context.clip();
  context.setTransform(-1, 0, 0, 1, FRAME_WIDTH, 0);
  context.drawImage(video, (FRAME_WIDTH - width) / 2, (FRAME_HEIGHT - height) / 2, width, height);
  context.restore();
  return frame;
}

/** Safe to call more than once: a custom element can only be defined once per page. */
export function defineReelCameraSource(): void {
  if (customElements.get(LIVE_MEDIA_ELEMENT)) return;
  customElements.define(
    LIVE_MEDIA_ELEMENT,
    class extends HTMLElement {
      getFrame(): HTMLCanvasElement | null {
        return this.dataset.sourceTag === CAMERA_TAG ? cameraFrame() : null;
      }
    },
  );
}

/** Points the monitor at a camera stream, or back at its fallback image with null. */
export function setReelCameraStream(stream: MediaStream | null): void {
  if (!stream) {
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    video = null;
    return;
  }
  video ??= document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  void video.play().catch(() => undefined);
}
