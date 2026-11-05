#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const APP = join(here, '..', 'app');

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36).slice(0, 6);
};
// Identificadores opacos, no estilo do que CSS Modules gera a cada build.
// Converter para outra convencao de escrita preservaria parte da cadeia
// original e transformaria o atributo renomeado em ancora, inflando a
// recuperacao. Esta foi a ameaca a validade interna corrigida no TCC.
const opaqueId = (v) => (v ? `e${hash(v)}` : v);
const opaqueClass = (v) => v.split(' ').filter(Boolean).map((c) => `css-${hash(c)}`).join(' ');
const opaqueName = (v) => (v ? `n${hash(v)}` : v);

const CLASS_MAP = {
  'field field-text':   'ds-input ds-input--text',
  'field field-search': 'ds-input ds-input--search',
  'field field-select': 'ds-select ds-select--md',
  'btn btn-primary':    'ds-btn ds-btn--primary',
  'btn btn-secondary':  'ds-btn ds-btn--secondary',
  'btn btn-ghost':      'ds-btn ds-btn--ghost',
  'btn btn-add':        'ds-btn ds-btn--accent',
  'btn btn-danger':     'ds-btn ds-btn--danger',
  'btn btn-qty':        'ds-btn ds-btn--icon',
  'link link-muted':    'ds-link ds-link--muted',
  'link link-detail':   'ds-link ds-link--detail',
  'thumb thumb-item':   'ds-thumb ds-thumb--sq',
};

const SCENARIOS = {
  base: { id: (v) => v, className: (v) => v, name: (v) => v,
          nested: false, reorder: false },
  c1: { id: opaqueId, className: (v) => v, name: (v) => v,
        nested: false, reorder: false },
  c2: { id: opaqueId, className: opaqueClass, name: (v) => v,
        nested: false, reorder: false },
  c3: { id: opaqueId, className: opaqueClass, name: opaqueName,
        nested: false, reorder: false },
  c4: { id: opaqueId, className: opaqueClass, name: opaqueName,
        nested: true, reorder: true },
};

const scenario = (process.argv[2] || 'base').toLowerCase();
const catalogSize = parseInt(process.argv[3] || '4', 10);
const rule = SCENARIOS[scenario];
if (!rule) {
  console.error(`cenario invalido: ${scenario}. Use: ${Object.keys(SCENARIOS).join(', ')}`);
  process.exit(1);
}

let src = readFileSync(join(APP, 'ui.baseline.ts'), 'utf8');

const catalogEntries = [];
for (let i = 1; i <= catalogSize; i++) {
  catalogEntries.push(
    `  catAdd${i}: { id: 'add-produto-${i}', name: 'add${i}', className: 'btn btn-add' },`);
  catalogEntries.push(
    `  catDet${i}: { id: 'detalhe-produto-${i}', name: 'det${i}', className: 'link link-detail' },`);
}
src = src.replace('/*__CATALOG__*/', catalogEntries.join('\n').trim());
src = src.replace(/export const CATALOG_SIZE = \d+;/,
                  `export const CATALOG_SIZE = ${catalogSize};`);

src = src.replace(
  /\{ id: '([^']*)',(\s*)name: '([^']*)',(\s*)className: '([^']*)' \}/g,
  (_m, id, s1, name, s2, cls) =>
    `{ id: '${rule.id(id)}',${s1}name: '${rule.name(name)}',${s2}className: '${rule.className(cls)}' }`
);
src = src.replace(/export const NESTED = (true|false);/,
                  `export const NESTED = ${rule.nested};`);
src = src.replace(/export const REORDER = (true|false);/,
                  `export const REORDER = ${rule.reorder};`);
src = src.replace(/export const VARIANT = '[^']*';/,
                  `export const VARIANT = '${scenario}';`);

writeFileSync(join(APP, 'ui.ts'), src);

let baseline = readFileSync(join(APP, 'ui.baseline.ts'), 'utf8');
baseline = baseline.replace('/*__CATALOG__*/', catalogEntries.join('\n').trim());
const entry = /(\w+):\s*\{ id: '([^']*)',\s*name: '([^']*)',\s*className: '([^']*)' \}/g;
const map = {};
let m;
while ((m = entry.exec(baseline)) !== null) {
  const [, key, id, name, cls] = m;
  map[key] = {
    key,
    baseline: { id, name, className: cls, selector: `#${id}` },
    mutated: {
      id: rule.id(id), name: rule.name(name), className: rule.className(cls),
      selector: `#${rule.id(id)}`,
    },
  };
}
const outDir = join(here, '..', '..', '.selfheal');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'variant-map.json'),
  JSON.stringify({ scenario, nested: rule.nested, elements: map }, null, 2));

console.log(`cenario '${scenario}' (catalogo=${catalogSize}) - ${Object.keys(map).length} elementos mapeados`);
