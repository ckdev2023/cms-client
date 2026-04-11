#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2];

if (!targetFile) {
  console.error('用法: node test-generator.js <path/to/source.ts>');
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(absolutePath)) {
  console.error(`错误: 文件不存在 -> ${absolutePath}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(absolutePath, 'utf8');
const fileName = path.basename(absolutePath);
const dirName = path.dirname(absolutePath);
const ext = path.extname(absolutePath);
const baseName = path.basename(fileName, ext);

const testFileName = `${baseName}.test${ext}`;
const testFilePath = path.join(dirName, testFileName);

if (fs.existsSync(testFilePath)) {
  console.error(`测试文件已存在: ${testFilePath}`);
  process.exit(1);
}

// 简单的正则匹配导出
const exportsRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+([a-zA-Z0-9_]+)/g;
let match;
const exportedNames = [];

while ((match = exportsRegex.exec(fileContent)) !== null) {
  exportedNames.push(match[1]);
}

// 区分是前端 (Vitest/Jest) 还是后端 (node --test)
const isServer = absolutePath.includes('packages/server');
const isMobile = absolutePath.includes('packages/mobile');
const isAdmin = absolutePath.includes('packages/admin');

let template = '';

if (isServer) {
  template = `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
${exportedNames.length > 0 ? `import { ${exportedNames.join(', ')} } from './${baseName}';` : `import * as ${baseName} from './${baseName}';`}

describe('${baseName}', () => {
${exportedNames.map(name => `  describe('${name}', () => {
    it('应该正确执行', () => {
      // TODO: 补充针对 ${name} 的单测断言
      assert.ok(true);
    });
  });`).join('\n\n')}
});
`;
} else if (isAdmin) {
  // Vitest template
  template = `import { describe, it, expect, vi } from 'vitest';
${exportedNames.length > 0 ? `import { ${exportedNames.join(', ')} } from './${baseName}';` : `import * as ${baseName} from './${baseName}';`}

// TODO: 根据规范，禁止在测试中发起真实网络请求，请使用 vi.mock 拦截 API
// vi.mock('@/infra/http/client', () => ({ ... }));

describe('${baseName}', () => {
${exportedNames.map(name => `  describe('${name}', () => {
    it('应该正确执行', () => {
      // TODO: 补充针对 ${name} 的单测断言
      expect(true).toBe(true);
    });
  });`).join('\n\n')}
});
`;
} else if (isMobile) {
  // Jest template
  template = `import { ${exportedNames.length > 0 ? exportedNames.join(', ') : `* as ${baseName}`} } from './${baseName}';

// TODO: 根据规范，禁止在测试中发起真实网络请求，请使用 jest.mock 拦截 API
// jest.mock('@infra/http/client', () => ({ ... }));

describe('${baseName}', () => {
${exportedNames.map(name => `  describe('${name}', () => {
    it('应该正确执行', () => {
      // TODO: 补充针对 ${name} 的单测断言
      expect(true).toBe(true);
    });
  });`).join('\n\n')}
});
`;
} else {
  // Fallback
  template = `// 测试骨架生成成功，请根据测试框架补充相关依赖
describe('${baseName}', () => {
  it('测试占位', () => {
    expect(true).toBe(true);
  });
});
`;
}

fs.writeFileSync(testFilePath, template, 'utf8');

console.log(`✅ 成功生成测试骨架: ${testFilePath}`);
console.log('请记得补充 Mock 和真实断言逻辑。');
