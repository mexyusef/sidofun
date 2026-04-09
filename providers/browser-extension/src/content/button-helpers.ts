export function findClickableElementByText(text: string) {
  const needle = text.trim().toLowerCase();
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('a, button, div[role="tab"], [role="button"]'));
  return candidates.find((node) => node.innerText.trim().toLowerCase() === needle);
}

export function findButtonByLabelNeedles(needles: string[]) {
  const normalizedNeedles = needles.map((value) => value.trim().toLowerCase());
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a'));
  return candidates.find((node) => {
    const label = [node.innerText, node.getAttribute('aria-label'), node.getAttribute('title'), node.getAttribute('data-testid')]
      .filter(Boolean).join(' ').trim().toLowerCase();
    return normalizedNeedles.some((needle) => label.includes(needle));
  });
}

export function findButtonsByLabelNeedles(needles: string[]) {
  const normalizedNeedles = needles.map((value) => value.trim().toLowerCase());
  return Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a'))
    .filter((node) => {
      const label = [node.innerText, node.getAttribute('aria-label'), node.getAttribute('title'), node.getAttribute('data-testid')]
        .filter(Boolean).join(' ').trim().toLowerCase();
      return normalizedNeedles.some((needle) => label.includes(needle));
    });
}

export function isDisabledControl(node: HTMLElement | undefined) {
  if (!node) {
    return true;
  }
  return node.hasAttribute('disabled')
    || node.getAttribute('aria-disabled') === 'true'
    || node.classList.contains('disabled')
    || node.getAttribute('data-disabled') === 'true';
}

export function findEnabledButtonByLabelNeedles(needles: string[]) {
  return findButtonsByLabelNeedles(needles).find((node) => !isDisabledControl(node));
}
