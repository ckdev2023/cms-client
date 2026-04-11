import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const STATE_FILE = path.join(
  REPO_ROOT,
  '.cursor',
  'state',
  'context7-audit.json',
);

const STACK_DEFINITIONS = [
  {
    id: 'mobile',
    label: 'Mobile',
    pathPrefixes: ['packages/mobile/'],
    libraries: [
      {
        key: 'expo',
        name: 'Expo',
        packageName: 'expo',
        manifestPath: 'packages/mobile/package.json',
        libraryIdPatterns: [/expo/i],
      },
      {
        key: 'react-native',
        name: 'React Native',
        packageName: 'react-native',
        manifestPath: 'packages/mobile/package.json',
        libraryIdPatterns: [/react-native/i],
      },
      {
        key: 'react-navigation',
        name: 'React Navigation',
        packageName: '@react-navigation/native',
        manifestPath: 'packages/mobile/package.json',
        libraryIdPatterns: [/react-navigation/i],
      },
      {
        key: 'tamagui',
        name: 'Tamagui',
        packageName: 'tamagui',
        manifestPath: 'packages/mobile/package.json',
        libraryIdPatterns: [/tamagui/i],
      },
    ],
  },
  {
    id: 'server',
    label: 'Server',
    pathPrefixes: ['packages/server/'],
    libraries: [
      {
        key: 'nestjs',
        name: 'NestJS',
        packageName: '@nestjs/common',
        manifestPath: 'packages/server/package.json',
        libraryIdPatterns: [/nestjs/i],
      },
      {
        key: 'drizzle',
        name: 'Drizzle ORM',
        packageName: 'drizzle-orm',
        manifestPath: 'packages/server/package.json',
        libraryIdPatterns: [/drizzle/i],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    pathPrefixes: ['packages/admin/'],
    libraries: [
      {
        key: 'vue',
        name: 'Vue',
        packageName: 'vue',
        manifestPath: 'packages/admin/package.json',
        libraryIdPatterns: [/vue/i],
      },
      {
        key: 'pinia',
        name: 'Pinia',
        packageName: 'pinia',
        manifestPath: 'packages/admin/package.json',
        libraryIdPatterns: [/pinia/i],
      },
      {
        key: 'vue-router',
        name: 'Vue Router',
        packageName: 'vue-router',
        manifestPath: 'packages/admin/package.json',
        libraryIdPatterns: [/vue-router/i, /router/i],
      },
      {
        key: 'arco',
        name: 'Arco Design Vue',
        packageName: '@arco-design/web-vue',
        manifestPath: 'packages/admin/package.json',
        libraryIdPatterns: [/arco/i],
      },
    ],
  },
];

const HINT_TTL_MS = 10 * 60 * 1000;
const AUDIT_TTL_MS = 6 * 60 * 60 * 1000;
const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.vue',
]);

const manifestCache = new Map();

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function loadManifest(relativePath) {
  if (!manifestCache.has(relativePath)) {
    manifestCache.set(
      relativePath,
      readJsonFile(path.join(REPO_ROOT, relativePath)) ?? {},
    );
  }

  return manifestCache.get(relativePath);
}

function getPackageVersion(manifestPath, packageName) {
  const manifest = loadManifest(manifestPath);
  const version =
    manifest.dependencies?.[packageName] ??
    manifest.devDependencies?.[packageName] ??
    manifest.peerDependencies?.[packageName];

  return typeof version === 'string' ? version : 'unknown';
}

function normalizePath(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return null;
  }

  const withSlashes = input.replaceAll('\\', '/');

  if (withSlashes.startsWith(REPO_ROOT.replaceAll('\\', '/'))) {
    return path.relative(REPO_ROOT, input).replaceAll('\\', '/');
  }

  if (
    withSlashes.startsWith('packages/') ||
    withSlashes.startsWith('.cursor/') ||
    withSlashes.startsWith('scripts/')
  ) {
    return withSlashes;
  }

  return null;
}

function looksLikeRepoPath(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }

  if (normalizePath(value)) {
    return true;
  }

  return /packages\/(mobile|server|admin)\//.test(value);
}

