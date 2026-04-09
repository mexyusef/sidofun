export interface DomElementSummary {
  selector?: string;
  tagName: string;
  id?: string;
  classes?: string[];
  role?: string;
  name?: string;
  type?: string;
  href?: string;
  value?: string;
  text?: string;
  placeholder?: string;
  disabled?: boolean;
  checked?: boolean;
  visible?: boolean;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DomLinkSummary {
  href: string;
  text?: string;
  title?: string;
  target?: string;
  rel?: string;
}

export interface DomActionableSummary extends DomElementSummary {
  selector: string;
  frameSelectors?: string[];
  actionableType: 'click' | 'fill' | 'select' | 'toggle' | 'submit' | 'link';
  label?: string;
  score?: number;
  reasons?: string[];
  formSelector?: string;
}

export interface DomFrameSummary {
  path: string[];
  selector?: string;
  tagName?: string;
  name?: string;
  title?: string;
  url?: string;
  visible?: boolean;
  width?: number;
  height?: number;
  depth: number;
}

export interface DomFormFieldEntry {
  selector: string;
  value: string;
  frameSelectors?: string[];
}

export interface DomFormFieldFillResult extends DomElementSummary {
  selector: string;
  filled: boolean;
  frameSelectors?: string[];
  humanLike?: boolean;
}

export interface DomFormFieldSummary extends DomElementSummary {
  selector: string;
  frameSelectors?: string[];
  fieldType: 'input' | 'textarea' | 'select' | 'contenteditable';
  required?: boolean;
  labels?: string[];
  formSelector?: string;
  formAction?: string;
  optionCount?: number;
  accept?: string;
}

export interface DomSelectOptionSummary {
  index: number;
  text: string;
  value: string;
  selected?: boolean;
  disabled?: boolean;
}

export interface DomSelectOptionPickResult extends DomFormFieldFillResult {
  option: DomSelectOptionSummary;
}

export interface DomFormFieldLookupResult extends DomFormFieldSummary {
  matchedBy: 'label' | 'name' | 'placeholder' | 'aria-label' | 'selector';
  query: string;
}

export interface DomFormValidationSummary extends DomFormFieldSummary {
  valid: boolean;
  invalid: boolean;
  validationMessage?: string;
  ariaInvalid?: boolean;
  willValidate?: boolean;
  dirty?: boolean;
  touched?: boolean;
  nativeValidity?: Partial<Record<
    | 'badInput'
    | 'customError'
    | 'patternMismatch'
    | 'rangeOverflow'
    | 'rangeUnderflow'
    | 'stepMismatch'
    | 'tooLong'
    | 'tooShort'
    | 'typeMismatch'
    | 'valid'
    | 'valueMissing',
    boolean
  >>;
}

export interface DomFormContextSummary {
  frameSelectors?: string[];
  formSelector?: string;
  formAction?: string;
  formMethod?: string;
  fieldCount: number;
  submitSelectors: string[];
  fields: Array<{
    selector: string;
    labels?: string[];
    name?: string;
    type?: string;
    fieldType?: 'input' | 'textarea' | 'select' | 'contenteditable';
    placeholder?: string;
    required?: boolean;
  }>;
}

export interface DomRadioOptionSummary {
  selector: string;
  value?: string;
  label?: string;
  checked?: boolean;
  disabled?: boolean;
}

export interface DomRadioGroupSummary {
  name?: string;
  frameSelectors?: string[];
  formSelector?: string;
  options: DomRadioOptionSummary[];
}

export interface DomSegmentedOptionSummary {
  selector: string;
  value?: string;
  label?: string;
  pressed?: boolean;
  disabled?: boolean;
}

export interface DomSegmentedGroupSummary {
  label?: string;
  selector?: string;
  frameSelectors?: string[];
  formSelector?: string;
  options: DomSegmentedOptionSummary[];
}

export interface DomTablistOptionSummary {
  selector: string;
  value?: string;
  label?: string;
  selected?: boolean;
  disabled?: boolean;
}

export interface DomTablistSummary {
  label?: string;
  selector?: string;
  frameSelectors?: string[];
  formSelector?: string;
  options: DomTablistOptionSummary[];
}

export interface DomFormSubmitResult {
  submitted: boolean;
  method: 'click' | 'requestSubmit' | 'submit';
  selector?: string;
  formAction?: string;
}

export interface DomClickResult extends DomElementSummary {
  selector: string;
  clicked: boolean;
  frameSelectors?: string[];
  humanLike?: boolean;
}

export interface DomFocusResult extends DomElementSummary {
  selector: string;
  frameSelectors?: string[];
  focused: boolean;
}

export interface DomBlurResult extends DomElementSummary {
  selector: string;
  frameSelectors?: string[];
  blurred: boolean;
}

export interface DomToggleResult extends DomElementSummary {
  selector: string;
  frameSelectors?: string[];
  checked?: boolean;
  desiredState?: 'on' | 'off' | 'toggle';
  changed?: boolean;
}

export interface DomStepperControlSummary {
  direction: 'next' | 'previous';
  selector: string;
  label?: string;
  disabled?: boolean;
}

export interface DomStepperSummary {
  label?: string;
  selector?: string;
  frameSelectors?: string[];
  formSelector?: string;
  next?: DomStepperControlSummary;
  previous?: DomStepperControlSummary;
}

export interface DomDialogSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  role?: string;
  modal?: boolean;
  open?: boolean;
  closeSelectors: string[];
  actionSelectors: string[];
  actions?: DomDialogActionSummary[];
}

export interface DomDialogActionSummary {
  selector: string;
  label?: string;
  disabled?: boolean;
  close?: boolean;
}

export interface DomMenuOptionSummary {
  selector: string;
  label?: string;
  value?: string;
  disabled?: boolean;
}

export interface DomMenuSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  options: DomMenuOptionSummary[];
}

export interface DomDisclosureSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  expanded?: boolean;
  controls?: string;
  disabled?: boolean;
}

export interface DomBannerSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  text?: string;
  role?: string;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'status';
  dismissSelectors?: string[];
}

export interface DomLoadingStateSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  text?: string;
  role?: string;
  variant?: 'spinner' | 'progress' | 'skeleton' | 'busy';
  blocking?: boolean;
}

export interface DomEmptyStateSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  text?: string;
  kind?: 'empty' | 'no_results' | 'not_found';
}

export interface DomCollectionItemSummary {
  selector: string;
  label?: string;
  text?: string;
  href?: string;
  rowIndex?: number;
  cells?: Array<{ key?: string; value: string }>;
  actions?: Array<{ selector: string; label?: string; actionableType?: string }>;
  actionableSelectors?: string[];
  selected?: boolean;
  expanded?: boolean;
  detailText?: string;
}

export interface DomCollectionSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  collectionType?: 'table' | 'list' | 'grid' | 'cards';
  itemCount: number;
  items: DomCollectionItemSummary[];
}

export interface DomCollectionControlSummary {
  selector: string;
  collectionSelector?: string;
  frameSelectors?: string[];
  label?: string;
  controlType?: 'search' | 'filter' | 'sort';
  fieldType?: 'input' | 'select' | 'button' | 'header';
  options?: string[];
  value?: string;
  active?: boolean;
  disabled?: boolean;
  sortDirection?: 'ascending' | 'descending' | 'other';
}

export interface DomCollectionFilterTokenSummary {
  selector: string;
  collectionSelector?: string;
  frameSelectors?: string[];
  label?: string;
  value?: string;
  removable?: boolean;
  removeSelector?: string;
}

export interface DomPaginationOptionSummary {
  selector: string;
  label?: string;
  disabled?: boolean;
  active?: boolean;
  kind?: 'page' | 'next' | 'previous' | 'first' | 'last' | 'load_more' | 'unknown';
}

export interface DomPaginationSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  options: DomPaginationOptionSummary[];
}

export function scrollDomPage(direction: 'down' | 'up' = 'down', amount = 0.85) {
  const normalizedAmount = Number.isFinite(amount) ? Math.min(1.5, Math.max(0.05, amount)) : 0.85;
  const delta = Math.round(window.innerHeight * normalizedAmount) * (direction === 'up' ? -1 : 1);
  const beforeY = window.scrollY;
  window.scrollBy({ top: delta, behavior: 'instant' as ScrollBehavior });
  const afterY = window.scrollY;
  return {
    direction,
    amount: normalizedAmount,
    beforeY,
    afterY,
    moved: beforeY !== afterY,
    atTop: afterY <= 0,
    atBottom: Math.ceil(afterY + window.innerHeight) >= document.documentElement.scrollHeight
  };
}

export interface DomXPostSummary {
  id: string;
  url?: string;
  authorName?: string;
  authorHandle?: string;
  text: string;
  timestamp?: string;
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  viewCount?: string;
}

export interface DomSnapshot {
  title: string;
  url: string;
  text: string;
  capturedAt: string;
}

export interface DomEditorSummary extends DomElementSummary {
  selector: string;
  text: string;
  html?: string;
  editorType?: string;
}

export interface DomReadabilitySummary {
  title: string;
  textContent: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  lang?: string;
  length: number;
  contentHtml?: string;
}

export interface DomPageStateSummary {
  selector?: string;
  frameSelectors?: string[];
  snapshot: DomSnapshot;
  forms: DomFormContextSummary[];
  banners?: DomBannerSummary[];
  loadingStates?: DomLoadingStateSummary[];
  emptyStates?: DomEmptyStateSummary[];
  actionables: DomActionableSummary[];
  links: DomLinkSummary[];
  domTree: DomTreeNode;
}

export interface DomTreeNode {
  selector?: string;
  tagName: string;
  id?: string;
  classes?: string[];
  role?: string;
  name?: string;
  type?: string;
  href?: string;
  placeholder?: string;
  text?: string;
  visible?: boolean;
  childCount: number;
  children?: DomTreeNode[];
}

function withVisibleDocRoot(frameSelectors?: string[]) {
  let currentDocument = document;
  for (const selector of frameSelectors ?? []) {
    const frameElement = findPreferredElement(selector, currentDocument);
    if (!(frameElement instanceof HTMLIFrameElement)) {
      throw new Error(`Frame selector did not resolve to an iframe: ${selector}`);
    }
    const nextDocument = frameElement.contentDocument;
    if (!nextDocument) {
      throw new Error(`Iframe is not ready for selector: ${selector}`);
    }
    currentDocument = nextDocument;
  }
  return currentDocument;
}

function collectVisibleText(limit = 6000) {
  const text = document.body?.innerText || document.documentElement?.innerText || '';
  return text.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, limit);
}

function summarizeElement(element: Element, selector?: string): DomElementSummary {
  const html = element as HTMLElement;
  const rect = typeof html.getBoundingClientRect === 'function' ? html.getBoundingClientRect() : undefined;
  const classes = (html.className || '')
    .toString()
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const text = html.innerText?.trim() || html.textContent?.trim() || undefined;
  return {
    selector,
    tagName: element.tagName.toLowerCase(),
    id: html.id || undefined,
    classes: classes.length > 0 ? classes : undefined,
    role: html.getAttribute('role') || undefined,
    name: html.getAttribute('name') || undefined,
    type: html.getAttribute('type') || undefined,
    href: (element as HTMLAnchorElement).href || html.getAttribute('href') || undefined,
    value: (element as HTMLInputElement).value || undefined,
    text,
    placeholder: html.getAttribute('placeholder') || undefined,
    disabled: 'disabled' in html ? Boolean((html as HTMLInputElement | HTMLButtonElement).disabled) : undefined,
    checked: 'checked' in html ? Boolean((html as HTMLInputElement).checked) : undefined,
    visible: rect ? rect.width > 0 && rect.height > 0 : undefined,
    rect: rect
      ? {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      : undefined
  };
}

function cssEscape(value: string) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

function buildElementSelector(element: Element) {
  const html = element as HTMLElement;
  if (html.id) {
    return `#${cssEscape(html.id)}`;
  }
  const tagName = element.tagName.toLowerCase();
  const name = html.getAttribute('name');
  if (name) {
    const type = html.getAttribute('type');
    const value = html.getAttribute('value');
    if ((type === 'radio' || type === 'checkbox') && value) {
      return `${tagName}[name="${cssEscape(name)}"][value="${cssEscape(value)}"]`;
    }
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
  const path: string[] = [];
  let current: Element | null = element;
  while (current && current !== current.ownerDocument.documentElement && path.length < 4) {
    const currentTag = current.tagName.toLowerCase();
    const parent = current.parentElement;
    if (!parent) {
      path.unshift(currentTag);
      break;
    }
    const siblings = Array.from(parent.children).filter((entry) => entry.tagName === current.tagName);
    const index = siblings.indexOf(current) + 1;
    path.unshift(`${currentTag}:nth-of-type(${Math.max(index, 1)})`);
    current = parent;
  }
  return path.join(' > ');
}

export function listDomFrames(frameSelectors?: string[], path: string[] = []): DomFrameSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const frames = Array.from(root.querySelectorAll('iframe, frame'));
  return frames.flatMap((frame) => {
    const html = frame as HTMLIFrameElement;
    const selector = buildElementSelector(frame);
    const nextPath = [...path, selector];
    const rect = typeof html.getBoundingClientRect === 'function' ? html.getBoundingClientRect() : undefined;
    const current: DomFrameSummary = {
      path: nextPath,
      selector,
      tagName: frame.tagName.toLowerCase(),
      name: html.getAttribute('name') || undefined,
      title: html.getAttribute('title') || undefined,
      url: html.src || html.getAttribute('src') || html.contentWindow?.location?.href || undefined,
      visible: rect ? rect.width > 0 && rect.height > 0 : undefined,
      width: rect ? Math.round(rect.width) : undefined,
      height: rect ? Math.round(rect.height) : undefined,
      depth: path.length + 1
    };
    try {
      if (html.contentDocument) {
        return [current, ...listDomFrames(nextPath, nextPath)];
      }
    } catch {
      // Cross-origin or inaccessible child frames stay as leaf entries.
    }
    return [current];
  });
}

export function buildDomSnapshot(limit = 6000): DomSnapshot {
  return {
    title: document.title,
    url: location.href,
    text: collectVisibleText(limit),
    capturedAt: new Date().toISOString()
  };
}

function shouldSkipTreeNode(element: Element) {
  const tag = element.tagName.toLowerCase();
  return ['script', 'style', 'noscript', 'template', 'svg', 'path'].includes(tag);
}

function buildDomTreeNode(
  element: Element,
  currentDepth: number,
  maxDepth: number,
  maxChildren: number
): DomTreeNode {
  const summary = summarizeElement(element, buildElementSelector(element));
  const visibleChildren = Array.from(element.children).filter((child) => !shouldSkipTreeNode(child));
  const node: DomTreeNode = {
    selector: summary.selector,
    tagName: summary.tagName,
    id: summary.id,
    classes: summary.classes,
    role: summary.role,
    name: summary.name,
    type: summary.type,
    href: summary.href,
    placeholder: summary.placeholder,
    text: summary.text?.slice(0, 160),
    visible: summary.visible,
    childCount: visibleChildren.length
  };
  if (currentDepth >= maxDepth || visibleChildren.length === 0) {
    return node;
  }
  node.children = visibleChildren
    .slice(0, maxChildren)
    .map((child) => buildDomTreeNode(child, currentDepth + 1, maxDepth, maxChildren));
  return node;
}

export function buildDomTree(
  selector?: string,
  frameSelectors?: string[],
  maxDepth = 4,
  maxChildren = 20
): DomTreeNode {
  const root = withVisibleDocRoot(frameSelectors);
  const target = selector
    ? findPreferredElement(selector, root)
    : (root.querySelector('main, body, article, [role="main"]') ?? root.body ?? root.documentElement);
  return buildDomTreeNode(target, 0, Math.max(0, maxDepth), Math.max(1, maxChildren));
}

export function inspectDomSelector(selector: string, frameSelectors?: string[]): DomElementSummary {
  const root = withVisibleDocRoot(frameSelectors);
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`No element matched selector: ${selector}`);
  }
  return summarizeElement(element, selector);
}

