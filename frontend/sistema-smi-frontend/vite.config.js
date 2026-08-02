import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 1200, // Aumenta el límite de advertencia de tamaño
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa las librerías de node_modules en chunks independientes para optimizar el build
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'chart-vendor';
            }
            return 'vendor'; // Resto de dependencias externas
          }
        },
      },
    },
  },
});