function visit(value, visitor, seen = new Set()) {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === 'string') {
    visitor(value);
    return;
  }

  if (typeof value !== 'object') {
    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      visit(item, visitor, seen);
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    visitor(key, true);
    visit(child, visitor, seen);
  }
}

export function extractPaths(payload) {
  const paths = new Set();

  visit(payload, (value) => {
    if (!looksLikeRepoPath(value)) {
      return;
    }

    const normalized = normalizePath(value);
    if (normalized) {
      paths.add(normalized);
    }
  });

  const payloadText = JSON.stringify(payload);
  const regex = /(?:packages\/(?:mobile|server|admin)\/[A-Za-z0-9._/\-]+|\.(?:cursor|\/cursor)\/[A-Za-z0-9._/\-]+)/g;

  for (const match of payloadText.matchAll(regex)) {
    const normalized = normalizePath(match[0]);
    if (normalized) {
      paths.add(normalized);
    }
  }

  return [...paths].sort();
}

export function extractPrompt(payload) {
  const candidates = [];

  function walk(value, keyHint = '') {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (
        trimmed.length >= 24 &&
        !looksLikeRepoPath(trimmed) &&
        /[A-Za-z\u4e00-\u9fff]/.test(trimmed)
      ) {
        candidates.push({
          score: trimmed.length + (/(prompt|query|message|text)/i.test(keyHint) ? 50 : 0),
          text: trimmed,
        });
      }
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item, keyHint);
      }
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      walk(child, key);
    }
  }

  walk(payload);

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.text ?? '';
}

export function extractDocQuery(payload) {
  const result = {
    libraryId: '',
    query: '',
  };

  function walk(value) {
    if (value === null || value === undefined || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }

    if (typeof value.libraryId === 'string' && value.libraryId.length > 0) {
      result.libraryId = value.libraryId;
    }

    if (typeof value.query === 'string' && value.query.length > 0) {
      result.query = value.query;
    }

    for (const child of Object.values(value)) {
      walk(child);
    }
  }

  walk(payload);

  return result;
}

export function detectToolFlavor(payload) {
  const text = JSON.stringify(payload);

  if (/query-docs/i.test(text)) {
    return 'context7-query-docs';
  }

  if (/resolve-library-id/i.test(text)) {
    return 'context7-resolve-library-id';
  }

  if (/ApplyPatch|EditNotebook|Write|TabWrite|afterFileEdit/i.test(text)) {
    return 'write';
  }

  if (/ReadFile|TabRead|beforeReadFile|postToolUse/i.test(text)) {
    return 'read';
  }

  return 'unknown';
}

