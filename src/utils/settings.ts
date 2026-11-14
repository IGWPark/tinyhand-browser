import { storage } from '#imports';
import { DEFAULT_HAND_ID } from './hands';

export type HandSize = 'small' | 'medium' | 'large';

export interface Settings {
  enabled: boolean;
  handId: string;
  size: HandSize;
  sound: boolean;
}

export const HAND_SCALE: Record<HandSize, number> = {
  small: 0.75,
  medium: 1,
  large: 1.35,
};

/** Synced across the user's browsers when they are signed in. */
export const settings = storage.defineItem<Settings>('sync:settings', {
  fallback: { enabled: true, handId: DEFAULT_HAND_ID, size: 'medium', sound: true },
});

export async function updateSettings(patch: Partial<Settings>) {
  const current = await settings.getValue();
  await settings.setValue({ ...current, ...patch });
}
