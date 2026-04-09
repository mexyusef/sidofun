import type {
  SidofunBrowserProviderQueuedCommand,
} from '../protocol.js';
import type {
  ProviderSessionRecord,
} from './types.js';
import type { CommandRouterDeps } from './command-router-deps.js';

export function createFormActionCommandExecutor(deps: CommandRouterDeps) {
  const {
    getSessionContext,
    waitForTabComplete,
    executeDomBridge,
    getTrackedActiveTabId,
    sendTabCommand,
    waitForFormOutcome,
  } = deps;

  return async function executeFormActionCommand(command: SidofunBrowserProviderQueuedCommand, existing: ProviderSessionRecord) {
    const send = (tabId: number, payload: Record<string, unknown>) => sendTabCommand(tabId, payload, command.sessionId);
    const result = await (async () => {
      switch (command.kind) {



    case 'form_fill': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = String(command.payload.selector || '');
      const value = String(command.payload.value ?? command.payload.text ?? '');
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      return {
        activeTabId: tabId,
        field: await executeDomBridge(tabId, 'form_fill', { selector, value, frameSelectors })
      };
    }


    case 'form_fill_human': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = String(command.payload.selector || '');
      const value = String(command.payload.value ?? command.payload.text ?? '');
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      return {
        activeTabId: tabId,
        field: await executeDomBridge(tabId, 'form_fill_human', {
          selector,
          value,
          delayMs: typeof command.payload.delayMs === 'number' ? command.payload.delayMs : undefined,
          jitterMs: typeof command.payload.jitterMs === 'number' ? command.payload.jitterMs : undefined,
          frameSelectors
        })
      };
    }


    case 'form_clear': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const selector = String(command.payload.selector || '');
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      return {
        activeTabId: tabId,
        field: await executeDomBridge(tabId, 'form_clear', {
          selector,
          frameSelectors
        })
      };
    }


    case 'form_fill_many': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const rawFields = Array.isArray(command.payload.fields) ? command.payload.fields : [];
      const fields = rawFields
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return undefined;
          }
          const selector = typeof (entry as { selector?: unknown }).selector === 'string'
            ? (entry as { selector: string }).selector
            : undefined;
          const value = (entry as { value?: unknown; text?: unknown }).value ?? (entry as { value?: unknown; text?: unknown }).text;
          const frameSelectors = Array.isArray((entry as { frameSelectors?: unknown }).frameSelectors)
            ? (entry as { frameSelectors: unknown[] }).frameSelectors.filter((item): item is string => typeof item === 'string' && item.length > 0)
            : undefined;
          if (!selector || typeof value !== 'string') {
            return undefined;
          }
          return { selector, value, frameSelectors };
        })
        .filter((entry): entry is { selector: string; value: string; frameSelectors?: string[] } => Boolean(entry));
      if (fields.length === 0) {
        throw new Error('At least one selector/value pair is required for form_fill_many');
      }
      const results = await executeDomBridge<any[]>(tabId, 'form_fill_many', {
        fields
      }).catch(() => []);
      const safeResults = Array.isArray(results) ? results : [];
      return {
        activeTabId: tabId,
        count: safeResults.length,
        fields: safeResults
      };
    }


    case 'form_radio_select': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'form_radio_select', {
        query: command.payload.query,
        option: command.payload.option ?? command.payload.value,
        exact: command.payload.exact === true,
        preferredFormSelector: typeof command.payload.preferredFormSelector === 'string' ? command.payload.preferredFormSelector : undefined,
        frameSelectors
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        option: (response as { option?: unknown } | undefined)?.option,
        group: (response as { group?: unknown } | undefined)?.group
      };
    }


    case 'form_segmented_select': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'form_segmented_select', {
        query: command.payload.query,
        option: command.payload.option ?? command.payload.value,
        exact: command.payload.exact === true,
        preferredFormSelector: typeof command.payload.preferredFormSelector === 'string' ? command.payload.preferredFormSelector : undefined,
        frameSelectors
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        option: (response as { option?: unknown } | undefined)?.option,
        group: (response as { group?: unknown } | undefined)?.group
      };
    }


    case 'form_tablist_select': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'form_tablist_select', {
        query: command.payload.query,
        option: command.payload.option ?? command.payload.value,
        exact: command.payload.exact === true,
        preferredFormSelector: typeof command.payload.preferredFormSelector === 'string' ? command.payload.preferredFormSelector : undefined,
        frameSelectors
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        option: (response as { option?: unknown } | undefined)?.option,
        group: (response as { group?: unknown } | undefined)?.group
      };
    }


    case 'form_stepper_move': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'form_stepper_move', {
        query: command.payload.query,
        direction: command.payload.direction,
        exact: command.payload.exact === true,
        preferredFormSelector: typeof command.payload.preferredFormSelector === 'string' ? command.payload.preferredFormSelector : undefined,
        frameSelectors
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        control: (response as { control?: unknown } | undefined)?.control,
        group: (response as { group?: unknown } | undefined)?.group
      };
    }


    case 'form_date_set':


    case 'form_toggle': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'form_toggle', {
        query: command.payload.query,
        desiredState: command.payload.desiredState,
        exact: command.payload.exact === true,
        preferredFormSelector: typeof command.payload.preferredFormSelector === 'string' ? command.payload.preferredFormSelector : undefined,
        frameSelectors
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response
      };
    }


    case 'form_range_set': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'form_range_set', {
        query: command.payload.query,
        value: command.payload.value,
        exact: command.payload.exact === true,
        preferredFormSelector: typeof command.payload.preferredFormSelector === 'string' ? command.payload.preferredFormSelector : undefined,
        frameSelectors
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response
      };
    }


    case 'form_fill_label': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const query = String(command.payload.query || '').trim();
      const value = String(command.payload.value ?? command.payload.text ?? '');
      const exact = command.payload.exact === true;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      return {
        activeTabId: tabId,
        field: await executeDomBridge(tabId, 'form_fill_label', {
          query,
          value,
          exact,
          frameSelectors,
          preferredFormSelector: typeof command.payload.preferredFormSelector === 'string' ? command.payload.preferredFormSelector : undefined
        })
      };
    }


    case 'form_select': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const selector = String(command.payload.selector || '');
      const option = String(command.payload.option || command.payload.value || '');
      const byRaw = String(command.payload.by || 'text').toLowerCase();
      const by = byRaw === 'value' || byRaw === 'label' ? byRaw : 'text';
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'form_select', {
        selector,
        option,
        by,
        frameSelectors
      });
      return {
        activeTabId: tabId,
        field: response,
        option: (response as { option?: unknown }).option
      };
    }


    case 'form_commit': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const selector = typeof command.payload.selector === 'string' && command.payload.selector.length > 0
        ? command.payload.selector
        : undefined;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'form_commit', {
        selector,
        frameSelectors
      }).catch(() => undefined);
      return {
        activeTabId: tabId,
        field: response,
        ...(response ?? {})
      };
    }


    case 'form_upload': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const selector = String(command.payload.selector || '');
      const fileName = String(command.payload.fileName || 'upload.bin');
      const fileData = String(command.payload.fileData || '');
      const mimeType = typeof command.payload.mimeType === 'string' ? command.payload.mimeType : undefined;
      const lastModified = typeof command.payload.lastModified === 'number' ? command.payload.lastModified : undefined;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await send(tabId, {
        kind: 'form_upload',
        selector,
        fileName,
        fileData,
        mimeType,
        lastModified,
        frameSelectors
      });
      return {
        activeTabId: tabId,
        field: response.field
      };
    }


    case 'form_combobox_select': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const selector = String(command.payload.selector || '');
      const option = String(command.payload.option || command.payload.value || '');
      const match = String(command.payload.match || 'includes') === 'exact' ? 'exact' : 'includes';
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await send(tabId, {
        kind: 'form_combobox_select',
        selector,
        option,
        match,
        frameSelectors
      });
      return {
        activeTabId: tabId,
        field: response.field,
        option: response.option
      };
    }


    case 'form_submit': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const selector = typeof command.payload.selector === 'string' && command.payload.selector.length > 0
        ? command.payload.selector
        : undefined;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const response = await executeDomBridge<Record<string, unknown>>(tabId, 'form_submit', {
        selector,
        frameSelectors
      });
      await waitForTabComplete(tabId).catch(() => undefined);
      return {
        activeTabId: tabId,
        ...(response ?? {})
      };
    }


    case 'form_submit_wait': {
      const tabId = await getTrackedActiveTabId(existing, command.sessionId);
      const selector = typeof command.payload.selector === 'string' && command.payload.selector.length > 0
        ? command.payload.selector
        : undefined;
      const frameSelectors = Array.isArray(command.payload.frameSelectors)
        ? command.payload.frameSelectors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : undefined;
      const submitResult = await executeDomBridge<Record<string, unknown>>(tabId, 'form_submit', {
        selector,
        frameSelectors
      });
      const waitResult = await waitForFormOutcome(tabId, {
        waitUrlIncludes: typeof command.payload.waitUrlIncludes === 'string' ? command.payload.waitUrlIncludes : undefined,
        waitText: typeof command.payload.waitText === 'string' ? command.payload.waitText : undefined,
        waitSelector: typeof command.payload.waitSelector === 'string' ? command.payload.waitSelector : undefined,
        waitNoSelector: typeof command.payload.waitNoSelector === 'string' ? command.payload.waitNoSelector : undefined,
        frameSelectors,
        timeoutMs: typeof command.payload.timeoutMs === 'number' ? command.payload.timeoutMs : undefined,
        intervalMs: typeof command.payload.intervalMs === 'number' ? command.payload.intervalMs : undefined
      });
      return {
        activeTabId: tabId,
        ...(submitResult ?? {}),
        ...waitResult
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
