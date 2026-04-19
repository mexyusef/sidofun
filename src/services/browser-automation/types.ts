import type {
  BrowserAutomationMode,
  BrowserId,
  BrowserLaunchOptions,
  BrowserLaunchResult,
  BrowserProfileInfo
} from '../browser/types.js';

export interface BrowserRuntimeCreateOptions extends Omit<BrowserLaunchOptions, 'automationMode'> {
  automationMode?: Exclude<BrowserAutomationMode, 'standard'>;
}

export interface BrowserRuntimeInfo {
  id: string;
  browserId: BrowserId;
  automationMode: Exclude<BrowserAutomationMode, 'standard'>;
  createdAt: string;
  closedAt?: string;
  status: 'running' | 'closed';
  pid?: number;
  debugPort: number;
  remoteDebuggingUrl: string;
  executablePath: string;
  command: string[];
  usedProfile?: BrowserProfileInfo;
  tempUserDataDir?: string;
  windowHandle?: number;
  windowTitle?: string;
  windowBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  windowBindingUpdatedAt?: string;
  launchResult: BrowserLaunchResult;
}

export interface BrowserRuntimeCloseResult {
  id: string;
  closed: boolean;
  status: 'running' | 'closed';
  closedAt?: string;
  pid?: number;
}

export interface BrowserPageInfo {
  id: string;
  runtimeId: string;
  url: string;
  title: string;
  createdAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
}

export type BrowserPageQueryKind = 'field' | 'button' | 'link' | 'any';

export interface BrowserPageQueryMatch {
  selector: string;
  text: string;
  tagName: string;
  type?: string;
  role?: string;
  score: number;
}

export interface BrowserPageLocateResult {
  page: BrowserPageInfo;
  query: string;
  kind: BrowserPageQueryKind;
  exact: boolean;
  matches: BrowserPageQueryMatch[];
}

export interface BrowserPageQueryActionResult {
  page: BrowserPageInfo;
  query?: string;
  value?: string;
  matched: boolean;
  match?: BrowserPageQueryMatch;
}

export interface BrowserPageFormFieldInput {
  query: string;
  value: string;
}

export interface BrowserPageFormWorkflowResult {
  page: BrowserPageInfo;
  fields: Array<BrowserPageFormFieldInput & { matched: boolean; match?: BrowserPageQueryMatch }>;
  submit?: {
    query?: string;
    matched: boolean;
    match?: BrowserPageQueryMatch;
  };
  waits: {
    urlIncludes?: string;
    text?: string;
    selector?: string;
    noSelector?: string;
    matched: boolean;
  };
}

export interface BrowserPageSnapshot extends BrowserPageInfo {
  networkEvents: BrowserNetworkEvent[];
  consoleEvents: BrowserConsoleEvent[];
  eventQueue: BrowserPageEvent[];
}

export interface BrowserPageActionResult {
  page: BrowserPageInfo;
}

export interface BrowserPageContentResult {
  page: BrowserPageInfo;
  content: string;
}

export interface BrowserPageScreenshotResult {
  page: BrowserPageInfo;
  path?: string;
}

export interface BrowserPageEvaluateResult {
  page: BrowserPageInfo;
  value: unknown;
}

export interface BrowserPageWaitResult {
  page: BrowserPageInfo;
  matched: boolean;
  waitFor: 'load' | 'selector' | 'title' | 'url' | 'text';
  query?: string;
}

export interface BrowserPagePdfResult {
  page: BrowserPageInfo;
  path: string;
}

export interface BrowserPageDownloadResult {
  page: BrowserPageInfo;
  path: string;
  url: string;
}

export interface BrowserNetworkEvent {
  pageId: string;
  kind: 'request' | 'response' | 'request-finished' | 'request-failed';
  url: string;
  method?: string;
  status?: number;
  timestamp: string;
  errorText?: string;
}

export interface BrowserConsoleEvent {
  pageId: string;
  type: string;
  text: string;
  timestamp: string;
}

export interface BrowserNetworkWaitResult {
  page: BrowserPageInfo;
  matched: boolean;
  urlIncludes?: string;
  kind?: BrowserNetworkEvent['kind'];
  status?: number;
}

export interface BrowserPageEvent {
  id: number;
  pageId: string;
  category: 'network' | 'console';
  timestamp: string;
  payload: BrowserNetworkEvent | BrowserConsoleEvent;
}