function stackMatchesPath(stack, relativePath) {
  return stack.pathPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

function hasManagedExtension(relativePath) {
  return CODE_EXTENSIONS.has(path.extname(relativePath));
}

export function matchStacksForPaths(paths) {
  const matched = [];

  for (const stack of STACK_DEFINITIONS) {
    const stackPaths = paths.filter(
      (relativePath) =>
        stackMatchesPath(stack, relativePath) && hasManagedExtension(relativePath),
    );

    if (stackPaths.length > 0) {
      matched.push({
        ...stack,
        matchedPaths: stackPaths,
        libraries: stack.libraries.map((library) => ({
          ...library,
          version: getPackageVersion(library.manifestPath, library.packageName),
        })),
      });
    }
  }

  return matched;
}

export function loadState() {
  const state = readJsonFile(STATE_FILE);

  if (!state || typeof state !== 'object') {
    return {
      version: 1,
      audits: [],
      hintedStacks: {},
    };
  }

  return {
    version: 1,
    audits: Array.isArray(state.audits) ? state.audits : [],
    hintedStacks:
      state.hintedStacks && typeof state.hintedStacks === 'object'
        ? state.hintedStacks
        : {},
  };
}

export function saveState(state) {
  writeJsonFile(STATE_FILE, state);
}

function matchesLibrary(stack, libraryId) {
  return stack.libraries.some((library) =>
    library.libraryIdPatterns.some((pattern) => pattern.test(libraryId)),
  );
}

export function recordDocAudit({ libraryId, query }) {
  if (!libraryId) {
    return;
  }

  const state = loadState();
  const recordedAt = new Date().toISOString();
  const matchedStacks = STACK_DEFINITIONS.filter((stack) =>
    matchesLibrary(stack, libraryId),
  ).map((stack) => stack.id);

  state.audits = [
    {
      libraryId,
      query,
      stacks: matchedStacks,
      recordedAt,
    },
    ...state.audits,
  ].slice(0, 40);

  saveState(state);
}

export function shouldHintStack(stackId, now = Date.now()) {
  const state = loadState();
  const lastHintedAt = state.hintedStacks[stackId];

  if (typeof lastHintedAt !== 'string') {
    return true;
  }

  return now - new Date(lastHintedAt).getTime() > HINT_TTL_MS;
}

export function markStacksHinted(stackIds) {
  if (stackIds.length === 0) {
    return;
  }

  const state = loadState();
  const now = new Date().toISOString();

  for (const stackId of stackIds) {
    state.hintedStacks[stackId] = now;
  }

  saveState(state);
}

export function hasFreshAuditForStack(stackId, now = Date.now()) {
  const state = loadState();

  return state.audits.some((audit) => {
    if (!Array.isArray(audit.stacks) || !audit.stacks.includes(stackId)) {
      return false;
    }

    const recordedAt = new Date(audit.recordedAt).getTime();
    return Number.isFinite(recordedAt) && now - recordedAt <= AUDIT_TTL_MS;
  });
}

export function analyzePaths(paths) {
  const stacks = matchStacksForPaths(paths);
  const hintableStacks = stacks.filter((stack) => shouldHintStack(stack.id));

  return {
    stacks,
    hintableStacks,
    requiresContext7: stacks.length > 0,
  };
}

function buildLibrarySummary(library) {
  return `${library.name} ${library.version}`;
}

function buildSuggestedQuery(stack, prompt) {
  const libraryList = stack.libraries.map(buildLibrarySummary).join(', ');

  if (prompt) {
    return `${prompt} Use current official docs for ${libraryList} and prefer the recommended path over legacy APIs.`;
  }

  return `Current recommended patterns for ${libraryList} in ${stack.label.toLowerCase()} code, including configuration, testing, and migration-safe APIs.`;
}

export function buildAdditionalContext({ prompt = '', paths = [] }) {
  const analysis = analyzePaths(paths);

  if (analysis.hintableStacks.length === 0) {
    return '';
  }

  const lines = [
    'Context7 preflight:',
    'This task touches framework-managed code. If the change depends on third-party APIs, query Context7 before writing code.',
  ];

  for (const stack of analysis.hintableStacks) {
    lines.push(
      `- ${stack.label}: ${stack.libraries.map(buildLibrarySummary).join(', ')}`,
    );
    lines.push(`- Suggested query: ${buildSuggestedQuery(stack, prompt)}`);
  }

  lines.push('Skip Context7 only for pure business logic or internal-only refactors.');

  markStacksHinted(analysis.hintableStacks.map((stack) => stack.id));
  return lines.join('\n');
}

export function buildWriteGuard(paths) {
  const stacks = matchStacksForPaths(paths);

  if (stacks.length === 0) {
    return { permission: 'allow' };
  }

  const now = Date.now();
  const missingStacks = stacks.filter((stack) => !hasFreshAuditForStack(stack.id, now));

  if (missingStacks.length === 0) {
    return { permission: 'allow' };
  }

  const summary = missingStacks
    .map((stack) => `${stack.label} (${stack.libraries.map(buildLibrarySummary).join(', ')})`)
    .join('; ');

  return {
    permission: 'ask',
    user_message: `This edit targets framework code without a recent Context7 doc query: ${summary}. Query Context7 first, or explicitly approve this write if you want to bypass the check.`,
    agent_message:
      'Context7 gate: query the relevant library docs before writing framework-facing code. After a successful query-docs call, retry the edit.',
  };
}

export function summarizeStatus() {
  const state = loadState();

  return {
    managedStacks: STACK_DEFINITIONS.map((stack) => ({
      id: stack.id,
      label: stack.label,
      libraries: stack.libraries.map((library) => ({
        name: library.name,
        version: getPackageVersion(library.manifestPath, library.packageName),
      })),
    })),
    audits: state.audits,
    hintedStacks: state.hintedStacks,
  };
}
