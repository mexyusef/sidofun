import type { AiProviderSiteDeps } from './ai-provider-types.js';

export function createChatGptComposerApi(deps: AiProviderSiteDeps) {
  function findChatGptComposer() {
    return deps.findFirstVisibleElement<HTMLElement>([
      'div#prompt-textarea[contenteditable="true"]',
      'div.ProseMirror#prompt-textarea',
      '[role="textbox"]#prompt-textarea',
      'div[contenteditable="true"][data-testid="prompt-textarea"]',
      'div[contenteditable="true"][aria-label*="Message"]',
      'div[contenteditable="true"][aria-label*="Send a message"]',
      'div[contenteditable="true"]',
      'textarea[data-testid="prompt-textarea"]',
      'textarea'
    ]) ?? document.querySelector(
      'div#prompt-textarea[contenteditable="true"], div.ProseMirror#prompt-textarea, [role="textbox"]#prompt-textarea, div[contenteditable="true"][data-testid="prompt-textarea"], textarea[data-testid="prompt-textarea"], #prompt-textarea, textarea, div[contenteditable="true"]'
    );
  }

  function findChatGptNewChatButton() {
    return document.querySelector<HTMLElement>(
      'a[href="/"], button[aria-label*="New chat"], a[aria-label*="New chat"], [data-testid="new-chat-button"]'
    );
  }

  function startNewChatGptConversation() {
    const button = findChatGptNewChatButton();
    if (!button) {
      throw new Error('ChatGPT new chat control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function sendChatGptPrompt(text: string) {
    const composer = findChatGptComposer();
    if (!composer) {
      throw new Error('ChatGPT composer was not found');
    }
    deps.setElementValue(composer, text);
    if ((composer.innerText || composer.textContent || '').trim().length === 0) {
      throw new Error('ChatGPT visible composer did not receive the prompt text');
    }
    const submitButton = Array.from(document.querySelectorAll<HTMLElement>(
      'button.composer-submit-button-color, button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="send"], [role="button"][aria-label*="Send"], [role="button"][data-testid="send-button"]'
    )).find((element) => deps.isVisibleElement(element) && !deps.isDisabledControl(element));
    if (submitButton && !submitButton.hasAttribute('disabled')) {
      deps.clickElementLikeUser(submitButton);
      return;
    }
    deps.pressKey(composer, 'Enter');
  }

  return {
    findChatGptComposer,
    findChatGptNewChatButton,
    startNewChatGptConversation,
    sendChatGptPrompt,
  };
}