export function inspectAllDomSelectors(selector: string, limit = 20, frameSelectors?: string[]): DomElementSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  return Array.from(root.querySelectorAll(selector))
    .slice(0, limit)
    .map((element) => summarizeElement(element, selector));
}

export function collectDomLinks(limit = 50, frameSelectors?: string[]): DomLinkSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .slice(0, limit)
    .map((link) => ({
      href: link.href,
      text: link.innerText?.trim() || link.textContent?.trim() || undefined,
      title: link.title || undefined,
      target: link.target || undefined,
      rel: link.rel || undefined
    }))
    .filter((entry) => Boolean(entry.href));
}

function toMarkdownFromElement(element: Element | null | undefined, depth = 0): string {
  if (!element || depth > 12) {
    return '';
  }
  if (element.nodeType === Node.TEXT_NODE) {
    return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }
  const html = element as HTMLElement;
  const tag = element.tagName.toLowerCase();
  if (['script', 'style', 'noscript', 'template'].includes(tag)) {
    return '';
  }
  const directText = () => Array.from(element.childNodes)
    .filter((child) => child.nodeType === Node.TEXT_NODE)
    .map((child) => child.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)
    .join(' ');
  const children = Array.from(element.children)
    .map((child) => toMarkdownFromElement(child, depth + 1))
    .filter(Boolean);
  const text = html.innerText?.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    || directText()
    || children.join('\n').trim();
  if (!text) {
    return '';
  }
  if (tag === 'h1') return `# ${text}`;
  if (tag === 'h2') return `## ${text}`;
  if (tag === 'h3') return `### ${text}`;
  if (tag === 'h4') return `#### ${text}`;
  if (tag === 'h5') return `##### ${text}`;
  if (tag === 'h6') return `###### ${text}`;
  if (tag === 'li') return `- ${text}`;
  if (tag === 'pre') return `\`\`\`\n${text}\n\`\`\``;
  if (tag === 'code') return `\`${text}\``;
  if (tag === 'blockquote') return text.split('\n').map((line) => `> ${line}`).join('\n');
  if (tag === 'a') {
    const href = (element as HTMLAnchorElement).href || html.getAttribute('href');
    return href ? `[${text}](${href})` : text;
  }
  if (['p', 'article', 'section', 'main', 'div'].includes(tag)) {
    return text;
  }
  return [directText(), ...children].filter(Boolean).join('\n').trim() || text;
}

export function readDomMarkdown(selector?: string, frameSelectors?: string[]) {
  const root = withVisibleDocRoot(frameSelectors);
  const element = selector ? findPreferredElement(selector, root) : root.body ?? root.documentElement;
  const markdown = toMarkdownFromElement(element).replace(/\n{3,}/g, '\n\n').trim();
  return {
    selector,
    frameSelectors,
    markdown
  };
}

export function readDomReadability(selector?: string, frameSelectors?: string[]): DomReadabilitySummary {
  const root = withVisibleDocRoot(frameSelectors);
  const element = selector
    ? findPreferredElement(selector, root)
    : (root.querySelector('main, article, [role="main"]') ?? root.body ?? root.documentElement);
  const title = root.title || document.title || (element instanceof HTMLElement ? element.innerText?.split('\n').find(Boolean) : '') || '';
  const textContent = (element instanceof HTMLElement ? element.innerText : element?.textContent || '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const excerpt = textContent.split('\n').find((line) => line.trim().length > 0)?.slice(0, 240);
  const byline = root.querySelector('[rel="author"], [itemprop="author"], .author, [class*="author"]')?.textContent?.trim() || undefined;
  const lang = root.documentElement.getAttribute('lang') || document.documentElement.getAttribute('lang') || undefined;
  const siteName = root.location?.hostname || location.hostname;
  const contentHtml = element instanceof HTMLElement ? element.innerHTML : undefined;
  return {
    title: title.trim(),
    textContent,
    excerpt,
    byline,
    siteName,
    lang,
    length: textContent.length,
    contentHtml
  };
}

function isVisibleElement(element: Element | null | undefined) {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findPreferredElement(selector: string, root: ParentNode = document) {
  const matches = Array.from(root.querySelectorAll(selector));
  if (matches.length === 0) {
    throw new Error(`No element matched selector: ${selector}`);
  }
  return matches.find((element) => isVisibleElement(element)) ?? matches[0]!;
}

function focusElement(element: Element) {
  if ('focus' in element && typeof (element as HTMLElement).focus === 'function') {
    (element as HTMLElement).focus();
  }
}

function blurElement(element: Element) {
  if ('blur' in element && typeof (element as HTMLElement).blur === 'function') {
    (element as HTMLElement).blur();
  }
}

function scrollElementIntoViewIfNeeded(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const inViewport = rect.width > 0
    && rect.height > 0
    && rect.top >= 0
    && rect.left >= 0
    && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
  if (!inViewport) {
    element.scrollIntoView({
      behavior: 'auto',
      block: 'center',
      inline: 'center'
    });
  }
}

function clickElementLikeUser(element: HTMLElement) {
  focusElement(element);
  element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  element.click();
}

function setNativeInputValue(element: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, text);
  if (element.value !== text) {
    element.value = text;
  }
}

function setCheckedState(element: HTMLInputElement, checked: boolean) {
  element.checked = checked;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function setEditableText(element: HTMLElement, text: string) {
  focusElement(element);
  element.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data: text,
    inputType: 'insertText'
  }));
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand?.('insertText', false, text);
  }
  if ((element.innerText || element.textContent || '').trim() !== text.trim()) {
    element.textContent = '';
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    element.appendChild(paragraph);
  }
  element.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    data: text,
    inputType: 'insertText'
  }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function dispatchBlurCommit(element: Element) {
  const html = element as HTMLElement;
  html.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
  html.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  html.dispatchEvent(new Event('change', { bubbles: true }));
  blurElement(html);
}

async function waitForAnimationFrame() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForElementStability(element: HTMLElement, timeoutMs = 750) {
  const startedAt = Date.now();
  let lastRect = element.getBoundingClientRect();
  while (Date.now() - startedAt < timeoutMs) {
    await waitForAnimationFrame();
    await waitForAnimationFrame();
    const nextRect = element.getBoundingClientRect();
    const stable = Math.abs(lastRect.x - nextRect.x) < 2
      && Math.abs(lastRect.y - nextRect.y) < 2
      && Math.abs(lastRect.width - nextRect.width) < 2
      && Math.abs(lastRect.height - nextRect.height) < 2;
    if (stable) {
      return;
    }
    lastRect = nextRect;
  }
}

function parseBooleanLike(value: string) {
  return /^(1|true|yes|on|checked)$/i.test(value.trim());
}

function setElementValue(element: Element, text: string) {
  focusElement(element);
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const inputType = element instanceof HTMLInputElement ? (element.type || '').toLowerCase() : '';
    if (element instanceof HTMLInputElement && (inputType === 'checkbox' || inputType === 'radio')) {
      setCheckedState(element, parseBooleanLike(text));
      return;
    }
    if (element instanceof HTMLInputElement && inputType === 'range') {
      const numericValue = Number.parseFloat(text);
      if (Number.isFinite(numericValue)) {
        element.value = String(numericValue);
      } else {
        setNativeInputValue(element, text);
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    setNativeInputValue(element, text);
    if (
      typeof element.setSelectionRange === 'function'
      && !['email', 'number', 'date', 'time', 'datetime-local', 'range'].includes(inputType)
    ) {
      element.setSelectionRange(text.length, text.length);
    }
    element.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: text,
      inputType: 'insertText'
    }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if ((element as HTMLElement).isContentEditable || element.getAttribute('role') === 'textbox') {
    setEditableText(element as HTMLElement, text);
    return;
  }
  throw new Error(`Element is not typable for selector: ${(element as HTMLElement).tagName}`);
}

function normalizeEditorElement(selector: string, frameSelectors?: string[]) {
  const root = withVisibleDocRoot(frameSelectors);
  const element = findPreferredElement(selector, root);
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement ||
    (element as HTMLElement).isContentEditable ||
    element.getAttribute('role') === 'textbox'
  ) {
    return element;
  }
  const nestedEditor = element.querySelector<HTMLElement>(
    '[contenteditable="true"], [role="textbox"][contenteditable], textarea, .ProseMirror, .cm-content, .ql-editor, [contenteditable]'
  );
  if (nestedEditor) {
    return nestedEditor;
  }
  return element;
}

function detectEditorType(element: Element) {
  const html = element as HTMLElement;
  if (element instanceof HTMLTextAreaElement) return 'textarea';
  if (element instanceof HTMLInputElement) return 'input';
  if (html.matches('.ProseMirror, .ProseMirror *') || html.closest('.ProseMirror')) return 'prosemirror';
  if (html.matches('.cm-content, .cm-editor *') || html.closest('.cm-editor')) return 'codemirror';
  if (html.matches('.ql-editor, .ql-container *') || html.closest('.ql-container')) return 'quill';
  if (html.closest('.tox-edit-area, .mce-content-body')) return 'tinymce';
  if (html.isContentEditable || html.getAttribute('role') === 'textbox') return 'contenteditable';
  return 'unknown';
}

export function readDomEditor(selector: string, frameSelectors?: string[]): DomEditorSummary {
  const element = normalizeEditorElement(selector, frameSelectors);
  const html = element as HTMLElement;
  const text = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
    ? element.value
    : html.innerText?.trim() || html.textContent?.trim() || '';
  return {
    ...summarizeElement(element, selector),
    selector,
    text,
    html: html.innerHTML,
    editorType: detectEditorType(element)
  };
}

export function fillDomEditor(selector: string, text: string, frameSelectors?: string[]) {
  const element = normalizeEditorElement(selector, frameSelectors);
  setElementValue(element, text);
  return {
    ...readDomEditor(selector, frameSelectors),
    filled: true
  };
}

export function clickDomElement(selector: string, frameSelectors?: string[]): DomClickResult {
  const root = withVisibleDocRoot(frameSelectors);
  const element = findPreferredElement(selector, root);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Element is not clickable for selector: ${selector}`);
  }
  clickElementLikeUser(element);
  return {
    ...summarizeElement(element, selector),
    selector,
    clicked: true,
    frameSelectors
  };
}

export async function clickDomElementHuman(selector: string, frameSelectors?: string[]): Promise<DomClickResult> {
  const root = withVisibleDocRoot(frameSelectors);
  const element = findPreferredElement(selector, root);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Element is not clickable for selector: ${selector}`);
  }
  scrollElementIntoViewIfNeeded(element);
  await waitForAnimationFrame();
  await waitForElementStability(element);
  try {
    clickElementLikeUser(element);
  } catch {
    element.click();
  }
  await waitForAnimationFrame();
  return {
    ...summarizeElement(element, selector),
    selector,
    clicked: true,
    frameSelectors,
    humanLike: true
  };
}

