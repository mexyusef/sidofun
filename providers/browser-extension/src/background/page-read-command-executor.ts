import type {
  SidofunBrowserProviderQueuedCommand,
} from '../protocol.js';
import type {
  ProviderSessionRecord,
} from './types.js';
import type { CommandRouterDeps } from './command-router-deps.js';

export function createPageReadCommandExecutor(deps: CommandRouterDeps) {
  const {
    getState,
    setState,
    getSessionContext,
    pushSessionState,
    getTabInfo,
    executeDomBridgeWithFallback,
    executeDomBridge,
    snapshotActiveTab,
  } = deps;

  return async function executePageReadCommand(command: SidofunBrowserProviderQueuedCommand, existing: ProviderSessionRecord) {
    const state = await getState();
    const result = await (async () => {
      switch (command.kind) {



    case 'frames': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const frames = await executeDomBridgeWithFallback<any[]>(
        tabId,
        command.sessionId,
        'frames',
        { frameSelectors },
        'frames',
        'frames'
      ).catch(() => []);
      return {
        activeTabId: tabId,
        frames: Array.isArray(frames) ? frames : []
      };
    }


    case 'snapshot': {
      const { session: currentSession, tabId } = await getSessionContext(command.sessionId, existing);
      const snapshot = await snapshotActiveTab(tabId);
      const tab = await getTabInfo(tabId);
      const nextRecord: ProviderSessionRecord = {
        ...currentSession,
        activeTabId: tabId,
        windowId: tab?.windowId ?? currentSession.windowId,
        tabs: currentSession.tabs,
        snapshot: snapshot ?? currentSession.snapshot,
        networkEvents: currentSession.networkEvents ?? [],
        domEvents: currentSession.domEvents ?? [],
        connected: true,
        updatedAt: new Date().toISOString()
      };
      state.sessions[command.sessionId] = nextRecord;
      await setState(state);
      void pushSessionState(command.sessionId);
      return {
        windowId: nextRecord.windowId,
        activeTabId: nextRecord.activeTabId,
        snapshot
      };
    }


    case 'dom_tree': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = typeof command.payload.selector === 'string' ? command.payload.selector : undefined;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const maxDepth = Number.parseInt(String(command.payload.maxDepth ?? '4'), 10);
      const maxChildren = Number.parseInt(String(command.payload.maxChildren ?? '20'), 10);
      const tree = await executeDomBridge<Record<string, unknown>>(tabId, 'dom_tree', {
        selector,
        frameSelectors,
        maxDepth: Number.isNaN(maxDepth) ? 4 : Math.max(0, maxDepth),
        maxChildren: Number.isNaN(maxChildren) ? 20 : Math.max(1, maxChildren)
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        tree
      };
    }


    case 'inspect': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = String(command.payload.selector || '');
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      return {
        activeTabId: tabId,
        element: await executeDomBridgeWithFallback(
          tabId,
          command.sessionId,
          'inspect',
          { selector, frameSelectors },
          'inspect',
          'element'
        )
      };
    }


    case 'inspect_all': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = String(command.payload.selector || '');
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const elements = await executeDomBridgeWithFallback<any[]>(
        tabId,
        command.sessionId,
        'inspect_all',
        {
          selector,
          limit: Number.isNaN(limit) ? 20 : Math.max(1, limit),
          frameSelectors
        },
        'inspect_all',
        'elements'
      ).catch(() => []);
      return {
        activeTabId: tabId,
        elements: Array.isArray(elements) ? elements : []
      };
    }


    case 'links': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const limit = Number.parseInt(String(command.payload.limit ?? '50'), 10);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const links = await executeDomBridgeWithFallback<any[]>(
        tabId,
        command.sessionId,
        'links',
        {
          limit: Number.isNaN(limit) ? 50 : Math.max(1, limit),
          frameSelectors
        },
        'links',
        'links'
      ).catch(() => []);
      return {
        activeTabId: tabId,
        links: Array.isArray(links) ? links : []
      };
    }


    case 'actionables': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const limit = Number.parseInt(String(command.payload.limit ?? '50'), 10);
      const selector = typeof command.payload.selector === 'string' ? command.payload.selector : undefined;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const actionables = await executeDomBridge<any[]>(tabId, 'actionables', {
        limit: Number.isNaN(limit) ? 50 : Math.max(1, limit),
        selector,
        frameSelectors
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(actionables) ? actionables.length : 0,
        actionables: Array.isArray(actionables) ? actionables : []
      };
    }


    case 'page_state': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const maxDepth = Number.parseInt(String(command.payload.maxDepth ?? '3'), 10);
      const maxChildren = Number.parseInt(String(command.payload.maxChildren ?? '12'), 10);
      const selector = typeof command.payload.selector === 'string' ? command.payload.selector : undefined;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const pageState = await executeDomBridge<Record<string, unknown>>(tabId, 'page_state', {
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit),
        selector,
        frameSelectors,
        maxDepth: Number.isNaN(maxDepth) ? 3 : Math.max(0, maxDepth),
        maxChildren: Number.isNaN(maxChildren) ? 12 : Math.max(1, maxChildren)
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        pageState
      };
    }


    case 'markdown': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = typeof command.payload.selector === 'string' ? command.payload.selector : undefined;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const markdown = await executeDomBridgeWithFallback<Record<string, unknown>>(
        tabId,
        command.sessionId,
        'markdown',
        { selector, frameSelectors },
        'markdown',
        'markdown'
      ).catch(() => undefined);
      return {
        activeTabId: tabId,
        markdown: typeof markdown === 'string'
          ? markdown
          : typeof markdown?.markdown === 'string'
            ? markdown.markdown
            : ''
      };
    }


    case 'readability': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = typeof command.payload.selector === 'string' ? command.payload.selector : undefined;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const readability = await executeDomBridgeWithFallback<Record<string, unknown>>(
        tabId,
        command.sessionId,
        'readability',
        { selector, frameSelectors },
        'readability',
        'readability'
      ).catch(() => undefined);
      return {
        activeTabId: tabId,
        readability
      };
    }


    case 'dialogs': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const dialogs = await executeDomBridge<any[]>(tabId, 'dialogs', {
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit)
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(dialogs) ? dialogs.length : 0,
        dialogs: Array.isArray(dialogs) ? dialogs : []
      };
    }


    case 'dialog_actions': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'dialog_actions', {
        query: typeof command.payload.query === 'string' ? command.payload.query : undefined,
        frameSelectors,
        exact: command.payload.exact === true
      });
      return {
        activeTabId: tabId,
        ...(response ?? {})
      };
    }


    case 'banners': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const banners = await executeDomBridge<any[]>(tabId, 'banners', {
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit)
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(banners) ? banners.length : 0,
        banners: Array.isArray(banners) ? banners : []
      };
    }


    case 'loading_states': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const loadingStates = await executeDomBridge<any[]>(tabId, 'loading_states', {
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit)
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(loadingStates) ? loadingStates.length : 0,
        loadingStates: Array.isArray(loadingStates) ? loadingStates : []
      };
    }


    case 'empty_states': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const emptyStates = await executeDomBridge<any[]>(tabId, 'empty_states', {
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit)
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(emptyStates) ? emptyStates.length : 0,
        emptyStates: Array.isArray(emptyStates) ? emptyStates : []
      };
    }


    case 'menus': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const menus = await executeDomBridge<any[]>(tabId, 'menus', {
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit)
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(menus) ? menus.length : 0,
        menus: Array.isArray(menus) ? menus : []
      };
    }


    case 'disclosures': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '50'), 10);
      const disclosures = await executeDomBridge<any[]>(tabId, 'disclosures', {
        frameSelectors,
        limit: Number.isNaN(limit) ? 50 : Math.max(1, limit)
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(disclosures) ? disclosures.length : 0,
        disclosures: Array.isArray(disclosures) ? disclosures : []
      };
    }


    case 'collections': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const collections = await executeDomBridge<any[]>(tabId, 'collections', {
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit)
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(collections) ? collections.length : 0,
        collections: Array.isArray(collections) ? collections : []
      };
    }


    case 'collection_controls': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const controls = await executeDomBridge<any[]>(tabId, 'collection_controls', {
        collectionQuery: command.payload.collectionQuery,
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit),
        exact: command.payload.exact === true
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(controls) ? controls.length : 0,
        controls: Array.isArray(controls) ? controls : []
      };
    }


    case 'collection_active_filters': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const controls = await executeDomBridge<any[]>(tabId, 'collection_active_filters', {
        collectionQuery: command.payload.collectionQuery,
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit),
        exact: command.payload.exact === true
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(controls) ? controls.length : 0,
        controls: Array.isArray(controls) ? controls : []
      };
    }


    case 'collection_filter_tokens': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const tokens = await executeDomBridge<any[]>(tabId, 'collection_filter_tokens', {
        collectionQuery: command.payload.collectionQuery,
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit),
        exact: command.payload.exact === true
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(tokens) ? tokens.length : 0,
        tokens: Array.isArray(tokens) ? tokens : []
      };
    }


    case 'collection_rows': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const result = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_rows', {
        collectionQuery: command.payload.collectionQuery,
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit),
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        collection: (result as { collection?: unknown } | undefined)?.collection,
        count: Array.isArray((result as { rows?: unknown[] } | undefined)?.rows) ? ((result as { rows?: unknown[] }).rows?.length ?? 0) : 0,
        rows: Array.isArray((result as { rows?: unknown[] } | undefined)?.rows) ? ((result as { rows?: unknown[] }).rows ?? []) : []
      };
    }


    case 'collection_row_actions': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_row_actions', {
        collectionQuery: command.payload.collectionQuery,
        rowQuery: command.payload.rowQuery ?? command.payload.query,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        collection: (response as { collection?: unknown } | undefined)?.collection,
        row: (response as { row?: unknown } | undefined)?.row,
        count: Array.isArray((response as { actions?: unknown[] } | undefined)?.actions) ? ((response as { actions?: unknown[] }).actions?.length ?? 0) : 0,
        actions: Array.isArray((response as { actions?: unknown[] } | undefined)?.actions) ? ((response as { actions?: unknown[] }).actions ?? []) : []
      };
    }


    case 'collection_selection_state': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_selection_state', {
        collectionQuery: command.payload.collectionQuery,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        collection: (response as { collection?: unknown } | undefined)?.collection,
        count: Number((response as { count?: unknown } | undefined)?.count ?? 0),
        selectedCount: Number((response as { selectedCount?: unknown } | undefined)?.selectedCount ?? 0),
        rows: Array.isArray((response as { rows?: unknown[] } | undefined)?.rows) ? ((response as { rows?: unknown[] }).rows ?? []) : [],
        selectedRows: Array.isArray((response as { selectedRows?: unknown[] } | undefined)?.selectedRows) ? ((response as { selectedRows?: unknown[] }).selectedRows ?? []) : []
      };
    }


    case 'paginations': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
      const paginations = await executeDomBridge<any[]>(tabId, 'paginations', {
        frameSelectors,
        limit: Number.isNaN(limit) ? 20 : Math.max(1, limit)
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(paginations) ? paginations.length : 0,
        paginations: Array.isArray(paginations) ? paginations : []
      };
    }


    case 'editor_read': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = String(command.payload.selector || '');
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      return {
        activeTabId: tabId,
        editor: await executeDomBridge(tabId, 'editor_read', { selector, frameSelectors })
      };
    }
        default:
          return { handled: false };
      }
    })();
    if (result && typeof result === 'object' && 'handled' in result) {
      return result;
    }
    return {
      handled: true as const,
      result
    };
  };
}
