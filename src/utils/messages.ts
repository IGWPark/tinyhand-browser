/** Messages sent from the popup and background to the content script in a tab. */
export type Message = { type: 'get-state' } | { type: 'toggle-drawing' };

export interface TabState {
  drawing: boolean;
}
