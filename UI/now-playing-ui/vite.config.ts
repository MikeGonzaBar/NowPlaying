import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from "dotenv";
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
dotenv.config();

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle analyzer (opt-in: vite build --mode analyze)
    ...(mode === 'analyze'
      ? [
        visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
      ]
      : []),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor libraries - SAFE OPTIMIZATION
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-icons': ['react-icons'],
          // Lazy loading will automatically create chunks for each page
        }
      }
    },
    // SAFE: Optimize chunks for better caching
    chunkSizeWarningLimit: 200, // Warn if chunks exceed 200KB
    minify: 'esbuild', // Faster than terser
    sourcemap: false, // Smaller bundles
  },
  define: {
    "process.env.VITE_REACT_APP_NEWS_API_KEY": JSON.stringify(process.env.VITE_REACT_APP_NEWS_API_KEY),
  },
}))
