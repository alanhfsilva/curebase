/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PROXY_TARGET = 'http://localhost:3001';
const DEV_SERVER_PORT = 5173;

export default defineConfig({
  plugins: [react()],
  server: {
    port: DEV_SERVER_PORT,
    proxy: {
      '/participants': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
