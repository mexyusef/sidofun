import type {
  AiSharedDeps,
  ProviderSite,
  VisibleTextButton,
} from './ai-types.js';

function listVisibleTextButtons(deps: AiSharedDeps, root: ParentNode = document): VisibleTextButton[] {
  return Array.from(root.querySelectorAll<HTMLElement>('button, [role="button"], [role="menuitem"], [role="option"], [role="tab"], a'))
    .filter((element) => deps.isVisibleElement(element))
    .map((element) => ({
      element,
      text: [
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.getAttribute('data-testid'),
        element.innerText,
        element.textContent
      ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    }))
    .filter((entry) => entry.text.length > 0);
}

function sidebarNeedles(site: ProviderSite) {
  return site === 'chatgpt'
    ? ['sidebar', 'history', 'open sidebar', 'close sidebar', 'open history', 'close history']
    : ['sidebar', 'history', 'open sidebar', 'close sidebar', 'open history', 'close history', 'chat history'];
}

function guessCurrentModelLabel(deps: AiSharedDeps, site: ProviderSite) {
  const buttons = listVisibleTextButtons(deps);
  const modelNeedles = site === 'chatgpt' ? ['gpt', 'o1', 'o3', 'o4', '4o', '4.1'] : ['deepseek', 'r1', 'v3'];
  return buttons.find(({ text }) => modelNeedles.some((needle) => text.toLowerCase().includes(needle)))?.text;
}

function findModelPicker(deps: AiSharedDeps, site: ProviderSite) {
  const exactNeedles = site === 'chatgpt' ? ['model', 'gpt', 'o1', 'o3', 'o4', '4o', '4.1'] : ['model', 'deepseek', 'r1', 'v3'];
  const candidates = listVisibleTextButtons(deps)
    .map(({ element, text }) => ({
      element,
      text,
      score: (element.getAttribute('aria-haspopup') ? -50 : 0)
        + (exactNeedles.some((needle) => text.toLowerCase().includes(needle)) ? -100 : 0)
        + (/more|share|copy|retry|regenerate|stop|sidebar|history/.test(text.toLowerCase()) ? 200 : 0)
    }))
    .sort((left, right) => left.score - right.score);
  return candidates[0]?.element;
}

export function createAiSidebarModelApi(deps: AiSharedDeps) {
  function readSidebarState(site: ProviderSite) {
    const sidebar = Array.from(document.querySelectorAll<HTMLElement>('aside, nav, [data-testid*="sidebar"], [data-testid*="history"]'))
      .find((element) => deps.isVisibleElement(element) && /chat|history|conversation|sidebar/i.test(element.innerText || element.textContent || ''));
    const toggle = deps.findEnabledButtonByLabelNeedles(sidebarNeedles(site));
    return {
      open: Boolean(sidebar),
      toggleLabel: toggle
        ? toggle.getAttribute('aria-label') || toggle.getAttribute('title') || toggle.innerText.trim() || undefined
        : undefined,
      toggleSelector: toggle ? deps.buildElementSelector(toggle) : undefined
    };
  }

  function toggleSidebar(site: ProviderSite) {
    const button = deps.findEnabledButtonByLabelNeedles(sidebarNeedles(site));
    if (!button) {
      throw new Error(`${site === 'chatgpt' ? 'ChatGPT' : 'DeepSeek'} sidebar toggle was not found`);
    }
    deps.focusElement(button);
    deps.clickElementLikeUser(button);
    return readSidebarState(site);
  }

  async function listModels(site: ProviderSite) {
    const picker = findModelPicker(deps, site);
    const current = guessCurrentModelLabel(deps, site);
    if (!picker) {
      return { currentModel: current, models: current ? [{ title: current, active: true }] : [] };
    }
    deps.focusElement(picker);
    deps.clickElementLikeUser(picker);
    await deps.sleep(250);
    const currentLower = current?.toLowerCase();
    const modelNeedles = site === 'chatgpt' ? ['gpt', 'o1', 'o3', 'o4', '4o', '4.1'] : ['deepseek', 'r1', 'v3'];
    const models = listVisibleTextButtons(deps)
      .map(({ element, text }) => ({
        title: text,
        selector: deps.buildElementSelector(element),
        active: currentLower ? text.toLowerCase() === currentLower || text.toLowerCase().includes(currentLower) : undefined
      }))
      .filter((entry) => modelNeedles.some((needle) => entry.title.toLowerCase().includes(needle)))
      .filter((entry, index, array) => array.findIndex((candidate) => candidate.title === entry.title) === index);
    return { currentModel: current, models };
  }

  async function selectModel(site: ProviderSite, query: string) {
    const picker = findModelPicker(deps, site);
    if (!picker) {
      throw new Error(`${site === 'chatgpt' ? 'ChatGPT' : 'DeepSeek'} model picker was not found`);
    }
    deps.focusElement(picker);
    deps.clickElementLikeUser(picker);
    await deps.sleep(250);
    const normalized = query.trim().toLowerCase();
    const option = listVisibleTextButtons(deps).find(({ text }) => text.toLowerCase().includes(normalized));
    if (!option) {
      throw new Error(`${site === 'chatgpt' ? 'ChatGPT' : 'DeepSeek'} model matching "${query}" was not found`);
    }
    deps.focusElement(option.element);
    deps.clickElementLikeUser(option.element);
    await deps.sleep(300);
    return { selected: option.text };
  }

  return {
    listVisibleTextButtons: (root?: ParentNode) => listVisibleTextButtons(deps, root),
    readSidebarState,
    toggleSidebar,
    listModels,
    selectModel,
  };
}
