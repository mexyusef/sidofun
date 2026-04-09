type ContentMessage = Record<string, unknown>;
type SendResponse = (response: Record<string, unknown>) => void;

interface UploadPayload {
  name: string;
  type?: string;
  data: string;
  lastModified?: number;
}

interface FillManyField {
  selector: string;
  value: string;
  frameSelectors?: string[];
}

interface FormCommandDeps {
  listFormFields: (limit: number, frameSelectors?: string[]) => unknown;
  listFormContexts: (limit: number, frameSelectors?: string[]) => unknown;
  findFormField: (query: string, frameSelectors?: string[], exact?: boolean, preferredFormSelector?: string) => unknown;
  fillFormField: (selector: string, value: string, frameSelectors?: string[]) => unknown;
  fillFormFieldHuman: (
    selector: string,
    value: string,
    frameSelectors?: string[],
    delayMs?: number,
    jitterMs?: number
  ) => Promise<unknown>;
  fillFormFieldByLabel: (query: string, value: string, frameSelectors?: string[], exact?: boolean) => unknown;
  fillManyFormFields: (fields: FillManyField[]) => unknown;
  listFormOptions: (selector: string, frameSelectors?: string[], limit?: number) => unknown;
  selectFormOption: (selector: string, option: string, by: 'text' | 'value' | 'label', frameSelectors?: string[]) => Record<string, unknown> | undefined;
  uploadFormFile: (selector: string, file: UploadPayload, frameSelectors?: string[]) => unknown;
  listComboboxOptions: (selector: string, frameSelectors?: string[], limit?: number) => unknown;
  selectComboboxOption: (selector: string, option: string, match: 'exact' | 'includes', frameSelectors?: string[]) => Record<string, unknown> | undefined;
  submitForm: (selector?: string, frameSelectors?: string[]) => Record<string, unknown>;
}

function parseLimit(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseFrameSelectors(message: ContentMessage) {
  return Array.isArray(message.frameSelectors)
    ? message.frameSelectors.filter((entry): entry is string => typeof entry === 'string')
    : undefined;
}

function parseFillManyFields(message: ContentMessage): FillManyField[] {
  return Array.isArray(message.fields)
    ? message.fields.filter((entry): entry is FillManyField => (
        Boolean(entry)
        && typeof entry.selector === 'string'
        && typeof entry.value === 'string'
      ))
    : [];
}

export async function handleFormCommand(
  message: ContentMessage,
  sendResponse: SendResponse,
  deps: FormCommandDeps
) {
  const frameSelectors = parseFrameSelectors(message);

  switch (message.kind) {
    case 'form_fields':
      sendResponse({ ok: true, fields: deps.listFormFields(parseLimit(message.limit, 50), frameSelectors) });
      return true;

    case 'form_contexts':
      sendResponse({ ok: true, contexts: deps.listFormContexts(parseLimit(message.limit, 50), frameSelectors) });
      return true;

    case 'form_find_field':
      sendResponse({
        ok: true,
        field: deps.findFormField(
          String(message.query || ''),
          frameSelectors,
          message.exact === true,
          typeof message.preferredFormSelector === 'string' ? message.preferredFormSelector : undefined
        )
      });
      return true;

    case 'form_fill':
      sendResponse({
        ok: true,
        field: deps.fillFormField(String(message.selector || ''), String(message.value ?? message.text ?? ''), frameSelectors)
      });
      return true;

    case 'form_fill_human':
      sendResponse({
        ok: true,
        field: await deps.fillFormFieldHuman(
          String(message.selector || ''),
          String(message.value ?? message.text ?? ''),
          frameSelectors,
          typeof message.delayMs === 'number' ? message.delayMs : undefined,
          typeof message.jitterMs === 'number' ? message.jitterMs : undefined
        )
      });
      return true;

    case 'form_fill_label':
      sendResponse({
        ok: true,
        field: deps.fillFormFieldByLabel(
          String(message.query || ''),
          String(message.value ?? message.text ?? ''),
          frameSelectors,
          message.exact === true
        )
      });
      return true;

    case 'form_fill_many':
      sendResponse({ ok: true, fields: deps.fillManyFormFields(parseFillManyFields(message)) });
      return true;

    case 'form_options':
      sendResponse({
        ok: true,
        options: deps.listFormOptions(String(message.selector || ''), frameSelectors, parseLimit(message.limit, 100))
      });
      return true;

    case 'form_select':
      sendResponse({
        ok: true,
        ...(deps.selectFormOption(
          String(message.selector || ''),
          String(message.option || message.value || ''),
          String(message.by || 'text') === 'value'
            ? 'value'
            : String(message.by || 'text') === 'label'
              ? 'label'
              : 'text',
          frameSelectors
        ) ?? {})
      });
      return true;

    case 'form_upload':
      sendResponse({
        ok: true,
        field: deps.uploadFormFile(
          String(message.selector || ''),
          {
            name: String(message.fileName || 'upload.bin'),
            type: typeof message.mimeType === 'string' ? message.mimeType : undefined,
            data: String(message.fileData || ''),
            lastModified: typeof message.lastModified === 'number' ? message.lastModified : undefined
          },
          frameSelectors
        )
      });
      return true;

    case 'form_combobox_options':
      sendResponse({
        ok: true,
        options: deps.listComboboxOptions(String(message.selector || ''), frameSelectors, parseLimit(message.limit, 50))
      });
      return true;

    case 'form_combobox_select':
      sendResponse({
        ok: true,
        ...(deps.selectComboboxOption(
          String(message.selector || ''),
          String(message.option || message.value || ''),
          String(message.match || 'includes') === 'exact' ? 'exact' : 'includes',
          frameSelectors
        ) ?? {})
      });
      return true;

    case 'form_submit':
      sendResponse({
        ok: true,
        ...deps.submitForm(typeof message.selector === 'string' ? message.selector : undefined, frameSelectors)
      });
      return true;

    default:
      return false;
  }
}
