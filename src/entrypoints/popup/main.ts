import { HANDS, handImagePath } from '@/utils/hands';
import { settings, updateSettings, type HandSize, type Settings } from '@/utils/settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const enabled = $<HTMLInputElement>('enabled');
const sound = $<HTMLInputElement>('sound');
const hands = $('hands');
const sizes = $('sizes');

// macOS keyboards label Alt as Option.
if (/Mac/.test(navigator.platform)) $('draw-key').textContent = '⌥ Option';

function render(value: Settings) {
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
  button.append(
    Object.assign(document.createElement('img'), { src: handImagePath(hand.id), alt: '' }),
  );
  button.addEventListener('click', () => updateSettings({ handId: hand.id, enabled: true }));
  hands.append(button);
}

sizes.addEventListener('click', (event) => {
  const size = (event.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.size;
  if (size) void updateSettings({ size: size as HandSize });
});
enabled.addEventListener('change', () => updateSettings({ enabled: enabled.checked }));
sound.addEventListener('change', () => updateSettings({ sound: sound.checked }));

render(await settings.getValue());
settings.watch(render);
