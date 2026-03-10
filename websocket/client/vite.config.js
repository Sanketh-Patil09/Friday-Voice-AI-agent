import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // HTTP API call
      '/connect': {
        target: 'http://localhost:7860',
        changeOrigin: true,
      },

      // WebSocket connection (THIS FIXES AUDIO)
      '/ws': {
        target: 'ws://localhost:7860',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});