import { Descriptor } from './collector';
export interface HealResult {
    ok: boolean;
    healed: boolean;
    selector: string;
    new_selector?: string;
    score?: number;
    margin?: number;
    reason?: string;
    breakdown?: Record<string, number>;
    element?: Record<string, string>;
    duration_ms?: number;
}
export interface BridgeOptions {
    python?: string;
    knowledge?: string;
    threshold?: number;
    margin?: number;
}
export declare class BridgeClient {
    private opts;
    private proc;
    private buffer;
    private nextId;
    private pending;
    constructor(opts?: BridgeOptions);
    private ensure;
    private send;
    remember(selector: string, descriptor: Descriptor): Promise<any>;
    rememberMany(items: {
        selector: string;
        descriptor: Descriptor;
    }[]): Promise<any>;
    heal(selector: string, candidates: Descriptor[]): Promise<HealResult>;
    apply(fixes: {
        file: string;
        old: string;
        new: string;
    }[]): Promise<any>;
    /** Onde cada seletor aparece na suite: usado nos que nao foram corrigidos. */
    locate(items: {
        file?: string;
        selector: string;
    }[]): Promise<any>;
    /** Consolida a execucao em .selfheal/report.json. */
    report(payload: {
        fixes: any[];
        misses: any[];
        suite?: any;
        path?: string;
    }): Promise<any>;
    save(): Promise<any>;
    close(): Promise<void>;
}
export declare function getBridge(opts?: BridgeOptions): BridgeClient;
