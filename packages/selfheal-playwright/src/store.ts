import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface Fix {
  file: string;
  line?: number;
  old: string;
  new: string;
  score: number;
  margin?: number;
  test?: string;
  element?: Record<string, string>;
  breakdown?: Record<string, number>;
  duration_ms?: number;
  rewrite_ms?: number;
}

export interface Miss {
  file?: string;
  line?: number;
  old: string;
  reason: string;
  score?: number;
  test?: string;
}

const DIR = '.selfheal';
const FIXES = join(DIR, 'pending-fixes.ndjson');
const MISSES = join(DIR, 'pending-misses.ndjson');

function ensureDir(path: string) {
  const d = dirname(path);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

export function recordFix(fix: Fix) {
  ensureDir(FIXES);
  appendFileSync(FIXES, JSON.stringify(fix) + '\n', 'utf8');
}

export function recordMiss(miss: Miss) {
  ensureDir(MISSES);
  appendFileSync(MISSES, JSON.stringify(miss) + '\n', 'utf8');
}

function readAll<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as T; } catch { return null; } })
    .filter(Boolean) as T[];
}

export function readFixes(): Fix[] {
  const seen = new Set<string>();
  return readAll<Fix>(FIXES).filter((f) => {
    const key = `${f.file}::${f.old}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function readMisses(): Miss[] {
  const seen = new Set<string>();
  return readAll<Miss>(MISSES).filter((m) => {
    if (seen.has(m.old)) return false;
    seen.add(m.old);
    return true;
  });
}

export function clearPending() {
  for (const f of [FIXES, MISSES]) if (existsSync(f)) rmSync(f);
}
