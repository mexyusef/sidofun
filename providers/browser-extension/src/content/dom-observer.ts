import { SIDOFUN_BROWSER_EXTENSION_PROTOCOL } from '../protocol.js';

let domObserverInstalled = false;
let pendingMutationRecords: MutationRecord[] = [];
let flushMutationTimer: ReturnType<typeof setTimeout> | undefined;

function buildTargetSelector(node: Element) {
  const html = node as HTMLElement;
  if (html.id) {
    return `#${html.id}`;
  }
  const classes = (html.className || '')
    .toString()
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 2);
  const classSuffix = classes.length > 0 ? `.${classes.join('.')}` : '';
  return `${node.tagName.toLowerCase()}${classSuffix}`;
}

function flushPendingDomMutations() {
  const records = pendingMutationRecords.splice(0, pendingMutationRecords.length);
  flushMutationTimer = undefined;
  if (records.length === 0) {
    return;
  }
  const target = records.find((record) => record.target instanceof Element)?.target as Element | undefined;
  const attributeNames = Array.from(new Set(records
    .map((record) => record.attributeName)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)));
  const textSample = records
    .map((record) => (record.target instanceof HTMLElement ? record.target.innerText || record.target.textContent : record.target.textContent) ?? '')
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .find((value) => value.length > 0)
    ?.slice(0, 240);
  void chrome.runtime.sendMessage({
    protocol: SIDOFUN_BROWSER_EXTENSION_PROTOCOL,
    kind: 'dom_event',
    event: {
      url: location.href,
      types: Array.from(new Set(records.map((record) => record.type))),
      targetTagName: target?.tagName?.toLowerCase(),
      targetSelector: target ? buildTargetSelector(target) : undefined,
      addedNodeCount: records.reduce((sum, record) => sum + record.addedNodes.length, 0),
      removedNodeCount: records.reduce((sum, record) => sum + record.removedNodes.length, 0),
      attributeNames,
      textSample,
      timestamp: new Date().toISOString()
    }
  }).catch(() => undefined);
}

export function installDomObserver() {
  if (domObserverInstalled || !document.documentElement) {
    return;
  }
  domObserverInstalled = true;
  const observer = new MutationObserver((records) => {
    pendingMutationRecords.push(...records);
    if (flushMutationTimer) {
      return;
    }
    flushMutationTimer = setTimeout(flushPendingDomMutations, 400);
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'aria-hidden', 'aria-busy', 'disabled']
  });
}
