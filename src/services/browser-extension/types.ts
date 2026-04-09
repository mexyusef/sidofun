export type BrowserExtensionCommandKind =
  | 'open_session'
  | 'navigate'
  | 'go_back'
  | 'go_forward'
  | 'reload'
  | 'metadata'
  | 'storage_list'
  | 'storage_get'
  | 'storage_set'
  | 'storage_remove'
  | 'list_tabs'
  | 'frames'
  | 'focus_tab'
  | 'snapshot'
  | 'scroll_page'
  | 'dom_tree'
  | 'screenshot'
  | 'inspect'
  | 'inspect_all'
  | 'links'
  | 'actionables'
  | 'page_state'
  | 'markdown'
  | 'readability'
  | 'dialogs'
  | 'dialog_actions'
  | 'banners'
  | 'banner_dismiss'
  | 'loading_states'
  | 'empty_states'
  | 'dialog_close'
  | 'dialog_action'
  | 'menus'
  | 'menu_select'
  | 'disclosures'
  | 'disclosure_toggle'
  | 'collections'
  | 'collection_controls'
  | 'collection_active_filters'
  | 'collection_filter_tokens'
  | 'collection_rows'
  | 'collection_row_actions'
  | 'collection_selection_state'
  | 'collection_click'
  | 'collection_row_click'
  | 'collection_row_select'
  | 'collection_select_all'
  | 'collection_row_details'
  | 'collection_row_expand'
  | 'collection_sort'
  | 'collection_filter'
  | 'collection_filter_clear'
  | 'collection_filter_token_clear'
  | 'paginations'
  | 'pagination_click'
  | 'load_more'
  | 'form_contexts'
  | 'evaluate'
  | 'click'
  | 'click_human'
  | 'focus'
  | 'blur'
  | 'type'
  | 'press'
  | 'editor_fill'
  | 'editor_read'
  | 'form_fill'
  | 'form_fill_human'
  | 'form_clear'
  | 'form_validation'
  | 'form_fill_many'
  | 'form_fields'
  | 'form_find_field'
  | 'form_radio_groups'
  | 'form_radio_select'
  | 'form_segmented_options'
  | 'form_segmented_select'
  | 'form_tablist_options'
  | 'form_tablist_select'
  | 'form_stepper'
  | 'form_stepper_move'
  | 'form_date_set'
  | 'form_time_set'
  | 'form_datetime_set'
  | 'form_toggle'
  | 'form_range_set'
  | 'form_options'
  | 'form_fill_label'
  | 'form_select'
  | 'form_commit'
  | 'form_upload'
  | 'form_combobox_options'
  | 'form_combobox_select'
  | 'form_submit'
  | 'form_submit_wait'
  | 'cookies'
  | 'cookie_get'
  | 'cookie_set'
  | 'cookie_remove'
  | 'downloads'
  | 'download_cancel'
  | 'download_erase'
  | 'dom_events'
  | 'clear_dom_events'
  | 'x_search'
  | 'x_timeline'
  | 'x_bookmarks'
  | 'x_notifications'
  | 'x_messages'
  | 'x_open_message_thread'
  | 'x_send_message'
  | 'x_read_thread'
  | 'x_post'
  | 'x_open_post'
  | 'x_profile'
  | 'x_follow'
  | 'x_reply'
  | 'x_like'
  | 'x_repost'
  | 'chatgpt_new_chat'
  | 'chatgpt_sidebar_state'
  | 'chatgpt_toggle_sidebar'
  | 'chatgpt_models'
  | 'chatgpt_select_model'
  | 'chatgpt_list_conversations'
  | 'chatgpt_open_conversation'
  | 'chatgpt_conversation_actions'
  | 'chatgpt_conversation_action'
  | 'chatgpt_rename_conversation'
  | 'chatgpt_read_thread'
  | 'chatgpt_read_latest'
  | 'chatgpt_busy'
  | 'chatgpt_stop'
  | 'chatgpt_continue'
  | 'chatgpt_response_controls'
  | 'chatgpt_previous_response'
  | 'chatgpt_next_response'
  | 'chatgpt_regenerate'
  | 'chatgpt_edit_message'
  | 'chatgpt_send'
  | 'chatgpt_ask'
  | 'chatgpt_wait_idle'
  | 'deepseek_new_chat'
  | 'deepseek_sidebar_state'
  | 'deepseek_toggle_sidebar'
  | 'deepseek_models'
  | 'deepseek_select_model'
  | 'deepseek_list_conversations'
  | 'deepseek_open_conversation'
  | 'deepseek_conversation_actions'
  | 'deepseek_conversation_action'
  | 'deepseek_rename_conversation'
  | 'deepseek_read_thread'
  | 'deepseek_read_latest'
  | 'deepseek_busy'
  | 'deepseek_stop'
  | 'deepseek_continue'
  | 'deepseek_response_controls'
  | 'deepseek_previous_response'
  | 'deepseek_next_response'
  | 'deepseek_regenerate'
  | 'deepseek_edit_message'
  | 'deepseek_send'
  | 'deepseek_ask'
  | 'deepseek_wait_idle'
  | 'network_events'
  | 'clear_network_events';

