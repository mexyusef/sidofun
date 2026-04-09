import type { AiProviderSiteDeps } from './ai-provider-types.js';

export function createDeepSeekComposerApi(deps: AiProviderSiteDeps) {
  function findDeepSeekComposer() {
    return deps.findFirstVisibleElement<HTMLElement>([
      'textarea',
      '[data-testid="chat-input"] textarea',
      '[data-testid="chat-input"]',
      '[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"]'
    ]) ?? document.querySelector(
      'textarea, div[contenteditable="true"], [role="textbox"][contenteditable="true"], [data-testid="chat-input"]'
    );
  }

  function findDeepSeekNewChatButton() {
    return document.querySelector<HTMLElement>(
      'button[aria-label*="New chat"], a[aria-label*="New chat"], [data-testid="new-chat-button"], [data-testid="newChatButton"]'
    );
  }

  function startDeepSeekNewChat() {
    const button = findDeepSeekNewChatButton();
    if (!button) {
      throw new Error('DeepSeek new chat control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function sendDeepSeekPrompt(text: string) {
    const composer = findDeepSeekComposer();
    if (!composer) {
      throw new Error('DeepSeek composer was not found');
    }
    deps.setElementValue(composer, text);
    const composerRect = composer.getBoundingClientRect();
    const submitButton = Array.from(document.querySelectorAll<HTMLElement>(
      'button[aria-label*="Send"], button[aria-label*="send"], button[type="submit"], [data-testid="send-button"], [role="button"][aria-label*="Send"], [role="button"][aria-label*="send"], [role="button"][data-testid="send-button"], div[role="button"], [role="button"]'
    )).filter((element) => deps.isVisibleElement(element))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const disabled = deps.isDisabledControl(element);
        const label = [
          element.getAttribute('aria-label'),
          element.getAttribute('title'),
          element.getAttribute('data-testid'),
          element.innerText
        ].filter(Boolean).join(' ').toLowerCase();
        const dx = Math.abs(rect.x - (composerRect.right - rect.width));
        const dy = Math.abs(rect.y - (composerRect.y + composerRect.height - rect.height));
        return {
          element,
          disabled,
          label,
          dx,
          dy,
          rect,
          score: (label.includes('send') || label.includes('submit') ? -200 : 0)
            + dy + dx + (rect.x >= composerRect.right - 100 ? 0 : 120)
        };
      })
      .filter((entry) =>
        !entry.disabled
        && entry.rect.y >= composerRect.y - 40
        && entry.rect.y <= composerRect.bottom + 80
        && entry.rect.x >= composerRect.left
        && (entry.label.includes('send') || entry.label.includes('submit') || entry.label.includes('arrow') || entry.rect.x >= composerRect.right - 120)
      )
      .sort((left, right) => left.score - right.score)[0]?.element;
    if (submitButton) {
      deps.clickElementLikeUser(submitButton);
      return;
    }
    deps.pressKey(composer, 'Enter');
  }

  return {
    findDeepSeekComposer,
    findDeepSeekNewChatButton,
    startDeepSeekNewChat,
    sendDeepSeekPrompt,
  };
}
