#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml', '.vue', '.html', '.css']);
const patterns = [
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/,
  /(secret|token|password)\s*[:=]\s*['"][^'"]{8,}/i,
  /postgres:\/\/[^\s]+:[^\s]+@/i
];

const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', 'web-build', '.expo', '.tamagui']);
const root = path.resolve(__dirname, '../../..');

let hasError = false;

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(p);
    } else if (exts.has(path.extname(ent.name))) {
      const c = fs.readFileSync(p, 'utf8');
      for (const r of patterns) {
        if (r.test(c)) {
          console.error(`门禁：疑似敏感信息：${p}`);
          hasError = true;
        }
      }
    }
  }
}

const dirsToCheck = [
  path.join(root, 'packages/server/src'),
  path.join(root, 'packages/mobile/src'),
  path.join(root, 'packages/admin/src'),
];

for (const dir of dirsToCheck) {
  if (fs.existsSync(dir)) {
    walk(dir);
  }
}

if (hasError) {
  process.exit(1);
}

console.log('✅ 敏感信息扫描通过');
