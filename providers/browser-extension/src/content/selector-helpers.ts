export function cssEscape(value: string) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

export function buildElementSelector(element: Element) {
  const html = element as HTMLElement;
  if (html.id) {
    return `#${cssEscape(html.id)}`;
  }
  const tagName = element.tagName.toLowerCase();
  const name = html.getAttribute('name');
  if (name) {
    return `${tagName}[name="${cssEscape(name)}"]`;
  }
  const dataTestId = html.getAttribute('data-testid');
  if (dataTestId) {
    return `${tagName}[data-testid="${cssEscape(dataTestId)}"]`;
  }
  const ariaLabel = html.getAttribute('aria-label');
  if (ariaLabel) {
    return `${tagName}[aria-label="${cssEscape(ariaLabel)}"]`;
  }
  const placeholder = html.getAttribute('placeholder');
  if (placeholder) {
    return `${tagName}[placeholder="${cssEscape(placeholder)}"]`;
  }
  return tagName;
}

export function buildFormSelector(element: HTMLFormElement) {
  if (element.id) {
    return `#${cssEscape(element.id)}`;
  }
  const name = element.getAttribute('name');
  if (name) {
    return `form[name="${cssEscape(name)}"]`;
  }
  const action = element.getAttribute('action');
  if (action) {
    return `form[action="${cssEscape(action)}"]`;
  }
  return 'form';
}

export function readAssociatedLabels(element: Element) {
  const labels = new Set<string>();
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    for (const label of Array.from(element.labels ?? [])) {
      const text = label.innerText?.trim() || label.textContent?.trim();
      if (text) {
        labels.add(text);
      }
    }
  }
  const wrapperLabel = element.closest('label');
  const wrapperLabelText = wrapperLabel?.innerText?.trim() || wrapperLabel?.textContent?.trim();
  if (wrapperLabelText) {
    labels.add(wrapperLabelText);
  }
  return [...labels];
}
