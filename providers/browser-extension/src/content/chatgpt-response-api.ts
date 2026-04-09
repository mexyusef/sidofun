import type { AiProviderSiteDeps } from './ai-provider-types.js';

export function createChatGptResponseApi(deps: AiProviderSiteDeps) {
  function isChatGptBusy() {
    return Boolean(
      document.querySelector(
        'button[aria-label*="Stop"], button[aria-label*="stop"], [data-testid="stop-button"], button[data-testid="stop-button"]'
      )
    );
  }

  function stopChatGptGeneration() {
    const button = document.querySelector<HTMLElement>(
      'button[aria-label*="Stop"], button[aria-label*="stop"], [data-testid="stop-button"], button[data-testid="stop-button"]'
    ) ?? deps.findButtonByLabelNeedles(['stop generating', 'stop response', 'stop']);
    if (!button) {
      throw new Error('ChatGPT stop control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function regenerateChatGptResponse() {
    const button = deps.findButtonByLabelNeedles(['regenerate', 'try again', 'retry']);
    if (!button) {
      throw new Error('ChatGPT regenerate control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function continueChatGptResponse() {
    const button = deps.findButtonByLabelNeedles(['continue generating', 'continue response', 'continue']);
    if (!button) {
      throw new Error('ChatGPT continue control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function readChatGptResponseControls() {
    const previousButton = deps.findButtonsByLabelNeedles(['previous response', 'previous answer', 'previous'])[0];
    const nextButton = deps.findButtonsByLabelNeedles(['next response', 'next answer', 'next'])[0];
    return {
      previousAvailable: Boolean(previousButton) && !deps.isDisabledControl(previousButton),
      nextAvailable: Boolean(nextButton) && !deps.isDisabledControl(nextButton),
      previousLabel: previousButton
        ? previousButton.getAttribute('aria-label') || previousButton.getAttribute('title') || previousButton.innerText.trim() || undefined
        : undefined,
      nextLabel: nextButton
        ? nextButton.getAttribute('aria-label') || nextButton.getAttribute('title') || nextButton.innerText.trim() || undefined
        : undefined
    };
  }

  function openChatGptPreviousResponse() {
    const button = deps.findButtonsByLabelNeedles(['previous response', 'previous answer', 'previous'])
      .find((candidate) => !deps.isDisabledControl(candidate));
    if (!button) {
      throw new Error('ChatGPT previous response control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function openChatGptNextResponse() {
    const button = deps.findButtonsByLabelNeedles(['next response', 'next answer', 'next'])
      .find((candidate) => !deps.isDisabledControl(candidate));
    if (!button) {
      throw new Error('ChatGPT next response control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function readChatGptLatestAssistantMessage() {
    const assistantBlocks = Array.from(document.querySelectorAll<HTMLElement>('[data-message-author-role="assistant"]'));
    const lastAssistant = assistantBlocks[assistantBlocks.length - 1];
    if (lastAssistant) {
      return lastAssistant.innerText.trim();
    }
    const proseBlocks = Array.from(document.querySelectorAll<HTMLElement>(
      'main [data-testid*="conversation"], main [data-testid*="response"], main .prose, main .markdown, main article'
    ));
    return proseBlocks.map((node) => node.innerText.trim()).filter(Boolean).slice(-1)[0] ?? '';
  }

  return {
    isChatGptBusy,
    stopChatGptGeneration,
    regenerateChatGptResponse,
    continueChatGptResponse,
    readChatGptResponseControls,
    openChatGptPreviousResponse,
    openChatGptNextResponse,
    readChatGptLatestAssistantMessage,
  };
}
