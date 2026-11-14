import { browser } from 'wxt/browser';
import { HANDS, handImagePath } from '@/utils/hands';
import type { Message, TabState } from '@/utils/messages';
import { settings, updateSettings, type HandSize, type Settings } from '@/utils/settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const enabled = $<HTMLInputElement>('enabled');
const sound = $<HTMLInputElement>('sound');
const hands = $('hands');
const sizes = $('sizes');
const draw = $<HTMLButtonElement>('draw');
const drawLabel = $('draw-label');
const drawHelp = $('draw-help');

const COMMAND_LABELS: Record<string, string> = {
  'toggle-hand': 'Show or hide the hand',
  'toggle-drawing': 'Start or stop drawing',
};

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const MAC_KEYS: Record<string, string> = {
  Alt: '⌥',
  Shift: '⇧',
  Ctrl: '⌃',
  MacCtrl: '⌃',
  Command: '⌘',
};

/**
 * Splits a shortcut into keys for display. Chrome on macOS already reports
 * symbols ("⌥⇧H"); other browsers and platforms report "Alt+Shift+H".
 */
function shortcutKeys(shortcut: string | undefined): string[] {
  if (!shortcut) return [];
  if (!shortcut.includes('+')) return shortcut.match(/[⌘⌥⇧⌃]|[^⌘⌥⇧⌃]+/g) ?? [];
  return shortcut.split('+').map((key) => (isMac ? (MAC_KEYS[key] ?? key) : key));
}

function renderKeys(container: HTMLElement, shortcut: string | undefined) {
  const keys = shortcutKeys(shortcut);
  container.replaceChildren(
    ...(keys.length
      ? keys.map((key) => Object.assign(document.createElement('kbd'), { textContent: key }))
      : [
          Object.assign(document.createElement('span'), {
            className: 'unset',
            textContent: 'Not set',
          }),
        ]),
  );
}

function renderSettings(value: Settings) {
  enabled.checked = value.enabled;
  sound.checked = value.sound;
  for (const button of hands.querySelectorAll<HTMLButtonElement>('button')) {
    button.setAttribute('aria-checked', String(button.dataset.hand === value.handId));
  }
  for (const button of sizes.querySelectorAll<HTMLButtonElement>('button')) {
    button.setAttribute('aria-checked', String(button.dataset.size === value.size));
  }
}

for (const hand of HANDS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.role = 'radio';
  button.title = hand.name;
  button.dataset.hand = hand.id;
  button.setAttribute('aria-label', hand.name);
  const image = Object.assign(document.createElement('img'), {
    src: handImagePath(hand.id),
    alt: '',
  });
  button.append(image);
  button.addEventListener('click', () => updateSettings({ handId: hand.id, enabled: true }));
  hands.append(button);
}

sizes.addEventListener('click', (event) => {
  const size = (event.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.size;
  if (size) void updateSettings({ size: size as HandSize });
});
enabled.addEventListener('change', () => updateSettings({ enabled: enabled.checked }));
sound.addEventListener('change', () => updateSettings({ sound: sound.checked }));

async function activeTabId() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function sendToTab(message: Message): Promise<TabState | undefined> {
  const tabId = await activeTabId();
  if (tabId === undefined) return undefined;
  return browser.tabs.sendMessage(tabId, message).catch(() => undefined);
}

function renderDrawState(state: TabState | undefined) {
  draw.disabled = !state;
  drawLabel.textContent = state?.drawing ? 'Stop drawing' : 'Start drawing';
  drawHelp.textContent = state
    ? 'Drag to draw. Ink fades after 3 seconds.'
    : 'Browsers don’t let extensions run on this page. Try another tab.';
}

draw.addEventListener('click', async () => {
  const state = await sendToTab({ type: 'toggle-drawing' });
  // Close so the next click lands on the page.
  if (state?.drawing) window.close();
  else renderDrawState(state);
});

$('change-shortcuts').addEventListener('click', () => {
  const commands = browser.commands as typeof browser.commands & {
    openShortcutSettings?: () => void;
  };
  if (commands.openShortcutSettings) return commands.openShortcutSettings();
  const scheme = navigator.userAgent.includes('Edg/') ? 'edge' : 'chrome';
  void browser.tabs.create({ url: `${scheme}://extensions/shortcuts` });
});

async function renderShortcuts() {
  const commands = await browser.commands.getAll();
  const list = $('shortcuts');
  list.replaceChildren();
  for (const command of commands) {
    const label = command.name && COMMAND_LABELS[command.name];
    if (!label) continue;
    const row = document.createElement('div');
    const keys = document.createElement('dd');
    keys.className = 'keys';
    renderKeys(keys, command.shortcut);
    row.append(Object.assign(document.createElement('dt'), { textContent: label }), keys);
    list.append(row);
    if (command.name === 'toggle-drawing') renderKeys($('draw-keys'), command.shortcut);
  }
}

renderSettings(await settings.getValue());
settings.watch(renderSettings);
renderDrawState(await sendToTab({ type: 'get-state' }));
void renderShortcuts();
