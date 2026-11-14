import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'TinyHand',
    description: 'A tiny hand on a stick in place of your mouse pointer, on any website.',
    permissions: ['storage', 'activeTab'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    action: { default_title: 'TinyHand' },
    web_accessible_resources: [
      { resources: ['hands/*.png', 'sounds/*.wav'], matches: ['<all_urls>'] },
    ],
    commands: {
      'toggle-hand': {
        suggested_key: { default: 'Alt+Shift+H' },
        description: 'Show or hide the hand',
      },
      'toggle-drawing': {
        suggested_key: { default: 'Alt+Shift+D' },
        description: 'Start or stop drawing',
      },
    },
    browser_specific_settings: {
      gecko: { id: 'tinyhand@igwpark.github.io' },
    },
  },
});
