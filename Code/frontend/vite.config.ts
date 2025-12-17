import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Copy Tesseract.js worker and core files for offline OCR
    viteStaticCopy({
      targets: [
        // Copy worker files
        {
          src: 'node_modules/tesseract.js/dist/worker.min.js*',
          dest: 'tessdata'
        },
        // Copy core WASM file
        {
          src: 'node_modules/tesseract.js-core/tesseract-core.wasm.js',
          dest: ''
        }
      ]
    })
  ],
  
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 5173,
    strictPort: true,
  },
  
  // Environment variables prefix for client-side exposure
  envPrefix: ['VITE_', 'TAURI_'],
  
  // Build configuration
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    // Output directory
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        popup: path.resolve(__dirname, 'popup.html'),
      },
    },
  },
  
  // Path aliases for cleaner imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
})