export interface BrowserExtensionWorkspace {
  name: string;
  path: string;
  sites?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrowserExtensionTab {
  id: number;
  windowId?: number;
  url?: string;
  title?: string;
  active?: boolean;
  status?: string;
  favIconUrl?: string;
}

export interface BrowserExtensionFrame {
  path: string[];
  selector?: string;
  tagName?: string;
  name?: string;
  title?: string;
  url?: string;
  visible?: boolean;
  width?: number;
  height?: number;
  depth: number;
}

export interface BrowserExtensionSnapshot {
  title: string;
  url: string;
  text: string;
  capturedAt: string;
}

export interface BrowserExtensionPageMetadata {
  title?: string;
  url?: string;
  description?: string;
  canonicalUrl?: string;
  language?: string;
  metas: Record<string, string>;
}

export interface BrowserExtensionDomTreeNode {
  selector?: string;
  frameSelectors?: string[];
  tagName: string;
  id?: string;
  classes?: string[];
  role?: string;
  name?: string;
  type?: string;
  href?: string;
  placeholder?: string;
  text?: string;
  visible?: boolean;
  childCount: number;
  children?: BrowserExtensionDomTreeNode[];
}

export interface BrowserExtensionScreenshot {
  format: 'png';
  dataUrl?: string;
  data?: string;
  width?: number;
  height?: number;
  capturedAt: string;
}

export interface BrowserExtensionElementSummary {
  selector?: string;
  tagName: string;
  id?: string;
  classes?: string[];
  role?: string;
  name?: string;
  type?: string;
  href?: string;
  value?: string;
  text?: string;
  placeholder?: string;
  disabled?: boolean;
  checked?: boolean;
  visible?: boolean;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface BrowserExtensionFormValidationSummary extends BrowserExtensionElementSummary {
  selector: string;
  frameSelectors?: string[];
  fieldType: 'input' | 'textarea' | 'select' | 'contenteditable';
  required?: boolean;
  labels?: string[];
  formSelector?: string;
  formAction?: string;
  optionCount?: number;
  accept?: string;
  valid: boolean;
  invalid: boolean;
  validationMessage?: string;
  ariaInvalid?: boolean;
  willValidate?: boolean;
  dirty?: boolean;
  touched?: boolean;
  nativeValidity?: Partial<Record<
    | 'badInput'
    | 'customError'
    | 'patternMismatch'
    | 'rangeOverflow'
    | 'rangeUnderflow'
    | 'stepMismatch'
    | 'tooLong'
    | 'tooShort'
    | 'typeMismatch'
    | 'valid'
    | 'valueMissing',
    boolean
  >>;
}

export interface BrowserExtensionDownloadSummary {
  id: number;
  url?: string;
  finalUrl?: string;
  filename?: string;
  mime?: string;
  state?: 'in_progress' | 'interrupted' | 'complete';
  danger?: string;
  paused?: boolean;
  exists?: boolean;
  error?: string;
  bytesReceived?: number;
  totalBytes?: number;
  startTime?: string;
  endTime?: string;
  fileSize?: number;
  byExtensionId?: string;
  byExtensionName?: string;
}

export interface BrowserExtensionStorageEntry {
  scope: 'local' | 'session';
  key: string;
  value: string;
}

export interface BrowserExtensionLinkSummary {
  href: string;
  text?: string;
  title?: string;
  target?: string;
  rel?: string;
}

export interface BrowserExtensionActionableSummary extends BrowserExtensionElementSummary {
  selector: string;
  frameSelectors?: string[];
  actionableType: 'click' | 'fill' | 'select' | 'toggle' | 'submit' | 'link';
  label?: string;
  score?: number;
  reasons?: string[];
  formSelector?: string;
}

export interface BrowserExtensionSuggestedAction {
  kind:
    | 'fill'
    | 'click'
    | 'submit'
    | 'select'
    | 'toggle'
    | 'dialog'
    | 'status'
    | 'menu'
    | 'disclosure'
    | 'collection'
    | 'paginate'
    | 'load_more'
    | 'radio'
    | 'segment'
    | 'tab'
    | 'step'
    | 'open_link';
  query: string;
  score: number;
  reason: string;
  selector?: string;
  frameSelectors?: string[];
  formSelector?: string;
  valueHint?: string;
  actionableType?: BrowserExtensionActionableSummary['actionableType'];
}

export interface BrowserExtensionFormFieldSummary extends BrowserExtensionElementSummary {
  selector: string;
  frameSelectors?: string[];
  fieldType: 'input' | 'textarea' | 'select' | 'contenteditable';
  required?: boolean;
  labels?: string[];
  formSelector?: string;
  formAction?: string;
  optionCount?: number;
  accept?: string;
}

export interface BrowserExtensionFormValueEntry {
  selector: string;
  name?: string;
  type?: string;
  value?: string;
  checked?: boolean;
  labels?: string[];
  placeholder?: string;
  required?: boolean;
  formSelector?: string;
  frameSelectors?: string[];
}

export interface BrowserExtensionFormContextSummary {
  frameSelectors?: string[];
  formSelector?: string;
  formAction?: string;
  formMethod?: string;
  fieldCount: number;
  submitSelectors: string[];
  fields: Array<{
    selector: string;
    labels?: string[];
    name?: string;
    type?: string;
    fieldType?: 'input' | 'textarea' | 'select' | 'contenteditable';
    placeholder?: string;
    required?: boolean;
  }>;
}

export interface BrowserExtensionRadioOptionSummary {
  selector: string;
  value?: string;
  label?: string;
  checked?: boolean;
  disabled?: boolean;
}

export interface BrowserExtensionRadioGroupSummary {
  name?: string;
  frameSelectors?: string[];
  formSelector?: string;
  options: BrowserExtensionRadioOptionSummary[];
}

export interface BrowserExtensionSegmentedOptionSummary {
  selector: string;
  value?: string;
  label?: string;
  pressed?: boolean;
  disabled?: boolean;
}

export interface BrowserExtensionSegmentedGroupSummary {
  label?: string;
  selector?: string;
  frameSelectors?: string[];
  formSelector?: string;
  options: BrowserExtensionSegmentedOptionSummary[];
}

export interface BrowserExtensionTablistOptionSummary {
  selector: string;
  value?: string;
  label?: string;
  selected?: boolean;
  disabled?: boolean;
}

export interface BrowserExtensionTablistSummary {
  label?: string;
  selector?: string;
  frameSelectors?: string[];
  formSelector?: string;
  options: BrowserExtensionTablistOptionSummary[];
}

export interface BrowserExtensionStepperControlSummary {
  direction: 'next' | 'previous';
  selector: string;
  label?: string;
  disabled?: boolean;
}

export interface BrowserExtensionStepperSummary {
  label?: string;
  selector?: string;
  frameSelectors?: string[];
  formSelector?: string;
  next?: BrowserExtensionStepperControlSummary;
  previous?: BrowserExtensionStepperControlSummary;
}

export interface BrowserExtensionDialogSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  role?: string;
  modal?: boolean;
  open?: boolean;
  closeSelectors: string[];
  actionSelectors: string[];
  actionLabels?: string[];
  actions?: BrowserExtensionDialogActionSummary[];
}

export interface BrowserExtensionDialogActionSummary {
  selector: string;
  label?: string;
  disabled?: boolean;
  close?: boolean;
}

export interface BrowserExtensionBannerSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  text?: string;
  role?: string;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'status';
  dismissSelectors?: string[];
}

export interface BrowserExtensionLoadingStateSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  text?: string;
  role?: string;
  variant?: 'spinner' | 'progress' | 'skeleton' | 'busy';
  blocking?: boolean;
}

export interface BrowserExtensionEmptyStateSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  text?: string;
  kind?: 'empty' | 'no_results' | 'not_found';
}

export interface BrowserExtensionMenuOptionSummary {
  selector: string;
  label?: string;
  value?: string;
  disabled?: boolean;
}

export interface BrowserExtensionMenuSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  options: BrowserExtensionMenuOptionSummary[];
}

export interface BrowserExtensionDisclosureSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  expanded?: boolean;
  controls?: string;
  disabled?: boolean;
}

export interface BrowserExtensionCollectionItemSummary {
  selector: string;
  label?: string;
  text?: string;
  href?: string;
  rowIndex?: number;
  cells?: Array<{ key?: string; value: string }>;
  actions?: Array<{ selector: string; label?: string; actionableType?: string }>;
  actionableSelectors?: string[];
  selected?: boolean;
  expanded?: boolean;
  detailText?: string;
}

export interface BrowserExtensionCollectionSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  collectionType?: 'table' | 'list' | 'grid' | 'cards';
  itemCount: number;
  selectedCount?: number;
  expandedCount?: number;
  detailCount?: number;
  items: BrowserExtensionCollectionItemSummary[];
}

