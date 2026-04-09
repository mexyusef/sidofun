export const SIDOFUN_BROWSER_EXTENSION_PROTOCOL = 'sidofun.browser-extension.v1';
export const SIDOFUN_BROWSER_EXTENSION_SERVER = 'http://127.0.0.1:9995';

export type SidofunBrowserProviderCommandKind =
  | 'open_session'
  | 'navigate'
  | 'list_tabs'
  | 'frames'
  | 'focus_tab'
  | 'snapshot'
  | 'scroll_page'
  | 'screenshot'
  | 'inspect'
  | 'inspect_all'
  | 'links'
  | 'markdown'
  | 'readability'
  | 'dialogs'
  | 'dialog_close'
  | 'menus'
  | 'menu_select'
  | 'disclosures'
  | 'disclosure_toggle'
  | 'collections'
  | 'collection_controls'
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
  | 'form_options'
  | 'form_fill_label'
  | 'form_select'
  | 'form_commit'
  | 'form_upload'
  | 'form_combobox_options'
  | 'form_combobox_select'
  | 'form_submit'
  | 'form_submit_wait'
  | 'form_tablist_options'
  | 'form_tablist_select'
  | 'form_stepper'
  | 'form_stepper_move'
  | 'form_date_set'
  | 'form_time_set'
  | 'form_datetime_set'
  | 'cookies'
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
  | 'deepseek_send'
  | 'deepseek_ask'
  | 'deepseek_wait_idle'
  | 'network_events'
  | 'clear_network_events';

export interface SidofunBrowserExtensionXPost {
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

export interface SidofunBrowserExtensionTab {
  id: number;
  windowId?: number;
  url?: string;
  title?: string;
  active?: boolean;
  status?: string;
  favIconUrl?: string;
}

export interface SidofunBrowserExtensionFrame {
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

export interface SidofunBrowserExtensionFormContext {
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

export interface SidofunBrowserExtensionReadability {
  title: string;
  textContent: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  lang?: string;
  length: number;
  contentHtml?: string;
}

export interface SidofunBrowserExtensionSnapshot {
  title: string;
  url: string;
  text: string;
  capturedAt: string;
}

export interface SidofunBrowserExtensionScreenshot {
  format: 'png';
  dataUrl?: string;
  width?: number;
  height?: number;
  capturedAt: string;
}

export interface SidofunBrowserExtensionConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'unknown';
  text: string;
  index: number;
}

export interface SidofunBrowserExtensionConversationSummary {
  id: string;
  title: string;
  url?: string;
  index: number;
  active?: boolean;
}

export interface SidofunBrowserExtensionNetworkEvent {
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

export interface SidofunBrowserExtensionDomEvent {
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

export interface SidofunBrowserProviderQueuedCommand {
  id: string;
  sessionId: string;
  kind: SidofunBrowserProviderCommandKind;
  payload: Record<string, unknown>;
}

export interface SidofunBrowserProviderSessionState {
  sessionId: string;
  connected: boolean;
  windowId?: number;
  activeTabId?: number;
  tabs?: SidofunBrowserExtensionTab[];
  site?: string;
  targetUrl?: string;
  privateMode?: boolean;
  snapshot?: SidofunBrowserExtensionSnapshot;
  screenshot?: SidofunBrowserExtensionScreenshot;
  networkEventCount?: number;
  domEventCount?: number;
}
