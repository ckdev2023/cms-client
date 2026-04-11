#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');

const forbidden = ['yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];

let hasError = false;

for (const f of forbidden) {
  if (fs.existsSync(path.join(root, f))) {
    console.error('门禁：发现不允许的锁文件', f);
    hasError = true;
  }
}

const required = path.join(root, 'package-lock.json');
if (!fs.existsSync(required)) {
  console.error('门禁：缺少 package-lock.json');
  hasError = true;
}

if (hasError) {
  process.exit(1);
}

console.log('✅ 锁文件检查通过');
