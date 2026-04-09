function summarizeDownloadItem(item: chrome.downloads.DownloadItem) {
  return {
    id: item.id,
    url: item.url,
    finalUrl: item.finalUrl,
    filename: item.filename,
    mime: item.mime,
    state: item.state,
    danger: item.danger,
    paused: item.paused,
    exists: item.exists,
    error: item.error,
    bytesReceived: item.bytesReceived,
    totalBytes: item.totalBytes,
    fileSize: item.fileSize,
    startTime: item.startTime,
    endTime: item.endTime,
    byExtensionId: item.byExtensionId,
    byExtensionName: item.byExtensionName
  };
}

function matchesDownloadQuery(
  item: ReturnType<typeof summarizeDownloadItem>,
  query?: string,
  exact = false
) {
  if (!query) {
    return true;
  }
  const normalizedQuery = query.trim().toLowerCase();
  const values = [
    item.url,
    item.finalUrl,
    item.filename,
    item.mime,
    item.state,
    item.danger,
    item.error
  ].filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    .map((entry) => entry.toLowerCase());
  return values.some((value) => exact ? value === normalizedQuery : value.includes(normalizedQuery));
}

export async function findDownloads(payload: Record<string, unknown>) {
  const limitRaw = Number.parseInt(String(payload.limit ?? '20'), 10);
  const limit = Number.isNaN(limitRaw) ? 20 : Math.max(1, limitRaw);
  const exact = payload.exact === true;
  const state = typeof payload.state === 'string' ? payload.state : undefined;
  const query = typeof payload.query === 'string' ? payload.query : undefined;
  const items = await chrome.downloads.search({ limit: Math.max(limit * 3, limit) });
  const downloads = items
    .map((item) => summarizeDownloadItem(item))
    .sort((left, right) => (new Date(right.startTime ?? 0).getTime()) - (new Date(left.startTime ?? 0).getTime()))
    .filter((item) => (!state || item.state === state) && matchesDownloadQuery(item, query, exact))
    .slice(0, limit);
  return downloads;
}

export async function executeStorageScript<T>(
  tabId: number,
  args: { scope: 'local' | 'session'; key?: string; value?: string; limit?: number },
  operation: 'list' | 'get' | 'set' | 'remove'
) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [args, operation],
    func: (scriptArgs, scriptOperation) => {
      const storage = scriptArgs.scope === 'session' ? window.sessionStorage : window.localStorage;
      if (scriptOperation === 'list') {
        const limit = Math.max(1, Number(scriptArgs.limit ?? 100));
        const entries = Array.from({ length: storage.length })
          .map((_, index) => storage.key(index))
          .filter((key): key is string => typeof key === 'string')
          .sort((left, right) => left.localeCompare(right))
          .slice(0, limit)
          .map((key) => ({
            scope: scriptArgs.scope,
            key,
            value: storage.getItem(key) ?? ''
          }));
        return { count: entries.length, entries };
      }
      if (scriptOperation === 'get') {
        const key = scriptArgs.key ?? '';
        const value = storage.getItem(key);
        return {
          found: value !== null,
          entry: value === null ? undefined : { scope: scriptArgs.scope, key, value }
        };
      }
      if (scriptOperation === 'set') {
        const key = scriptArgs.key ?? '';
        storage.setItem(key, scriptArgs.value ?? '');
        return {
          updated: true,
          entry: { scope: scriptArgs.scope, key, value: storage.getItem(key) ?? '' }
        };
      }
      const key = scriptArgs.key ?? '';
      const existed = storage.getItem(key) !== null;
      storage.removeItem(key);
      return {
        removed: existed,
        key
      };
    }
  });
  return result?.result as T;
}

export function summarizeCookie(cookie: chrome.cookies.Cookie | null | undefined) {
  if (!cookie) {
    return undefined;
  }
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expirationDate: cookie.expirationDate
  };
}
