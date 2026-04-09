import type {
  SidofunBrowserExtensionScreenshot,
  SidofunBrowserProviderQueuedCommand,
} from '../protocol.js';
import type {
  ProviderSessionRecord,
} from './types.js';
import type { CommandRouterDeps } from './command-router-deps.js';

export function createPageActionCommandExecutor(deps: CommandRouterDeps) {
  const {
    getState,
    setState,
    getSessionContext,
    waitForTabComplete,
    refreshSessionState,
    pushSessionState,
    getSessionRecord,
    executeDomBridge,
    sendTabCommand,
  } = deps;

  return async function executePageActionCommand(command: SidofunBrowserProviderQueuedCommand, existing: ProviderSessionRecord) {
    const state = await getState();
    const send = (tabId: number, payload: Record<string, unknown>) => sendTabCommand(tabId, payload, command.sessionId);
    const result = await (async () => {
      switch (command.kind) {


    case 'focus_tab': {
      const tabId = Number(command.payload.tabId);
      if (!Number.isFinite(tabId)) {
        throw new Error('A valid tabId is required for focus_tab');
      }
      const tab = await chrome.tabs.get(tabId);
      await chrome.windows.update(tab.windowId, { focused: true });
      await chrome.tabs.update(tabId, { active: true });
      await refreshSessionState(command.sessionId);
      void pushSessionState(command.sessionId);
      return {
        tabId,
        windowId: tab.windowId
      };
    }


    case 'scroll_page': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'scroll_page', {
        direction: command.payload.direction,
        amount: command.payload.amount
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        ...(response ?? {})
      };
    }


    case 'focus': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'focus', {
        selector: command.payload.selector,
        frameSelectors
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        ...(response ?? {})
      };
    }


    case 'blur': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'blur', {
        selector: typeof command.payload.selector === 'string' ? command.payload.selector : undefined,
        frameSelectors
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        ...(response ?? {})
      };
    }


    case 'screenshot': {
      const currentSession = await getSessionRecord(command.sessionId, existing);
      if (!currentSession.windowId) {
        throw new Error(`No browser window is tracked for browser-extension session ${command.sessionId}`);
      }
      const dataUrl = await chrome.tabs.captureVisibleTab(currentSession.windowId, { format: 'png' });
      const screenshot: SidofunBrowserExtensionScreenshot = {
        format: 'png',
        dataUrl,
        capturedAt: new Date().toISOString()
      };
      const nextRecord: ProviderSessionRecord = {
        ...currentSession,
        screenshot,
        connected: true,
        updatedAt: new Date().toISOString()
      };
      state.sessions[command.sessionId] = nextRecord;
      await setState(state);
      void pushSessionState(command.sessionId);
      return {
        windowId: nextRecord.windowId,
        activeTabId: nextRecord.activeTabId,
        screenshot
      };
    }


    case 'banner_dismiss': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'banner_dismiss', {
        query: typeof command.payload.query === 'string' ? command.payload.query : undefined,
        frameSelectors,
        exact: command.payload.exact === true
      });
      return {
        activeTabId: tabId,
        ...(response ?? {})
      };
    }


    case 'click_human': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'click_human', {
        selector: command.payload.selector,
        frameSelectors
      }).catch(() => undefined);
      await waitForTabComplete(tabId).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        ...(response ?? {})
      };
    }


    case 'dialog_action': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'dialog_action', {
        dialogQuery: typeof command.payload.dialogQuery === 'string' ? command.payload.dialogQuery : undefined,
        actionQuery: typeof command.payload.actionQuery === 'string' ? command.payload.actionQuery : undefined,
        frameSelectors,
        exact: command.payload.exact === true
      });
      return {
        activeTabId: tabId,
        ...(response ?? {})
      };
    }


    case 'dialog_close': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'dialog_close', {
        query: command.payload.query,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        dialog: (response as { dialog?: unknown } | undefined)?.dialog,
        closed: (response as { closed?: boolean } | undefined)?.closed === true
      };
    }


    case 'menu_select': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'menu_select', {
        menuQuery: command.payload.menuQuery,
        optionQuery: command.payload.optionQuery ?? command.payload.query ?? command.payload.value,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        menu: (response as { menu?: unknown } | undefined)?.menu,
        option: (response as { option?: unknown } | undefined)?.option
      };
    }


    case 'disclosure_toggle': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'disclosure_toggle', {
        query: command.payload.query,
        desiredState: command.payload.desiredState,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        disclosure: (response as { disclosure?: unknown } | undefined)?.disclosure
      };
    }


    case 'collection_click': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_click', {
        collectionQuery: command.payload.collectionQuery,
        itemQuery: command.payload.itemQuery ?? command.payload.query,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        collection: (response as { collection?: unknown } | undefined)?.collection,
        item: (response as { item?: unknown } | undefined)?.item
      };
    }


    case 'collection_row_click': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_row_click', {
        collectionQuery: command.payload.collectionQuery,
        rowQuery: command.payload.rowQuery ?? command.payload.query,
        actionQuery: command.payload.actionQuery,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        collection: (response as { collection?: unknown } | undefined)?.collection,
        row: (response as { row?: unknown } | undefined)?.row,
        action: (response as { action?: unknown } | undefined)?.action
      };
    }


    case 'collection_row_select': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_row_select', {
        collectionQuery: command.payload.collectionQuery,
        rowQuery: command.payload.rowQuery ?? command.payload.query,
        desiredState: command.payload.desiredState,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        collection: (response as { collection?: unknown } | undefined)?.collection,
        row: (response as { row?: unknown } | undefined)?.row,
        checked: (response as { checked?: unknown } | undefined)?.checked
      };
    }


    case 'collection_select_all': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_select_all', {
        collectionQuery: command.payload.collectionQuery,
        desiredState: command.payload.desiredState,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        collection: (response as { collection?: unknown } | undefined)?.collection,
        checked: (response as { checked?: unknown } | undefined)?.checked
      };
    }


    case 'collection_row_details': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_row_details', {
        collectionQuery: command.payload.collectionQuery,
        rowQuery: command.payload.rowQuery ?? command.payload.query,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        collection: (response as { collection?: unknown } | undefined)?.collection,
        row: (response as { row?: unknown } | undefined)?.row,
        expanded: (response as { expanded?: unknown } | undefined)?.expanded,
        detailText: (response as { detailText?: unknown } | undefined)?.detailText
      };
    }


    case 'collection_row_expand': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_row_expand', {
        collectionQuery: command.payload.collectionQuery,
        rowQuery: command.payload.rowQuery ?? command.payload.query,
        desiredState: command.payload.desiredState,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        collection: (response as { collection?: unknown } | undefined)?.collection,
        row: (response as { row?: unknown } | undefined)?.row,
        changed: (response as { changed?: unknown } | undefined)?.changed
      };
    }


    case 'collection_sort': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_sort', {
        collectionQuery: command.payload.collectionQuery,
        valueQuery: command.payload.valueQuery ?? command.payload.query ?? command.payload.value,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        control: (response as { control?: unknown } | undefined)?.control,
        value: (response as { value?: unknown } | undefined)?.value
      };
    }


    case 'collection_filter': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_filter', {
        collectionQuery: command.payload.collectionQuery,
        query: command.payload.query,
        value: command.payload.value,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        control: (response as { control?: unknown } | undefined)?.control,
        query: command.payload.query,
        value: command.payload.value
      };
    }


    case 'collection_filter_clear': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_filter_clear', {
        collectionQuery: command.payload.collectionQuery,
        query: command.payload.query,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        control: (response as { control?: unknown } | undefined)?.control,
        query: command.payload.query,
        cleared: Boolean((response as { cleared?: unknown } | undefined)?.cleared)
      };
    }


    case 'collection_filter_token_clear': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'collection_filter_token_clear', {
        collectionQuery: command.payload.collectionQuery,
        query: command.payload.query,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        token: (response as { token?: unknown } | undefined)?.token,
        query: command.payload.query,
        cleared: Boolean((response as { cleared?: unknown } | undefined)?.cleared)
      };
    }


    case 'pagination_click': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'pagination_click', {
        query: command.payload.query,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        pagination: (response as { pagination?: unknown } | undefined)?.pagination,
        option: (response as { option?: unknown } | undefined)?.option
      };
    }


    case 'load_more': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'load_more', {
        query: command.payload.query,
        frameSelectors,
        exact: command.payload.exact === true
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        label: (response as { label?: unknown } | undefined)?.label
      };
    }


    case 'evaluate': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const response = await send(tabId, {
        kind: 'evaluate',
        expression: command.payload.expression
      });
      return {
        activeTabId: tabId,
        value: response.value
      };
    }


    case 'click': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'click', {
        selector: command.payload.selector,
        frameSelectors: Array.isArray(command.payload.frameSelectors)
          ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
          : undefined
      });
      return {
        activeTabId: tabId,
        clicked: response.clicked === true,
        element: response
      };
    }


    case 'type': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const response = await send(tabId, {
        kind: 'type',
        selector: command.payload.selector,
        text: command.payload.text
      });
      return {
        activeTabId: tabId,
        typed: response.typed === true
      };
    }


    case 'press': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const response = await send(tabId, {
        kind: 'press',
        selector: command.payload.selector,
        key: command.payload.key
      });
      return {
        activeTabId: tabId,
        pressed: response.pressed === true
      };
    }


    case 'editor_fill': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = String(command.payload.selector || '');
      const value = String(command.payload.value ?? command.payload.text ?? '');
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      return {
        activeTabId: tabId,
        editor: await executeDomBridge(tabId, 'editor_fill', { selector, value, frameSelectors })
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
