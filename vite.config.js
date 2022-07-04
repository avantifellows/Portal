import { defineConfig } from "vite";
import path from "path";
import vue from "@vitejs/plugin-vue";
import eslintPlugin from "vite-plugin-eslint";

export default defineConfig({
  plugins: [vue(), eslintPlugin()],
  server: {
    port: 8080,
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "src"),
      },
    ],
  },
});