export interface BrowserExtensionCollectionControlSummary {
  selector: string;
  collectionSelector?: string;
  frameSelectors?: string[];
  label?: string;
  controlType?: 'search' | 'filter' | 'sort';
  fieldType?: 'input' | 'select' | 'button' | 'header';
  options?: string[];
  value?: string;
  active?: boolean;
  disabled?: boolean;
  sortDirection?: 'ascending' | 'descending' | 'other';
}

export interface BrowserExtensionCollectionFilterTokenSummary {
  selector: string;
  collectionSelector?: string;
  frameSelectors?: string[];
  label?: string;
  value?: string;
  removable?: boolean;
  removeSelector?: string;
}

export interface BrowserExtensionPaginationOptionSummary {
  selector: string;
  label?: string;
  disabled?: boolean;
  active?: boolean;
  kind?: 'page' | 'next' | 'previous' | 'first' | 'last' | 'load_more' | 'unknown';
}

export interface BrowserExtensionPaginationSummary {
  selector: string;
  frameSelectors?: string[];
  label?: string;
  options: BrowserExtensionPaginationOptionSummary[];
}

export interface BrowserExtensionToggleSummary extends BrowserExtensionElementSummary {
  selector: string;
  frameSelectors?: string[];
  checked?: boolean;
  desiredState?: 'on' | 'off' | 'toggle';
  changed?: boolean;
}

