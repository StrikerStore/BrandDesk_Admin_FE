import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/auth': 'http://localhost:3001',
      '/api':  'http://localhost:3001',
    },
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: ["admin.branddesk.in"]
  }
});
