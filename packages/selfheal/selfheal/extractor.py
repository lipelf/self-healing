"""Extracao dos elementos candidatos a partir do DOM renderizado.

Usa Playwright com Chromium para obter tambem a geometria real do elemento
(posicao, area e proporcao), que o HTML estatico nao fornece.
"""
from typing import List, Optional

from .descriptor import ElementDescriptor

INTERACTIVE = "a, button, input, select, textarea, [role=button], [onclick], [data-testid]"

COLLECT_JS = r"""
(selector) => {
  const xpathOf = (el) => {
    const parts = [];
    for (; el && el.nodeType === 1; el = el.parentNode) {
      let i = 1;
      for (let s = el.previousSibling; s; s = s.previousSibling) {
        if (s.nodeType === 1 && s.nodeName === el.nodeName) i++;
      }
      parts.unshift(el.nodeName.toLowerCase() + '[' + i + ']');
    }
    return '/' + parts.join('/');
  };

  const idXpathOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1) {
      if (node.id) { parts.unshift('//*[@id="' + node.id + '"]'); return parts.join('/'); }
      let i = 1;
      for (let s = node.previousSibling; s; s = s.previousSibling) {
        if (s.nodeType === 1 && s.nodeName === node.nodeName) i++;
      }
      parts.unshift(node.nodeName.toLowerCase() + '[' + i + ']');
      node = node.parentNode;
    }
    return '/' + parts.join('/');
  };

  const neighborTextOf = (el) => {
    const parent = el.parentElement;
    if (!parent) return '';
    const chunks = [];
    for (const child of parent.children) {
      if (child === el) continue;
      const t = (child.innerText || child.textContent || '').trim();
      if (t) chunks.push(t);
    }
    if (!chunks.length) {
      const label = parent.innerText || '';
      return label.trim().slice(0, 120);
    }
    return chunks.join(' ').slice(0, 120);
  };

  const out = [];
  for (const el of document.querySelectorAll(selector)) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    out.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      name: el.getAttribute('name') || '',
      class_: el.getAttribute('class') || '',
      visible_text: ((el.innerText || el.value || el.getAttribute('placeholder')
                     || el.getAttribute('aria-label') || '') + '').trim().slice(0, 120),
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
        'href': el.getAttribute('href') || '',
      },
    });
  }
  return out;
}
"""


def collect_from_page(page, selector: str = INTERACTIVE) -> List[ElementDescriptor]:
    """Descritores de todos os elementos interativos visiveis da pagina."""
    raw = page.evaluate(COLLECT_JS, selector)
    return [ElementDescriptor.from_dict(item) for item in raw]


def describe_locator(page, css_selector: str) -> Optional[ElementDescriptor]:
    """Descritor de um unico elemento, se ele existir na pagina."""
    elements = collect_from_page(page)
    handle = page.query_selector(css_selector)
    if handle is None:
        return None
    box = handle.bounding_box() or {}
    for element in elements:
        if abs(element.x - box.get("x", -1)) < 1 and abs(element.y - box.get("y", -1)) < 1:
            element.selector = css_selector
            return element
    return None
