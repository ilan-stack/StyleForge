import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "client",
  server: {
    port: 5199,
    proxy: {
      "/api": {
        target: "http://localhost:3456",
        timeout: 300000, // 5 min — generation can take a while
      },
      "/uploads": "http://localhost:3456",
    },
  },
  build: {
    outDir: "../dist",
  },
});
