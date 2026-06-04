// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Tumhari original important settings
  output: 'server',
  
  // Sitemap ke liye ye URL zaroori hai
  site: 'https://linux-tool-hub.vercel.app',

  vite: {
    plugins: [tailwindcss()]
  },

  // Integration mein sitemap add kar diya hai
  integrations: [sitemap()],

  adapter: vercel()
});