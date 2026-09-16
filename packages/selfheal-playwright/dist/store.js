"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordFix = recordFix;
exports.recordMiss = recordMiss;
exports.readFixes = readFixes;
exports.readMisses = readMisses;
exports.clearPending = clearPending;
/**
 * Acumula as correcoes descobertas durante a execucao.
 *
 * Cada worker do Playwright roda em um processo separado, entao as correcoes
 * sao gravadas em disco e consolidadas pelo reporter ao final da suite.
 */
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const DIR = '.selfheal';
const FIXES = (0, node_path_1.join)(DIR, 'pending-fixes.ndjson');
const MISSES = (0, node_path_1.join)(DIR, 'pending-misses.ndjson');
function ensureDir(path) {
    const d = (0, node_path_1.dirname)(path);
    if (!(0, node_fs_1.existsSync)(d))
        (0, node_fs_1.mkdirSync)(d, { recursive: true });
}
function recordFix(fix) {
    ensureDir(FIXES);
    (0, node_fs_1.appendFileSync)(FIXES, JSON.stringify(fix) + '\n', 'utf8');
}
function recordMiss(miss) {
    ensureDir(MISSES);
    (0, node_fs_1.appendFileSync)(MISSES, JSON.stringify(miss) + '\n', 'utf8');
}
function readAll(path) {
    if (!(0, node_fs_1.existsSync)(path))
        return [];
    return (0, node_fs_1.readFileSync)(path, 'utf8')
        .split('\n').filter(Boolean)
        .map((l) => { try {
        return JSON.parse(l);
    }
    catch {
        return null;
    } })
        .filter(Boolean);
}
function readFixes() {
    // Um mesmo seletor pode quebrar em varios testes; corrige-se uma vez so.
    const seen = new Set();
    return readAll(FIXES).filter((f) => {
        const key = `${f.file}::${f.old}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function readMisses() {
    const seen = new Set();
    return readAll(MISSES).filter((m) => {
        if (seen.has(m.old))
            return false;
        seen.add(m.old);
        return true;
    });
}
function clearPending() {
    for (const f of [FIXES, MISSES])
        if ((0, node_fs_1.existsSync)(f))
            (0, node_fs_1.rmSync)(f);
}
