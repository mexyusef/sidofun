import { SIDOFUN_BROWSER_EXTENSION_PROTOCOL } from './protocol.js';
import { handleAiCommand } from './content/ai-command-handler.js';
import { createAiSharedApi } from './content/ai-shared.js';
import { createChatGptSiteApi } from './content/chatgpt-site.js';
import { createDeepSeekSiteApi } from './content/deepseek-site.js';
import {
  collectLinksInFrames,
  collectVisibleText,
  findVisibleElement,
  findFirstVisibleElement,
  focusElement,
  inspectAllInFrames,
  inspectSelectorInFrames,
  isVisibleElement,
  listFrames as listFramesInternal,
  readMarkdown,
  readReadability,
  requireElement,
  summarizeElement,
  withDocumentRoot,
} from './content/dom-helpers.js';
import { installDomObserver } from './content/dom-observer.js';
import { createFormApi } from './content/form-api.js';
import { handleFormCommand } from './content/form-command-handler.js';
import {
  buildElementSelector,
  buildFormSelector,
  clickElementLikeUser as clickElementLikeUserInternal,
  findButtonByLabelNeedles,
  findButtonsByLabelNeedles,
  findClickableElementByText,
  findEnabledButtonByLabelNeedles,
  isDisabledControl,
  parseBooleanLike,
  readAssociatedLabels,
  readMetricNumber,
  resolveHumanDelay,
  setNativeInputValue,
  sleep,
} from './content/interaction-helpers.js';
import { handlePageCommand } from './content/page-command-handler.js';
import { handleXCommand } from './content/x-command-handler.js';
import { createXSiteApi } from './content/x-site.js';

const sidofunContentScriptGlobal = globalThis as typeof globalThis & {
  __sidofunBrowserExtensionContentScriptInstalled?: boolean;
};

function collectLinks(limit = 50) {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
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

function listFrames(frameSelectors?: string[], path: string[] = []) {
  return listFramesInternal(buildElementSelector, frameSelectors, path);
}

function clickElementLikeUser(element: HTMLElement) {
  return clickElementLikeUserInternal(element, focusElement);
}

const {
  listFormFields,
  listFormContexts,
  findFormField,
  fillFormField,
  fillFormFieldHuman,
  fillFormFieldByLabel,
  fillManyFormFields,
  listFormOptions,
  selectFormOption,
  submitForm,
  uploadFormFile,
  listComboboxOptions,
  selectComboboxOption,
} = createFormApi({
  summarizeElement,
  withDocumentRoot,
  isVisibleElement,
  findVisibleElement,
  buildElementSelector,
  buildFormSelector,
  readAssociatedLabels,
  parseBooleanLike,
  clickElementLikeUser,
  setNativeInputValue,
  setElementValue,
  sleep,
  resolveHumanDelay,
});

function setElementValue(element: Element, text: string) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus();
    setNativeInputValue(element, text);
    if (typeof element.setSelectionRange === 'function') {
      try {
        element.setSelectionRange(text.length, text.length);
      } catch {
        // Some input types such as email do not support selection ranges.
      }
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
  if ((element as HTMLElement).isContentEditable) {
    const editable = element as HTMLElement;
    editable.focus();
    editable.click();
    editable.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: text,
      inputType: 'insertText'
    }));
    const selection = window.getSelection();
    let inserted = false;
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      inserted = Boolean(document.execCommand?.('insertText', false, text));
    }
    if ((editable.innerText || editable.textContent || '').trim() !== text.trim()) {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      editable.replaceChildren(paragraph);
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(paragraph);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    editable.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: text,
      inputType: 'insertText'
    }));
    editable.dispatchEvent(new Event('change', { bubbles: true }));
    if (!inserted) {
      pressKey(editable, 'End');
    }
    return;
  }
  throw new Error(`Element is not typable for selector: ${(element as HTMLElement).tagName}`);
}

