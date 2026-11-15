import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'TinyHand for Browser',
    description: 'A tiny hand on a stick in place of your mouse pointer, on any website.',
    permissions: ['storage'],
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
    browser_specific_settings: {
      gecko: { id: 'tinyhand-browser@igwpark.github.io' },
    },
  },
});
