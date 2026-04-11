#!/usr/bin/env node

import {
  buildAdditionalContext,
  detectToolFlavor,
  extractDocQuery,
  extractPaths,
  extractPrompt,
  recordDocAudit,
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
const toolFlavor = detectToolFlavor(payload);

if (toolFlavor === 'context7-query-docs') {
  const { libraryId, query } = extractDocQuery(payload);
  recordDocAudit({ libraryId, query });
  console.log('{}');
  process.exit(0);
}

const paths = extractPaths(payload);

if (paths.length === 0) {
  console.log('{}');
  process.exit(0);
}

const additionalContext = buildAdditionalContext({
  prompt: extractPrompt(payload),
  paths,
});

if (additionalContext.length === 0) {
  console.log('{}');
  process.exit(0);
}

console.log(
  JSON.stringify({
    additional_context: additionalContext,
  }),
);
