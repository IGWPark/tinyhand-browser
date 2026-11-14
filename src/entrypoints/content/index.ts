import { browser } from 'wxt/browser';
import { getHand, handImagePath } from '@/utils/hands';
import type { Message, TabState } from '@/utils/messages';
import { drawHand, drawStroke, strokeOpacity, type Point, type Stroke } from '@/utils/render';
import { HAND_SCALE, settings, updateSettings, type Settings } from '@/utils/settings';
import { createSound } from '@/utils/sound';
import overlayStyles from './overlay.css?inline';

const PAGE_STYLES = `
  html[data-tinyhand], html[data-tinyhand] * { cursor: none !important; }
  html[data-tinyhand='drawing'], html[data-tinyhand='drawing'] * { user-select: none !important; }
`;

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  async main(ctx) {
    let config: Settings = await settings.getValue();

    // The overlay lives in a shadow root so page styles cannot reach it.
    const host = document.createElement('tinyhand-overlay');
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `<style>${overlayStyles}</style><canvas></canvas><div class="badge" role="status"></div>`;
    const canvas = shadow.querySelector('canvas')!;
    const badge = shadow.querySelector<HTMLDivElement>('.badge')!;
    const context = canvas.getContext('2d')!;
    const pageStyle = Object.assign(document.createElement('style'), { textContent: PAGE_STYLES });

    const tap = createSound(browser.runtime.getURL('/sounds/tap.wav'));
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const images = new Map<string, HTMLImageElement>();

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let pointer: Point | undefined;
    let gripX: number | undefined;
    let press = 0;
    let pressed = false;
    let drawing = false;
    let stroke: Stroke | undefined;
    const strokes: Stroke[] = [];
    let needsFrame = true;

    function imageFor(id: string) {
      let image = images.get(id);
      if (!image) {
        image = new Image();
        image.onload = () => (needsFrame = true);
        image.src = browser.runtime.getURL(handImagePath(id));
        images.set(id, image);
      }
      return image;
    }

    function resize() {
      pixelRatio = Math.min(devicePixelRatio || 1, 2);
      width = innerWidth;
      height = innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      needsFrame = true;
    }

    // Shows the hand when it is on and the page is not in fullscreen, where the
    // overlay cannot be drawn on top.
    function apply() {
      const visible = config.enabled && !document.fullscreenElement;
      if (!visible && drawing) setDrawing(false);
      host.hidden = !visible;
      if (visible) document.documentElement.dataset.tinyhand = drawing ? 'drawing' : 'on';
      else delete document.documentElement.dataset.tinyhand;
      needsFrame = true;
    }

    function setDrawing(next: boolean) {
      if (next && !config.enabled) {
        config = { ...config, enabled: true };
        void updateSettings({ enabled: true });
      }
      drawing = next;
      badge.textContent = drawing ? 'Drawing · Esc to stop' : '';
      badge.classList.toggle('visible', drawing);
      if (!drawing) finishStroke();
      apply();
    }

    function finishStroke() {
      if (stroke) stroke.endedAt = performance.now();
      stroke = undefined;
    }

    function isPointer(event: PointerEvent) {
      return event.pointerType === 'mouse' || event.pointerType === 'pen';
    }

    // Input. Listeners run in the capture phase so the hand keeps up even when
    // the page stops propagation.
    ctx.addEventListener(
      window,
      'pointermove',
      (event) => {
        if (!config.enabled || !isPointer(event)) return;
        pointer = { x: event.clientX, y: event.clientY };
        const last = stroke?.points.at(-1);
        if (stroke && last && Math.hypot(pointer.x - last.x, pointer.y - last.y) > 1.5) {
          stroke.points.push(pointer);
        }
        needsFrame = true;
      },
      { capture: true },
    );

    ctx.addEventListener(
      window,
      'pointerdown',
      (event) => {
        if (!config.enabled || !isPointer(event) || event.button !== 0) return;
        pressed = true;
        press = 1;
        if (config.sound) void tap.play();
        if (drawing) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const hand = getHand(config.handId);
          stroke = {
            points: [{ x: event.clientX, y: event.clientY }],
            color: hand.ink,
            endedAt: 0,
          };
          strokes.push(stroke);
        }
        needsFrame = true;
      },
      { capture: true },
    );

    ctx.addEventListener(
      window,
      'pointerup',
      () => {
        pressed = false;
        finishStroke();
      },
      { capture: true },
    );

    // While drawing, the page should not react to the clicks that make the ink.
    for (const type of ['click', 'dblclick', 'auxclick', 'contextmenu'] as const) {
      ctx.addEventListener(
        window,
        type,
        (event) => {
          if (drawing) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        },
        { capture: true },
      );
    }

    ctx.addEventListener(
      window,
      'keydown',
      (event) => {
        if (event.key !== 'Escape' || (!drawing && strokes.length === 0)) return;
        event.stopImmediatePropagation();
        strokes.length = 0;
        setDrawing(false);
      },
      { capture: true },
    );

    ctx.addEventListener(window, 'blur', () => (pressed = false));
    ctx.addEventListener(window, 'resize', resize);
    ctx.addEventListener(document, 'fullscreenchange', apply);

    settings.watch((next) => {
      config = next;
      apply();
    });

    browser.runtime.onMessage.addListener((message: Message): Promise<TabState> | undefined => {
      if (message.type === 'toggle-drawing') setDrawing(!drawing);
      if (message.type === 'get-state' || message.type === 'toggle-drawing') {
        return Promise.resolve({ drawing });
      }
      return undefined;
    });

    // Rendering
    let lastFrame = performance.now();
    function frame(now: number) {
      const dt = Math.min(64, now - lastFrame);
      lastFrame = now;

      if (!pressed && press > 0.002) {
        press -= press * Math.min(1, dt * 0.022);
        needsFrame = true;
      }

      if (!host.hidden && (needsFrame || strokes.length > 0)) {
        needsFrame = false;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);

        for (const item of [...strokes]) {
          const opacity = strokeOpacity(item, now);
          if (opacity > 0) drawStroke(context, item, opacity);
          else strokes.splice(strokes.indexOf(item), 1);
        }

        if (pointer) renderHand(pointer, dt);
      }
      ctx.requestAnimationFrame(frame);
    }

    function renderHand(tip: Point, dt: number) {
      const hand = getHand(config.handId);
      const image = imageFor(hand.id);
      if (!image.complete || !image.naturalWidth) return;

      // The stick is held from below the screen, a little to the right of the
      // pointer, and swings after it with a slight lag.
      const targetX = Math.min(Math.max(tip.x + 0.18 * width, width * 0.15), width * 1.05);
      const follow = reducedMotion.matches ? 1 : Math.min(1, dt * 0.0096);
      gripX = gripX === undefined ? targetX : gripX + (targetX - gripX) * follow;
      if (Math.abs(targetX - gripX) > 0.3) needsFrame = true;

      const size = Math.max(56, Math.min(110, height * 0.13)) * HAND_SCALE[config.size];
      drawHand(
        context,
        hand,
        image,
        tip,
        { x: gripX, y: height * 1.35 },
        size * (1 - 0.06 * press),
      );
    }

    document.head.append(pageStyle);
    document.documentElement.append(host);
    resize();
    apply();
    ctx.requestAnimationFrame(frame);
    ctx.onInvalidated(() => {
      host.remove();
      pageStyle.remove();
      delete document.documentElement.dataset.tinyhand;
    });
  },
});