export function focusDomElement(selector: string, frameSelectors?: string[]): DomFocusResult {
  const root = withVisibleDocRoot(frameSelectors);
  const element = findPreferredElement(selector, root);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Element is not focusable for selector: ${selector}`);
  }
  scrollElementIntoViewIfNeeded(element);
  focusElement(element);
  return {
    ...summarizeElement(element, selector),
    selector,
    frameSelectors,
    focused: root.activeElement === element
  };
}

export function blurDomElement(selector?: string, frameSelectors?: string[]): DomBlurResult {
  const root = withVisibleDocRoot(frameSelectors);
  const element = selector
    ? findPreferredElement(selector, root)
    : (root.activeElement ?? undefined);
  if (!(element instanceof HTMLElement)) {
    throw new Error(selector ? `Element is not blur-capable for selector: ${selector}` : 'No active element is available to blur');
  }
  dispatchBlurCommit(element);
  return {
    ...summarizeElement(element, selector ?? buildElementSelector(element)),
    selector: selector ?? buildElementSelector(element),
    frameSelectors,
    blurred: true
  };
}

export function commitDomField(selector?: string, frameSelectors?: string[]) {
  const root = withVisibleDocRoot(frameSelectors);
  const element = selector
    ? findPreferredElement(selector, root)
    : (root.activeElement ?? undefined);
  if (!(element instanceof HTMLElement)) {
    throw new Error(selector ? `Element is not committable for selector: ${selector}` : 'No active element is available to commit');
  }
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element.isContentEditable || element.getAttribute('role') === 'textbox') {
    dispatchBlurCommit(element);
  } else {
    focusElement(element);
  }
  const formAction = element.closest('form')?.getAttribute('action') || undefined;
  return {
    ...summarizeElement(element, selector ?? buildElementSelector(element)),
    selector: selector ?? buildElementSelector(element),
    frameSelectors,
    blurred: true,
    formAction
  };
}

export function readDomFormValidation(selector: string, frameSelectors?: string[]): DomFormValidationSummary {
  const root = withVisibleDocRoot(frameSelectors);
  const element = findPreferredElement(selector, root);
  const summary = summarizeFormField(element, selector, frameSelectors);
  const html = element as HTMLElement & {
    validity?: ValidityState;
    willValidate?: boolean;
    validationMessage?: string;
    checkValidity?: () => boolean;
  };
  const checkable = (
    element instanceof HTMLInputElement
    || element instanceof HTMLTextAreaElement
    || element instanceof HTMLSelectElement
  ) ? element : undefined;
  const validity = checkable?.validity ?? html.validity;
  const valid = typeof html.checkValidity === 'function'
    ? html.checkValidity()
    : validity?.valid ?? html.getAttribute('aria-invalid') !== 'true';
  const dirty = checkable
    ? (checkable instanceof HTMLInputElement && (checkable.type === 'checkbox' || checkable.type === 'radio')
      ? checkable.checked
      : Boolean(checkable.value))
    : Boolean(html.innerText || html.textContent);
  const touched = html !== root.activeElement;
  return {
    ...summary,
    valid,
    invalid: !valid,
    validationMessage: typeof html.validationMessage === 'string' && html.validationMessage.trim().length > 0
      ? html.validationMessage.trim()
      : undefined,
    ariaInvalid: html.getAttribute('aria-invalid') === 'true'
      ? true
      : html.getAttribute('aria-invalid') === 'false'
        ? false
        : undefined,
    willValidate: typeof html.willValidate === 'boolean' ? html.willValidate : undefined,
    dirty,
    touched,
    nativeValidity: validity ? {
      badInput: validity.badInput || undefined,
      customError: validity.customError || undefined,
      patternMismatch: validity.patternMismatch || undefined,
      rangeOverflow: validity.rangeOverflow || undefined,
      rangeUnderflow: validity.rangeUnderflow || undefined,
      stepMismatch: validity.stepMismatch || undefined,
      tooLong: validity.tooLong || undefined,
      tooShort: validity.tooShort || undefined,
      typeMismatch: validity.typeMismatch || undefined,
      valid: validity.valid,
      valueMissing: validity.valueMissing || undefined
    } : undefined
  };
}

function fillSingleField(selector: string, value: string, frameSelectors?: string[]): DomFormFieldFillResult {
  const root = withVisibleDocRoot(frameSelectors);
  const element = findPreferredElement(selector, root);
  focusElement(element);

  if (element instanceof HTMLInputElement) {
    const type = (element.type || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      setCheckedState(element, parseBooleanLike(value));
      return {
        ...summarizeElement(element, selector),
        selector,
        filled: true,
        frameSelectors
      };
    }
    if (type === 'range') {
      const numericValue = Number.parseFloat(value);
      if (Number.isFinite(numericValue)) {
        element.value = String(numericValue);
      } else {
        setNativeInputValue(element, value);
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return {
        ...summarizeElement(element, selector),
        selector,
        filled: true,
        frameSelectors
      };
    }
    setNativeInputValue(element, value);
    if (typeof element.setSelectionRange === 'function' && !['date', 'time', 'datetime-local', 'range'].includes(type)) {
      element.setSelectionRange(value.length, value.length);
    }
    element.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: value,
      inputType: 'insertText'
    }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      ...summarizeElement(element, selector),
      selector,
      filled: true,
      frameSelectors
    };
  }

  if (element instanceof HTMLTextAreaElement) {
    setNativeInputValue(element, value);
    element.setSelectionRange?.(value.length, value.length);
    element.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: value,
      inputType: 'insertText'
    }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      ...summarizeElement(element, selector),
      selector,
      filled: true,
      frameSelectors
    };
  }

  if (element instanceof HTMLSelectElement) {
    const normalized = value.trim().toLowerCase();
    const option =
      Array.from(element.options).find((entry) => entry.value.trim().toLowerCase() === normalized) ??
      Array.from(element.options).find((entry) => entry.label.trim().toLowerCase() === normalized) ??
      Array.from(element.options).find((entry) => entry.text.trim().toLowerCase() === normalized);
    if (!option) {
      throw new Error(`No option matched value "${value}" for selector: ${selector}`);
    }
    element.value = option.value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      ...summarizeElement(element, selector),
      selector,
      filled: true,
      frameSelectors
    };
  }

  const html = element as HTMLElement;
  if (html.isContentEditable) {
    setEditableText(html, value);
    return {
      ...summarizeElement(html, selector),
      selector,
      filled: true,
      frameSelectors
    };
  }

  throw new Error(`Element is not fillable for selector: ${selector}`);
}

export function fillDomFormField(selector: string, value: string, frameSelectors?: string[]): DomFormFieldFillResult {
  return fillSingleField(selector, value, frameSelectors);
}

export function clearDomFormField(selector: string, frameSelectors?: string[]): DomFormFieldFillResult {
  const result = fillSingleField(selector, '', frameSelectors);
  return {
    ...result,
    value: '',
    filled: true,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveHumanDelay(delayMs = 60, jitterMs = 20) {
  const normalizedDelay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 60;
  const normalizedJitter = Number.isFinite(jitterMs) ? Math.max(0, jitterMs) : 20;
  if (normalizedJitter === 0) {
    return normalizedDelay;
  }
  const offset = Math.round((Math.random() * 2 - 1) * normalizedJitter);
  return Math.max(0, normalizedDelay + offset);
}

async function typeInputLikeUser(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  delayMs = 60,
  jitterMs = 20
) {
  focusElement(element);
  setNativeInputValue(element, '');
  element.dispatchEvent(new Event('input', { bubbles: true }));
  for (const character of value) {
    await sleep(resolveHumanDelay(delayMs, jitterMs));
    const nextValue = `${element.value}${character}`;
    element.dispatchEvent(new KeyboardEvent('keydown', {
      key: character,
      bubbles: true,
      cancelable: true
    }));
    element.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: character,
      inputType: 'insertText'
    }));
    setNativeInputValue(element, nextValue);
    if (typeof element.setSelectionRange === 'function') {
      try {
        element.setSelectionRange(nextValue.length, nextValue.length);
      } catch {
        // Some input types such as email do not support selection ranges.
      }
    }
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: character,
      inputType: 'insertText'
    }));
    element.dispatchEvent(new KeyboardEvent('keyup', {
      key: character,
      bubbles: true,
      cancelable: true
    }));
  }
  await sleep(resolveHumanDelay(delayMs, jitterMs));
  dispatchBlurCommit(element);
}

async function typeEditableLikeUser(element: HTMLElement, value: string, delayMs = 60, jitterMs = 20) {
  focusElement(element);
  setEditableText(element, '');
  element.dispatchEvent(new Event('input', { bubbles: true }));
  for (const character of value) {
    await sleep(resolveHumanDelay(delayMs, jitterMs));
    const currentValue = element.innerText || element.textContent || '';
    const nextValue = `${currentValue}${character}`;
    element.dispatchEvent(new KeyboardEvent('keydown', {
      key: character,
      bubbles: true,
      cancelable: true
    }));
    element.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: character,
      inputType: 'insertText'
    }));
    setEditableText(element, nextValue);
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: character,
      inputType: 'insertText'
    }));
    element.dispatchEvent(new KeyboardEvent('keyup', {
      key: character,
      bubbles: true,
      cancelable: true
    }));
  }
  await sleep(resolveHumanDelay(delayMs, jitterMs));
  dispatchBlurCommit(element);
}

export async function fillDomFormFieldHuman(
  selector: string,
  value: string,
  frameSelectors?: string[],
  delayMs = 60,
  jitterMs = 20
): Promise<DomFormFieldFillResult> {
  const root = withVisibleDocRoot(frameSelectors);
  const element = findPreferredElement(selector, root);
  if (element instanceof HTMLInputElement) {
    const type = (element.type || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio' || type === 'file') {
      return {
        ...fillSingleField(selector, value, frameSelectors),
        humanLike: true
      };
    }
    if (!['range', 'date', 'time', 'datetime-local'].includes(type)) {
      await typeInputLikeUser(element, value, delayMs, jitterMs);
      return {
        ...summarizeElement(element, selector),
        selector,
        filled: true,
        frameSelectors,
        humanLike: true
      };
    }
  }
  if (element instanceof HTMLTextAreaElement) {
    await typeInputLikeUser(element, value, delayMs, jitterMs);
    return {
      ...summarizeElement(element, selector),
      selector,
      filled: true,
      frameSelectors,
      humanLike: true
    };
  }
  if (element instanceof HTMLSelectElement) {
    return {
      ...fillSingleField(selector, value, frameSelectors),
      humanLike: true
    };
  }
  if ((element as HTMLElement).isContentEditable) {
    await typeEditableLikeUser(element as HTMLElement, value, delayMs, jitterMs);
    return {
      ...summarizeElement(element, selector),
      selector,
      filled: true,
      frameSelectors,
      humanLike: true
    };
  }
  return {
    ...fillSingleField(selector, value, frameSelectors),
    humanLike: true
  };
}

export function fillDomFormFields(fields: DomFormFieldEntry[]): DomFormFieldFillResult[] {
  return fields.map((entry) => fillSingleField(entry.selector, entry.value, entry.frameSelectors));
}

function readAssociatedLabels(element: Element) {
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

function summarizeFormField(element: Element, selector: string, frameSelectors?: string[]): DomFormFieldSummary {
  const html = element as HTMLElement;
  const summary = summarizeElement(element, selector);
  const form = html.closest('form');
  const labels = readAssociatedLabels(element);
  let fieldType: DomFormFieldSummary['fieldType'] = 'input';
  let optionCount: number | undefined;
  let accept: string | undefined;
  if (element instanceof HTMLTextAreaElement) {
    fieldType = 'textarea';
  } else if (element instanceof HTMLSelectElement) {
    fieldType = 'select';
    optionCount = element.options.length;
  } else if (html.isContentEditable) {
    fieldType = 'contenteditable';
  }
  if (element instanceof HTMLInputElement) {
    accept = element.accept || undefined;
  }
  return {
    ...summary,
    selector,
    frameSelectors,
    fieldType,
    required: html.hasAttribute('required'),
    labels: labels.length > 0 ? labels : undefined,
    formSelector: form instanceof HTMLFormElement ? buildFormSelector(form) : undefined,
    formAction: form?.getAttribute('action') || undefined,
    optionCount,
    accept
  };
}

export function listDomFormFields(limit = 50, frameSelectors?: string[]): DomFormFieldSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const selectors = [
    'input:not([type="hidden"])',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '[role="textbox"][contenteditable]'
  ];
  const seen = new Set<Element>();
  const fields: DomFormFieldSummary[] = [];
  for (const selector of selectors) {
    for (const element of Array.from(root.querySelectorAll(selector))) {
      if (seen.has(element)) {
        continue;
      }
      seen.add(element);
      fields.push(summarizeFormField(element, buildElementSelector(element) || selector, frameSelectors));
      if (fields.length >= limit) {
        return fields;
      }
    }
  }
  return fields;
}

export function listDomFormContexts(limit = 50, frameSelectors?: string[]): DomFormContextSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const forms = Array.from(root.querySelectorAll('form'));
  const contexts = forms.slice(0, limit).map((form) => {
    const formElement = form as HTMLFormElement;
    const fields = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"][contenteditable]'))
      .slice(0, 100)
      .map((element) => summarizeFormField(element, buildElementSelector(element), frameSelectors))
      .map((field) => ({
        selector: field.selector,
        labels: field.labels,
        name: field.name,
        type: field.type,
        fieldType: field.fieldType,
        placeholder: field.placeholder,
        required: field.required
      }));
    const submitSelectors = Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"], button, [role="button"]'))
      .filter((element) => isVisibleElement(element))
      .map((element) => buildElementSelector(element))
      .slice(0, 10);
    return {
      frameSelectors,
      formSelector: buildFormSelector(formElement),
      formAction: formElement.getAttribute('action') || undefined,
      formMethod: formElement.getAttribute('method') || undefined,
      fieldCount: fields.length,
      submitSelectors,
      fields
    };
  });
  if (contexts.length > 0) {
    return contexts;
  }
  const looseFields = listDomFormFields(limit, frameSelectors);
  if (looseFields.length === 0) {
    return [];
  }
  return [{
    frameSelectors,
    formSelector: undefined,
    formAction: undefined,
    formMethod: undefined,
    fieldCount: looseFields.length,
    submitSelectors: [],
    fields: looseFields.map((field) => ({
      selector: field.selector,
      labels: field.labels,
      name: field.name,
      type: field.type,
      fieldType: field.fieldType,
      placeholder: field.placeholder,
      required: field.required
    }))
  }];
}

function summarizeActionableElement(
  element: Element,
  actionableType: DomActionableSummary['actionableType'],
  frameSelectors?: string[],
  score = 0,
  reasons?: string[]
): DomActionableSummary {
  const selector = buildElementSelector(element);
  const summary = summarizeElement(element, selector);
  const labels = readAssociatedLabels(element);
  const form = (element as HTMLElement).closest('form');
  return {
    ...summary,
    selector,
    frameSelectors,
    actionableType,
    label: labels[0] || summary.text || summary.placeholder || summary.name,
    score,
    reasons,
    formSelector: form instanceof HTMLFormElement ? buildFormSelector(form) : undefined
  };
}

function scoreActionableElement(element: Element, actionableType: DomActionableSummary['actionableType']) {
  const summary = summarizeElement(element, buildElementSelector(element));
  const textLength = summary.text?.trim().length ?? 0;
  const visibleBoost = summary.visible ? 300 : 0;
  const enabledBoost = summary.disabled ? 0 : 120;
  const labelBoost = readAssociatedLabels(element).length > 0 ? 120 : 0;
  const compactBoost = summary.rect ? Math.max(0, 120 - Math.round(summary.rect.height / 4)) : 0;
  const typeBoost = actionableType === 'submit'
    ? 260
    : actionableType === 'fill'
      ? 220
      : actionableType === 'toggle'
        ? 200
        : actionableType === 'select'
          ? 190
          : actionableType === 'link'
            ? 140
            : 160;
  return typeBoost + visibleBoost + enabledBoost + labelBoost + compactBoost + Math.max(0, 80 - textLength);
}

function collectActionableElements(root: ParentNode, frameSelectors?: string[]) {
  const actionables: DomActionableSummary[] = [];
  const seen = new Set<Element>();
  const push = (element: Element, actionableType: DomActionableSummary['actionableType'], reasons: string[]) => {
    if (seen.has(element)) {
      return;
    }
    seen.add(element);
    actionables.push(summarizeActionableElement(
      element,
      actionableType,
      frameSelectors,
      scoreActionableElement(element, actionableType),
      reasons
    ));
  };

  for (const element of Array.from(root.querySelectorAll('input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"][contenteditable]'))) {
    if (!isVisibleElement(element)) {
      continue;
    }
    if (element instanceof HTMLInputElement) {
      const type = (element.type || '').toLowerCase();
      if (type === 'radio' || type === 'checkbox') {
        push(element, 'toggle', ['checkable_input']);
      } else if (type === 'submit' || type === 'button') {
        push(element, 'submit', ['input_submit']);
      } else {
        push(element, 'fill', ['text_input']);
      }
      continue;
    }
    if (element instanceof HTMLSelectElement) {
      push(element, 'select', ['select_control']);
      continue;
    }
    push(element, 'fill', ['editor_or_textarea']);
  }

  for (const element of Array.from(root.querySelectorAll('button, [role="button"], a[href], summary'))) {
    if (!isVisibleElement(element)) {
      continue;
    }
    const html = element as HTMLElement;
    if (html.getAttribute('aria-disabled') === 'true' || (html as HTMLButtonElement).disabled) {
      continue;
    }
    const actionableType: DomActionableSummary['actionableType'] =
      element instanceof HTMLAnchorElement
        ? 'link'
        : /submit|save|send|continue|next|search|log in|sign in|sign up/i.test(html.innerText || html.textContent || '')
          ? 'submit'
          : 'click';
    push(element, actionableType, [actionableType === 'link' ? 'link' : 'button_like']);
  }

  return actionables;
}

export function listDomActionables(limit = 50, frameSelectors?: string[], selector?: string): DomActionableSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const scope = selector ? findPreferredElement(selector, root) : (root.body ?? root.documentElement);
  return collectActionableElements(scope, frameSelectors)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, limit);
}

function readRadioLabel(input: HTMLInputElement) {
  const label = readAssociatedLabels(input)[0];
  if (label) {
    return label;
  }
  const text = input.closest('label, [role="radio"], [role="option"], .option, .radio')?.textContent?.trim();
  return text || input.value || undefined;
}

export function listDomRadioGroups(limit = 50, frameSelectors?: string[]): DomRadioGroupSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const radios = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const groups = new Map<string, DomRadioGroupSummary>();
  for (const radio of radios) {
    const name = radio.name || `__unnamed_${buildElementSelector(radio)}`;
    const form = radio.closest('form');
    const key = `${form ? buildFormSelector(form as HTMLFormElement) : '__noform__'}::${name}`;
    const existing = groups.get(key) ?? {
      name: radio.name || undefined,
      frameSelectors,
      formSelector: form instanceof HTMLFormElement ? buildFormSelector(form) : undefined,
      options: []
    };
    existing.options.push({
      selector: buildElementSelector(radio),
      value: radio.value || undefined,
      label: readRadioLabel(radio),
      checked: radio.checked,
      disabled: radio.disabled
    });
    groups.set(key, existing);
  }
  return [...groups.values()]
    .filter((group) => group.options.length > 0)
    .slice(0, limit);
}

function optionMatches(option: DomRadioOptionSummary, query: string, exact = false) {
  const normalized = query.trim().toLowerCase();
  const candidates = [option.label, option.value, option.selector]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());
  return candidates.some((candidate) => exact ? candidate === normalized : candidate.includes(normalized));
}

export function selectDomRadio(
  groupQuery: string,
  optionQuery: string,
  frameSelectors?: string[],
  exact = false,
  preferredFormSelector?: string
) {
  const groups = listDomRadioGroups(100, frameSelectors)
    .sort((left, right) => {
      const leftPreferred = preferredFormSelector && left.formSelector === preferredFormSelector ? 1 : 0;
      const rightPreferred = preferredFormSelector && right.formSelector === preferredFormSelector ? 1 : 0;
      return rightPreferred - leftPreferred;
    });
  const normalizedGroup = groupQuery.trim().toLowerCase();
  const matchedGroup = groups.find((group) => {
    const groupCandidates = [group.name, ...group.options.map((option) => option.label)]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase());
    return groupCandidates.some((candidate) => exact ? candidate === normalizedGroup : candidate.includes(normalizedGroup));
  });
  if (!matchedGroup) {
    throw new Error(`No radio group matched query: ${groupQuery}`);
  }
  const matchedOption = matchedGroup.options.find((option) => optionMatches(option, optionQuery, exact));
  if (!matchedOption?.selector) {
    throw new Error(`No radio option matched query: ${optionQuery}`);
  }
  const root = withVisibleDocRoot(frameSelectors);
  const element = findPreferredElement(matchedOption.selector, root);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Matched radio option is not an input for query: ${optionQuery}`);
  }
  setCheckedState(element, true);
  const result = {
    ...summarizeElement(element, matchedOption.selector),
    selector: matchedOption.selector,
    filled: true,
    frameSelectors
  };
  return {
    ...result,
    group: matchedGroup,
    option: matchedOption
  };
}

