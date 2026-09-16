/**
 * Coleta os atributos dos elementos interativos diretamente da pagina viva.
 *
 * A funcao `collectFn` e serializada e executada dentro do navegador, e nao
 * no processo de teste: e a unica forma de obter a geometria real dos
 * elementos (posicao, area e proporcao), que so existe apos a renderizacao.
 */
export declare const INTERACTIVE = "a, button, input, select, textarea, [role=button], [onclick], [data-testid]";
export interface Descriptor {
    tag: string;
    id: string;
    name: string;
    class_: string;
    visible_text: string;
    neighbor_text: string;
    xpath: string;
    idxpath: string;
    x: number;
    y: number;
    width: number;
    height: number;
    viewport_width: number;
    viewport_height: number;
    meta?: Record<string, string>;
}
/** Descritores de todos os elementos interativos visiveis da pagina. */
export declare function collectCandidates(page: any): Promise<Descriptor[]>;
/** Descritor de um unico elemento, casado pela sua posicao na pagina. */
export declare function describeSelector(page: any, selector: string): Promise<Descriptor | null>;
