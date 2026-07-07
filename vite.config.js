import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Required for SharedArrayBuffer used by ffmpeg.wasm (multi-thread mode)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      // Enables byte-range seeking in large video files
      'Accept-Ranges': 'bytes',
    },
    fs: {
      strict: false,
    },
  },
  // Treat video files as static assets — never bundle or fingerprint them
  assetsInclude: ['**/*.mkv', '**/*.mp4', '**/*.avi', '**/*.mov', '**/*.webm'],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})
