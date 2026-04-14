import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectTargetFiles,
  findJsdocLanguageViolations,
  findVueDocumentationViolations,
} from "./checkChineseJsdoc.mjs";

describe("checkChineseJsdoc", () => {
  it("accepts Chinese summary and tag descriptions", () => {
    const source = `
      /**
       * 根据案件阶段返回可执行操作列表。
       *
       * @param stage 当前案件阶段
       * @returns 允许执行的操作键集合
       */
      export function getActions(stage: string) {
        return [stage];
      }
    `;

    expect(findJsdocLanguageViolations(source)).toEqual([]);
  });

  it("ignores tags without prose requirements", () => {
    const source = `
      /**
       * 判断是否为外部链接。
       *
       * @param item 当前导航项
       * @internal
       * @returns 是否为外部链接
       */
      export function isExternal(item: unknown) {
        return Boolean(item);
      }
    `;

    expect(findJsdocLanguageViolations(source)).toEqual([]);
  });

  it("reports English summary descriptions", () => {
    const source = `
      /**
       * Returns all navigation items.
       *
       * @returns 所有导航项
       */
      export function allNavItems() {
        return [];
      }
    `;

    expect(findJsdocLanguageViolations(source)).toEqual([
      { line: 2, message: "JSDoc 摘要描述必须使用中文" },
    ]);
  });

  it("reports English param descriptions", () => {
    const source = `
      /**
       * 根据键查找导航项。
       *
       * @param key Item key to search for.
       * @returns 匹配的导航项
       */
      export function findNavItem(key: string) {
        return key;
      }
    `;

    expect(findJsdocLanguageViolations(source)).toEqual([
      { line: 2, message: "@param 描述必须使用中文" },
    ]);
  });

  it("collects admin source files only", () => {
    const packageDir = path.dirname(fileURLToPath(import.meta.url));
    const files = collectTargetFiles(path.resolve(packageDir, "src"));

    expect(files.some((file) => file.endsWith("src/shell/nav-config.ts"))).toBe(
      true,
    );
    expect(files.some((file) => file.includes("/coverage/"))).toBe(false);
  });

  it("requires Chinese component JSDoc in Vue script setup", () => {
    const source = `<script setup lang="ts">
const count = 1;
</script>`;

    expect(findVueDocumentationViolations(source)).toEqual([
      {
        line: 1,
        message: "Vue 组件必须在 script setup 中提供中文 JSDoc 说明",
      },
    ]);
  });

  it("requires JSDoc for named functions in Vue script setup", () => {
    const source = `<script setup lang="ts">
/**
 * 仪表盘快捷操作面板。
 */
const count = 1;

function saveDraft(value: string): string {
  return value;
}
</script>`;

    expect(findVueDocumentationViolations(source)).toEqual([
      {
        line: 6,
        message: "函数 saveDraft 必须提供中文 JSDoc 注释",
      },
    ]);
  });

  it("accepts documented Vue component and functions", () => {
    const source = `<script setup lang="ts">
/**
 * 仪表盘快捷操作面板。
 */
const count = 1;

/**
 * 保存当前草稿内容。
 *
 * @param value 草稿内容
 * @returns 原样返回草稿内容
 */
function saveDraft(value: string): string {
  return value;
}
</script>`;

    expect(findVueDocumentationViolations(source)).toEqual([]);
    expect(findJsdocLanguageViolations(source)).toEqual([]);
  });
});
