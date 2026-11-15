import { browser } from 'wxt/browser';
import { handImagePath } from '@/utils/hands';

export interface HandImageRequest {
  type: 'hand-image';
  handId: string;
}

/**
 * Reads hand images for the content script. Pages are not allowed to load
 * extension files on some sites (YouTube's service worker blocks them), so the
 * bytes are passed over messaging instead of by URL.
 */
export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: HandImageRequest) => {
    if (message?.type !== 'hand-image') return undefined;
    return fetch(browser.runtime.getURL(handImagePath(message.handId)))
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        let binary = '';
        for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
        return btoa(binary);
      });
  });
});
