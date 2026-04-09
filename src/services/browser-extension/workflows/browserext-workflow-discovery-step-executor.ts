import {
  getBrowserExtensionWorkflowOutput,
} from './browserext-workflow-output.js';
import type { BrowserExtensionWorkflowRuntimeState } from './browserext-workflow-execution-state.js';

type DiscoveryStepDeps = {
  withTransientRetry: <T>(fn: () => Promise<T>) => Promise<T>;
  browserExtensionService: any;
  markdown: (selector: unknown, timeoutMs?: number, frameSelectors?: string[]) => Promise<Record<string, unknown>>;
  readability: (selector: unknown, timeoutMs?: number, frameSelectors?: string[]) => Promise<Record<string, unknown>>;
  metadata: (timeoutMs?: number) => Promise<Record<string, unknown>>;
  urlParts: (timeoutMs?: number) => Promise<Record<string, unknown>>;
  listStorage: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  getStorage: (key: string, options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  setStorage: (key: string, value: unknown, options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  removeStorage: (key: string, options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  cookies: (targetUrl: unknown, timeoutMs?: number) => Promise<Record<string, unknown>>;
  getCookie: (name: string, options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  setCookie: (name: string, value: unknown, options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  removeCookie: (name: string, options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  downloads: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  pageBlockers: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  pageOutcomes: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  pageReady: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  pageRecover: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  contextState: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  listActiveCollectionFilters: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  listCollectionFilterTokens: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  listCollectionSortState: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  findCollectionRows: (options: any) => Promise<Record<string, unknown>>;
  getCollectionValues: (options: any) => Promise<Record<string, unknown>>;
  diffCollectionValues: (options: any) => Promise<Record<string, unknown>>;
  getCollectionStats: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  diffCollectionStats: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  getCollectionRow: (options: any) => Promise<Record<string, unknown>>;
  getCollectionCell: (options: any) => Promise<Record<string, unknown>>;
  waitCollectionRow: (options: any) => Promise<Record<string, unknown>>;
  waitCollectionCount: (options: any) => Promise<Record<string, unknown>>;
  bulkCollectionAction: (options: any) => Promise<Record<string, unknown>>;
  exportCollection: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  diffCollection: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  waitCollectionDiff: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  matchCollectionDiff: (result: Record<string, unknown>, expected: Record<string, unknown>, exact?: boolean) => boolean;
  harvestCollection: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  matchesQuery: (value: string | undefined, query: string, exact?: boolean) => boolean;
  extractComparable: (value: unknown) => string;
};

type DiscoveryStepContext = {
  sessionId: string;
  step: Record<string, unknown> & { kind: string };
  defaults: Record<string, unknown>;
  exact?: boolean;
  effectiveFrameSelectors?: string[];
  preferredFormSelector?: string;
  contextQuery?: string;
  frameQuery?: string;
  runtimeState?: BrowserExtensionWorkflowRuntimeState;
};

function againstOutputValue(
  runtimeState: BrowserExtensionWorkflowRuntimeState | undefined,
  step: Record<string, unknown>
): Record<string, unknown> | undefined {
  return typeof step.againstOutput === 'string'
    ? getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined
    : undefined;
}

export async function executeBrowserExtensionWorkflowDiscoveryStep(
  deps: DiscoveryStepDeps,
  context: DiscoveryStepContext
): Promise<Record<string, unknown> | undefined> {
  const { sessionId, step, defaults, exact, effectiveFrameSelectors, preferredFormSelector, contextQuery, frameQuery, runtimeState } = context;
  const timeoutMs = typeof defaults.timeoutMs === 'number' ? defaults.timeoutMs : undefined;
  const intervalMs = typeof defaults.intervalMs === 'number' ? defaults.intervalMs : undefined;
  switch (step.kind) {
    case 'menus':
      return deps.withTransientRetry(() => deps.browserExtensionService.listMenus(sessionId, effectiveFrameSelectors, (step.limit as number | undefined) ?? 20, timeoutMs));
    case 'menu-select':
      return deps.withTransientRetry(() => deps.browserExtensionService.selectMenuOption(sessionId, String(step.option || ''), {
        menuQuery: step.menu,
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs
      }));
    case 'disclosures':
      return deps.withTransientRetry(() => deps.browserExtensionService.listDisclosures(sessionId, effectiveFrameSelectors, (step.limit as number | undefined) ?? 20, timeoutMs));
    case 'disclosure-toggle':
      return deps.withTransientRetry(() => deps.browserExtensionService.toggleDisclosure(sessionId, String(step.query || ''), {
        desiredState: step.desiredState,
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs
      }));
    case 'collections':
      return deps.withTransientRetry(() => deps.browserExtensionService.listCollections(sessionId, effectiveFrameSelectors, (step.limit as number | undefined) ?? 20, timeoutMs));
    case 'collection-active-filters':
      return deps.listActiveCollectionFilters({ collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, limit: (step.limit as number | undefined) ?? 20, exact, timeoutMs });
    case 'collection-filter-tokens':
      return deps.listCollectionFilterTokens({ collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, limit: (step.limit as number | undefined) ?? 20, exact, timeoutMs });
    case 'collection-sort-state':
      return deps.listCollectionSortState({ collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, limit: (step.limit as number | undefined) ?? 20, exact, timeoutMs });
    case 'collection-rows':
      return deps.withTransientRetry(() => deps.browserExtensionService.listCollectionRows(sessionId, {
        collectionQuery: step.collection,
        frameSelectors: effectiveFrameSelectors,
        limit: (step.limit as number | undefined) ?? 20,
        exact,
        timeoutMs
      }));
    case 'collection-find':
      return deps.findCollectionRows({ query: step.query, cellQuery: step.cell, collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs });
    case 'collection-values':
      return deps.getCollectionValues({ cellQuery: step.cell, rowQuery: step.row, collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs });
    case 'collection-values-diff':
      return deps.diffCollectionValues({ cellQuery: step.cell, rowQuery: step.row, collectionQuery: step.collection, againstFile: step.againstFile, againstOutput: againstOutputValue(runtimeState, step), frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs });
    case 'collection-stats':
      return deps.getCollectionStats({ cellQuery: step.cell, collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs });
    case 'collection-stats-diff':
      return deps.diffCollectionStats({ cellQuery: step.cell, collectionQuery: step.collection, againstFile: step.againstFile, againstOutput: againstOutputValue(runtimeState, step), frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs });
    case 'collection-row': {
      const result = await deps.getCollectionRow({ rowQuery: step.row, collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs });
      if (result.found !== true) {
        throw new Error(`No collection row matched query: ${String(step.row || '')}`);
      }
      return result;
    }
    case 'collection-cell': {
      const result = await deps.getCollectionCell({ rowQuery: step.row, cellQuery: step.cell, collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs });
      if (result.found !== true) {
        throw new Error(`No collection cell matched query: ${String(step.cell || '')}`);
      }
      return result;
    }
    case 'wait-collection-row': {
      const result = await deps.waitCollectionRow({ rowQuery: step.row, collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs: typeof step.timeoutMs === 'number' ? step.timeoutMs : timeoutMs, intervalMs: typeof step.intervalMs === 'number' ? step.intervalMs : intervalMs });
      if (result.timedOut === true) {
        throw new Error(`Timed out waiting for collection row: ${String(step.row || '')}`);
      }
      return result;
    }
    case 'wait-collection-count': {
      const result = await deps.waitCollectionCount({ count: step.count, collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs: typeof step.timeoutMs === 'number' ? step.timeoutMs : timeoutMs, intervalMs: typeof step.intervalMs === 'number' ? step.intervalMs : intervalMs });
      if (result.timedOut === true) {
        throw new Error(`Timed out waiting for collection count: ${String(step.count ?? '')}`);
      }
      return result;
    }
    case 'collection-row-actions':
      return deps.withTransientRetry(() => deps.browserExtensionService.listCollectionRowActions(sessionId, { collectionQuery: step.collection, rowQuery: step.row, frameSelectors: effectiveFrameSelectors, exact, timeoutMs }));
    case 'collection-selection-state':
      return deps.withTransientRetry(() => deps.browserExtensionService.getCollectionSelectionState(sessionId, { collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, timeoutMs }));
    case 'collection-click':
      return deps.withTransientRetry(() => deps.browserExtensionService.clickCollectionItem(sessionId, String(step.item || ''), { collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, timeoutMs }));
    case 'collection-row-click':
      return deps.withTransientRetry(() => deps.browserExtensionService.clickCollectionRowAction(sessionId, { collectionQuery: step.collection, rowQuery: step.row, actionQuery: step.action, frameSelectors: effectiveFrameSelectors, exact, timeoutMs }));
    case 'collection-row-select':
      return deps.withTransientRetry(() => deps.browserExtensionService.selectCollectionRow(sessionId, { collectionQuery: step.collection, rowQuery: step.row, desiredState: step.desiredState, frameSelectors: effectiveFrameSelectors, exact, timeoutMs }));
    case 'collection-select-all':
      return deps.withTransientRetry(() => deps.browserExtensionService.selectAllCollectionRows(sessionId, { collectionQuery: step.collection, desiredState: step.desiredState, frameSelectors: effectiveFrameSelectors, exact, timeoutMs }));
    case 'collection-row-details':
      return deps.withTransientRetry(() => deps.browserExtensionService.getCollectionRowDetails(sessionId, { collectionQuery: step.collection, rowQuery: step.row, frameSelectors: effectiveFrameSelectors, exact, timeoutMs }));
    case 'collection-row-expand':
      return deps.withTransientRetry(() => deps.browserExtensionService.expandCollectionRow(sessionId, { collectionQuery: step.collection, rowQuery: step.row, desiredState: step.desiredState, frameSelectors: effectiveFrameSelectors, exact, timeoutMs }));
    case 'assert-collection-cell': {
      const result = await deps.getCollectionCell({ rowQuery: step.row, cellQuery: step.cell, collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, limit: 200, timeoutMs });
      if (step.exists === true && result.found !== true) {
        throw new Error(`Collection cell "${String(step.cell || '')}" was not found in row "${String(step.row || '')}"`);
      }
      if (step.exists === false && result.found === true) {
        throw new Error(`Collection cell "${String(step.cell || '')}" unexpectedly exists in row "${String(step.row || '')}"`);
      }
      const comparable = deps.extractComparable((result.cell as { value?: unknown } | undefined)?.value);
      if (step.equals !== undefined && comparable !== step.equals) {
        throw new Error(`Collection cell "${String(step.cell || '')}" did not equal "${String(step.equals)}"`);
      }
      if (step.includes !== undefined && !comparable.includes(String(step.includes))) {
        throw new Error(`Collection cell "${String(step.cell || '')}" did not include "${String(step.includes)}"`);
      }
      return result;
    }
    case 'assert-collection-selection': {
      const result = await deps.withTransientRetry(() => deps.browserExtensionService.getCollectionSelectionState(sessionId, { collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, timeoutMs })) as Record<string, unknown>;
      const selectedCount = typeof result.selectedCount === 'number' ? result.selectedCount : 0;
      if (typeof step.atLeast === 'number' && selectedCount < step.atLeast) {
        throw new Error(`Collection selection count ${selectedCount} is below required minimum ${step.atLeast}`);
      }
      if (typeof step.atMost === 'number' && selectedCount > step.atMost) {
        throw new Error(`Collection selection count ${selectedCount} exceeds maximum ${step.atMost}`);
      }
      return result;
    }
    case 'assert-collection-detail': {
      const result = await deps.withTransientRetry(() => deps.browserExtensionService.getCollectionRowDetails(sessionId, { collectionQuery: step.collection, rowQuery: step.row, frameSelectors: effectiveFrameSelectors, exact, timeoutMs })) as Record<string, unknown>;
      if (typeof step.expanded === 'boolean' && Boolean(result.expanded) !== step.expanded) {
        throw new Error(`Collection detail expanded state ${String(result.expanded)} did not match ${String(step.expanded)}`);
      }
      if (step.includes && !String(result.detailText ?? '').includes(String(step.includes))) {
        throw new Error(`Collection detail text did not include required text: ${String(step.includes)}`);
      }
      return result;
    }
    case 'assert-collection-values-diff': {
      const result = await deps.diffCollectionValues({ cellQuery: step.cell, rowQuery: step.row, collectionQuery: step.collection, againstFile: step.againstFile, againstOutput: againstOutputValue(runtimeState, step), frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs });
      if (typeof result.countDelta === 'number' && typeof step.countDeltaAtLeast === 'number' && result.countDelta < step.countDeltaAtLeast) {
        throw new Error(`Collection value count delta ${result.countDelta} is below required minimum ${step.countDeltaAtLeast}`);
      }
      if (typeof result.uniqueCountDelta === 'number' && typeof step.uniqueCountDeltaAtLeast === 'number' && result.uniqueCountDelta < step.uniqueCountDeltaAtLeast) {
        throw new Error(`Collection unique value delta ${result.uniqueCountDelta} is below required minimum ${step.uniqueCountDeltaAtLeast}`);
      }
      if (step.addedValue && !(Array.isArray(result.addedValues) && result.addedValues.some((value) => deps.matchesQuery(String(value), String(step.addedValue), exact)))) {
        throw new Error(`Collection values diff did not add required value: ${String(step.addedValue)}`);
      }
      if (step.removedValue && !(Array.isArray(result.removedValues) && result.removedValues.some((value) => deps.matchesQuery(String(value), String(step.removedValue), exact)))) {
        throw new Error(`Collection values diff did not remove required value: ${String(step.removedValue)}`);
      }
      return result;
    }
    case 'assert-collection-stats-diff': {
      const result = await deps.diffCollectionStats({ cellQuery: step.cell, collectionQuery: step.collection, againstFile: step.againstFile, againstOutput: againstOutputValue(runtimeState, step), frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, timeoutMs });
      if (typeof result.countDelta === 'number' && typeof step.countDeltaAtLeast === 'number' && result.countDelta < step.countDeltaAtLeast) {
        throw new Error(`Collection row-count delta ${result.countDelta} is below required minimum ${step.countDeltaAtLeast}`);
      }
      if (typeof result.selectedCountDelta === 'number' && typeof step.selectedDeltaAtLeast === 'number' && result.selectedCountDelta < step.selectedDeltaAtLeast) {
        throw new Error(`Collection selected-count delta ${result.selectedCountDelta} is below required minimum ${step.selectedDeltaAtLeast}`);
      }
      if (typeof result.expandedCountDelta === 'number' && typeof step.expandedDeltaAtLeast === 'number' && result.expandedCountDelta < step.expandedDeltaAtLeast) {
        throw new Error(`Collection expanded-count delta ${result.expandedCountDelta} is below required minimum ${step.expandedDeltaAtLeast}`);
      }
      if (typeof result.detailCountDelta === 'number' && typeof step.detailDeltaAtLeast === 'number' && result.detailCountDelta < step.detailDeltaAtLeast) {
        throw new Error(`Collection detail-count delta ${result.detailCountDelta} is below required minimum ${step.detailDeltaAtLeast}`);
      }
      if (typeof result.rowActionCountDelta === 'number' && typeof step.rowActionDeltaAtLeast === 'number' && result.rowActionCountDelta < step.rowActionDeltaAtLeast) {
        throw new Error(`Collection row-action delta ${result.rowActionCountDelta} is below required minimum ${step.rowActionDeltaAtLeast}`);
      }
      return result;
    }
    case 'collection-bulk-action':
      return deps.bulkCollectionAction({ rowQueries: step.rows, actionQuery: step.action, collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, continueOnError: step.continueOnError, timeoutMs });
    case 'collection-export':
      return deps.exportCollection({ collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, includeSelection: step.includeSelection, includeDetails: step.includeDetails, format: step.format, filePath: step.file, timeoutMs });
    case 'collection-diff':
      return deps.diffCollection({ collectionQuery: step.collection, againstFile: step.againstFile, againstOutput: againstOutputValue(runtimeState, step), frameSelectors: effectiveFrameSelectors, exact, dedupeBy: step.dedupeBy, includeSelection: step.includeSelection, includeDetails: step.includeDetails, timeoutMs });
    case 'wait-collection-diff': {
      const result = await deps.waitCollectionDiff({ collectionQuery: step.collection, againstFile: step.againstFile, againstOutput: againstOutputValue(runtimeState, step), frameSelectors: effectiveFrameSelectors, exact, dedupeBy: step.dedupeBy, includeSelection: step.includeSelection, includeDetails: step.includeDetails, addedAtLeast: step.addedAtLeast, removedAtLeast: step.removedAtLeast, changedAtLeast: step.changedAtLeast, unchangedAtLeast: step.unchangedAtLeast, rowAdded: step.rowAdded, rowRemoved: step.rowRemoved, rowChanged: step.rowChanged, timeoutMs: typeof step.timeoutMs === 'number' ? step.timeoutMs : timeoutMs, intervalMs: typeof step.intervalMs === 'number' ? step.intervalMs : intervalMs }) as Record<string, unknown>;
      if (result.timedOut === true) {
        throw new Error('Timed out waiting for collection diff conditions');
      }
      return result;
    }
    case 'assert-collection-diff': {
      const result = await deps.diffCollection({ collectionQuery: step.collection, againstFile: step.againstFile, againstOutput: againstOutputValue(runtimeState, step), frameSelectors: effectiveFrameSelectors, exact, dedupeBy: step.dedupeBy, includeSelection: step.includeSelection, includeDetails: step.includeDetails, timeoutMs }) as Record<string, unknown>;
      if (!deps.matchCollectionDiff(result, { addedAtLeast: step.addedAtLeast, removedAtLeast: step.removedAtLeast, changedAtLeast: step.changedAtLeast, unchangedAtLeast: step.unchangedAtLeast, rowAdded: step.rowAdded, rowRemoved: step.rowRemoved, rowChanged: step.rowChanged }, exact)) {
        throw new Error('Collection diff did not match expected mutation conditions');
      }
      return result;
    }
    case 'collection-harvest':
      return deps.harvestCollection({ collectionQuery: step.collection, strategy: step.strategy, frameSelectors: effectiveFrameSelectors, exact, limit: step.limit, maxIterations: step.maxIterations, stableIterations: step.stableIterations, settleQuietMs: step.settleQuietMs ?? defaults.settleQuietMs, dedupeBy: step.dedupeBy, scrollAmount: step.scrollAmount, timeoutMs });
    case 'paginations':
      return deps.withTransientRetry(() => deps.browserExtensionService.listPaginations(sessionId, effectiveFrameSelectors, (step.limit as number | undefined) ?? 20, timeoutMs));
    case 'pagination-click':
      return deps.withTransientRetry(() => deps.browserExtensionService.clickPagination(sessionId, String(step.query || ''), { frameSelectors: effectiveFrameSelectors, exact, timeoutMs }));
    case 'load-more':
      return deps.withTransientRetry(() => deps.browserExtensionService.clickLoadMore(sessionId, { query: step.query, frameSelectors: effectiveFrameSelectors, exact, timeoutMs }));
    case 'markdown':
      return deps.withTransientRetry(() => deps.markdown(step.selector, timeoutMs, effectiveFrameSelectors));
    case 'readability':
      return deps.withTransientRetry(() => deps.readability(step.selector, timeoutMs, effectiveFrameSelectors));
    case 'page-state': {
      const result = await deps.withTransientRetry(() => deps.browserExtensionService.pageState(sessionId, {
        selector: step.selector,
        frameSelectors: effectiveFrameSelectors,
        limit: (step.limit as number | undefined) ?? 20,
        maxDepth: step.maxDepth,
        maxChildren: step.maxChildren,
        timeoutMs
      })) as Record<string, unknown>;
      if (runtimeState) {
        runtimeState.lastPageState = result;
      }
      return result;
    }
    case 'metadata':
      return deps.metadata(timeoutMs);
    case 'url-parts':
      return deps.urlParts(timeoutMs);
    case 'storage-list':
      return deps.listStorage({ scope: step.scope, limit: step.limit, timeoutMs });
    case 'storage-get':
      return deps.getStorage(String(step.key || ''), { scope: step.scope, timeoutMs });
    case 'storage-set':
      return deps.setStorage(String(step.key || ''), step.value, { scope: step.scope, timeoutMs });
    case 'storage-remove':
      return deps.removeStorage(String(step.key || ''), { scope: step.scope, timeoutMs });
    case 'cookies':
      return deps.cookies(step.targetUrl, timeoutMs);
    case 'cookie-get':
      return deps.getCookie(String(step.name || ''), { targetUrl: step.targetUrl, timeoutMs });
    case 'cookie-set':
      return deps.setCookie(String(step.name || ''), step.value, { targetUrl: step.targetUrl, domain: step.domain, path: step.path, secure: step.secure, httpOnly: step.httpOnly, sameSite: step.sameSite, expirationDate: step.expirationDate, timeoutMs });
    case 'cookie-remove':
      return deps.removeCookie(String(step.name || ''), { targetUrl: step.targetUrl, timeoutMs });
    case 'downloads':
      return deps.downloads({ query: step.query, state: step.state, limit: (step.limit as number | undefined) ?? 20, exact, timeoutMs });
    case 'page-blockers':
      return deps.pageBlockers({ frameSelectors: effectiveFrameSelectors, limit: (step.limit as number | undefined) ?? 20, timeoutMs });
    case 'page-outcomes':
      return deps.pageOutcomes({ frameSelectors: effectiveFrameSelectors, limit: (step.limit as number | undefined) ?? 20, timeoutMs });
    case 'page-ready':
      return deps.pageReady({ collectionQuery: step.collection, frameSelectors: effectiveFrameSelectors, exact, limit: (step.limit as number | undefined) ?? 20, timeoutMs: typeof step.timeoutMs === 'number' ? step.timeoutMs : timeoutMs, intervalMs: typeof step.intervalMs === 'number' ? step.intervalMs : intervalMs, continueOnError: step.continueOnError });
    case 'page-recover':
      return deps.pageRecover({ frameSelectors: effectiveFrameSelectors, collectionQuery: step.collection, exact, limit: (step.limit as number | undefined) ?? 20, timeoutMs, intervalMs: typeof step.intervalMs === 'number' ? step.intervalMs : intervalMs, continueOnError: step.continueOnError });
    case 'next-actions':
      return deps.withTransientRetry(() => deps.browserExtensionService.suggestNextActions(sessionId, { selector: step.selector, frameSelectors: effectiveFrameSelectors, limit: (step.limit as number | undefined) ?? 20, maxDepth: step.maxDepth, maxChildren: step.maxChildren, timeoutMs }));
    case 'context-state':
      return deps.contextState({ frameSelectors: effectiveFrameSelectors, formSelector: preferredFormSelector, contextQuery: contextQuery ?? defaults.contextQuery, frameQuery: frameQuery ?? defaults.frameQuery, exact, limit: (step.limit as number | undefined) ?? 20, timeoutMs });
    default:
      return undefined;
  }
}
