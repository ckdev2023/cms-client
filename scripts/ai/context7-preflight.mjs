#!/usr/bin/env node

import {
  buildAdditionalContext,
  summarizeStatus,
} from './context7-core.mjs';

function parseArgs(argv) {
  const args = {
    prompt: '',
    paths: [],
    status: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--prompt') {
      args.prompt = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (value === '--paths') {
      args.paths = (argv[index + 1] ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (value === '--status') {
      args.status = true;
      continue;
    }

    if (value === '--json') {
      args.json = true;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.status) {
  const status = summarizeStatus();
  console.log(JSON.stringify(status, null, 2));
  process.exit(0);
}

const context = buildAdditionalContext({
  prompt: args.prompt,
  paths: args.paths,
});

if (args.json) {
  console.log(
    JSON.stringify(
      {
        additional_context: context,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (context.length > 0) {
  console.log(context);
}
