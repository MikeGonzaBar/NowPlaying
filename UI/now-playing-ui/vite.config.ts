import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from "dotenv";
import { visualizer } from 'rollup-plugin-visualizer'

dotenv.config();

export default defineConfig(({ mode }) => ({
  cacheDir: 'C:/Users/gonza/AppData/Local/Temp/vite-tmp',
  plugins: [
    react(),
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
          'vendor-router': ['react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-icons': ['react-icons'],
          'vendor-recharts': ['recharts'],
        }
      }
    },
    chunkSizeWarningLimit: 500,
    minify: 'esbuild',
    sourcemap: false,
  },
  define: {
    "process.env.VITE_REACT_APP_NEWS_API_KEY": JSON.stringify(process.env.VITE_REACT_APP_NEWS_API_KEY),
  },
}))
