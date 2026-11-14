import type { Hand } from './hands';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  /** Time the stroke ended, from performance.now(); 0 while still drawing. */
  endedAt: number;
}

const INK_WIDTH = 4;
export const INK_VISIBLE_MS = 3000;
export const INK_FADE_MS = 600;

/**
 * Draws a hand holding a stick. The fingertip sits on `tip`; the stick runs to
 * `grip`, a point below the bottom edge of the viewport.
 */
export function drawHand(
  ctx: CanvasRenderingContext2D,
  hand: Hand,
  image: HTMLImageElement,
  tip: Point,
  grip: Point,
  height: number,
) {
  const scale = height / hand.height;
  const angleOnScreen = Math.atan2(tip.y - grip.y, tip.x - grip.x);
  const angleInImage = Math.atan2(hand.tip[1] - hand.wrist[1], hand.tip[0] - hand.wrist[0]);
  const rotation = angleOnScreen - angleInImage;

  const dx = (hand.wrist[0] - hand.tip[0]) * scale;
  const dy = (hand.wrist[1] - hand.tip[1]) * scale;
  const wrist = {
    x: tip.x + dx * Math.cos(rotation) - dy * Math.sin(rotation),
    y: tip.y + dx * Math.sin(rotation) + dy * Math.cos(rotation),
  };

  ctx.save();
  ctx.strokeStyle = stickGradient(ctx, hand, wrist, grip, Math.max(4, height * 0.07));
  ctx.lineWidth = Math.max(4, height * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(grip.x, grip.y);
  ctx.lineTo(wrist.x, wrist.y);
  ctx.stroke();

  ctx.translate(tip.x, tip.y);
  ctx.rotate(rotation);
  ctx.drawImage(
    image,
    -hand.tip[0] * scale,
    -hand.tip[1] * scale,
    hand.width * scale,
    hand.height * scale,
  );
  ctx.restore();
}

/** Shades the stick across its width so it reads as round. */
function stickGradient(
  ctx: CanvasRenderingContext2D,
  hand: Hand,
  wrist: Point,
  grip: Point,
  width: number,
) {
  const nx = -(wrist.y - grip.y);
  const ny = wrist.x - grip.x;
  const length = Math.hypot(nx, ny) || 1;
  const ox = (nx / length) * (width / 2);
  const oy = (ny / length) * (width / 2);
  const mx = (wrist.x + grip.x) / 2;
  const my = (wrist.y + grip.y) / 2;
  const [highlight, mid, shadow] = hand.stick;
  const gradient = ctx.createLinearGradient(mx - ox, my - oy, mx + ox, my + oy);
  gradient.addColorStop(0, shadow);
  gradient.addColorStop(0.35, mid);
  gradient.addColorStop(0.55, highlight);
  gradient.addColorStop(1, shadow);
  return gradient;
}

/** Draws a smoothed stroke at the given opacity. */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, opacity: number) {
  const [first, ...rest] = stroke.points;
  if (!first) return;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = INK_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  let prev = first;
  for (const point of rest) {
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + point.x) / 2, (prev.y + point.y) / 2);
    prev = point;
  }
  ctx.lineTo(prev.x + 0.01, prev.y);
  ctx.stroke();
  ctx.restore();
}

/** Opacity of a finished stroke: fully visible, then fading out. Returns 0 once gone. */
export function strokeOpacity(stroke: Stroke, now: number) {
  if (!stroke.endedAt) return 1;
  const fading = now - stroke.endedAt - INK_VISIBLE_MS;
  if (fading <= 0) return 1;
  return Math.max(0, 1 - fading / INK_FADE_MS);
}
