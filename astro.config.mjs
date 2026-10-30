// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://1022260464.github.io',
  base: '/',
  integrations: [react()],
});
