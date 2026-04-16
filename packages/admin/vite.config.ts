import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const adminApiProxyTarget =
  process.env.ADMIN_API_PROXY_TARGET ?? "http://localhost:3000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: adminApiProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
