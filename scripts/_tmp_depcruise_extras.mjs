import fs from 'node:fs';
const file = process.argv[2];
const label = process.argv[3];
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const mods = j.modules || [];
const orphans = mods.filter((m) => m.orphan).map((m) => m.source);
const unresolved = [];
for (const m of mods) {
  for (const d of m.dependencies || []) {
    if (d.couldNotResolve) unresolved.push({ from: m.source, to: d.module });
  }
}
console.log('### ' + label + ' extras');
console.log('orphans (' + orphans.length + '):');
for (const o of orphans) console.log('  ' + o);
console.log('unresolved (' + unresolved.length + '):');
for (const u of unresolved.slice(0, 30)) console.log('  ' + u.from + ' -> ' + u.to);
