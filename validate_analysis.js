const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const ROOT = '/workspaces/kronos-app';
const EXCLUDE = ['node_modules', 'dist', '.git', '.expo', 'assets'];

function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (EXCLUDE.includes(entry.name)) continue;
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (/\.jsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = walk(ROOT);
let parseErrors = [];
let importErrors = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  try {
    parser.parse(src, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'dynamicImport', 'optionalChaining', 'nullishCoalescingOperator', 'decorators-legacy', 'exportDefaultFrom', 'exportNamespaceFrom'],
      errorRecovery: false,
    });
  } catch (e) {
    parseErrors.push({ file: path.relative(ROOT, file), msg: e.message });
  }
}

// Check import / require resolution
function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // external, skip
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, base + '.js', base + '.jsx', path.join(base, 'index.js'), path.join(base, 'index.jsx')];
  return candidates.some(c => fs.existsSync(c));
}

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const importRe = /^\s*(?:import\s.*?from\s+['"]([^'"]+)['"]|const\s+\w+\s*=\s*require\(['"]([^'"]+)['"]\))/;
  lines.forEach((line, i) => {
    const m = line.match(importRe);
    if (m) {
      const spec = m[1] || m[2];
      if (spec && spec.startsWith('.')) {
        if (!resolveImport(file, spec)) {
          importErrors.push({ file: path.relative(ROOT, file), line: i + 1, spec });
        }
      }
    }
  });
}

console.log('=== SYNTAX PARSE ERRORS ===');
if (parseErrors.length === 0) console.log('NONE - all files parsed OK');
else parseErrors.forEach(e => console.log(`${e.file}: ${e.msg}`));

console.log('\n=== UNRESOLVED RELATIVE IMPORTS ===');
if (importErrors.length === 0) console.log('NONE - all relative imports resolve');
else importErrors.forEach(e => console.log(`${e.file}:${e.line} -> ${e.spec}`));

console.log(`\nTotal files checked: ${files.length}`);
