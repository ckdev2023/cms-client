import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // 覆盖率门禁已随业务单测移除而删除：全仓改人工测试，仅保留 19 个静态护栏
    // （FS 扫描 + 完整性/契约断言，见 static-checks/ 等）。护栏不覆盖 model/api，
    // 覆盖率度量已无意义。vitest 仅用于跑这批护栏。
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
