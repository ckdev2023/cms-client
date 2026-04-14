import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const caseDir = path.resolve(__dirname, '..');
const shellPath = path.join(caseDir, 'detail.shell.html');
const entryPath = path.join(caseDir, 'detail.html');

const markerRegex = /^[ \t]*<!-- section: (sections\/[^>\n]+?\.html)(?: [^>]*)? -->[ \t]*$/gm;

function collectMarkers(html) {
  const markers = [];
  let match;

  while ((match = markerRegex.exec(html))) {
    const markerStart = match.index;
    const lineEnd = html.indexOf('\n', markerStart);
    const markerLineEnd = lineEnd === -1 ? html.length : lineEnd + 1;

    markers.push({
      sectionFile: match[1],
      markerStart,
      markerLineEnd,
      markerLine: html.slice(markerStart, markerLineEnd),
    });
  }

  return markers;
}

function stripLeadingMetadataComment(sectionHtml) {
  return sectionHtml.replace(/^<!--[\s\S]*?-->\s*\n?/, '');
}

function ensureTrailingNewline(content) {
  return content.endsWith('\n') ? content : `${content}\n`;
}

async function buildEntryFromShell() {
  const shellHtml = await fs.readFile(shellPath, 'utf8');
  const markers = collectMarkers(shellHtml);

  if (!markers.length) {
    throw new Error('No section markers found in detail.shell.html');
  }

  let output = '';
  let cursor = 0;

  for (const marker of markers) {
    const sectionPath = path.join(caseDir, marker.sectionFile);
    const rawSectionHtml = await fs.readFile(sectionPath, 'utf8');
    const sectionHtml = ensureTrailingNewline(stripLeadingMetadataComment(rawSectionHtml));

    output += shellHtml.slice(cursor, marker.markerLineEnd);
    output += sectionHtml;
    cursor = marker.markerLineEnd;
  }

  output += shellHtml.slice(cursor);
  await fs.writeFile(entryPath, output, 'utf8');
}

async function main() {
  const mode = process.argv[2] || 'build';

  if (mode === 'build' || mode === 'init-shell') {
    await buildEntryFromShell();
    return;
  }

  throw new Error(`Unsupported mode: ${mode}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
