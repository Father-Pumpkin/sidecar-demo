import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base './' so the build works at any path (GitHub Pages subpath included).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