export function listDomSegmentedGroups(limit = 50, frameSelectors?: string[]): DomSegmentedGroupSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('button[aria-pressed], [role="tab"], button[data-segment], [data-segment], [aria-selected]'))
    .filter((element) => isVisibleElement(element));
  const grouped = new Map<string, { container: Element; buttons: HTMLElement[] }>();
  for (const candidate of candidates) {
    const container =
      candidate.closest('[role="group"], [role="tablist"], fieldset')
      ?? candidate.parentElement
      ?? candidate;
    const key = buildElementSelector(container);
    const entry = grouped.get(key) ?? { container, buttons: [] };
    entry.buttons.push(candidate);
    grouped.set(key, entry);
  }
  const groups = [...grouped.values()]
    .map(({ container, buttons }) => {
      const uniqueButtons = buttons.filter((button, index, array) => array.indexOf(button) === index);
      if (uniqueButtons.length === 0) {
        return undefined;
      }
      const form = container.closest('form');
      return {
        label: (
          container.getAttribute('aria-label')
          || container.querySelector('legend')?.textContent
          || container.querySelector('label, [data-label], [aria-labelledby]')?.textContent
          || (container as HTMLElement).innerText?.split('\n').find(Boolean)
          || ''
        ).trim() || undefined,
        selector: buildElementSelector(container),
        frameSelectors,
        formSelector: form instanceof HTMLFormElement ? buildFormSelector(form) : undefined,
        options: uniqueButtons.map((button) => ({
          selector: buildElementSelector(button),
          value: button.getAttribute('data-segment') || button.getAttribute('data-value') || undefined,
          label: (button.innerText || button.textContent || '').trim() || undefined,
          pressed: button.getAttribute('aria-pressed') === 'true' || button.getAttribute('aria-selected') === 'true',
          disabled: (button as HTMLButtonElement).disabled || button.getAttribute('aria-disabled') === 'true'
        }))
      } satisfies DomSegmentedGroupSummary;
    })
    .filter((group): group is DomSegmentedGroupSummary => Boolean(group))
    .filter((group) => group.options.length > 0);
  return groups.slice(0, limit);
}

export function selectDomSegmentedOption(
  groupQuery: string,
  optionQuery: string,
  frameSelectors?: string[],
  exact = false,
  preferredFormSelector?: string
) {
  const groups = listDomSegmentedGroups(100, frameSelectors)
    .sort((left, right) => {
      const leftPreferred = preferredFormSelector && left.formSelector === preferredFormSelector ? 1 : 0;
      const rightPreferred = preferredFormSelector && right.formSelector === preferredFormSelector ? 1 : 0;
      return rightPreferred - leftPreferred;
    });
  const normalizedGroup = groupQuery.trim().toLowerCase();
  const matchedGroup = groups.find((group) => {
    const values = [group.label, ...group.options.map((option) => option.label), group.selector]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase());
    return values.some((value) => exact ? value === normalizedGroup : value.includes(normalizedGroup));
  });
  if (!matchedGroup) {
    throw new Error(`No segmented control matched query: ${groupQuery}`);
  }
  const normalizedOption = optionQuery.trim().toLowerCase();
  const matchedOption = matchedGroup.options.find((option) => {
    const values = [option.label, option.value, option.selector]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase());
    return values.some((value) => exact ? value === normalizedOption : value.includes(normalizedOption));
  });
  if (!matchedOption?.selector) {
    throw new Error(`No segmented option matched query: ${optionQuery}`);
  }
  const result = clickDomElement(matchedOption.selector, frameSelectors);
  return {
    ...result,
    group: matchedGroup,
    option: matchedOption
  };
}

export function listDomTablists(limit = 50, frameSelectors?: string[]): DomTablistSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const tablists = Array.from(root.querySelectorAll<HTMLElement>('[role="tablist"], [data-tablist], .tabs, .tablist'))
    .filter((element) => isVisibleElement(element));
  const groups = tablists
    .map((container) => {
      const form = container.closest('form');
      const options = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"], button, [aria-controls], [data-tab], [data-value]'))
        .filter((element) => isVisibleElement(element))
        .map((button) => ({
          selector: buildElementSelector(button),
          value: button.getAttribute('data-tab') || button.getAttribute('data-value') || button.getAttribute('aria-controls') || undefined,
          label: (button.innerText || button.textContent || '').trim() || undefined,
          selected: button.getAttribute('aria-selected') === 'true' || button.getAttribute('data-state') === 'active' || button.classList.contains('active'),
          disabled: (button as HTMLButtonElement).disabled || button.getAttribute('aria-disabled') === 'true'
        }))
        .filter((option, index, array) => array.findIndex((entry) => entry.selector === option.selector) === index);
      if (options.length === 0) {
        return undefined;
      }
      return {
        label: (
          container.getAttribute('aria-label')
          || container.querySelector('legend')?.textContent
          || container.querySelector('label, [data-label], [aria-labelledby]')?.textContent
          || (container as HTMLElement).innerText?.split('\n').find(Boolean)
          || ''
        ).trim() || undefined,
        selector: buildElementSelector(container),
        frameSelectors,
        formSelector: form instanceof HTMLFormElement ? buildFormSelector(form) : undefined,
        options
      } satisfies DomTablistSummary;
    })
    .filter((group): group is DomTablistSummary => Boolean(group));
  return groups.slice(0, limit);
}

export function selectDomTabOption(
  groupQuery: string,
  optionQuery: string,
  frameSelectors?: string[],
  exact = false,
  preferredFormSelector?: string
) {
  const groups = listDomTablists(100, frameSelectors)
    .sort((left, right) => {
      const leftPreferred = preferredFormSelector && left.formSelector === preferredFormSelector ? 1 : 0;
      const rightPreferred = preferredFormSelector && right.formSelector === preferredFormSelector ? 1 : 0;
      return rightPreferred - leftPreferred;
    });
  const normalizedGroup = groupQuery.trim().toLowerCase();
  const matchedGroup = groups.find((group) => {
    const values = [group.label, group.selector, ...group.options.map((option) => option.label ?? option.value ?? option.selector)]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase());
    return values.some((value) => exact ? value === normalizedGroup : value.includes(normalizedGroup));
  });
  if (!matchedGroup) {
    throw new Error(`No tablist matched query: ${groupQuery}`);
  }
  const normalizedOption = optionQuery.trim().toLowerCase();
  const matchedOption = matchedGroup.options.find((option) => {
    const values = [option.label, option.value, option.selector]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase());
    return values.some((value) => exact ? value === normalizedOption : value.includes(normalizedOption));
  });
  if (!matchedOption?.selector) {
    throw new Error(`No tab option matched query: ${optionQuery}`);
  }
  const result = clickDomElement(matchedOption.selector, frameSelectors);
  return {
    ...result,
    group: matchedGroup,
    option: matchedOption
  };
}

export function listDomSteppers(limit = 50, frameSelectors?: string[]): DomStepperSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('form, [role="group"], [role="region"], [data-stepper], .stepper, .wizard, .steps'))
    .filter((element) => isVisibleElement(element));
  const groups = candidates
    .map((container) => {
      const form = container.closest('form');
      const buttons = Array.from(container.querySelectorAll<HTMLElement>('button, [role="button"], a'))
        .filter((element) => isVisibleElement(element));
      const next = buttons.find((button) => /next|continue|proceed|finish|submit|save/i.test((button.innerText || button.textContent || '').trim()));
      const previous = buttons.find((button) => /back|previous|prev/i.test((button.innerText || button.textContent || '').trim()));
      if (!next && !previous) {
        return undefined;
      }
      const summarize = (button: HTMLElement | undefined, direction: 'next' | 'previous') =>
        button ? {
          direction,
          selector: buildElementSelector(button),
          label: (button.innerText || button.textContent || '').trim() || undefined,
          disabled: (button as HTMLButtonElement).disabled || button.getAttribute('aria-disabled') === 'true'
        } satisfies DomStepperControlSummary : undefined;
      return {
        label: (
          container.getAttribute('aria-label')
          || container.querySelector('legend, h1, h2, h3, [data-label], [aria-labelledby]')?.textContent
          || ''
        ).trim() || undefined,
        selector: buildElementSelector(container),
        frameSelectors,
        formSelector: form instanceof HTMLFormElement ? buildFormSelector(form) : undefined,
        next: summarize(next, 'next'),
        previous: summarize(previous, 'previous')
      } satisfies DomStepperSummary;
    })
    .filter((group): group is DomStepperSummary => Boolean(group));
  return groups.slice(0, limit);
}

