import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from "dotenv";

// https://vite.dev/config/
dotenv.config();

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.VITE_REACT_APP_NEWS_API_KEY": JSON.stringify(process.env.VITE_REACT_APP_NEWS_API_KEY),
  },
})
