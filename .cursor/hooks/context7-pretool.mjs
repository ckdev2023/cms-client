#!/usr/bin/env node

import {
  buildWriteGuard,
  detectToolFlavor,
  extractPaths,
} from '../../scripts/ai/context7-core.mjs';

function readStdin() {
  return new Promise((resolve) => {
    let buffer = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
    });
    process.stdin.on('end', () => {
      resolve(buffer);
    });
  });
}

const rawInput = await readStdin();
const payload = rawInput ? JSON.parse(rawInput) : {};

if (detectToolFlavor(payload) !== 'write') {
  console.log('{ "permission": "allow" }');
  process.exit(0);
}

const paths = extractPaths(payload);
const response = buildWriteGuard(paths);

console.log(JSON.stringify(response));
