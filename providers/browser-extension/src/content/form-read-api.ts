import type { FormApiDeps } from './form-types.js';

export function createFormReadApi(deps: FormApiDeps) {
  function summarizeFormField(element: Element, frameSelectors?: string[]) {
    const html = element as HTMLElement;
    const form = html.closest('form');
    let fieldType: 'input' | 'textarea' | 'select' | 'contenteditable' = 'input';
    let optionCount: number | undefined;
    let accept: string | undefined;
    if (element instanceof HTMLTextAreaElement) {
      fieldType = 'textarea';
    } else if (element instanceof HTMLSelectElement) {
      fieldType = 'select';
      optionCount = element.options.length;
    } else if (html.isContentEditable) {
      fieldType = 'contenteditable';
    }
    if (element instanceof HTMLInputElement) {
      accept = element.accept || undefined;
    }
    return {
      ...deps.summarizeElement(element, deps.buildElementSelector(element)),
      selector: deps.buildElementSelector(element),
      frameSelectors,
      fieldType,
      required: html.hasAttribute('required'),
      labels: deps.readAssociatedLabels(element),
      formSelector: form instanceof HTMLFormElement ? deps.buildFormSelector(form) : undefined,
      formAction: form?.getAttribute('action') || undefined,
      optionCount,
      accept
    };
  }

  function listFormFields(limit = 50, frameSelectors?: string[]) {
    const root = deps.withDocumentRoot(frameSelectors);
    const selectors = ['input:not([type="hidden"])', 'textarea', 'select', '[contenteditable="true"]', '[role="textbox"][contenteditable]'];
    const seen = new Set<Element>();
    const fields: any[] = [];
    for (const selector of selectors) {
      for (const element of Array.from(root.querySelectorAll(selector))) {
        if (seen.has(element)) continue;
        seen.add(element);
        fields.push(summarizeFormField(element, frameSelectors));
        if (fields.length >= limit) return fields;
      }
    }
    return fields;
  }

  function listFormContexts(limit = 50, frameSelectors?: string[]) {
    const root = deps.withDocumentRoot(frameSelectors);
    const forms = Array.from(root.querySelectorAll('form'));
    const contexts = forms.slice(0, limit).map((form) => {
      const formElement = form as HTMLFormElement;
      const fields = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"][contenteditable]'))
        .slice(0, 100)
        .map((element) => summarizeFormField(element, frameSelectors))
        .map((field: any) => ({
          selector: field.selector,
          labels: field.labels,
          name: field.name,
          type: field.type,
          fieldType: field.fieldType,
          placeholder: field.placeholder,
          required: field.required
        }));
      const submitSelectors = Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"], button, [role="button"]'))
        .filter((element) => deps.isVisibleElement(element))
        .map((element) => deps.buildElementSelector(element))
        .slice(0, 10);
      return {
        frameSelectors,
        formSelector: deps.buildFormSelector(formElement),
        formAction: formElement.getAttribute('action') || undefined,
        formMethod: formElement.getAttribute('method') || undefined,
        fieldCount: fields.length,
        submitSelectors,
        fields
      };
    });
    if (contexts.length > 0) {
      return contexts;
    }
    const looseFields = listFormFields(limit, frameSelectors);
    if (looseFields.length === 0) {
      return [];
    }
    return [{
      frameSelectors,
      formSelector: undefined,
      formAction: undefined,
      formMethod: undefined,
      fieldCount: looseFields.length,
      submitSelectors: [],
      fields: looseFields.map((field: any) => ({
        selector: field.selector,
        labels: field.labels,
        name: field.name,
        type: field.type,
        fieldType: field.fieldType,
        placeholder: field.placeholder,
        required: field.required
      }))
    }];
  }

  function findFormField(query: string, frameSelectors?: string[], exact = false, preferredFormSelector?: string) {
    const normalized = query.trim().toLowerCase();
    const predicate = (value?: string) => {
      if (!value) return false;
      const candidate = value.trim().toLowerCase();
      return exact ? candidate === normalized : candidate.includes(normalized);
    };
    for (const field of listFormFields(200, frameSelectors)) {
      if (preferredFormSelector && (field as any).formSelector !== preferredFormSelector) {
        continue;
      }
      if ((field as any).labels?.some(predicate)) return { ...field, matchedBy: 'label', query };
      if (predicate((field as any).name)) return { ...field, matchedBy: 'name', query };
      if (predicate((field as any).placeholder)) return { ...field, matchedBy: 'placeholder', query };
      if (predicate((field as any).text)) return { ...field, matchedBy: 'text', query };
      if (predicate((field as any).selector)) return { ...field, matchedBy: 'selector', query };
    }
    return null;
  }

  function listFormOptions(selector: string, frameSelectors?: string[], limit = 100) {
    const element = deps.findVisibleElement(selector, frameSelectors);
    if (!(element instanceof HTMLSelectElement)) {
      return [];
    }
    return Array.from(element.options).slice(0, limit).map((option, index) => ({
      index,
      text: option.text.trim(),
      value: option.value,
      selected: option.selected,
      disabled: option.disabled
    }));
  }

  function listComboboxOptions(selector: string, frameSelectors?: string[], limit = 50) {
    const element = deps.findVisibleElement(selector, frameSelectors);
    const html = element as HTMLElement;
    deps.clickElementLikeUser(html);
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || html.isContentEditable) {
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const root = deps.withDocumentRoot(frameSelectors);
    const controls = Array.from(root.querySelectorAll<HTMLElement>('[role="option"], [data-option-index], li[role="option"], [cmdk-item], [aria-selected]'));
    const visibleControls = controls.filter((node) => deps.isVisibleElement(node));
    const candidates = visibleControls.length > 0 ? visibleControls : controls;
    return candidates.slice(0, limit).map((node, index) => ({
      index,
      text: node.innerText?.trim() || node.textContent?.trim() || '',
      value: node.getAttribute('data-value') || node.getAttribute('value') || node.getAttribute('aria-label') || node.innerText?.trim() || node.textContent?.trim() || '',
      selected: node.getAttribute('aria-selected') === 'true',
      disabled: node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true'
    })).filter((entry) => entry.text.length > 0 || entry.value.length > 0);
  }

  return {
    summarizeFormField,
    listFormFields,
    listFormContexts,
    findFormField,
    listFormOptions,
    listComboboxOptions,
  };
}