export function moveDomStepper(
  query: string | undefined,
  direction: 'next' | 'previous',
  frameSelectors?: string[],
  exact = false,
  preferredFormSelector?: string
) {
  const groups = listDomSteppers(100, frameSelectors)
    .sort((left, right) => {
      const leftPreferred = preferredFormSelector && left.formSelector === preferredFormSelector ? 1 : 0;
      const rightPreferred = preferredFormSelector && right.formSelector === preferredFormSelector ? 1 : 0;
      return rightPreferred - leftPreferred;
    });
  const normalized = query?.trim().toLowerCase();
  const matchedGroup = !normalized
    ? groups[0]
    : groups.find((group) => {
        const values = [group.label, group.selector, group.next?.label, group.previous?.label]
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .map((value) => value.trim().toLowerCase());
        return values.some((value) => exact ? value === normalized : value.includes(normalized));
      });
  if (!matchedGroup) {
    throw new Error(`No stepper matched query: ${query}`);
  }
  const control = direction === 'next' ? matchedGroup.next : matchedGroup.previous;
  if (!control?.selector) {
    throw new Error(`No ${direction} stepper control matched query: ${query ?? matchedGroup.label ?? matchedGroup.selector}`);
  }
  const result = clickDomElement(control.selector, frameSelectors);
  return {
    ...result,
    direction,
    group: matchedGroup,
    control
  };
}

function matchesLooseQuery(candidates: Array<string | undefined>, query: string, exact = false) {
  const normalized = query.trim().toLowerCase();
  const values = candidates
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());
  return values.some((value) => exact ? value === normalized : value.includes(normalized));
}

function summarizeDialogActions(dialog: HTMLElement) {
  const actions = Array.from(dialog.querySelectorAll<HTMLElement>('button, [role="button"], a[href], summary'))
    .filter((element) => isVisibleElement(element));
  const summarized = actions.map((element) => {
    const label = (element.innerText || element.textContent || '').trim() || element.getAttribute('aria-label') || undefined;
    const close = /close|cancel|dismiss|x$/i.test((element.innerText || element.textContent || '').trim())
      || element.getAttribute('aria-label')?.match(/close|dismiss/i) !== null;
    return {
      selector: buildElementSelector(element),
      label,
      disabled: (element as HTMLButtonElement).disabled || element.getAttribute('aria-disabled') === 'true',
      close
    } satisfies DomDialogActionSummary;
  });
  const closeSelectors = actions
    .filter((element) => /close|cancel|dismiss|x$/i.test((element.innerText || element.textContent || '').trim()) || element.getAttribute('aria-label')?.match(/close|dismiss/i))
    .map((element) => buildElementSelector(element));
  const actionSelectors = summarized.map((element) => element.selector);
  return {
    closeSelectors: [...new Set(closeSelectors)],
    actionSelectors: [...new Set(actionSelectors)],
    actions: summarized.filter((entry, index, array) => array.findIndex((candidate) => candidate.selector === entry.selector) === index)
  };
}

export function listDomDialogs(limit = 20, frameSelectors?: string[]): DomDialogSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"], .modal, .dialog'))
    .filter((element) => isVisibleElement(element));
  const dialogs = candidates.map((dialog) => {
    const actions = summarizeDialogActions(dialog);
    return {
      selector: buildElementSelector(dialog),
      frameSelectors,
      label: (
        dialog.getAttribute('aria-label')
        || dialog.querySelector('[aria-labelledby]')?.textContent
        || dialog.querySelector('h1, h2, h3, header, .modal-title, .dialog-title')?.textContent
        || (dialog.innerText || dialog.textContent || '').split('\n').map((entry) => entry.trim()).find(Boolean)
        || ''
      ).trim() || undefined,
      role: dialog.getAttribute('role') || (dialog.tagName.toLowerCase() === 'dialog' ? 'dialog' : undefined),
      modal: dialog.getAttribute('aria-modal') === 'true' || dialog.tagName.toLowerCase() === 'dialog',
      open: dialog.tagName.toLowerCase() === 'dialog' ? (dialog as HTMLDialogElement).open : true,
      closeSelectors: actions.closeSelectors,
      actionSelectors: actions.actionSelectors,
      actions: actions.actions
    } satisfies DomDialogSummary;
  });
  return dialogs.slice(0, limit);
}

export function listDomDialogActions(query?: string, frameSelectors?: string[], exact = false) {
  const dialogs = listDomDialogs(20, frameSelectors);
  const dialog = query
    ? dialogs.find((entry) => matchesLooseQuery([entry.label, entry.selector], query, exact))
    : dialogs[0];
  if (!dialog) {
    throw new Error(query ? `No dialog matched query: ${query}` : 'No open dialog found');
  }
  return {
    dialog,
    actions: dialog.actions ?? []
  };
}

export function closeDomDialog(query?: string, frameSelectors?: string[], exact = false) {
  const dialogs = listDomDialogs(20, frameSelectors);
  const dialog = query
    ? dialogs.find((entry) => matchesLooseQuery([entry.label, entry.selector], query, exact))
    : dialogs[0];
  if (!dialog) {
    throw new Error(query ? `No dialog matched query: ${query}` : 'No open dialog found');
  }
  const closeSelector = dialog.closeSelectors[0];
  if (!closeSelector) {
    throw new Error(`Dialog matched "${query ?? dialog.label ?? dialog.selector}" but no close control was found`);
  }
  const result = clickDomElement(closeSelector, frameSelectors);
  return {
    ...result,
    dialog,
    closed: true
  };
}

export function clickDomDialogAction(
  dialogQuery: string | undefined,
  actionQuery: string | undefined,
  frameSelectors?: string[],
  exact = false
) {
  const { dialog, actions } = listDomDialogActions(dialogQuery, frameSelectors, exact);
  const action = actionQuery
    ? actions.find((entry) => matchesLooseQuery([entry.label, entry.selector], actionQuery, exact))
    : actions.find((entry) => !entry.close && entry.disabled !== true) ?? actions[0];
  if (!action?.selector) {
    throw new Error(actionQuery ? `No dialog action matched query: ${actionQuery}` : `Dialog matched "${dialogQuery ?? dialog.label ?? dialog.selector}" but no action was found`);
  }
  const result = clickDomElement(action.selector, frameSelectors);
  return {
    ...result,
    dialog,
    action
  };
}

export function listDomMenus(limit = 20, frameSelectors?: string[]): DomMenuSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('[role="menu"], [role="listbox"], [data-menu], .menu, .dropdown-menu'))
    .filter((element) => isVisibleElement(element));
  const menus = candidates.map((menu) => {
    const options = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"], [role="option"], button, a[href], li, [data-value]'))
      .filter((element) => isVisibleElement(element))
      .map((element) => ({
        selector: buildElementSelector(element),
        label: (element.innerText || element.textContent || '').trim() || undefined,
        value: element.getAttribute('data-value') || element.getAttribute('value') || undefined,
        disabled: (element as HTMLButtonElement).disabled || element.getAttribute('aria-disabled') === 'true'
      }))
      .filter((option, index, array) => array.findIndex((entry) => entry.selector === option.selector) === index);
    return {
      selector: buildElementSelector(menu),
      frameSelectors,
      label: (
        menu.getAttribute('aria-label')
        || menu.closest('[aria-label], [data-label]')?.getAttribute('aria-label')
        || ''
      ).trim() || undefined,
      options
    } satisfies DomMenuSummary;
  }).filter((menu) => menu.options.length > 0);
  return menus.slice(0, limit);
}

export function selectDomMenuOption(
  menuQuery: string | undefined,
  optionQuery: string,
  frameSelectors?: string[],
  exact = false
) {
  const menus = listDomMenus(50, frameSelectors);
  const menu = menuQuery
    ? menus.find((entry) => matchesLooseQuery([entry.label, entry.selector, ...entry.options.map((option) => option.label)], menuQuery, exact))
    : menus[0];
  if (!menu) {
    throw new Error(menuQuery ? `No menu matched query: ${menuQuery}` : 'No visible menu found');
  }
  const option = menu.options.find((entry) => matchesLooseQuery([entry.label, entry.value, entry.selector], optionQuery, exact));
  if (!option?.selector) {
    throw new Error(`No menu option matched query: ${optionQuery}`);
  }
  const result = clickDomElement(option.selector, frameSelectors);
  return {
    ...result,
    menu,
    option
  };
}

export function listDomDisclosures(limit = 50, frameSelectors?: string[]): DomDisclosureSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('summary, [aria-expanded], [data-expanded], .accordion button, .disclosure button, .accordion summary'))
    .filter((element) => isVisibleElement(element));
  const disclosures = candidates.map((element) => ({
    selector: buildElementSelector(element),
    frameSelectors,
    label: (element.innerText || element.textContent || '').trim() || undefined,
    expanded: element.getAttribute('aria-expanded') === 'true'
      || element.getAttribute('data-expanded') === 'true'
      || element.closest('details')?.open
      || undefined,
    controls: element.getAttribute('aria-controls') || undefined,
    disabled: (element as HTMLButtonElement).disabled || element.getAttribute('aria-disabled') === 'true'
  } satisfies DomDisclosureSummary));
  return disclosures
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.selector === entry.selector) === index)
    .slice(0, limit);
}

function inferBannerVariant(element: HTMLElement, text: string) {
  const haystack = [
    element.getAttribute('role'),
    element.className,
    element.getAttribute('aria-label'),
    text
  ].filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ').toLowerCase();
  if (/error|danger|failed|invalid|alert/.test(haystack)) return 'error';
  if (/success|saved|done|complete|confirmed/.test(haystack)) return 'success';
  if (/warn|warning|caution/.test(haystack)) return 'warning';
  if (/status/.test(haystack)) return 'status';
  return 'info';
}

export function listDomBanners(limit = 20, frameSelectors?: string[]): DomBannerSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(
    '[role="alert"], [role="status"], [aria-live], .toast, .alert, .banner, .notification, [data-toast], [data-alert], [data-banner]'
  )).filter((element) => isVisibleElement(element));
  return candidates
    .map((element) => {
      const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
      const dismissSelectors = Array.from(element.querySelectorAll<HTMLElement>('button, [role="button"], [aria-label*="dismiss" i], [aria-label*="close" i]'))
        .filter((entry) => isVisibleElement(entry))
        .map((entry) => buildElementSelector(entry));
      return {
        selector: buildElementSelector(element),
        frameSelectors,
        label: element.getAttribute('aria-label') || undefined,
        text: text || undefined,
        role: element.getAttribute('role') || undefined,
        variant: inferBannerVariant(element, text),
        dismissSelectors: [...new Set(dismissSelectors)]
      } satisfies DomBannerSummary;
    })
    .filter((entry, index, array) => Boolean(entry.text || entry.label) && array.findIndex((candidate) => candidate.selector === entry.selector) === index)
    .slice(0, limit);
}

export function dismissDomBanner(query?: string, frameSelectors?: string[], exact = false) {
  const banners = listDomBanners(50, frameSelectors);
  const banner = query
    ? banners.find((entry) => matchesLooseQuery([entry.text, entry.label, entry.selector], query, exact))
    : banners.find((entry) => (entry.dismissSelectors?.length ?? 0) > 0) ?? banners[0];
  if (!banner) {
    throw new Error(query ? `No banner matched query: ${query}` : 'No visible banner found');
  }
  const dismissSelector = banner.dismissSelectors?.[0];
  if (!dismissSelector) {
    throw new Error(`Banner matched "${query ?? banner.text ?? banner.label ?? banner.selector}" but no dismiss control was found`);
  }
  const result = clickDomElement(dismissSelector, frameSelectors);
  return {
    ...result,
    banner,
    dismissed: true
  };
}

function inferLoadingVariant(element: HTMLElement): DomLoadingStateSummary['variant'] {
  const haystack = [
    element.getAttribute('role'),
    element.className,
    element.getAttribute('aria-label')
  ].filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ').toLowerCase();
  if (/progress/.test(haystack) || element.tagName.toLowerCase() === 'progress') return 'progress';
  if (/skeleton|placeholder|shimmer/.test(haystack)) return 'skeleton';
  if (/busy/.test(haystack)) return 'busy';
  return 'spinner';
}

function isBlockingLoadingElement(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    ['fixed', 'absolute', 'sticky'].includes(style.position)
    && rect.width >= window.innerWidth * 0.5
    && rect.height >= window.innerHeight * 0.3
  ) || element.getAttribute('aria-modal') === 'true';
}

export function listDomLoadingStates(limit = 20, frameSelectors?: string[]): DomLoadingStateSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(
    '[aria-busy="true"], [role="progressbar"], progress, .loading, .spinner, .busy, .skeleton, [data-loading], [data-busy]'
  )).filter((element) => isVisibleElement(element));
  return candidates
    .map((element) => {
      const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
      return {
        selector: buildElementSelector(element),
        frameSelectors,
        label: element.getAttribute('aria-label') || undefined,
        text: text || undefined,
        role: element.getAttribute('role') || undefined,
        variant: inferLoadingVariant(element),
        blocking: isBlockingLoadingElement(element)
      } satisfies DomLoadingStateSummary;
    })
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.selector === entry.selector) === index)
    .slice(0, limit);
}

