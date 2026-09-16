export interface EngineCommand {
    command: string;
    /** Argumentos que antecedem os do subcomando `bridge`. */
    baseArgs: string[];
    /** De onde veio o engine, para diagnostico. */
    origin: string;
}
/** 1. Binario standalone embutido: o caminho que dispensa Python. */
export declare function findBundledBinary(): string | null;
/** 2. Ambiente virtual criado pelo postinstall do proprio pacote. */
export declare function findManagedVenv(): string | null;
/** Confere se um interpretador consegue importar o engine. */
export declare function pythonHasEngine(python: string): boolean;
/** 3. Python do sistema com o engine ja instalado. */
export declare function findSystemPython(): string | null;
export declare function resolveEngine(explicitPython?: string): EngineCommand | null;
export declare const MENSAGEM_SEM_ENGINE: string;
