import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@contracts': path.resolve(__dirname, './contracts'),
      '@content': path.resolve(__dirname, './content'),
      '@client': path.resolve(__dirname, './client/src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