export interface BrowserPageEventCursorResult {
  page: BrowserPageInfo;
  events: BrowserPageEvent[];
  nextCursor: number;
}

export interface BrowserNavigationPolicy {
  enabled: boolean;
  allowList: string[];
  denyList: string[];
}

export interface BrowserPageDomElement {
  index: number;
  selector: string;
  fingerprint: string;
  text: string;
  tagName: string;
  type?: string;
  role?: string;
  path: string;
  interactive: boolean;
  visible: boolean;
  inViewport: boolean;
}

export interface BrowserPageDomSnapshotResult {
  page: BrowserPageInfo;
  elements: BrowserPageDomElement[];
}

export interface BrowserPageScrollResult {
  page: BrowserPageInfo;
  direction: 'up' | 'down' | 'top' | 'bottom';
  query?: string;
  matched: boolean;
}

export interface BrowserPageScrollTextResult {
  page: BrowserPageInfo;
  text: string;
  nth: number;
  matched: boolean;
}

export interface BrowserPageSendKeysResult {
  page: BrowserPageInfo;
  keys: string;
  query?: string;
  matched: boolean;
}

export interface BrowserPageSelectOption {
  value: string;
  text: string;
  selected: boolean;
}

export interface BrowserPageSelectOptionsResult {
  page: BrowserPageInfo;
  query: string;
  matched: boolean;
  options: BrowserPageSelectOption[];
  match?: BrowserPageQueryMatch;
}

export interface BrowserPageSelectOptionResult {
  page: BrowserPageInfo;
  query: string;
  text: string;
  matched: boolean;
  match?: BrowserPageQueryMatch;
}

export interface BrowserPageFileUploaderResult {
  page: BrowserPageInfo;
  query: string;
  matched: boolean;
  isFileUploader: boolean;
  match?: BrowserPageQueryMatch;
}

export interface BrowserPageFillCommitResult {
  page: BrowserPageInfo;
  selector: string;
  value: string;
  matched: boolean;
}

export interface BrowserPageWaitReadyResult {
  page: BrowserPageInfo;
  selectors: string[];
  matched: boolean;
  stableReads: number;
}

export interface BrowserPageClickTextResult {
  page: BrowserPageInfo;
  text: string;
  matched: boolean;
}

export interface BrowserPageAgreementResult {
  page: BrowserPageInfo;
  matched: boolean;
  checked: boolean;
}

export interface BrowserPageSettleResult {
  page: BrowserPageInfo;
  mode: 'dom' | 'page' | 'network';
  matched: boolean;
}

export interface BrowserPageCompleteProfileResult {
  page: BrowserPageInfo;
  username: string;
  fullName: string;
  usernameFilled: boolean;
  fullNameFilled: boolean;
  agreementChecked: boolean;
  submitClicked: boolean;
  matched: boolean;
}

export interface BrowserPageSignupStepResult {
  page: BrowserPageInfo;
  email: string;
  emailFilled: boolean;
  passwordFilled: boolean;
  submitClicked: boolean;
  matched: boolean;
}

export interface BrowserPageRecordedAction {
  kind:
    | 'open'
    | 'fill'
    | 'click'
    | 'submit'
    | 'wait_text'
    | 'wait_url'
    | 'scroll'
    | 'scroll_text'
    | 'send_keys'
    | 'select_option'
    | 'done';
  query?: string;
  value?: string;
  url?: string;
  text?: string;
  keys?: string;
  direction?: 'up' | 'down' | 'top' | 'bottom';
  nth?: number;
  fingerprint?: string;
  selector?: string;
  exact?: boolean;
  formSelector?: string;
  rootSelector?: string;
}

export interface BrowserPageReplayResult {
  page: BrowserPageInfo;
  steps: Array<{
    action: BrowserPageRecordedAction;
    matched: boolean;
    detail?: unknown;
  }>;
}

export interface BrowserAgentPlanStep {
  goal: string;
  actions: BrowserPageRecordedAction[];
}

export interface BrowserAgentRunResult {
  runtimeId: string;
  goal?: string;
  page?: BrowserPageInfo;
  completed: boolean;
  plannerSteps: number;
  navigatorActions: number;
  failures: number;
  steps: Array<{
    goal: string;
    ok: boolean;
    actions: Array<{
      kind: BrowserPageRecordedAction['kind'];
      matched: boolean;
      detail?: unknown;
    }>;
  }>;
}