function normalizeEditorElement(selector: string, frameSelectors?: string[]) {
  const element = findVisibleElement(selector, frameSelectors);
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

function readEditor(selector: string, frameSelectors?: string[]) {
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

function fillEditor(selector: string, text: string, frameSelectors?: string[]) {
  const element = normalizeEditorElement(selector, frameSelectors);
  setElementValue(element, text);
  const editor = readEditor(selector, frameSelectors);
  return {
    ...editor,
    filled: true
  };
}

function pressKey(element: Element | undefined, key: string) {
  const target = (element as HTMLElement | undefined) ?? document.activeElement as HTMLElement | null ?? document.body;
  if (!target) {
    throw new Error('No active target for key press');
  }
  focusElement(target);
  const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
  const keyCode = key === 'Enter' ? 13 : key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
  const options = {
    key,
    code,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true
  };
  target.dispatchEvent(new KeyboardEvent('keydown', options));
  target.dispatchEvent(new KeyboardEvent('keypress', options));
  target.dispatchEvent(new KeyboardEvent('keyup', options));
}

function evaluateExpression(expression: string) {
  try {
    const fn = new Function('document', 'window', 'location', `return (${expression});`);
    return fn(document, window, location);
  } catch {
    const fn = new Function('document', 'window', 'location', expression);
    return fn(document, window, location);
  }
}

const {
  collectXSearchPosts,
  collectXTimelinePosts,
  sendXPost,
  collectSingleXPost,
  sendXReply,
  likeXPost,
  repostXPost,
  collectXProfile,
  collectXNotifications,
  collectXMessageThreads,
  openXMessageThread,
  sendXDirectMessage,
  collectXThread,
  followXProfile,
} = createXSiteApi({
  sleep,
  focusElement,
  setElementValue,
  pressKey,
  readMetricNumber,
  findClickableElementByText,
  findButtonByLabelNeedles,
});

const {
  listVisibleTextButtons,
  readSidebarState,
  toggleSidebar,
  listModels,
  selectModel,
  listConversationActions,
  invokeConversationAction,
  renameConversation,
} = createAiSharedApi({
  sleep,
  focusElement,
  findFirstVisibleElement,
  isVisibleElement,
  clickElementLikeUser,
  setElementValue,
  pressKey,
  buildElementSelector,
  listChatGptConversations,
  listDeepSeekConversations,
  findButtonsByLabelNeedles,
  findEnabledButtonByLabelNeedles,
  isDisabledControl,
});

const {
  findChatGptComposer,
  findChatGptNewChatButton,
  openChatGptConversation,
  startNewChatGptConversation,
  isChatGptBusy,
  stopChatGptGeneration,
  regenerateChatGptResponse,
  continueChatGptResponse,
  readChatGptResponseControls,
  openChatGptPreviousResponse,
  openChatGptNextResponse,
  readChatGptLatestAssistantMessage,
  collectChatGptConversation,
  sendChatGptPrompt,
  editChatGptMessage,
} = createChatGptSiteApi({
  sleep,
  focusElement,
  findFirstVisibleElement,
  isVisibleElement,
  isDisabledControl,
  clickElementLikeUser,
  setElementValue,
  pressKey,
  findButtonByLabelNeedles,
  findButtonsByLabelNeedles,
});

const {
  findDeepSeekComposer,
  findDeepSeekNewChatButton,
  listDeepSeekConversations,
  openDeepSeekConversation,
  startDeepSeekNewChat,
  isDeepSeekBusy,
  stopDeepSeekGeneration,
  regenerateDeepSeekResponse,
  continueDeepSeekResponse,
  readDeepSeekResponseControls,
  openDeepSeekPreviousResponse,
  openDeepSeekNextResponse,
  readDeepSeekLatestAssistantMessage,
  collectDeepSeekConversation,
  sendDeepSeekPrompt,
  editDeepSeekMessage,
} = createDeepSeekSiteApi({
  sleep,
  focusElement,
  findFirstVisibleElement,
  isVisibleElement,
  isDisabledControl,
  clickElementLikeUser,
  setElementValue,
  pressKey,
  findButtonByLabelNeedles,
  findButtonsByLabelNeedles,
});

if (!sidofunContentScriptGlobal.__sidofunBrowserExtensionContentScriptInstalled) {
sidofunContentScriptGlobal.__sidofunBrowserExtensionContentScriptInstalled = true;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.protocol !== SIDOFUN_BROWSER_EXTENSION_PROTOCOL) {
    return false;
  }
  if (message.kind === 'content_script_exists') {
    sendResponse({ ok: true, installed: true });
    return false;
  }

  void (async () => {
    try {
      if (await handleXCommand(message, sendResponse, {
        collectXSearchPosts,
        collectXTimelinePosts,
        collectXNotifications,
        collectXMessageThreads,
        openXMessageThread,
        sendXDirectMessage,
        collectXThread,
        sendXPost,
        collectSingleXPost,
        collectXProfile,
        followXProfile,
        sendXReply,
        likeXPost,
        repostXPost
      })) {
        return;
      }

      if (await handleAiCommand(message, sendResponse, {
        startNewChatGptConversation,
        readSidebarState,
        toggleSidebar,
        listModels,
        selectModel,
        readChatGptLatestAssistantMessage,
        listChatGptConversations,
        openChatGptConversation,
        listConversationActions,
        invokeConversationAction,
        renameConversation,
        collectChatGptConversation,
        isChatGptBusy,
        stopChatGptGeneration,
        continueChatGptResponse,
        readChatGptResponseControls,
        openChatGptPreviousResponse,
        openChatGptNextResponse,
        regenerateChatGptResponse,
        editChatGptMessage,
        sendChatGptPrompt,
        readDeepSeekLatestAssistantMessage,
        listDeepSeekConversations,
        openDeepSeekConversation,
        collectDeepSeekConversation,
        startDeepSeekNewChat,
        sendDeepSeekPrompt,
        stopDeepSeekGeneration,
        continueDeepSeekResponse,
        readDeepSeekResponseControls,
        openDeepSeekPreviousResponse,
        openDeepSeekNextResponse,
        regenerateDeepSeekResponse,
        editDeepSeekMessage,
        isDeepSeekBusy
      })) {
        return;
      }

      if (await handleFormCommand(message, sendResponse, {
        listFormFields,
        listFormContexts,
        findFormField,
        fillFormField,
        fillFormFieldHuman,
        fillFormFieldByLabel,
        fillManyFormFields,
        listFormOptions,
        selectFormOption,
        uploadFormFile,
        listComboboxOptions,
        selectComboboxOption,
        submitForm
      })) {
        return;
      }

      if (await handlePageCommand(message, sendResponse, {
        collectVisibleText,
        inspectSelectorInFrames,
        inspectAllInFrames,
        listFrames,
        collectLinksInFrames,
        readMarkdown,
        readReadability,
        evaluateExpression,
        requireElement,
        focusElement,
        setElementValue,
        pressKey,
        readEditor,
        fillEditor
      })) {
        return;
      }

      switch (message.kind) {
      }

      sendResponse({
        ok: false,
        error: `Unsupported content-script command: ${message.kind}`
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  })();
  return true;
});

installDomObserver();
}
