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
}
export interface Miss {
    file?: string;
    line?: number;
    old: string;
    reason: string;
    score?: number;
    test?: string;
}
export declare function recordFix(fix: Fix): void;
export declare function recordMiss(miss: Miss): void;
export declare function readFixes(): Fix[];
export declare function readMisses(): Miss[];
export declare function clearPending(): void;