export interface BrowserExtensionPageStateSummary {
  sessionId?: string;
  selector?: string;
  frameSelectors?: string[];
  snapshot?: BrowserExtensionSnapshot;
  forms: BrowserExtensionFormContextSummary[];
  formValueEntries?: BrowserExtensionFormValueEntry[];
  formValues?: Record<string, unknown>;
  banners?: BrowserExtensionBannerSummary[];
  loadingStates?: BrowserExtensionLoadingStateSummary[];
  emptyStates?: BrowserExtensionEmptyStateSummary[];
  dialogs?: BrowserExtensionDialogSummary[];
  menus?: BrowserExtensionMenuSummary[];
  disclosures?: BrowserExtensionDisclosureSummary[];
  collections?: BrowserExtensionCollectionSummary[];
  collectionControls?: BrowserExtensionCollectionControlSummary[];
  activeCollectionFilters?: BrowserExtensionCollectionControlSummary[];
  collectionFilterTokens?: BrowserExtensionCollectionFilterTokenSummary[];
  collectionSortState?: BrowserExtensionCollectionControlSummary[];
  paginations?: BrowserExtensionPaginationSummary[];
  tablists?: BrowserExtensionTablistSummary[];
  steppers?: BrowserExtensionStepperSummary[];
  actionables: BrowserExtensionActionableSummary[];
  links: BrowserExtensionLinkSummary[];
  domTree?: BrowserExtensionDomTreeNode;
}

export interface BrowserExtensionReadabilitySummary {
  title: string;
  textContent: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  lang?: string;
  length: number;
  contentHtml?: string;
}

export interface BrowserExtensionSelectOptionSummary {
  index: number;
  text: string;
  value: string;
  selected?: boolean;
  disabled?: boolean;
}

export interface BrowserExtensionUploadedFileSummary {
  name: string;
  size: number;
  type?: string;
  lastModified?: number;
}

export interface BrowserExtensionDomEvent {
  id: string;
  url?: string;
  types: Array<'childList' | 'attributes' | 'characterData'>;
  targetTagName?: string;
  targetSelector?: string;
  addedNodeCount?: number;
  removedNodeCount?: number;
  attributeNames?: string[];
  textSample?: string;
  timestamp: string;
}

export interface BrowserExtensionConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'unknown';
  text: string;
  index: number;
}

export interface BrowserExtensionConversationSummary {
  id: string;
  title: string;
  url?: string;
  index: number;
  active?: boolean;
}

export interface BrowserExtensionCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  expirationDate?: number;
}

export interface BrowserExtensionNetworkEvent {
  id: string;
  tabId?: number;
  windowId?: number;
  url: string;
  method?: string;
  type?: string;
  stage: 'request' | 'response' | 'error';
  statusCode?: number;
  statusLine?: string;
  error?: string;
  timestamp: string;
}

export interface BrowserExtensionXPost {
  id: string;
  url?: string;
  authorName?: string;
  authorHandle?: string;
  text: string;
  timestamp?: string;
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  viewCount?: string;
}

export interface BrowserExtensionXProfile {
  handle?: string;
  url?: string;
  name?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  verified?: boolean;
  posts?: BrowserExtensionXPost[];
}

export interface BrowserExtensionXMessageThread {
  id: string;
  url?: string;
  title?: string;
  snippet?: string;
  unread?: boolean;
  active?: boolean;
}

export interface BrowserExtensionXDirectMessage {
  id: string;
  text: string;
  sender?: string;
  timestamp?: string;
  outgoing?: boolean;
}

export interface BrowserExtensionSessionEvent {
  id: string;
  commandId?: string;
  kind: BrowserExtensionCommandKind | 'session_created' | 'session_heartbeat' | 'session_state';
  ok: boolean;
  summary?: string;
  url?: string;
  text?: string;
  error?: string;
  timestamp: string;
}

