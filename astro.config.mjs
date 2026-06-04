// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // ✅ Yeh line add ki
  output: 'server',

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});