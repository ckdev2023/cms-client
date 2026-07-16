import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      // 覆盖率只圈逻辑层（视图模型 model/ 与仓储 api/）。
      //
      // 历史坑：原三条 glob（features/domain/data）整段抄自 mobile，在 admin 里
      // 一个目录都不存在——v8 报 0/0「Unknown%」，80% 阈值在空集上真空通过，
      // 而 `npm run test` 就挂在 admin:guard 里，故该门禁长期空转（本仓主线病之一）。
      // 现改指真实目录：features/**/model → views/**/model（212 文件，纯逻辑无 .vue），
      // data → views/**/api（仓储层，当前仅 cases/api）；domain 在 admin 无对应物，删。
      //
      // 阈值按「先测再信」定档：改指后实测 lines 91.02 / functions 90.63 /
      // statements 88.46 / branches 80.52（全量套件带插桩，未测文件计入——已探针
      // 确认报告含 0% 文件，非虚高）。在实测值下方留 1–2pp 缓冲棘轮上锁，把静默
      // 回退空间从 11pp 收到约 1pp；branches 维持配置原定的 80。
      include: ["src/views/**/model/**", "src/views/**/api/**"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/*.d.ts"],
      thresholds: {
        lines: 90,
        functions: 89,
        branches: 80,
        statements: 87,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
