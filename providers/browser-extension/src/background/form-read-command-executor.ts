import type {
  SidofunBrowserProviderQueuedCommand,
} from '../protocol.js';
import type {
  ProviderSessionRecord,
} from './types.js';
import type { CommandRouterDeps } from './command-router-deps.js';

export function createFormReadCommandExecutor(deps: CommandRouterDeps) {
  const {
    getSessionContext,
    executeDomBridgeWithFallback,
    executeDomBridge,
    getTrackedActiveTabId,
    sendTabCommand,
  } = deps;

  return async function executeFormReadCommand(command: SidofunBrowserProviderQueuedCommand, existing: ProviderSessionRecord) {
    const send = (tabId: number, payload: Record<string, unknown>) => sendTabCommand(tabId, payload, command.sessionId);
    const result = await (async () => {
      switch (command.kind) {


    case 'form_fields': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '50'), 10);
      const fields = await executeDomBridgeWithFallback<any[]>(
        tabId,
        command.sessionId,
        'form_fields',
        {
        limit: Number.isNaN(limit) ? 50 : Math.max(1, limit),
        frameSelectors
        },
        'form_fields',
        'fields'
      ).catch(() => []);
      const safeFields = Array.isArray(fields) ? fields : [];
      return {
        activeTabId: tabId,
        count: safeFields.length,
        fields: safeFields
      };
    }


    case 'form_contexts': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '50'), 10);
      const contexts = await executeDomBridgeWithFallback<any[]>(
        tabId,
        command.sessionId,
        'form_contexts',
        {
        limit: Number.isNaN(limit) ? 50 : Math.max(1, limit),
        frameSelectors
        },
        'form_contexts',
        'contexts'
      ).catch(() => []);
      const safeContexts = Array.isArray(contexts) ? contexts : [];
      return {
        activeTabId: tabId,
        count: safeContexts.length,
        contexts: safeContexts
      };
    }


    case 'form_find_field': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const query = String(command.payload.query || '').trim();
      const exact = command.payload.exact === true;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      return {
        activeTabId: tabId,
        field: await executeDomBridgeWithFallback(
          tabId,
          command.sessionId,
          'form_find_field',
          {
          query,
          exact,
          frameSelectors,
          preferredFormSelector: typeof command.payload.preferredFormSelector === 'string' ? command.payload.preferredFormSelector : undefined
          },
          'form_find_field',
          'field'
        )
      };
    }


    case 'form_validation': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = String(command.payload.selector || '').trim();
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      return {
        activeTabId: tabId,
        validation: await executeDomBridge(
          tabId,
          'form_validation',
          {
            selector,
            frameSelectors
          }
        )
      };
    }


    case 'form_radio_groups': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '50'), 10);
      const groups = await executeDomBridge<any[]>(tabId, 'form_radio_groups', {
        limit: Number.isNaN(limit) ? 50 : Math.max(1, limit),
        frameSelectors
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(groups) ? groups.length : 0,
        groups: Array.isArray(groups) ? groups : []
      };
    }


    case 'form_segmented_options': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '50'), 10);
      const groups = await executeDomBridge<any[]>(tabId, 'form_segmented_options', {
        limit: Number.isNaN(limit) ? 50 : Math.max(1, limit),
        frameSelectors
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(groups) ? groups.length : 0,
        groups: Array.isArray(groups) ? groups : []
      };
    }


    case 'form_tablist_options': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '50'), 10);
      const groups = await executeDomBridge<any[]>(tabId, 'form_tablist_options', {
        limit: Number.isNaN(limit) ? 50 : Math.max(1, limit),
        frameSelectors
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(groups) ? groups.length : 0,
        groups: Array.isArray(groups) ? groups : []
      };
    }


    case 'form_stepper': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '50'), 10);
      const groups = await executeDomBridge<any[]>(tabId, 'form_stepper', {
        limit: Number.isNaN(limit) ? 50 : Math.max(1, limit),
        frameSelectors
      }).catch(() => []);
      return {
        activeTabId: tabId,
        count: Array.isArray(groups) ? groups.length : 0,
        steppers: Array.isArray(groups) ? groups : []
      };
    }


    case 'form_options': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const selector = String(command.payload.selector || '');
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const limit = Number.parseInt(String(command.payload.limit ?? '100'), 10);
      const options = await executeDomBridge<any[]>(tabId, 'form_options', {
        selector,
        frameSelectors,
        limit: Number.isNaN(limit) ? 100 : Math.max(1, limit)
      }).catch(() => []);
      return {
        activeTabId: tabId,
        options: Array.isArray(options) ? options : []
      };
    }


    case 'form_combobox_options': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const selector = String(command.payload.selector || '');
      const limit = Number.parseInt(String(command.payload.limit ?? '50'), 10);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await send(tabId, {
        kind: 'form_combobox_options',
        selector,
        limit: Number.isNaN(limit) ? 50 : Math.max(1, limit),
        frameSelectors
      });
      return {
        activeTabId: tabId,
        options: Array.isArray(response.options) ? response.options : []
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
