import fs from 'node:fs';
const file = process.argv[2];
const label = process.argv[3];
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const mods = j.modules || [];
const violationsAll = (j.summary && j.summary.violations) || [];
const fanIn = new Map();
const fanOut = new Map();
for (const m of mods) {
  fanOut.set(
    m.source,
    (m.dependencies || []).filter((d) => !d.coreModule && !d.couldNotResolve).length,
  );
  for (const d of m.dependencies || []) {
    if (d.coreModule || d.couldNotResolve) continue;
    fanIn.set(d.resolved, (fanIn.get(d.resolved) || 0) + 1);
  }
}
const topFanIn = [...fanIn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
const topFanOut = [...fanOut.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
const cycles = [];
for (const m of mods) {
  for (const d of m.dependencies || []) {
    if (d.circular) cycles.push({ from: m.source, to: d.resolved, cycle: d.cycle });
  }
}
const orphans = mods.filter((m) => m.orphan).map((m) => m.source);
console.log('### ' + label);
console.log(
  'modules=' + mods.length +
  ' cyclesEdges=' + cycles.length +
  ' orphans=' + orphans.length +
  ' violations=' + violationsAll.length,
);
console.log('--- topFanIn ---');
for (const [k, v] of topFanIn) console.log(String(v).padStart(4), k);
console.log('--- topFanOut ---');
for (const [k, v] of topFanOut) console.log(String(v).padStart(4), k);
if (cycles.length) {
  console.log('--- cycles (first 10 unique) ---');
  const seen = new Set();
  let n = 0;
  for (const c of cycles) {
    const key = (c.cycle || []).join('->');
    if (seen.has(key)) continue;
    seen.add(key);
    console.log('from ' + c.from + ': ' + (c.cycle || []).join(' -> '));
    if (++n >= 10) break;
  }
}
if (violationsAll.length) {
  console.log('--- violations (first 15) ---');
  for (const v of violationsAll.slice(0, 15)) {
    console.log(
      '[' + (v.rule && v.rule.severity) + '] ' + (v.rule && v.rule.name) + '  ' + v.from + ' -> ' + (v.to || ''),
    );
  }
}