function inferEmptyStateKind(text: string) {
  const normalized = text.toLowerCase();
  if (/no results|no matches|nothing found|0 results/.test(normalized)) return 'no_results';
  if (/not found|missing|404/.test(normalized)) return 'not_found';
  return 'empty';
}

export function listDomEmptyStates(limit = 20, frameSelectors?: string[]): DomEmptyStateSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(
    '.empty, .empty-state, .no-results, .zero-state, [data-empty], [data-empty-state], [data-no-results]'
  )).filter((element) => isVisibleElement(element));
  const textMatches = Array.from(root.querySelectorAll<HTMLElement>('section, article, div, main'))
    .filter((element) => isVisibleElement(element))
    .filter((element) => {
      const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
      return text.length > 0 && /no results|nothing here|nothing found|no items|empty|not found/.test(text.toLowerCase());
    });
  return [...new Map([...candidates, ...textMatches].map((element) => [buildElementSelector(element), element])).values()]
    .map((element) => {
      const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
      return {
        selector: buildElementSelector(element),
        frameSelectors,
        label: element.getAttribute('aria-label') || undefined,
        text: text || undefined,
        kind: inferEmptyStateKind(text)
      } satisfies DomEmptyStateSummary;
    })
    .filter((entry) => Boolean(entry.text || entry.label))
    .slice(0, limit);
}

export function toggleDomDisclosure(
  query: string,
  desiredState: 'open' | 'closed' | 'toggle' = 'toggle',
  frameSelectors?: string[],
  exact = false
) {
  const disclosure = listDomDisclosures(100, frameSelectors).find((entry) =>
    matchesLooseQuery([entry.label, entry.selector, entry.controls], query, exact)
  );
  if (!disclosure?.selector) {
    throw new Error(`No disclosure matched query: ${query}`);
  }
  if (desiredState === 'open' && disclosure.expanded === true) {
    return { ...disclosure, changed: false };
  }
  if (desiredState === 'closed' && disclosure.expanded === false) {
    return { ...disclosure, changed: false };
  }
  const result = clickDomElement(disclosure.selector, frameSelectors);
  return {
    ...result,
    disclosure,
    changed: true
  };
}

export function listDomCollections(limit = 20, frameSelectors?: string[]): DomCollectionSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('table, [role="table"], [role="grid"], ul, ol, [role="list"], .list, .grid, .cards, [data-collection]'))
    .filter((element) => isVisibleElement(element));
  const collections = candidates.map((container) => {
    const isTableLike = container.matches('table, [role="table"], [role="grid"]');
    const tableHeaders = isTableLike
      ? Array.from(container.querySelectorAll<HTMLElement>('thead th, [role="columnheader"]'))
        .map((cell) => (cell.innerText || cell.textContent || '').replace(/\s+/g, ' ').trim())
      : [];
    const rows = isTableLike
      ? Array.from(container.querySelectorAll<HTMLElement>('tbody tr, [role="row"]'))
      : Array.from(container.querySelectorAll<HTMLElement>('li, [role="listitem"], article, .card, [data-item]'));
    const items = rows
      .filter((element) => isVisibleElement(element))
      .map((item, index) => {
        const actions = collectActionableElements(item, frameSelectors).slice(0, 5);
        const selected = item.getAttribute('aria-selected') === 'true'
          || item.classList.contains('selected')
          || Boolean(item.querySelector('input[type="checkbox"]:checked, input[type="radio"]:checked, [role="checkbox"][aria-checked="true"], [role="radio"][aria-checked="true"]'));
        const expanded = item.getAttribute('aria-expanded') === 'true'
          || Boolean(item.querySelector('[aria-expanded="true"], details[open]'));
        const detailText = (
          item.querySelector('[data-row-details], [data-details], .details, .row-details, [aria-live], [aria-expanded="true"] + *, details[open]')?.textContent
          || ''
        ).replace(/\s+/g, ' ').trim() || undefined;
        const cells = isTableLike
          ? Array.from(item.querySelectorAll<HTMLElement>('th, td, [role="gridcell"], [role="cell"]'))
            .filter((cell) => isVisibleElement(cell))
            .map((cell, cellIndex) => ({
              key: tableHeaders[cellIndex] || undefined,
              value: (cell.innerText || cell.textContent || '').replace(/\s+/g, ' ').trim()
            }))
            .filter((entry) => entry.value)
          : undefined;
        return {
          selector: buildElementSelector(item),
          label: (item.querySelector('h1, h2, h3, h4, strong, [data-title]')?.textContent || item.innerText || item.textContent || '').trim().split('\n')[0] || undefined,
          text: (item.innerText || item.textContent || '').replace(/\s+/g, ' ').trim() || undefined,
          href: item.querySelector<HTMLAnchorElement>('a[href]')?.href || undefined,
          rowIndex: index,
          cells,
          actions: actions.map((entry) => ({
            selector: entry.selector,
            label: entry.label ?? entry.text ?? entry.selector,
            actionableType: entry.actionableType
          })),
          selected,
          expanded,
          detailText,
          actionableSelectors: actions.map((entry) => entry.selector)
        } satisfies DomCollectionItemSummary;
      })
      .filter((item) => item.text || item.label);
    if (items.length === 0) {
      return undefined;
    }
    return {
      selector: buildElementSelector(container),
      frameSelectors,
      label: (
        container.getAttribute('aria-label')
        || container.querySelector('caption, legend, h1, h2, h3, h4, [data-label]')?.textContent
        || ''
      ).trim() || undefined,
      collectionType: isTableLike
        ? 'table'
        : container.matches('.grid, [data-collection].grid')
          ? 'grid'
          : container.matches('.cards, article .card')
            ? 'cards'
            : 'list',
      itemCount: items.length,
      selectedCount: items.filter((item) => item.selected).length,
      expandedCount: items.filter((item) => item.expanded).length,
      detailCount: items.filter((item) => typeof item.detailText === 'string' && item.detailText.length > 0).length,
      items: items.slice(0, limit)
    } satisfies DomCollectionSummary;
  }).filter((entry): entry is DomCollectionSummary => Boolean(entry));
  return collections.slice(0, limit);
}

export function listDomCollectionRows(
  collectionQuery: string | undefined,
  limit = 20,
  frameSelectors?: string[],
  exact = false
) {
  const collections = listDomCollections(50, frameSelectors);
  const collection = collectionQuery
    ? collections.find((entry) => matchesLooseQuery([entry.label, entry.selector], collectionQuery, exact))
    : collections[0];
  if (!collection) {
    throw new Error(collectionQuery ? `No collection matched query: ${collectionQuery}` : 'No visible collection found');
  }
  return {
    collection,
    rows: collection.items.slice(0, limit)
  };
}

function matchDomCollectionRow(
  rows: DomCollectionItemSummary[],
  rowQuery: string,
  exact = false
) {
  return rows.find((entry) => matchesLooseQuery([
    entry.label,
    entry.text,
    entry.selector,
    ...(entry.cells ?? []).map((cell) => `${cell.key ?? ''} ${cell.value}`.trim())
  ], rowQuery, exact));
}

function findDomCollectionRowElement(row: DomCollectionItemSummary, frameSelectors?: string[]) {
  return findInFrameScope(row.selector, frameSelectors) as HTMLElement | null;
}

function findRowSelectionControl(rowElement: HTMLElement) {
  return rowElement.querySelector<HTMLElement>('input[type="checkbox"], input[type="radio"], [role="checkbox"], [role="radio"]');
}

function setRowSelectionState(control: HTMLElement, desiredState: 'on' | 'off' | 'toggle') {
  const isChecked = control instanceof HTMLInputElement
    ? control.checked
    : control.getAttribute('aria-checked') === 'true';
  const nextChecked = desiredState === 'toggle' ? !isChecked : desiredState === 'on';
  if (control instanceof HTMLInputElement) {
    control.checked = nextChecked;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    control.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
    control.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
  }
  return {
    changed: nextChecked !== isChecked,
    checked: nextChecked
  };
}

export function clickDomCollectionItem(
  collectionQuery: string | undefined,
  itemQuery: string,
  frameSelectors?: string[],
  exact = false
) {
  const collections = listDomCollections(50, frameSelectors);
  const collection = collectionQuery
    ? collections.find((entry) => matchesLooseQuery([entry.label, entry.selector], collectionQuery, exact))
    : collections[0];
  if (!collection) {
    throw new Error(collectionQuery ? `No collection matched query: ${collectionQuery}` : 'No visible collection found');
  }
  const item = collection.items.find((entry) => matchesLooseQuery([entry.label, entry.text, entry.href, entry.selector], itemQuery, exact));
  if (!item?.selector) {
    throw new Error(`No collection item matched query: ${itemQuery}`);
  }
  const targetSelector = item.actionableSelectors?.[0] || item.selector;
  const result = clickDomElement(targetSelector, frameSelectors);
  return {
    ...result,
    collection,
    item
  };
}

export function listDomCollectionRowActions(
  collectionQuery: string | undefined,
  rowQuery: string,
  frameSelectors?: string[],
  exact = false
) {
  const { collection, rows } = listDomCollectionRows(collectionQuery, 200, frameSelectors, exact);
  const row = matchDomCollectionRow(rows, rowQuery, exact);
  if (!row) {
    throw new Error(`No collection row matched query: ${rowQuery}`);
  }
  return {
    collection,
    row,
    count: row.actions?.length ?? 0,
    actions: row.actions ?? []
  };
}

export function getDomCollectionSelectionState(
  collectionQuery: string | undefined,
  frameSelectors?: string[],
  exact = false
) {
  const { collection, rows } = listDomCollectionRows(collectionQuery, 500, frameSelectors, exact);
  const selectedRows = rows.filter((row) => row.selected);
  return {
    collection,
    count: rows.length,
    selectedCount: selectedRows.length,
    rows,
    selectedRows
  };
}

export function selectDomCollectionRow(
  collectionQuery: string | undefined,
  rowQuery: string,
  desiredState: 'on' | 'off' | 'toggle' = 'toggle',
  frameSelectors?: string[],
  exact = false
) {
  const { collection, rows } = listDomCollectionRows(collectionQuery, 500, frameSelectors, exact);
  const row = matchDomCollectionRow(rows, rowQuery, exact);
  if (!row) {
    throw new Error(`No collection row matched query: ${rowQuery}`);
  }
  const rowElement = findDomCollectionRowElement(row, frameSelectors);
  if (!rowElement) {
    throw new Error(`Matched row is no longer present in the DOM: ${rowQuery}`);
  }
  const control = findRowSelectionControl(rowElement);
  if (!control) {
    throw new Error(`No selectable control was found for row: ${rowQuery}`);
  }
  const result = setRowSelectionState(control, desiredState);
  return {
    selector: buildElementSelector(control),
    collection,
    row,
    desiredState,
    ...result
  };
}

export function selectAllDomCollectionRows(
  collectionQuery: string | undefined,
  desiredState: 'on' | 'off' | 'toggle' = 'toggle',
  frameSelectors?: string[],
  exact = false
) {
  const collections = listDomCollections(50, frameSelectors);
  const collection = collectionQuery
    ? collections.find((entry) => matchesLooseQuery([entry.label, entry.selector], collectionQuery, exact))
    : collections[0];
  if (!collection) {
    throw new Error(collectionQuery ? `No collection matched query: ${collectionQuery}` : 'No visible collection found');
  }
  const collectionElement = findInFrameScope(collection.selector, frameSelectors) as HTMLElement | null;
  if (!collectionElement) {
    throw new Error(`Matched collection is no longer present in the DOM: ${collectionQuery ?? collection.selector}`);
  }
  const control = collectionElement.querySelector<HTMLElement>('thead input[type="checkbox"], [role="columnheader"] input[type="checkbox"], input[aria-label*="select all" i], [role="checkbox"][aria-label*="select all" i]');
  if (!control) {
    throw new Error(`No select-all control was found for collection: ${collectionQuery ?? collection.label ?? collection.selector}`);
  }
  const result = setRowSelectionState(control, desiredState);
  return {
    selector: buildElementSelector(control),
    collection,
    desiredState,
    ...result
  };
}

export function clickDomCollectionRowAction(
  collectionQuery: string | undefined,
  rowQuery: string,
  actionQuery: string | undefined,
  frameSelectors?: string[],
  exact = false
) {
  const result = listDomCollectionRowActions(collectionQuery, rowQuery, frameSelectors, exact);
  const action = actionQuery
    ? result.actions.find((entry) => matchesLooseQuery([entry.label, entry.selector, entry.actionableType], actionQuery, exact))
    : result.actions[0];
  if (!action?.selector) {
    throw new Error(actionQuery ? `No row action matched query: ${actionQuery}` : `No row actions available for row: ${rowQuery}`);
  }
  const clicked = clickDomElement(action.selector, frameSelectors);
  return {
    ...clicked,
    collection: result.collection,
    row: result.row,
    action
  };
}

export function getDomCollectionRowDetails(
  collectionQuery: string | undefined,
  rowQuery: string,
  frameSelectors?: string[],
  exact = false
) {
  const { collection, rows } = listDomCollectionRows(collectionQuery, 500, frameSelectors, exact);
  const row = matchDomCollectionRow(rows, rowQuery, exact);
  if (!row) {
    throw new Error(`No collection row matched query: ${rowQuery}`);
  }
  return {
    collection,
    row,
    expanded: Boolean(row.expanded),
    detailText: row.detailText
  };
}

