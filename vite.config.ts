import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@contracts': path.resolve(__dirname, './contracts'),
      '@content': path.resolve(__dirname, './content'),
      '@client': path.resolve(__dirname, './client/src'),
    },
  },
});
