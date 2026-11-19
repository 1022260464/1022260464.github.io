// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';

const yamlBrowserEntry = fileURLToPath(
  new URL('./node_modules/yaml/browser/index.js', import.meta.url),
);
const picomatchEntry = fileURLToPath(
  new URL('./scripts/picomatch-entry.mjs', import.meta.url),
);

// https://astro.build/config
export default defineConfig({
  site: 'https://1022260464.github.io',
  base: '/',
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        yaml: yamlBrowserEntry,
        picomatch: picomatchEntry,
      },
    },
  },
});