export function toggleDomCollectionRowExpansion(
  collectionQuery: string | undefined,
  rowQuery: string,
  desiredState: 'open' | 'closed' | 'toggle' = 'toggle',
  frameSelectors?: string[],
  exact = false
) {
  const details = getDomCollectionRowDetails(collectionQuery, rowQuery, frameSelectors, exact);
  const rowElement = findDomCollectionRowElement(details.row, frameSelectors);
  if (!rowElement) {
    throw new Error(`Matched row is no longer present in the DOM: ${rowQuery}`);
  }
  const trigger = rowElement.querySelector<HTMLElement>('summary, [aria-expanded], [data-expanded], button[aria-controls]');
  if (!trigger) {
    throw new Error(`No expandable control was found for row: ${rowQuery}`);
  }
  const expanded = trigger.getAttribute('aria-expanded') === 'true'
    || trigger.getAttribute('data-expanded') === 'true'
    || trigger.closest('details')?.open
    || false;
  if (desiredState === 'open' && expanded) {
    return { collection: details.collection, row: details.row, desiredState, changed: false, expanded: true };
  }
  if (desiredState === 'closed' && !expanded) {
    return { collection: details.collection, row: details.row, desiredState, changed: false, expanded: false };
  }
  const result = clickDomElement(buildElementSelector(trigger), frameSelectors);
  return {
    ...result,
    collection: details.collection,
    row: details.row,
    desiredState,
    changed: true
  };
}

function inferPaginationOptionKind(label?: string) {
  const normalized = (label || '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (/^next\b|›|»/.test(normalized)) return 'next';
  if (/^prev|^previous\b|‹|«/.test(normalized)) return 'previous';
  if (/^first\b/.test(normalized)) return 'first';
  if (/^last\b/.test(normalized)) return 'last';
  if (/load more|show more|more results|more\b/.test(normalized)) return 'load_more';
  if (/^\d+$/.test(normalized)) return 'page';
  return 'unknown';
}

export function listDomPaginations(limit = 20, frameSelectors?: string[]): DomPaginationSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('nav[aria-label*="pagination" i], .pagination, [data-pagination], [role="navigation"], [aria-label*="pager" i]'))
    .filter((element) => isVisibleElement(element));
  const paginations = candidates.map((container) => {
    const options = Array.from(container.querySelectorAll<HTMLElement>('a[href], button, [role="button"], [role="link"], [aria-current], [data-page], li'))
      .filter((element) => isVisibleElement(element))
      .map((element) => {
        const label = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim() || undefined;
        return {
          selector: buildElementSelector(element),
          label,
          disabled: (element as HTMLButtonElement).disabled || element.getAttribute('aria-disabled') === 'true',
          active: element.getAttribute('aria-current') === 'page' || element.getAttribute('aria-selected') === 'true' || element.classList.contains('active'),
          kind: inferPaginationOptionKind(label)
        } satisfies DomPaginationOptionSummary;
      })
      .filter((entry, index, array) => entry.label && array.findIndex((candidate) => candidate.selector === entry.selector) === index);
    return {
      selector: buildElementSelector(container),
      frameSelectors,
      label: (
        container.getAttribute('aria-label')
        || container.querySelector('h1, h2, h3, h4, strong, [data-label]')?.textContent
        || ''
      ).trim() || undefined,
      options
    } satisfies DomPaginationSummary;
  }).filter((entry) => entry.options.length > 0);
  return paginations.slice(0, limit);
}

export function clickDomPagination(
  query: string,
  frameSelectors?: string[],
  exact = false
) {
  const paginations = listDomPaginations(50, frameSelectors);
  const matches = paginations.flatMap((pagination) => pagination.options.map((option) => ({ pagination, option })));
  const matched = matches.find(({ pagination, option }) =>
    matchesLooseQuery([option.label, option.selector, pagination.label, pagination.selector, option.kind], query, exact)
  );
  if (!matched) {
    throw new Error(`No pagination control matched query: ${query}`);
  }
  const result = clickDomElement(matched.option.selector, frameSelectors);
  return {
    ...result,
    pagination: matched.pagination,
    option: matched.option
  };
}

export function clickDomLoadMore(
  query: string | undefined,
  frameSelectors?: string[],
  exact = false
) {
  const root = withVisibleDocRoot(frameSelectors);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('button, a[href], [role="button"]'))
    .filter((element) => isVisibleElement(element));
  const target = candidates.find((element) => {
    const label = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
    if (query) {
      return matchesLooseQuery([label, buildElementSelector(element)], query, exact);
    }
    return /load more|show more|more results|view more/i.test(label);
  });
  if (!target) {
    throw new Error(query ? `No load-more control matched query: ${query}` : 'No visible load-more control found');
  }
  const result = clickDomElement(buildElementSelector(target), frameSelectors);
  return {
    ...result,
    label: (target.innerText || target.textContent || '').replace(/\s+/g, ' ').trim() || undefined
  };
}

function collectCollectionContextControls(container: HTMLElement, frameSelectors?: string[]) {
  const scope = container.closest('section, article, main, form, div, aside') ?? container.parentElement ?? container;
  const controls = Array.from(scope.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, button, th, [role="button"], [aria-sort]'))
    .filter((element) => isVisibleElement(element));
  return controls
    .filter((element) => element !== container && !container.contains(element) || element.matches('th,[aria-sort]'))
    .map((element) => {
      const label = (
        element.getAttribute('aria-label')
        || element.getAttribute('placeholder')
        || element.closest('label')?.textContent
        || element.textContent
        || ''
      ).replace(/\s+/g, ' ').trim() || undefined;
      const normalized = (label || '').toLowerCase();
      let controlType: DomCollectionControlSummary['controlType'] = 'filter';
      if (/search/.test(normalized)) {
        controlType = 'search';
      } else if (/sort|order|name|date|status|price|created|updated/.test(normalized) || element.hasAttribute('aria-sort') || element.tagName === 'TH') {
        controlType = 'sort';
      }
      const fieldType: DomCollectionControlSummary['fieldType'] =
        element instanceof HTMLInputElement ? 'input'
          : element instanceof HTMLSelectElement ? 'select'
            : element.tagName === 'TH' ? 'header'
              : 'button';
      const value = element instanceof HTMLInputElement || element instanceof HTMLSelectElement
        ? (element.value || '').trim() || undefined
        : undefined;
      const sortDirection = element.getAttribute('aria-sort') === 'ascending'
        ? 'ascending'
        : element.getAttribute('aria-sort') === 'descending'
          ? 'descending'
          : element.hasAttribute('aria-sort') && element.getAttribute('aria-sort') !== 'none'
            ? 'other'
            : undefined;
      const active = Boolean(
        (value && value.length > 0)
        || sortDirection
        || element.getAttribute('aria-pressed') === 'true'
        || element.getAttribute('aria-selected') === 'true'
        || element.classList.contains('active')
        || element.classList.contains('selected')
      );
      const disabled = element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true';
      const options = element instanceof HTMLSelectElement
        ? Array.from(element.options).map((option) => option.textContent?.trim() || option.value).filter(Boolean)
        : undefined;
      return {
        selector: buildElementSelector(element),
        collectionSelector: buildElementSelector(container),
        frameSelectors,
        label,
        controlType,
        fieldType,
        options,
        value,
        active,
        disabled,
        sortDirection
      } satisfies DomCollectionControlSummary;
    })
    .filter((entry, index, array) => Boolean(entry.label) && array.findIndex((candidate) => candidate.selector === entry.selector) === index);
}

function collectCollectionFilterTokens(container: HTMLElement, frameSelectors?: string[]) {
  const scope = container.closest('section, article, main, form, div, aside') ?? container.parentElement ?? container;
  const candidates = Array.from(scope.querySelectorAll<HTMLElement>(
    [
      '[aria-pressed="true"]',
      '[aria-selected="true"]',
      '[data-active="true"]',
      '[data-state="active"]',
      '.active',
      '.selected',
      '.chip',
      '.pill',
      '.tag',
      '.badge',
      '[role="option"][aria-selected="true"]',
      '[data-filter-chip]',
      '[data-chip]'
    ].join(', ')
  )).filter((element) => isVisibleElement(element));
  return candidates
    .filter((element) => element !== container && !container.contains(element))
    .map((element) => {
      const label = (
        element.getAttribute('aria-label')
        || element.innerText
        || element.textContent
        || ''
      ).replace(/\s+/g, ' ').trim() || undefined;
      const remove = element.querySelector<HTMLElement>(
        'button,[role="button"],[aria-label*="remove" i],[aria-label*="clear" i],[aria-label*="close" i],.remove,.clear,.close'
      );
      return {
        selector: buildElementSelector(element),
        collectionSelector: buildElementSelector(container),
        frameSelectors,
        label,
        value: label,
        removable: Boolean(remove) || element.matches('button,[role="button"]'),
        removeSelector: remove ? buildElementSelector(remove) : undefined
      } satisfies DomCollectionFilterTokenSummary;
    })
    .filter((entry, index, array) => Boolean(entry.label) && array.findIndex((candidate) => candidate.selector === entry.selector) === index);
}

export function listDomCollectionControls(
  collectionQuery: string | undefined,
  limit = 20,
  frameSelectors?: string[],
  exact = false
) {
  const collections = listDomCollections(50, frameSelectors);
  const targets = collectionQuery
    ? collections.filter((entry) => matchesLooseQuery([entry.label, entry.selector], collectionQuery, exact))
    : collections;
  const controls = targets.flatMap((collection) => {
    const root = findInFrameScope(collection.selector, frameSelectors) as HTMLElement | null;
    if (!root) {
      return [];
    }
    return collectCollectionContextControls(root, frameSelectors);
  });
  return controls.slice(0, limit);
}

export function listDomCollectionFilterTokens(
  collectionQuery: string | undefined,
  limit = 20,
  frameSelectors?: string[],
  exact = false
) {
  const collections = listDomCollections(50, frameSelectors);
  const targets = collectionQuery
    ? collections.filter((entry) => matchesLooseQuery([entry.label, entry.selector], collectionQuery, exact))
    : collections;
  const tokens = targets.flatMap((collection) => {
    const root = findInFrameScope(collection.selector, frameSelectors) as HTMLElement | null;
    if (!root) {
      return [];
    }
    return collectCollectionFilterTokens(root, frameSelectors);
  });
  return tokens.slice(0, limit);
}

export function applyDomCollectionSort(
  collectionQuery: string | undefined,
  valueQuery: string,
  frameSelectors?: string[],
  exact = false
) {
  const controls = listDomCollectionControls(collectionQuery, 50, frameSelectors, exact)
    .filter((entry) => entry.controlType === 'sort');
  const control = controls.find((entry) =>
    matchesLooseQuery([entry.label, ...(entry.options ?? [])], valueQuery, exact)
    || matchesLooseQuery([entry.label], valueQuery, exact)
  );
  if (!control?.selector) {
    throw new Error(`No collection sort control matched query: ${valueQuery}`);
  }
  if (control.fieldType === 'select') {
    const result = selectDomOption(control.selector, valueQuery, 'text', frameSelectors);
    return { ...result, control, value: valueQuery };
  }
  const result = clickDomElement(control.selector, frameSelectors);
  return { ...result, control, value: valueQuery };
}

export function applyDomCollectionFilter(
  collectionQuery: string | undefined,
  query: string,
  value: string,
  frameSelectors?: string[],
  exact = false
) {
  const controls = listDomCollectionControls(collectionQuery, 50, frameSelectors, exact)
    .filter((entry) => entry.controlType === 'filter' || entry.controlType === 'search');
  const control = controls.find((entry) =>
    matchesLooseQuery([entry.label, entry.selector], query, exact)
  );
  if (!control?.selector) {
    throw new Error(`No collection filter control matched query: ${query}`);
  }
  if (control.fieldType === 'select') {
    const result = selectDomOption(control.selector, value, 'text', frameSelectors);
    return { ...result, control, query, value };
  }
  const result = fillSingleField(control.selector, value, frameSelectors);
  return { ...result, control, query, value };
}

export function clearDomCollectionFilter(
  collectionQuery: string | undefined,
  query: string,
  frameSelectors?: string[],
  exact = false
) {
  const controls = listDomCollectionControls(collectionQuery, 50, frameSelectors, exact)
    .filter((entry) => entry.controlType === 'filter' || entry.controlType === 'search');
  const control = controls.find((entry) =>
    matchesLooseQuery([entry.label, entry.selector], query, exact)
  );
  if (!control?.selector) {
    throw new Error(`No collection filter control matched query: ${query}`);
  }
  if (control.fieldType === 'select') {
    const field = findInFrameScope(control.selector, frameSelectors);
    if (!(field instanceof HTMLSelectElement)) {
      throw new Error(`Collection filter "${query}" is not a select element`);
    }
    const blankOption = Array.from(field.options).find((option) => !option.value || !option.textContent?.trim());
    field.value = blankOption?.value ?? field.options[0]?.value ?? '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return { selector: control.selector, control, cleared: true, value: field.value };
  }
  if (control.fieldType === 'button') {
    const result = clickDomElement(control.selector, frameSelectors);
    return { ...result, control, cleared: true, value: '' };
  }
  const result = fillSingleField(control.selector, '', frameSelectors);
  return { ...result, control, cleared: true, value: '' };
}

export function clearDomCollectionFilterToken(
  collectionQuery: string | undefined,
  query: string,
  frameSelectors?: string[],
  exact = false
) {
  const tokens = listDomCollectionFilterTokens(collectionQuery, 100, frameSelectors, exact);
  const token = tokens.find((entry) =>
    matchesLooseQuery([entry.label, entry.value, entry.selector], query, exact)
  );
  if (!token?.selector) {
    throw new Error(`No collection filter token matched query: ${query}`);
  }
  if (token.removeSelector) {
    const result = clickDomElement(token.removeSelector, frameSelectors);
    return { ...result, token, cleared: true };
  }
  const result = clickDomElement(token.selector, frameSelectors);
  return { ...result, token, cleared: true };
}

export function setDomRangeByQuery(
  query: string,
  value: string,
  frameSelectors?: string[],
  exact = false,
  preferredFormSelector?: string
) {
  const field = findDomFormField(query, frameSelectors, exact, preferredFormSelector);
  if ((field.type || '').toLowerCase() !== 'range' && field.fieldType !== 'input') {
    throw new Error(`Form field matched "${query}" but is not a range input`);
  }
  const result = fillSingleField(field.selector, value, frameSelectors);
  return {
    ...result,
    matchedBy: field.matchedBy,
    query
  };
}

export function setDomTypedFieldByQuery(
  query: string,
  value: string,
  expectedType: 'date' | 'time' | 'datetime-local',
  frameSelectors?: string[],
  exact = false,
  preferredFormSelector?: string
) {
  const field = findDomFormField(query, frameSelectors, exact, preferredFormSelector);
  const actualType = (field.type || '').toLowerCase();
  if (actualType !== expectedType) {
    throw new Error(`Form field matched "${query}" but is not a ${expectedType} input`);
  }
  const result = fillSingleField(field.selector, value, frameSelectors);
  return {
    ...result,
    matchedBy: field.matchedBy,
    query,
    expectedType
  };
}

function candidateToggleElements(root: ParentNode) {
  return Array.from(root.querySelectorAll(
    'input[type="checkbox"], [role="switch"], [aria-checked], button[aria-pressed], [data-state]'
  )).filter((element) => isVisibleElement(element));
}

function readToggleState(element: Element) {
  if (element instanceof HTMLInputElement) {
    return element.checked;
  }
  const ariaChecked = element.getAttribute('aria-checked');
  if (ariaChecked === 'true') return true;
  if (ariaChecked === 'false') return false;
  const ariaPressed = element.getAttribute('aria-pressed');
  if (ariaPressed === 'true') return true;
  if (ariaPressed === 'false') return false;
  const dataState = element.getAttribute('data-state');
  if (typeof dataState === 'string') {
    if (['checked', 'on', 'active', 'open'].includes(dataState)) return true;
    if (['unchecked', 'off', 'inactive', 'closed'].includes(dataState)) return false;
  }
  return undefined;
}

export function toggleDomControl(
  query: string,
  desiredState: 'on' | 'off' | 'toggle' = 'toggle',
  frameSelectors?: string[],
  exact = false,
  preferredFormSelector?: string
): DomToggleResult {
  const root = withVisibleDocRoot(frameSelectors);
  const normalized = query.trim().toLowerCase();
  const candidates = candidateToggleElements(root)
    .sort((left, right) => {
      const leftForm = (left as HTMLElement).closest('form');
      const rightForm = (right as HTMLElement).closest('form');
      const leftPreferred = preferredFormSelector && leftForm instanceof HTMLFormElement && buildFormSelector(leftForm) === preferredFormSelector ? 1 : 0;
      const rightPreferred = preferredFormSelector && rightForm instanceof HTMLFormElement && buildFormSelector(rightForm) === preferredFormSelector ? 1 : 0;
      return rightPreferred - leftPreferred;
    });
  const match = candidates.find((element) => {
    const labels = readAssociatedLabels(element);
    const text = ((element as HTMLElement).innerText || (element as HTMLElement).textContent || '').trim();
    const selector = buildElementSelector(element);
    const values = [text, selector, ...labels].filter(Boolean).map((value) => value.trim().toLowerCase());
    return values.some((value) => exact ? value === normalized : value.includes(normalized));
  });
  if (!match) {
    throw new Error(`No toggle control matched query: ${query}`);
  }
  const before = readToggleState(match);
  let changed = false;
  if (
    desiredState === 'toggle'
    || (desiredState === 'on' && before !== true)
    || (desiredState === 'off' && before !== false)
  ) {
    if (match instanceof HTMLInputElement && (match.type || '').toLowerCase() === 'checkbox') {
      const nextChecked = desiredState === 'toggle' ? !Boolean(before) : desiredState === 'on';
      setCheckedState(match, nextChecked);
    } else {
      clickElementLikeUser(match as HTMLElement);
    }
    changed = true;
  }
  const after = readToggleState(match);
  return {
    ...summarizeElement(match, buildElementSelector(match)),
    selector: buildElementSelector(match),
    frameSelectors,
    checked: after,
    desiredState,
    changed
  };
}

export function readDomPageState(
  limit = 20,
  frameSelectors?: string[],
  selector?: string,
  maxDepth = 3,
  maxChildren = 12
): DomPageStateSummary {
  return {
    selector,
    frameSelectors,
    snapshot: buildDomSnapshot(6000),
    forms: listDomFormContexts(limit, frameSelectors),
    banners: listDomBanners(limit, frameSelectors),
    loadingStates: listDomLoadingStates(limit, frameSelectors),
    emptyStates: listDomEmptyStates(limit, frameSelectors),
    actionables: listDomActionables(limit, frameSelectors, selector),
    links: collectDomLinks(limit, frameSelectors),
    domTree: buildDomTree(selector, frameSelectors, maxDepth, maxChildren)
  };
}

export function findDomFormField(
  query: string,
  frameSelectors?: string[],
  exact = false,
  preferredFormSelector?: string
): DomFormFieldLookupResult {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    throw new Error('A label or field query is required');
  }
  const preferredForm = preferredFormSelector?.trim().toLowerCase();
  const fields = listDomFormFields(200, frameSelectors).sort((left, right) => {
    const leftPreferred = preferredForm && left.formSelector?.toLowerCase() === preferredForm ? 1 : 0;
    const rightPreferred = preferredForm && right.formSelector?.toLowerCase() === preferredForm ? 1 : 0;
    return rightPreferred - leftPreferred;
  });
  const predicate = (value?: string) => {
    if (!value) {
      return false;
    }
    const candidate = value.trim().toLowerCase();
    return exact ? candidate === normalized : candidate.includes(normalized);
  };
  for (const field of fields) {
    if (field.labels?.some(predicate)) {
      return { ...field, matchedBy: 'label', query };
    }
    if (predicate(field.name)) {
      return { ...field, matchedBy: 'name', query };
    }
    if (predicate(field.placeholder)) {
      return { ...field, matchedBy: 'placeholder', query };
    }
    if (predicate(field.text)) {
      return { ...field, matchedBy: 'selector', query };
    }
    const ariaLabel = field.selector.match(/\[aria-label="([^"]+)"\]/)?.[1];
    if (predicate(ariaLabel)) {
      return { ...field, matchedBy: 'aria-label', query };
    }
  }
  throw new Error(`No form field matched query: ${query}`);
}

