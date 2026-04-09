import type { AiProviderSiteDeps } from './ai-provider-types.js';

export function createDeepSeekResponseApi(deps: AiProviderSiteDeps) {
  function isDeepSeekBusy() {
    return Boolean(
      document.querySelector(
        'button[aria-label*="Stop"], button[aria-label*="stop"], [data-testid="stop-button"], button[data-testid="stop-button"], button[title*="Stop"]'
      )
    );
  }

  function stopDeepSeekGeneration() {
    const button = document.querySelector<HTMLElement>(
      'button[aria-label*="Stop"], button[aria-label*="stop"], [data-testid="stop-button"], button[data-testid="stop-button"], button[title*="Stop"]'
    ) ?? deps.findButtonByLabelNeedles(['stop generating', 'stop response', 'stop']);
    if (!button) {
      throw new Error('DeepSeek stop control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function regenerateDeepSeekResponse() {
    const button = deps.findButtonByLabelNeedles(['regenerate', 'try again', 'retry']);
    if (!button) {
      throw new Error('DeepSeek regenerate control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function continueDeepSeekResponse() {
    const button = deps.findButtonByLabelNeedles(['continue generating', 'continue response', 'continue']);
    if (!button) {
      throw new Error('DeepSeek continue control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function readDeepSeekResponseControls() {
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

  function openDeepSeekPreviousResponse() {
    const button = deps.findButtonsByLabelNeedles(['previous response', 'previous answer', 'previous'])
      .find((candidate) => !deps.isDisabledControl(candidate));
    if (!button) {
      throw new Error('DeepSeek previous response control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function openDeepSeekNextResponse() {
    const button = deps.findButtonsByLabelNeedles(['next response', 'next answer', 'next'])
      .find((candidate) => !deps.isDisabledControl(candidate));
    if (!button) {
      throw new Error('DeepSeek next response control was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  function readDeepSeekLatestAssistantMessage() {
    const assistantBlocks = Array.from(document.querySelectorAll<HTMLElement>(
      '[data-role="assistant"], [data-message-author-role="assistant"], [class*="assistant"]'
    ))
      .map((node) => node.innerText.trim())
      .filter(Boolean);
    if (assistantBlocks.length > 0) {
      return assistantBlocks[assistantBlocks.length - 1]!;
    }
    const proseBlocks = Array.from(document.querySelectorAll<HTMLElement>(
      'main [data-role], main [data-message-author-role], main article, main .markdown, main .prose'
    ));
    return proseBlocks.map((node) => node.innerText.trim()).filter(Boolean).slice(-1)[0] ?? '';
  }

  return {
    isDeepSeekBusy,
    stopDeepSeekGeneration,
    regenerateDeepSeekResponse,
    continueDeepSeekResponse,
    readDeepSeekResponseControls,
    openDeepSeekPreviousResponse,
    openDeepSeekNextResponse,
    readDeepSeekLatestAssistantMessage,
  };
}
