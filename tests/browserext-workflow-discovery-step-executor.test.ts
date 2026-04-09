import { describe, expect, test } from 'bun:test';
import { executeBrowserExtensionWorkflowDiscoveryStep } from '../src/services/browser-extension/workflows/browserext-workflow-discovery-step-executor.js';
import type { BrowserExtensionWorkflowRuntimeState } from '../src/services/browser-extension/workflows/browserext-workflow-execution-state.js';

function createDeps() {
  return {
    withTransientRetry: async <T>(fn: () => Promise<T>) => fn(),
    browserExtensionService: {
      listMenus: async () => ({ menus: [{ label: 'File' }] }),
      selectMenuOption: async () => ({ selected: true }),
      listDisclosures: async () => ({ disclosures: [] }),
      toggleDisclosure: async () => ({ toggled: true }),
      listCollections: async () => ({ collections: [] }),
      listCollectionRows: async () => ({ rows: [] }),
      listCollectionRowActions: async () => ({ actions: [] }),
      getCollectionSelectionState: async () => ({ selectedCount: 2 }),
      clickCollectionItem: async () => ({ clicked: true }),
      clickCollectionRowAction: async () => ({ clicked: true }),
      selectCollectionRow: async () => ({ selected: true }),
      selectAllCollectionRows: async () => ({ selected: true }),
      getCollectionRowDetails: async () => ({ expanded: true, detailText: 'details' }),
      expandCollectionRow: async () => ({ expanded: true }),
      listPaginations: async () => ({ paginations: [] }),
      clickPagination: async () => ({ clicked: true }),
      clickLoadMore: async () => ({ clicked: true }),
      pageState: async () => ({ snapshot: { url: 'https://example.com' } }),
      suggestNextActions: async () => ({ suggestions: [{ query: 'Next' }] })
    },
    markdown: async () => ({ markdown: '# Hello' }),
    readability: async () => ({ article: 'Hello' }),
    metadata: async () => ({ title: 'Example' }),
    urlParts: async () => ({ host: 'example.com' }),
    listStorage: async () => ({ entries: [{ key: 'a' }] }),
    getStorage: async () => ({ key: 'a', value: '1' }),
    setStorage: async () => ({ stored: true }),
    removeStorage: async () => ({ removed: true }),
    cookies: async () => ({ cookies: [] }),
    getCookie: async () => ({ name: 'sid', value: '1' }),
    setCookie: async () => ({ set: true }),
    removeCookie: async () => ({ removed: true }),
    downloads: async () => ({ items: [] }),
    pageBlockers: async () => ({ blockers: [] }),
    pageOutcomes: async () => ({ outcomes: [] }),
    pageReady: async () => ({ ready: true }),
    pageRecover: async () => ({ recovered: true }),
    contextState: async () => ({ contexts: [] }),
    listActiveCollectionFilters: async () => ({ filters: [] }),
    listCollectionFilterTokens: async () => ({ tokens: [] }),
    listCollectionSortState: async () => ({ sorts: [] }),
    findCollectionRows: async () => ({ rows: [] }),
    getCollectionValues: async () => ({ values: ['x'] }),
    diffCollectionValues: async () => ({ countDelta: 1, uniqueCountDelta: 1, addedValues: ['new'] }),
    getCollectionStats: async () => ({ count: 3 }),
    diffCollectionStats: async () => ({ countDelta: 1, selectedCountDelta: 1, expandedCountDelta: 1, detailCountDelta: 1, rowActionCountDelta: 1 }),
    getCollectionRow: async () => ({ found: true, row: { id: '1' } }),
    getCollectionCell: async () => ({ found: true, cell: { value: 'ok' } }),
    waitCollectionRow: async () => ({ timedOut: false, found: true }),
    waitCollectionCount: async () => ({ timedOut: false, count: 3 }),
    bulkCollectionAction: async () => ({ processed: 2 }),
    exportCollection: async () => ({ filePath: 'tmp.csv' }),
    diffCollection: async () => ({ added: [], removed: [], changed: [], unchanged: [] }),
    waitCollectionDiff: async () => ({ timedOut: false, added: [] }),
    matchCollectionDiff: () => true,
    harvestCollection: async () => ({ harvested: 4 }),
    matchesQuery: (value: string | undefined, query: string) => value === query,
    extractComparable: (value: unknown) => String(value ?? '')
  };
}

describe('browserext workflow discovery step executor', () => {
  test('updates runtime lastPageState for page-state', async () => {
    const runtimeState: BrowserExtensionWorkflowRuntimeState = { outputs: {} };
    const result = await executeBrowserExtensionWorkflowDiscoveryStep(createDeps(), {
      sessionId: 'session_1',
      step: { kind: 'page-state' },
      defaults: { timeoutMs: 1000 },
      runtimeState
    });

    expect(result?.snapshot).toBeDefined();
    expect(runtimeState.lastPageState).toEqual(result);
  });

  test('resolves againstOutput for collection diff assertions', async () => {
    const runtimeState: BrowserExtensionWorkflowRuntimeState = { outputs: { baseline: { rows: [] } } };
    const result = await executeBrowserExtensionWorkflowDiscoveryStep(createDeps(), {
      sessionId: 'session_1',
      step: {
        kind: 'assert-collection-diff',
        collection: 'Inbox',
        againstOutput: 'baseline',
        addedAtLeast: 0
      },
      defaults: { timeoutMs: 1000 },
      runtimeState
    });

    expect(result).toBeDefined();
  });
});
