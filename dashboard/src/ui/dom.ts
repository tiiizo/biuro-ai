// DOM helpers. Content from office.md reaches the DOM only through textContent and attributes (no innerHTML).

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}

/** External link (GitHub) in a new tab, without giving the target page access to `window.opener`. */
export function externalLink(href: string, text: string, className?: string): HTMLAnchorElement {
  const a = el('a', text, className);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

export function button(text: string, className?: string, label?: string): HTMLButtonElement {
  const b = el('button', text, className);
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  return b;
}
