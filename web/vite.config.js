import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // VitePWA({...}) - Desactivado por ahora para evitar conflictos de caché
  ],
  build: {
    rollupOptions: {
      output: {
        // Manual Chunking: Divide librerías de terceros (React, Router, etc.) de tu código
        // Esto previene que un solo archivo gigante falle al descargar
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-styles': ['framer-motion', 'lucide-react', 'clsx', 'tailwind-merge'],
          'vendor-utils': ['axios', 'date-fns'],
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Ajustar el límite de advertencia
  }
})