export interface BrowserExtensionSession {
  id: string;
  provider: 'chrome-extension';
  workspace?: string;
  site?: string;
  targetUrl?: string;
  name?: string;
  privateMode?: boolean;
  connected: boolean;
  stale?: boolean;
  ready?: boolean;
  disconnectedReason?: string;
  extensionId?: string;
  windowId?: number;
  activeTabId?: number;
  tabs?: BrowserExtensionTab[];
  lastSnapshot?: BrowserExtensionSnapshot;
  lastScreenshot?: BrowserExtensionScreenshot;
  networkEvents?: BrowserExtensionNetworkEvent[];
  domEvents?: BrowserExtensionDomEvent[];
  events?: BrowserExtensionSessionEvent[];
  lastHeartbeatAt?: string;
  lastReadyAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrowserExtensionQueuedCommand {
  id: string;
  sessionId: string;
  kind: BrowserExtensionCommandKind;
  payload: Record<string, unknown>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
  result?: unknown;
  error?: string;
}

export interface BrowserExtensionProviderState {
  extensionId: string;
  protocolVersion: string;
  buildId?: string;
  connected: boolean;
  registeredAt: string;
  lastSeenAt: string;
  browserName?: string;
  browserVersion?: string;
  userAgent?: string;
}

export interface BrowserExtensionStatus {
  available: boolean;
  providerId: 'sidofun-browser-extension';
  providerVersion: string;
  protocolVersion: string;
  expectedBuildId: string;
  activeProviderBuildId?: string;
  serverBaseUrl?: string;
  serverReachable?: boolean;
  rootPath: string;
  manifestPath: string;
  backgroundPath: string;
  contentScriptPath: string;
  optionsPagePath: string;
  extensionIdConfigured: boolean;
  configuredExtensionId?: string;
  providerConnected: boolean;
  activeProviderExtensionId?: string;
  providerLastSeenAt?: string;
  connectedSessionCount: number;
  staleSessionCount: number;
  totalSessionCount: number;
  workspaceCount: number;
  queuedCommandCount: number;
  supportedSites: string[];
  capabilities: string[];
  notes: string[];
}

export interface BrowserExtensionCapabilities {
  providerId: 'sidofun-browser-extension';
  protocolVersion: string;
  host: 'chrome';
  primitives: string[];
  siteModules: Array<{
    site: string;
    status: 'planned' | 'scaffolded' | 'active';
    commands: string[];
  }>;
}

export interface BrowserExtensionProviderRegistration {
  extensionId: string;
  protocolVersion: string;
  buildId?: string;
  browserName?: string;
  browserVersion?: string;
  userAgent?: string;
}

export interface BrowserExtensionProviderHeartbeat {
  extensionId: string;
  protocolVersion: string;
  buildId?: string;
  sessions?: Array<{
    sessionId: string;
    connected: boolean;
    windowId?: number;
    activeTabId?: number;
    tabs?: BrowserExtensionTab[];
    site?: string;
    targetUrl?: string;
    privateMode?: boolean;
    snapshot?: BrowserExtensionSnapshot;
    screenshot?: BrowserExtensionScreenshot;
    networkEventCount?: number;
    domEventCount?: number;
  }>;
}

export interface BrowserExtensionProviderSessionStateUpsert {
  extensionId: string;
  protocolVersion: string;
  buildId?: string;
  session: {
    sessionId: string;
    connected: boolean;
    windowId?: number;
    activeTabId?: number;
    tabs?: BrowserExtensionTab[];
    site?: string;
    targetUrl?: string;
    privateMode?: boolean;
    snapshot?: BrowserExtensionSnapshot;
    screenshot?: BrowserExtensionScreenshot;
    networkEventCount?: number;
    domEventCount?: number;
  };
}

export interface BrowserExtensionProviderEventsUpsert {
  extensionId: string;
  protocolVersion: string;
  buildId?: string;
  sessionId: string;
  networkEvents?: BrowserExtensionNetworkEvent[];
  domEvents?: BrowserExtensionDomEvent[];
  events?: BrowserExtensionSessionEvent[];
}

export interface BrowserExtensionCommandResult {
  extensionId: string;
  sessionId: string;
  commandId: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}
