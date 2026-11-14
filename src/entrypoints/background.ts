import { browser } from 'wxt/browser';
import type { Message } from '@/utils/messages';
import { settings, updateSettings } from '@/utils/settings';

export default defineBackground(() => {
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-hand') {
      const { enabled } = await settings.getValue();
      await updateSettings({ enabled: !enabled });
    }

    if (command === 'toggle-drawing') {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) return;
      const message: Message = { type: 'toggle-drawing' };
      // Pages where extensions cannot run (browser settings, web stores) have no listener.
      await browser.tabs.sendMessage(tab.id, message).catch(() => undefined);
    }
  });
});
