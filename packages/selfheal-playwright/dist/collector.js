"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTERACTIVE = void 0;
exports.collectCandidates = collectCandidates;
exports.describeSelector = describeSelector;
exports.describeLocator = describeLocator;
/**
 * Coleta os atributos dos elementos interativos diretamente da pagina viva.
 *
 * A funcao `collectFn` e serializada e executada dentro do navegador, e nao
 * no processo de teste: e a unica forma de obter a geometria real dos
 * elementos (posicao, area e proporcao), que so existe apos a renderizacao.
 */
exports.INTERACTIVE = 'a, button, input, select, textarea, [role=button], [onclick], [data-testid]';
/* Executada no contexto da pagina. */
function collectFn(selector) {
    const xpathOf = (el) => {
        const parts = [];
        for (; el && el.nodeType === 1; el = el.parentNode) {
            let i = 1;
            for (let s = el.previousSibling; s; s = s.previousSibling) {
                if (s.nodeType === 1 && s.nodeName === el.nodeName)
                    i++;
            }
            parts.unshift(el.nodeName.toLowerCase() + '[' + i + ']');
        }
        return '/' + parts.join('/');
    };
    const idXpathOf = (el) => {
        const parts = [];
        let node = el;
        while (node && node.nodeType === 1) {
            if (node.id) {
                parts.unshift('//*[@id="' + node.id + '"]');
                return parts.join('/');
            }
            let i = 1;
            for (let s = node.previousSibling; s; s = s.previousSibling) {
                if (s.nodeType === 1 && s.nodeName === node.nodeName)
                    i++;
            }
            parts.unshift(node.nodeName.toLowerCase() + '[' + i + ']');
            node = node.parentNode;
        }
        return '/' + parts.join('/');
    };
    const neighborTextOf = (el) => {
        const parent = el.parentElement;
        if (!parent)
            return '';
        const chunks = [];
        for (const child of Array.from(parent.children)) {
            if (child === el)
                continue;
            const t = (child.innerText || child.textContent || '').trim();
            if (t)
                chunks.push(t);
        }
        if (!chunks.length)
            return (parent.innerText || '').trim().slice(0, 120);
        return chunks.join(' ').slice(0, 120);
    };
    const out = [];
    for (const el of Array.from(document.querySelectorAll(selector))) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0)
            continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden')
            continue;
        out.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            name: el.getAttribute('name') || '',
            class_: el.getAttribute('class') || '',
            visible_text: ((el.innerText || el.value ||
                el.getAttribute('placeholder') || el.getAttribute('aria-label') || '') + '')
                .trim().slice(0, 120),
            neighbor_text: neighborTextOf(el),
            xpath: xpathOf(el),
            idxpath: idXpathOf(el),
            x: rect.x + window.scrollX,
            y: rect.y + window.scrollY,
            width: rect.width,
            height: rect.height,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
            meta: {
                'data-testid': el.getAttribute('data-testid') || '',
                'type': el.getAttribute('type') || '',
            },
        });
    }
    return out;
}
/** Descritores de todos os elementos interativos visiveis da pagina. */
async function collectCandidates(page) {
    const res = await page.evaluate(collectFn, exports.INTERACTIVE);
    return Array.isArray(res) ? res : [];
}
/** Descritor de um unico elemento, casado pela sua posicao na pagina. */
async function describeSelector(page, selector) {
    const handle = await page.$(selector);
    if (!handle)
        return null;
    const box = await handle.boundingBox();
    if (!box)
        return null;
    const candidates = await collectCandidates(page);
    if (!candidates.length)
        return null;
    // boundingBox devolve a posicao relativa a area visivel; os candidatos
    // trazem a posicao absoluta no documento. A rolagem e a diferenca.
    const scroll = await page.evaluate('[window.scrollX, window.scrollY]');
    const alvoX = box.x + (scroll?.[0] || 0);
    const alvoY = box.y + (scroll?.[1] || 0);
    let melhor = null;
    let menor = Infinity;
    for (const c of candidates) {
        const d = Math.abs(c.x - alvoX) + Math.abs(c.y - alvoY);
        if (d < menor) {
            menor = d;
            melhor = c;
        }
    }
    return menor <= 4 ? melhor : null;
}
/**
 * Descreve o elemento de um Locator, e nao de uma string de seletor.
 *
 * Necessario para os localizadores semanticos (getByRole e afins), em que nao
 * existe seletor CSS para passar a page.$(). A correspondencia com o candidato
 * e feita pela posicao, do mesmo modo que em describeSelector.
 */
async function describeLocator(page, locator) {
    let box = null;
    try {
        box = await locator.first().boundingBox({ timeout: 1000 });
    }
    catch {
        return null;
    }
    if (!box)
        return null;
    const candidates = await collectCandidates(page);
    if (!candidates.length)
        return null;
    const scroll = await page.evaluate('[window.scrollX, window.scrollY]');
    const alvoX = box.x + (scroll?.[0] || 0);
    const alvoY = box.y + (scroll?.[1] || 0);
    let melhor = null;
    let menor = Infinity;
    for (const c of candidates) {
        const d = Math.abs(c.x - alvoX) + Math.abs(c.y - alvoY);
        if (d < menor) {
            menor = d;
            melhor = c;
        }
    }
    return menor <= 4 ? melhor : null;
}
