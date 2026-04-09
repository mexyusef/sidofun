import { decodeBase64ToUint8Array, type FormApiDeps } from './form-types.js';

interface FormReadApiLike {
  findFormField: (query: string, frameSelectors?: string[], exact?: boolean, preferredFormSelector?: string) => any;
  listComboboxOptions: (selector: string, frameSelectors?: string[], limit?: number) => any[];
}

export function createFormActionApi(deps: FormApiDeps, readApi: FormReadApiLike) {
  function fillFormField(selector: string, value: string, frameSelectors?: string[]) {
    const element = deps.findVisibleElement(selector, frameSelectors);
    if (element instanceof HTMLInputElement) {
      const type = (element.type || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio') {
        const nextChecked = deps.parseBooleanLike(value);
        if (element.checked !== nextChecked) {
          deps.clickElementLikeUser(element);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        deps.setNativeInputValue(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (element instanceof HTMLTextAreaElement || (element as HTMLElement).isContentEditable) {
      deps.setElementValue(element, value);
    } else if (element instanceof HTMLSelectElement) {
      const option = Array.from(element.options).find((entry) =>
        [entry.value, entry.label, entry.text].some((candidate) => candidate.trim().toLowerCase() === value.trim().toLowerCase())
      );
      if (!option) {
        return null;
      }
      element.value = option.value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      return null;
    }
    return {
      ...deps.summarizeElement(element, selector),
      selector,
      frameSelectors,
      filled: true
    };
  }

  function fillFormFieldByLabel(query: string, value: string, frameSelectors?: string[], exact = false) {
    const field = readApi.findFormField(query, frameSelectors, exact);
    if (!(field as any)?.selector) return null;
    const result = fillFormField((field as any).selector, value, frameSelectors);
    return result ? { ...result, matchedBy: (field as any).matchedBy, query } : null;
  }

  async function fillFormFieldHuman(selector: string, value: string, frameSelectors?: string[], delayMs = 60, jitterMs = 20) {
    const element = deps.findVisibleElement(selector, frameSelectors);
    if (element instanceof HTMLInputElement) {
      const type = (element.type || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio' || type === 'file' || type === 'select-one') {
        const result = fillFormField(selector, value, frameSelectors);
        return result ? { ...result, humanLike: true } : null;
      }
    }
    const pauses = Math.max(1, Math.min(value.length, 12));
    for (let index = 0; index < pauses; index += 1) {
      await deps.sleep(deps.resolveHumanDelay(delayMs, jitterMs));
    }
    const result = fillFormField(selector, value, frameSelectors);
    return result ? { ...result, humanLike: true } : null;
  }

  function fillManyFormFields(fields: Array<{ selector: string; value: string; frameSelectors?: string[] }>) {
    return fields.map((field) => fillFormField(field.selector, field.value, field.frameSelectors)).filter(Boolean);
  }

  function selectFormOption(selector: string, optionQuery: string, by: 'text' | 'value' | 'label' = 'text', frameSelectors?: string[]) {
    const element = deps.findVisibleElement(selector, frameSelectors);
    if (!(element instanceof HTMLSelectElement)) {
      return null;
    }
    const option = Array.from(element.options).find((entry) => {
      if (by === 'value') return entry.value.trim().toLowerCase() === optionQuery.trim().toLowerCase();
      if (by === 'label') return entry.label.trim().toLowerCase() === optionQuery.trim().toLowerCase();
      return entry.text.trim().toLowerCase() === optionQuery.trim().toLowerCase();
    });
    if (!option) return null;
    element.value = option.value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      field: {
        ...deps.summarizeElement(element, selector),
        selector,
        frameSelectors,
        filled: true
      },
      option: {
        index: Array.from(element.options).indexOf(option),
        text: option.text.trim(),
        value: option.value,
        selected: option.selected,
        disabled: option.disabled
      }
    };
  }

  function submitForm(selector?: string, frameSelectors?: string[]) {
    const root = deps.withDocumentRoot(frameSelectors);
    if (selector) {
      const target = deps.findVisibleElement(selector, frameSelectors);
      if (target instanceof HTMLElement) {
        deps.clickElementLikeUser(target);
        return { submitted: true, method: 'click', selector };
      }
    }
    const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button', '[role="button"]'];
    for (const candidate of submitSelectors) {
      const element = Array.from(root.querySelectorAll<HTMLElement>(candidate)).find((entry) => deps.isVisibleElement(entry) && !(entry as HTMLButtonElement).disabled);
      if (element) {
        deps.clickElementLikeUser(element);
        return {
          submitted: true,
          method: 'click',
          selector: candidate,
          formAction: element.closest('form')?.getAttribute('action') || undefined
        };
      }
    }
    const form = root.querySelector('form');
    if (form instanceof HTMLFormElement) {
      form.requestSubmit?.();
      return { submitted: true, method: 'requestSubmit', formAction: form.getAttribute('action') || undefined };
    }
    return { submitted: false };
  }

  function uploadFormFile(selector: string, file: { name: string; type?: string; data: string; lastModified?: number }, frameSelectors?: string[]) {
    const element = deps.findVisibleElement(selector, frameSelectors);
    if (!(element instanceof HTMLInputElement) || element.type !== 'file') {
      return null;
    }
    const bytes = decodeBase64ToUint8Array(file.data);
    const uploadedFile = new File([bytes], file.name, {
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified ?? Date.now()
    });
    const transfer = new DataTransfer();
    transfer.items.add(uploadedFile);
    element.files = transfer.files;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      ...deps.summarizeElement(element, selector),
      selector,
      frameSelectors,
      filled: true,
      uploadedFile: {
        name: uploadedFile.name,
        size: uploadedFile.size,
        type: uploadedFile.type || undefined,
        lastModified: uploadedFile.lastModified
      }
    };
  }

  function selectComboboxOption(selector: string, optionQuery: string, match: 'exact' | 'includes' = 'includes', frameSelectors?: string[]) {
    const element = deps.findVisibleElement(selector, frameSelectors);
    const html = element as HTMLElement;
    deps.clickElementLikeUser(html);
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || html.isContentEditable) {
      deps.setElementValue(element, optionQuery);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const candidates = readApi.listComboboxOptions(selector, frameSelectors, 100);
    const normalized = optionQuery.trim().toLowerCase();
    const option = candidates.find((entry) =>
      match === 'exact'
        ? entry.text.trim().toLowerCase() === normalized || entry.value.trim().toLowerCase() === normalized
        : entry.text.trim().toLowerCase().includes(normalized) || entry.value.trim().toLowerCase().includes(normalized)
    );
    if (!option) {
      return null;
    }
    const root = deps.withDocumentRoot(frameSelectors);
    const controls = Array.from(root.querySelectorAll<HTMLElement>('[role="option"], [data-option-index], li[role="option"], [cmdk-item], [aria-selected]'));
    const matchNode = controls.find((node) => {
      const text = node.innerText?.trim() || node.textContent?.trim() || '';
      const value = node.getAttribute('data-value') || node.getAttribute('value') || node.getAttribute('aria-label') || text;
      return text === option.text || value === option.value;
    });
    if (matchNode) {
      deps.clickElementLikeUser(matchNode);
    }
    return { option, selected: true };
  }

  return {
    fillFormField,
    fillFormFieldHuman,
    fillFormFieldByLabel,
    fillManyFormFields,
    selectFormOption,
    submitForm,
    uploadFormFile,
    selectComboboxOption,
  };
}