export function fillDomFormFieldByLabel(
  query: string,
  value: string,
  frameSelectors?: string[],
  exact = false,
  preferredFormSelector?: string
): DomFormFieldFillResult & { matchedBy: DomFormFieldLookupResult['matchedBy']; query: string } {
  const field = findDomFormField(query, frameSelectors, exact, preferredFormSelector);
  const result = fillSingleField(field.selector, value, frameSelectors);
  return {
    ...result,
    matchedBy: field.matchedBy,
    query
  };
}

export function listDomSelectOptions(
  selector: string,
  frameSelectors?: string[],
  limit = 100
): DomSelectOptionSummary[] {
  const root = withVisibleDocRoot(frameSelectors);
  const element = findPreferredElement(selector, root);
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Element is not a select for selector: ${selector}`);
  }
  return Array.from(element.options)
    .slice(0, limit)
    .map((option, index) => ({
      index,
      text: option.text.trim(),
      value: option.value,
      selected: option.selected,
      disabled: option.disabled
    }));
}

export function selectDomOption(
  selector: string,
  optionQuery: string,
  by: 'text' | 'value' | 'label' = 'text',
  frameSelectors?: string[]
): DomSelectOptionPickResult {
  const root = withVisibleDocRoot(frameSelectors);
  const element = findPreferredElement(selector, root);
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Element is not a select for selector: ${selector}`);
  }
  const normalized = optionQuery.trim().toLowerCase();
  const options = Array.from(element.options);
  const option = options.find((entry) => {
    if (by === 'value') {
      return entry.value.trim().toLowerCase() === normalized;
    }
    if (by === 'label') {
      return entry.label.trim().toLowerCase() === normalized;
    }
    return entry.text.trim().toLowerCase() === normalized;
  });
  if (!option) {
    throw new Error(`No option matched ${by} "${optionQuery}" for selector: ${selector}`);
  }
  element.value = option.value;
  option.selected = true;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  return {
    ...summarizeElement(element, selector),
    selector,
    frameSelectors,
    filled: true,
    option: {
      index: options.indexOf(option),
      text: option.text.trim(),
      value: option.value,
      selected: option.selected,
      disabled: option.disabled
    }
  };
}

function findSubmitControl(root?: ParentNode | null) {
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    '[role="button"][data-testid*="submit" i]',
    'button[aria-label*="submit" i]',
    'button[aria-label*="save" i]',
    'button[aria-label*="send" i]',
    'button[aria-label*="search" i]'
  ];
  const candidateRoots = [root, document].filter(Boolean) as ParentNode[];
  for (const candidateRoot of candidateRoots) {
    for (const selector of submitSelectors) {
      const match = Array.from(candidateRoot.querySelectorAll(selector))
        .find((element) => isVisibleElement(element) && !(element as HTMLButtonElement).disabled);
      if (match instanceof HTMLElement) {
        return { element: match, selector };
      }
    }
    const textMatch = Array.from(candidateRoot.querySelectorAll<HTMLElement>('button,[role="button"],input[type="button"]'))
      .find((element) => {
        if (!isVisibleElement(element) || (element as HTMLButtonElement).disabled) {
          return false;
        }
        const text = (element.innerText || element.textContent || (element as HTMLInputElement).value || '').trim().toLowerCase();
        return ['submit', 'save', 'send', 'search', 'continue', 'next', 'log in', 'sign in'].includes(text);
      });
    if (textMatch) {
      return { element: textMatch, selector: undefined };
    }
  }
  return undefined;
}

export async function submitDomForm(selector?: string): Promise<DomFormSubmitResult> {
  return submitDomFormInFrame(selector, undefined);
}

export async function submitDomFormInFrame(selector?: string, frameSelectors?: string[]): Promise<DomFormSubmitResult> {
  const root = withVisibleDocRoot(frameSelectors);
  const activeElement = root.activeElement instanceof HTMLElement ? root.activeElement : undefined;
  if (activeElement) {
    dispatchBlurCommit(activeElement);
    await waitForAnimationFrame();
  }
  if (selector) {
    const clicked = await clickDomElementHuman(selector, frameSelectors);
    return {
      submitted: true,
      method: 'click',
      selector: clicked.selector,
      formAction: (root.querySelector(selector)?.closest('form') as HTMLFormElement | null)?.getAttribute('action') || undefined
    };
  }

  const activeForm = activeElement?.closest('form') ?? undefined;
  const submitControl = findSubmitControl(activeForm ?? activeElement?.parentElement ?? root);
  if (submitControl?.element) {
    await clickDomElementHuman(buildElementSelector(submitControl.element), frameSelectors);
    return {
      submitted: true,
      method: 'click',
      selector: submitControl.selector,
      formAction: submitControl.element.closest('form')?.getAttribute('action') || undefined
    };
  }

  if (activeForm instanceof HTMLFormElement) {
    if (typeof activeForm.requestSubmit === 'function') {
      activeForm.requestSubmit();
      return {
        submitted: true,
        method: 'requestSubmit',
        formAction: activeForm.getAttribute('action') || undefined
      };
    }
    activeForm.submit();
    return {
      submitted: true,
      method: 'submit',
      formAction: activeForm.getAttribute('action') || undefined
    };
  }

  const anyForm = root.querySelector('form');
  if (anyForm instanceof HTMLFormElement) {
    if (typeof anyForm.requestSubmit === 'function') {
      anyForm.requestSubmit();
      return {
        submitted: true,
        method: 'requestSubmit',
        formAction: anyForm.getAttribute('action') || undefined
      };
    }
    anyForm.submit();
    return {
      submitted: true,
      method: 'submit',
      formAction: anyForm.getAttribute('action') || undefined
    };
  }

  throw new Error('No visible submit control or form was found');
}

function readMetricNumber(text: string | undefined) {
  if (!text) {
    return undefined;
  }
  const normalized = text.replace(/,/g, '').trim().toLowerCase();
  const match = normalized.match(/^([\d.]+)(k|m)?$/);
  if (!match) {
    return undefined;
  }
  const value = Number.parseFloat(match[1]!);
  if (!Number.isFinite(value)) {
    return undefined;
  }
  if (match[2] === 'k') {
    return Math.round(value * 1000);
  }
  if (match[2] === 'm') {
    return Math.round(value * 1_000_000);
  }
  return Math.round(value);
}

export function collectXSearchPostsFromDom(limit = 10): DomXPostSummary[] {
  const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]')).slice(0, limit);
  return articles.map((article, index) => {
    const permalink = article.querySelector<HTMLAnchorElement>('a[href*="/status/"]');
    const time = article.querySelector<HTMLTimeElement>('time');
    const handleLink = Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href^="/"]'))
      .find((link) => /^\/[A-Za-z0-9_]{1,15}$/.test(new URL(link.href, location.origin).pathname));
    const authorHandle = handleLink?.pathname?.replace(/^\//, '');
    const authorName = handleLink?.textContent?.trim()
      || article.querySelector<HTMLElement>('[data-testid="User-Name"] span')?.textContent?.trim()
      || undefined;
    const text = Array.from(article.querySelectorAll<HTMLElement>('[data-testid="tweetText"]'))
      .map((node) => node.innerText.trim())
      .filter(Boolean)
      .join('\n\n');
    const metricElements = Array.from(article.querySelectorAll<HTMLElement>('[role="group"] [data-testid]'));
    const readMetric = (testId: string) => {
      const target = metricElements.find((node) => node.dataset.testid === testId);
      return readMetricNumber(target?.textContent?.trim());
    };
    const viewMetric = Array.from(article.querySelectorAll<HTMLElement>('a[aria-label*="View"], a[href*="/analytics"] span'))
      .map((node) => node.textContent?.trim())
      .find((value) => Boolean(value));

    return {
      id: permalink?.href || `tweet_${index}`,
      url: permalink?.href,
      authorName,
      authorHandle,
      text,
      timestamp: time?.dateTime,
      replyCount: readMetric('reply'),
      repostCount: readMetric('retweet'),
      likeCount: readMetric('like'),
      viewCount: viewMetric
    };
  }).filter((entry) => entry.text.length > 0 || entry.url);
}
