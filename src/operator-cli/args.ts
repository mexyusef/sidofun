import { OPERATOR_HELP_TEXT } from './operator-help-text.constants.js';

export type OperatorCommand =
  | { kind: 'help' }
  | { kind: 'doctor'; json: boolean }
  | { kind: 'tui' }
  | { kind: 'config_get'; key?: string; json: boolean }
  | { kind: 'config_set'; key: string; value: string; json: boolean }
  | { kind: 'daemon_start'; json: boolean }
  | { kind: 'daemon_status'; json: boolean }
  | { kind: 'daemon_stop'; json: boolean }
  | { kind: 'clipboard_read'; json: boolean }
  | { kind: 'clipboard_write'; text: string; json: boolean }
  | { kind: 'clipboard_clear'; json: boolean }
  | { kind: 'clipboard_status'; json: boolean }
  | { kind: 'session_create'; clientKind?: 'operator' | 'python' | 'mcp' | 'http' | 'websocket' | 'internal'; name?: string; json: boolean }
  | { kind: 'session_list'; json: boolean }
  | { kind: 'session_info'; sessionId: string; json: boolean }
  | { kind: 'session_resources'; resourceType?: 'terminal' | 'browser_runtime' | 'browser_page' | 'desktop_scope' | 'trace' | 'trajectory'; sessionId?: string; json: boolean }
  | { kind: 'session_resource_owners'; resourceType: 'terminal' | 'browser_runtime' | 'browser_page' | 'desktop_scope' | 'trace' | 'trajectory'; resourceId: string; json: boolean }
  | { kind: 'session_claim_resource'; sessionId: string; resourceType: 'terminal' | 'browser_runtime' | 'browser_page' | 'desktop_scope' | 'trace' | 'trajectory'; resourceId: string; takeover: boolean; json: boolean }
  | { kind: 'session_close'; sessionId: string; cleanupOwnedResources: boolean; json: boolean }
  | { kind: 'session_list_idle'; maxIdleMs: number; clientKind?: 'operator' | 'python' | 'mcp' | 'http' | 'websocket' | 'internal'; json: boolean }
  | { kind: 'session_reap_idle'; maxIdleMs: number; clientKind?: 'operator' | 'python' | 'mcp' | 'http' | 'websocket' | 'internal'; cleanupOwnedResources: boolean; json: boolean }
  | { kind: 'trace_start'; name?: string; ownerSessionId?: string; json: boolean }
  | { kind: 'trace_list'; json: boolean }
  | { kind: 'trace_info'; traceId: string; json: boolean }
  | { kind: 'trace_export'; traceId: string; path?: string; json: boolean }
  | { kind: 'trace_stop'; traceId: string; json: boolean }
  | { kind: 'trajectory_start'; name?: string; ownerSessionId?: string; json: boolean }
  | { kind: 'trajectory_list'; json: boolean }
  | { kind: 'trajectory_info'; trajectoryId: string; json: boolean }
  | { kind: 'trajectory_export'; trajectoryId: string; path?: string; json: boolean }
  | { kind: 'trajectory_append_turn'; trajectoryId: string; turnId: string; role?: string; prompt?: string; response?: string; json: boolean }
  | { kind: 'trajectory_stop'; trajectoryId: string; json: boolean }
  | { kind: 'desktop_scope_create'; windowHandles?: number[]; processIds?: number[]; titleQuery?: string; name?: string; ownerSessionId?: string; json: boolean }
  | { kind: 'desktop_scope_list'; json: boolean }
  | { kind: 'desktop_scope_info'; scopeId: string; json: boolean }
  | { kind: 'desktop_scope_focus'; scopeId: string; json: boolean }
  | { kind: 'desktop_scope_screenshot'; scopeId: string; filename?: string; json: boolean }
  | { kind: 'desktop_scope_click'; scopeId: string; x: number; y: number; button: 'left' | 'right' | 'middle'; json: boolean }
  | { kind: 'desktop_scope_type'; scopeId: string; text: string; json: boolean }
  | { kind: 'desktop_scope_close'; scopeId: string; json: boolean }
  | { kind: 'shell_run'; command: string; shell: 'cmd' | 'pwsh'; cwd?: string; timeoutMs?: number; json: boolean }
  | { kind: 'terminal_spawn'; terminalKind: 'cmd' | 'pwsh'; title?: string; cwd?: string; text?: string; delayMs?: number; ownerSessionId?: string; json: boolean }
  | { kind: 'terminal_list'; terminalKind?: 'cmd' | 'pwsh'; json: boolean }
  | { kind: 'terminal_status'; terminalKind: 'cmd' | 'pwsh'; sessionId: string; json: boolean }
  | { kind: 'terminal_focus'; terminalKind: 'cmd' | 'pwsh'; sessionId: string; json: boolean }
  | { kind: 'terminal_type'; terminalKind: 'cmd' | 'pwsh'; sessionId: string; text: string; json: boolean }
  | { kind: 'terminal_exec'; terminalKind: 'cmd' | 'pwsh'; sessionId: string; command: string; json: boolean }
  | { kind: 'terminal_close'; terminalKind: 'cmd' | 'pwsh'; sessionId: string; json: boolean }
  | { kind: 'browsers_list'; json: boolean }
  | { kind: 'browser_profiles'; browserId: string; json: boolean }
  | {
      kind: 'browser_launch';
      browserId: string;
      profile?: string;
      url?: string;
      privateMode: boolean;
      headless: boolean;
      json: boolean;
    }
  | {
      kind: 'browser_runtime_create';
      browserId: string;
      profile?: string;
      url?: string;
      privateMode: boolean;
      headless: boolean;
      automationMode?: 'debuggable' | 'persistent-debuggable';
      debugPort?: number;
      ownerSessionId?: string;
      json: boolean;
    }
  | { kind: 'browser_runtime_list'; json: boolean }
  | { kind: 'browser_runtime_info'; runtimeId: string; json: boolean }
  | { kind: 'browser_policy_get'; json: boolean }
  | { kind: 'browser_policy_set'; enabled?: boolean; allowList?: string[]; denyList?: string[]; json: boolean }
  | { kind: 'browser_runtime_windows'; runtimeIds?: string[]; json: boolean }
  | { kind: 'browser_runtime_bind'; runtimeId: string; windowHandle?: number; json: boolean }
  | { kind: 'browser_runtime_open_tab'; runtimeId: string; url?: string; json: boolean }
  | {
      kind: 'browser_runtime_tile';
      runtimeIds?: string[];
      preset?: '2-up' | '3-column' | '2x2' | 'main-left' | 'main-right' | 'newsroom-5' | 'newsroom-6';
      columns?: number;
      gap?: number;
      area?: { x: number; y: number; width: number; height: number };
      json: boolean;
    }
  | { kind: 'browser_runtime_close'; runtimeId: string; json: boolean }
  | { kind: 'browser_page_list'; runtimeId?: string; json: boolean }
  | { kind: 'browser_page_open'; runtimeId: string; url?: string; json: boolean }
  | { kind: 'browser_page_info'; pageId: string; json: boolean }
  | {
      kind: 'browser_page_locate';
      pageId: string;
      query: string;
      queryKind?: 'field' | 'button' | 'link' | 'any';
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      limit?: number;
      json: boolean;
    }
  | {
      kind: 'browser_page_fill_query';
      pageId: string;
      query: string;
      value: string;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      json: boolean;
    }
  | {
      kind: 'browser_page_click_query';
      pageId: string;
      query: string;
      queryKind?: 'field' | 'button' | 'link' | 'any';
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      json: boolean;
    }
  | {
      kind: 'browser_page_submit';
      pageId: string;
      query?: string;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      json: boolean;
    }
  | {
      kind: 'browser_page_wait_text';
      pageId: string;
      text: string;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | {
      kind: 'browser_page_form_workflow';
      pageId: string;
      fields: Array<{ query: string; value: string }>;
      submit: boolean;
      submitQuery?: string;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | {
      kind: 'browser_page_auth_login';
      pageId: string;
      email?: string;
      username?: string;
      password: string;
      submitQuery?: string;
      skipSubmit: boolean;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | {
      kind: 'browser_page_auth_signup';
      pageId: string;
      fullName?: string;
      username?: string;
      email?: string;
      password: string;
      confirmPassword?: string;
      submitQuery?: string;
      skipSubmit: boolean;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | {
      kind: 'browser_page_open_workflow';
      runtimeId: string;
      url: string;
      fields: Array<{ query: string; value: string }>;
      submit: boolean;
      submitQuery?: string;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | {
      kind: 'browser_page_open_and_login';
      runtimeId: string;
      url: string;
      email?: string;
      username?: string;
      password: string;
      submitQuery?: string;
      skipSubmit: boolean;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | {
      kind: 'browser_page_open_and_signup';
      runtimeId: string;
      url: string;
      fullName?: string;
      username?: string;
      email?: string;
      password: string;
      confirmPassword?: string;
      submitQuery?: string;
      skipSubmit: boolean;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | { kind: 'browser_page_profile_list'; profileFile?: string; json: boolean }
  | { kind: 'browser_page_profile_info'; profileId: string; profileFile?: string; json: boolean }
  | {
      kind: 'browser_page_profile_login';
      runtimeId: string;
      profileId: string;
      profileFile?: string;
      url?: string;
      email?: string;
      username?: string;
      password?: string;
      confirmPassword?: string;
      fullName?: string;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | {
      kind: 'browser_page_profile_signup';
      runtimeId: string;
      profileId: string;
      profileFile?: string;
      url?: string;
      email?: string;
      username?: string;
      password?: string;
      confirmPassword?: string;
      fullName?: string;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | { kind: 'browser_page_dom'; pageId: string; json: boolean }
  | { kind: 'browser_page_fill_commit'; pageId: string; selector: string; value: string; json: boolean }
  | { kind: 'browser_page_wait_ready'; pageId: string; selectors: string[]; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_page_click_text'; pageId: string; text: string; exact: boolean; withinSelector?: string; topRegionOnly: boolean; topRegionMax?: number; allowLinks: boolean; settleAfter?: 'dom' | 'page' | 'network'; settleTimeoutMs?: number; settleStableReads?: number; json: boolean }
  | { kind: 'browser_page_check_agreement'; pageId: string; selector?: string; labelTextIncludes?: string[]; json: boolean }
  | { kind: 'browser_page_settle'; pageId: string; mode: 'dom' | 'page' | 'network'; timeoutMs?: number; intervalMs?: number; stableReads?: number; quietMs?: number; json: boolean }
  | { kind: 'browser_page_complete_profile'; pageId: string; email: string; username?: string; fullName?: string; usernameSelector?: string; fullNameSelector?: string; agreementSelector?: string; agreementTextIncludes?: string[]; submitText?: string; waitReadyTimeoutMs?: number; json: boolean }
  | { kind: 'browser_page_signup_step'; pageId: string; email: string; password: string; emailSelector?: string; passwordSelector?: string; submitText?: string; waitReadyTimeoutMs?: number; json: boolean }
  | {
      kind: 'browser_page_scroll';
      pageId: string;
      direction: 'up' | 'down' | 'top' | 'bottom';
      query?: string;
      json: boolean;
    }
  | { kind: 'browser_page_scroll_text'; pageId: string; text: string; nth?: number; json: boolean }
  | { kind: 'browser_page_send_keys'; pageId: string; keys: string; query?: string; json: boolean }
  | {
      kind: 'browser_page_select_options';
      pageId: string;
      query: string;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      json: boolean;
    }
  | {
      kind: 'browser_page_select_option';
      pageId: string;
      query: string;
      text: string;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      json: boolean;
    }
  | {
      kind: 'browser_page_detect_file_uploader';
      pageId: string;
      query: string;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      json: boolean;
    }
  | { kind: 'browser_page_replay'; pageId: string; filePath: string; json: boolean }
  | { kind: 'browser_agent_run'; runtimeId: string; filePath: string; url?: string; goal?: string; trajectoryId?: string; json: boolean }
  | { kind: 'browser_page_close'; pageId: string; json: boolean }
  | { kind: 'hf_papers_status'; json: boolean }
  | { kind: 'hf_papers_doctor'; backend?: 'api' | 'cli' | 'auto'; timeoutMs?: number; json: boolean }
  | { kind: 'hf_papers_search'; query: string; limit?: number; backend?: 'api' | 'cli' | 'auto'; token?: string; includeRaw: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'hf_papers_info'; paperId: string; backend?: 'api' | 'cli' | 'auto'; token?: string; includeRaw: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'hf_papers_read'; paperId: string; backend?: 'api' | 'cli' | 'auto'; token?: string; savePath?: string; timeoutMs?: number; json: boolean }
  | { kind: 'hf_papers_list_daily'; date?: string; week?: string; month?: string; submitter?: string; sort?: 'publishedAt' | 'trending'; limit?: number; backend?: 'api' | 'cli' | 'auto'; token?: string; includeRaw: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_status'; json: boolean }
  | { kind: 'browser_extension_capabilities'; json: boolean }
  | { kind: 'browser_extension_sites'; json: boolean }
  | { kind: 'browser_extension_wait_provider'; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_workspace_list'; json: boolean }
  | { kind: 'browser_extension_workspace_get'; name: string; json: boolean }
  | { kind: 'browser_extension_workspace_set'; name: string; path: string; sites?: string[]; json: boolean }
  | { kind: 'browser_extension_workspace_clear'; name: string; json: boolean }
  | { kind: 'browser_extension_session_create'; workspace?: string; site?: string; targetUrl?: string; name?: string; privateMode?: boolean; json: boolean }
  | { kind: 'browser_extension_session_list'; json: boolean }
  | { kind: 'browser_extension_session_info'; sessionId: string; json: boolean }
  | { kind: 'browser_extension_session_refresh'; sessionId: string; json: boolean }
  | { kind: 'browser_extension_session_reconnect'; sessionId: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_session_close'; sessionId: string; json: boolean }
  | { kind: 'browser_extension_session_nuke'; site?: string; staleOnly: boolean; connectedOnly: boolean; disconnectedOnly: boolean; queue: 'keep' | 'matching' | 'all'; json: boolean }
  | { kind: 'browser_extension_session_wait_ready'; sessionId: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_queue_clear'; sessionId?: string; site?: string; status?: 'pending' | 'in_progress' | 'completed' | 'failed'; json: boolean }
  | { kind: 'browser_extension_tabs'; sessionId: string; json: boolean }
  | { kind: 'browser_extension_frames'; sessionId: string; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_navigate'; sessionId: string; targetUrl: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_back'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_forward'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_reload'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_metadata'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_url_parts'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_storage_list'; sessionId: string; scope?: 'local' | 'session'; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_storage_get'; sessionId: string; key: string; scope?: 'local' | 'session'; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_storage_set'; sessionId: string; key: string; value: string; scope?: 'local' | 'session'; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_storage_remove'; sessionId: string; key: string; scope?: 'local' | 'session'; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_focus_tab'; sessionId: string; tabId: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_snapshot'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_scroll_page'; sessionId: string; direction?: 'down' | 'up'; amount?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_dom_tree'; sessionId: string; selector?: string; frameSelectors?: string[]; maxDepth?: number; maxChildren?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_screenshot'; sessionId: string; filename?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_inspect'; sessionId: string; selector: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_inspect_all'; sessionId: string; selector: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_links'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_actionables'; sessionId: string; selector?: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_page_state'; sessionId: string; selector?: string; frameSelectors?: string[]; limit?: number; maxDepth?: number; maxChildren?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_page_diff'; sessionId: string; againstFile: string; selector?: string; frameSelectors?: string[]; limit?: number; maxDepth?: number; maxChildren?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_page_blockers'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_page_outcomes'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_page_recover'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; limit?: number; timeoutMs?: number; intervalMs?: number; continueOnError?: boolean; json: boolean }
  | { kind: 'browser_extension_page_ready'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; limit?: number; timeoutMs?: number; intervalMs?: number; continueOnError?: boolean; json: boolean }
  | { kind: 'browser_extension_next_actions'; sessionId: string; selector?: string; frameSelectors?: string[]; limit?: number; maxDepth?: number; maxChildren?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_markdown'; sessionId: string; selector?: string; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_readability'; sessionId: string; selector?: string; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_dialogs'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_dialog_actions'; sessionId: string; query?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_banners'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_banner_dismiss'; sessionId: string; query?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_loading_states'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_empty_states'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_dialog_close'; sessionId: string; query?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_dialog_action'; sessionId: string; actionQuery?: string; dialogQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_menus'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_menu_select'; sessionId: string; optionQuery: string; menuQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_disclosures'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_disclosure_toggle'; sessionId: string; query: string; desiredState?: 'open' | 'closed' | 'toggle'; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_dialog'; sessionId: string; query?: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_no_dialog'; sessionId: string; query?: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_menu'; sessionId: string; query?: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_no_menu'; sessionId: string; query?: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_disclosure'; sessionId: string; query: string; state?: 'open' | 'closed'; frameSelectors?: string[]; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_collections'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_controls'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_active_filters'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_sort_state'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_filter_tokens'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_rows'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_find'; sessionId: string; query: string; cellQuery?: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_values'; sessionId: string; cellQuery: string; rowQuery?: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_values_diff'; sessionId: string; cellQuery: string; againstFile: string; rowQuery?: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_stats'; sessionId: string; cellQuery?: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_stats_diff'; sessionId: string; againstFile: string; cellQuery?: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_row'; sessionId: string; rowQuery: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_cell'; sessionId: string; rowQuery: string; cellQuery: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_collection_row'; sessionId: string; rowQuery: string; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_collection_count'; sessionId: string; count: number; collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_row_actions'; sessionId: string; rowQuery: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_selection_state'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_click'; sessionId: string; itemQuery: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_row_click'; sessionId: string; rowQuery: string; actionQuery?: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_row_select'; sessionId: string; rowQuery: string; desiredState?: 'on' | 'off' | 'toggle'; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_select_all'; sessionId: string; desiredState?: 'on' | 'off' | 'toggle'; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_row_details'; sessionId: string; rowQuery: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_row_expand'; sessionId: string; rowQuery: string; desiredState?: 'open' | 'closed' | 'toggle'; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_bulk_action'; sessionId: string; rowQueries: string[]; actionQuery?: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; continueOnError?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_export'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; includeSelection?: boolean; includeDetails?: boolean; format?: 'json' | 'markdown'; filePath?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_diff'; sessionId: string; collectionQuery?: string; againstFile: string; frameSelectors?: string[]; exact?: boolean; dedupeBy?: 'auto' | 'selector' | 'text' | 'cells'; includeSelection?: boolean; includeDetails?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_collection_diff'; sessionId: string; collectionQuery?: string; againstFile: string; frameSelectors?: string[]; exact?: boolean; dedupeBy?: 'auto' | 'selector' | 'text' | 'cells'; includeSelection?: boolean; includeDetails?: boolean; addedAtLeast?: number; removedAtLeast?: number; changedAtLeast?: number; unchangedAtLeast?: number; rowAdded?: string; rowRemoved?: string; rowChanged?: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_sort'; sessionId: string; valueQuery: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_filter'; sessionId: string; query: string; value: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_filter_clear'; sessionId: string; query: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_filter_token_clear'; sessionId: string; query: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_clear_all_filters'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; continueOnError?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_paginations'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_pagination_click'; sessionId: string; query: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_load_more'; sessionId: string; query?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_collection_harvest'; sessionId: string; collectionQuery?: string; strategy?: 'auto' | 'load_more' | 'scroll'; frameSelectors?: string[]; exact?: boolean; limit?: number; maxIterations?: number; stableIterations?: number; settleQuietMs?: number; dedupeBy?: 'auto' | 'selector' | 'text' | 'cells'; scrollAmount?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_locate'; sessionId: string; query: string; by?: 'text' | 'selector' | 'role' | 'id' | 'name' | 'placeholder' | 'tag'; selector?: string; frameSelectors?: string[]; maxDepth?: number; maxChildren?: number; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_click_query'; sessionId: string; query: string; by?: 'text' | 'selector' | 'role' | 'id' | 'name' | 'placeholder' | 'tag'; selector?: string; frameSelectors?: string[]; maxDepth?: number; maxChildren?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_evaluate'; sessionId: string; expression: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_click'; sessionId: string; selector: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_type'; sessionId: string; selector: string; text: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_press'; sessionId: string; key: string; selector?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_editor_read'; sessionId: string; selector: string; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_editor_fill'; sessionId: string; selector: string; value: string; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_fill'; sessionId: string; selector: string; value: string; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_fill_human'; sessionId: string; selector: string; value: string; frameSelectors?: string[]; delayMs?: number; jitterMs?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_fill_many'; sessionId: string; fields: Array<{ selector: string; value: string }>; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | {
      kind: 'browser_extension_form_workflow';
      sessionId: string;
      fields: Array<{ query: string; value: string }>;
      frameSelectors?: string[];
      formSelector?: string;
      contextIndex?: number;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
      submit?: boolean;
      submitSelector?: string;
      delayMs?: number;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | {
      kind: 'browser_extension_context_plan';
      sessionId: string;
      frameSelectors?: string[];
      formSelector?: string;
      contextIndex?: number;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
      json: boolean;
    }
  | {
      kind: 'browser_extension_context_state';
      sessionId: string;
      frameSelectors?: string[];
      formSelector?: string;
      contextIndex?: number;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
      json: boolean;
    }
  | {
      kind: 'browser_extension_query_plan';
      sessionId: string;
      fills: Array<{ query: string; value: string }>;
      clicks: string[];
      radios?: Array<{ query: string; value: string }>;
      segmenteds?: Array<{ query: string; value: string }>;
      tabs?: Array<{ query: string; value: string }>;
      steppers?: Array<{ query?: string; direction?: 'next' | 'previous' }>;
      dates?: Array<{ query: string; value: string }>;
      times?: Array<{ query: string; value: string }>;
      datetimes?: Array<{ query: string; value: string }>;
      ranges?: Array<{ query: string; value: string }>;
      toggles?: Array<{ query: string; desiredState?: 'on' | 'off' | 'toggle' }>;
      frameSelectors?: string[];
      formSelector?: string;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
      submit?: boolean;
      submitSelector?: string;
      submitQuery?: string;
      json: boolean;
    }
  | {
      kind: 'browser_extension_query_workflow';
      sessionId: string;
      fills: Array<{ query: string; value: string }>;
      clicks: string[];
      radios?: Array<{ query: string; value: string }>;
      segmenteds?: Array<{ query: string; value: string }>;
      tabs?: Array<{ query: string; value: string }>;
      steppers?: Array<{ query?: string; direction?: 'next' | 'previous' }>;
      dates?: Array<{ query: string; value: string }>;
      times?: Array<{ query: string; value: string }>;
      datetimes?: Array<{ query: string; value: string }>;
      ranges?: Array<{ query: string; value: string }>;
      toggles?: Array<{ query: string; desiredState?: 'on' | 'off' | 'toggle' }>;
      frameSelectors?: string[];
      formSelector?: string;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
      submit?: boolean;
      submitSelector?: string;
      submitQuery?: string;
      delayMs?: number;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      requireTexts?: string[];
      requireNoTexts?: string[];
      requireSelectors?: string[];
      requireNoSelectors?: string[];
      settleAfterEach?: 'dom' | 'network' | 'page';
      settleQuietMs?: number;
      stableReads?: number;
      timeoutMs?: number;
      intervalMs?: number;
      json: boolean;
    }
  | { kind: 'browser_extension_workflow_validate'; filepath: string; json: boolean }
  | { kind: 'browser_extension_workflow_plan'; sessionId?: string; filepath: string; variables?: Record<string, string>; json: boolean }
  | { kind: 'browser_extension_workflow_diagnose'; sessionId?: string; filepath: string; variables?: Record<string, string>; json: boolean }
  | { kind: 'browser_extension_workflow_run'; sessionId?: string; filepath: string; variables?: Record<string, string>; json: boolean }
  | { kind: 'browser_extension_form_fields'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_values'; sessionId: string; frameSelectors?: string[]; formSelector?: string; contextQuery?: string; frameQuery?: string; exact?: boolean; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_contexts'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_find_field'; sessionId: string; query: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_radio_groups'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_radio_select'; sessionId: string; query: string; value: string; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_segmented_options'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_segmented_select'; sessionId: string; query: string; value: string; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_tablist_options'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_tablist_select'; sessionId: string; query: string; value: string; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_stepper'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_stepper_move'; sessionId: string; direction: 'next' | 'previous'; query?: string; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_date_set'; sessionId: string; query: string; value: string; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_time_set'; sessionId: string; query: string; value: string; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_datetime_set'; sessionId: string; query: string; value: string; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_toggle'; sessionId: string; query: string; desiredState?: 'on' | 'off' | 'toggle'; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_range_set'; sessionId: string; query: string; value: string; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_options'; sessionId: string; selector: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_fill_label'; sessionId: string; query: string; value: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_fill_query'; sessionId: string; query: string; value: string; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_select'; sessionId: string; selector: string; value: string; by?: 'text' | 'value' | 'label'; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_upload'; sessionId: string; selector: string; filepath: string; fileName?: string; mimeType?: string; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_combobox_options'; sessionId: string; selector: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_combobox_select'; sessionId: string; selector: string; value: string; match?: 'exact' | 'includes'; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_submit'; sessionId: string; selector?: string; frameSelectors?: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_form_submit_wait'; sessionId: string; selector?: string; frameSelectors?: string[]; waitUrlIncludes?: string; waitText?: string; waitSelector?: string; waitNoSelector?: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_auth_login'; sessionId: string; email?: string; username?: string; password: string; frameSelectors?: string[]; selector?: string; humanLike?: boolean; delayMs?: number; jitterMs?: number; skipSubmit?: boolean; waitUrlIncludes?: string; waitText?: string; waitSelector?: string; waitNoSelector?: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_auth_signup'; sessionId: string; fullName?: string; username?: string; email?: string; password: string; confirmPassword?: string; frameSelectors?: string[]; selector?: string; humanLike?: boolean; delayMs?: number; jitterMs?: number; skipSubmit?: boolean; waitUrlIncludes?: string; waitText?: string; waitSelector?: string; waitNoSelector?: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_cookies'; sessionId: string; targetUrl?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_cookie_get'; sessionId: string; name: string; targetUrl?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_cookie_set'; sessionId: string; name: string; value: string; targetUrl?: string; domain?: string; path?: string; secure?: boolean; httpOnly?: boolean; sameSite?: 'no_restriction' | 'lax' | 'strict' | 'unspecified'; expirationDate?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_cookie_remove'; sessionId: string; name: string; targetUrl?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_cookie'; sessionId: string; name: string; targetUrl?: string; equals?: string; includes?: string; exists?: boolean; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_downloads'; sessionId: string; query?: string; state?: 'in_progress' | 'interrupted' | 'complete'; limit?: number; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_download_cancel'; sessionId: string; query?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_download_erase'; sessionId: string; query?: string; exact?: boolean; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_download'; sessionId: string; query?: string; state?: 'in_progress' | 'interrupted' | 'complete'; limit?: number; exact?: boolean; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_x_search'; sessionId: string; query: string; mode?: 'top' | 'latest' | 'live' | 'people' | 'media'; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_timeline'; sessionId: string; timelineType?: 'for-you' | 'following'; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_bookmarks'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_notifications'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_messages'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_open_message_thread'; sessionId: string; thread: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_send_message'; sessionId: string; text: string; thread?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_read_thread'; sessionId: string; postUrl: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_post'; sessionId: string; text: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_open_post'; sessionId: string; postUrl: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_profile'; sessionId: string; handleOrUrl: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_follow'; sessionId: string; handleOrUrl: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_reply'; sessionId: string; text: string; postUrl?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_like'; sessionId: string; postUrl?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_x_repost'; sessionId: string; postUrl?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_read_latest'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_new_chat'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_sidebar_state'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_toggle_sidebar'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_models'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_select_model'; sessionId: string; query: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_info'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_list_conversations'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_open_conversation'; sessionId: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_conversation_actions'; sessionId: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_conversation_action'; sessionId: string; actionQuery: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_rename_conversation'; sessionId: string; title: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_stop'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_continue'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_response_controls'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_previous_response'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_next_response'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_list_response_versions'; sessionId: string; limit?: number; maxVersions?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_select_response_version'; sessionId: string; count: number; limit?: number; maxVersions?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_regenerate'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_edit_message'; sessionId: string; text: string; index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_read_thread'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_read_message'; sessionId: string; index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_current_conversation'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_export_thread'; sessionId: string; limit?: number; timeoutMs?: number; format?: 'json' | 'markdown'; json: boolean }
  | { kind: 'browser_extension_chatgpt_send'; sessionId: string; text: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_ask'; sessionId: string; text: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_ask_thread'; sessionId: string; text: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_rewrite_thread'; sessionId: string; text: string; index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_wait_idle'; sessionId: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_wait_response'; sessionId: string; baselineText?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_wait_sidebar'; sessionId: string; open?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_wait_model'; sessionId: string; query?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_wait_conversation'; sessionId: string; titleQuery?: string; url?: string; active?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_prepare'; sessionId: string; ensureSidebarOpen?: boolean; model?: string; newChat?: boolean; titleQuery?: string; url?: string; index?: number; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_delete_conversation'; sessionId: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_archive_conversation'; sessionId: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_read_latest'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_new_chat'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_sidebar_state'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_toggle_sidebar'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_models'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_select_model'; sessionId: string; query: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_info'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_list_conversations'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_open_conversation'; sessionId: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_conversation_actions'; sessionId: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_conversation_action'; sessionId: string; actionQuery: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_rename_conversation'; sessionId: string; title: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_stop'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_continue'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_response_controls'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_previous_response'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_next_response'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_list_response_versions'; sessionId: string; limit?: number; maxVersions?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_select_response_version'; sessionId: string; count: number; limit?: number; maxVersions?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_regenerate'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_edit_message'; sessionId: string; text: string; index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_read_thread'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_read_message'; sessionId: string; index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_current_conversation'; sessionId: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_export_thread'; sessionId: string; limit?: number; timeoutMs?: number; format?: 'json' | 'markdown'; json: boolean }
  | { kind: 'browser_extension_deepseek_send'; sessionId: string; text: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_ask'; sessionId: string; text: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_ask_thread'; sessionId: string; text: string; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_rewrite_thread'; sessionId: string; text: string; index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_wait_idle'; sessionId: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_wait_response'; sessionId: string; baselineText?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_wait_sidebar'; sessionId: string; open?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_wait_model'; sessionId: string; query?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_wait_conversation'; sessionId: string; titleQuery?: string; url?: string; active?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_prepare'; sessionId: string; ensureSidebarOpen?: boolean; model?: string; newChat?: boolean; titleQuery?: string; url?: string; index?: number; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_delete_conversation'; sessionId: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_archive_conversation'; sessionId: string; titleQuery?: string; url?: string; index?: number; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_deepseek_wait_message'; sessionId: string; text?: string; role?: 'user' | 'assistant' | 'system'; limit?: number; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_extension_network_events'; sessionId: string; limit?: number; urlIncludes?: string; stage?: 'request' | 'response' | 'error'; method?: string; json: boolean }
  | { kind: 'browser_extension_dom_events'; sessionId: string; limit?: number; mutationType?: 'childList' | 'attributes' | 'characterData'; textIncludes?: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_clear_network_events'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_clear_dom_events'; sessionId: string; timeoutMs?: number; json: boolean }
  | { kind: 'browser_extension_session_events'; sessionId: string; limit?: number; eventKind?: string; ok?: boolean; json: boolean }
  | { kind: 'browser_extension_clear_session_events'; sessionId: string; json: boolean }
  | { kind: 'browser_extension_wait_dom_quiet'; sessionId: string; quietMs?: number; timeoutMs?: number; intervalMs?: number; mutationType?: 'childList' | 'attributes' | 'characterData'; textIncludes?: string; json: boolean }
  | { kind: 'browser_extension_wait_network_idle'; sessionId: string; quietMs?: number; timeoutMs?: number; intervalMs?: number; urlIncludes?: string; stage?: 'request' | 'response' | 'error'; method?: string; json: boolean }
  | { kind: 'browser_extension_wait_page_stable'; sessionId: string; quietMs?: number; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'browser_extension_wait_page_diff'; sessionId: string; againstFile: string; selector?: string; frameSelectors?: string[]; limit?: number; maxDepth?: number; maxChildren?: number; urlChanged?: boolean; titleChanged?: boolean; textChanged?: boolean; textLengthDeltaAtLeast?: number; addedActionableQuery?: string; removedActionableQuery?: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_no_blockers'; sessionId: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_banner'; sessionId: string; text: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_no_banner'; sessionId: string; text?: string; frameSelectors?: string[]; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_page_outcome'; sessionId: string; status: 'loading' | 'blocked' | 'error' | 'warning' | 'success' | 'empty' | 'ready'; frameSelectors?: string[]; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_no_collection_filters'; sessionId: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; limit?: number; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_url'; sessionId: string; text: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_selector'; sessionId: string; selector: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_no_selector'; sessionId: string; selector: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_wait_text'; sessionId: string; text: string; timeoutMs?: number; intervalMs?: number; json: boolean }
  | { kind: 'browser_extension_chatgpt_wait_message'; sessionId: string; text?: string; role?: 'user' | 'assistant' | 'system'; limit?: number; timeoutMs?: number; intervalMs?: number; stableReads?: number; json: boolean }
  | { kind: 'opencli_status'; json: boolean }
  | { kind: 'opencli_doctor'; cwd?: string; workspace?: string; ownerSessionId?: string; timeoutMs?: number; json: boolean }
  | { kind: 'opencli_sites'; json: boolean }
  | { kind: 'opencli_commands'; site: string; json: boolean }
  | { kind: 'opencli_run'; site: string; command: string; args: string[]; cwd?: string; workspace?: string; ownerSessionId?: string; timeoutMs?: number; keepBrowserOpen: boolean; waitAfterMs?: number; maximizeBrowser: boolean; json: boolean }
  | { kind: 'opencli_workspace_list'; json: boolean }
  | { kind: 'opencli_workspace_get'; name: string; json: boolean }
  | { kind: 'opencli_workspace_set'; name: string; path: string; json: boolean }
  | { kind: 'opencli_workspace_clear'; name: string; json: boolean }
  | { kind: 'opencli_workspace_bind_session'; sessionId: string; workspace: string; json: boolean }
  | { kind: 'opencli_workspace_unbind_session'; sessionId: string; json: boolean }
  | { kind: 'opencli_workspace_session'; sessionId: string; json: boolean }
  | { kind: 'twitter_search'; query: string; mode?: 'top' | 'latest' | 'live' | 'people' | 'media'; limit?: number; cwd?: string; workspace?: string; ownerSessionId?: string; timeoutMs?: number; keepBrowserOpen: boolean; waitAfterMs?: number; maximizeBrowser: boolean; json: boolean }
  | { kind: 'twitter_timeline'; timelineType?: 'for-you' | 'following'; limit?: number; cwd?: string; workspace?: string; ownerSessionId?: string; timeoutMs?: number; keepBrowserOpen: boolean; waitAfterMs?: number; maximizeBrowser: boolean; json: boolean }
  | { kind: 'twitter_bookmarks'; limit?: number; cwd?: string; workspace?: string; ownerSessionId?: string; timeoutMs?: number; keepBrowserOpen: boolean; waitAfterMs?: number; maximizeBrowser: boolean; json: boolean }
  | { kind: 'twitter_post'; text: string; cwd?: string; workspace?: string; ownerSessionId?: string; timeoutMs?: number; keepBrowserOpen: boolean; waitAfterMs?: number; maximizeBrowser: boolean; json: boolean }
  | { kind: 'local_coder_list'; json: boolean }
  | { kind: 'local_coder_status'; appId: string; json: boolean }
  | { kind: 'local_coder_open'; appId: string; prompt?: string; workingDirectory?: string; inputDelayMs?: number; json: boolean }
  | { kind: 'local_coder_focus'; appId: string; json: boolean }
  | { kind: 'local_coder_close'; appId: string; json: boolean }
  | { kind: 'local_coder_maximize'; appId: string; json: boolean }
  | { kind: 'local_coder_minimize'; appId: string; json: boolean }
  | { kind: 'local_coder_restore'; appId: string; json: boolean }
  | { kind: 'local_coder_move'; appId: string; x: number; y: number; json: boolean }
  | { kind: 'local_coder_resize'; appId: string; width: number; height: number; json: boolean }
  | { kind: 'local_coder_run'; appId: string; prompt: string; workingDirectory?: string; timeoutMs?: number; json: boolean }
  | { kind: 'cmd_spawn'; title?: string; cwd?: string; text?: string; delayMs?: number; json: boolean }
  | { kind: 'cmd_list'; json: boolean }
  | { kind: 'cmd_type'; sessionId: string; text: string; json: boolean }
  | { kind: 'cmd_exec'; sessionId: string; command: string; json: boolean }
  | { kind: 'cmd_screenshot'; sessionId: string; filename?: string; json: boolean }
  | { kind: 'cmd_status'; sessionId: string; json: boolean }
  | { kind: 'cmd_focus'; sessionId: string; json: boolean }
  | { kind: 'cmd_activate'; titleQuery: string; json: boolean }
  | { kind: 'cmd_close'; sessionId: string; json: boolean }
  | { kind: 'pwsh_spawn'; title?: string; cwd?: string; text?: string; delayMs?: number; json: boolean }
  | { kind: 'pwsh_list'; json: boolean }
  | { kind: 'pwsh_type'; sessionId: string; text: string; json: boolean }
  | { kind: 'pwsh_exec'; sessionId: string; command: string; json: boolean }
  | { kind: 'pwsh_screenshot'; sessionId: string; filename?: string; json: boolean }
  | { kind: 'pwsh_status'; sessionId: string; json: boolean }
  | { kind: 'pwsh_focus'; sessionId: string; json: boolean }
  | { kind: 'pwsh_activate'; titleQuery: string; json: boolean }
  | { kind: 'pwsh_close'; sessionId: string; json: boolean };

function readGlobalOptions(args: string[]) {
  const json = args.includes('--json');
  const filtered = args.filter((arg) => arg !== '--json');
  return { json, filtered };
}

function readFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function readFlagValues(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag && args[index + 1] !== undefined) {
      values.push(args[index + 1]);
      index += 1;
    }
  }
  return values;
}

const AUTO_BROWSER_EXTENSION_SESSION_ID = '__auto_browserext_site_session__';

function readBrowserExtensionSiteSessionId(token?: string) {
  return token && token.startsWith('browserext_')
    ? token
    : AUTO_BROWSER_EXTENSION_SESSION_ID;
}

function readBrowserExtensionSiteArgStart(token?: string) {
  return token && token.startsWith('browserext_')
    ? 4
    : 3;
}

function readResourceType(value: string | undefined) {
  return value === 'terminal'
    || value === 'browser_runtime'
    || value === 'browser_page'
    || value === 'desktop_scope'
    || value === 'trace'
    || value === 'trajectory'
    ? value
    : undefined;
}

export function parseOperatorCommand(argv: string[]): OperatorCommand {
  const { json, filtered } = readGlobalOptions(argv);
  const [domain, action, value] = filtered;

  if (!domain || domain === 'help' || domain === '--help' || domain === '-h') {
    return { kind: 'help' };
  }

  if (domain === 'doctor') {
    return { kind: 'doctor', json };
  }

  if (domain === 'tui') {
    return { kind: 'tui' };
  }

  if (domain === 'config') {
    if (action === 'get') {
      return { kind: 'config_get', key: value, json };
    }
    if (action === 'set' && value && filtered[3] !== undefined) {
      return {
        kind: 'config_set',
        key: value,
        value: filtered.slice(3).join(' '),
        json
      };
    }
  }

  const waitAfterRaw = readFlagValue(filtered, '--wait-ms');
  const parsedWaitAfterMs = waitAfterRaw ? Number.parseInt(waitAfterRaw, 10) : undefined;
  const waitAfterMs = parsedWaitAfterMs !== undefined && !Number.isNaN(parsedWaitAfterMs) ? parsedWaitAfterMs : undefined;
  const keepBrowserOpen = filtered.includes('--keep-browser-open');
  const maximizeBrowser = filtered.includes('--maximize-browser');

  if (domain === 'bex') {
    if (!action || action === 'status') {
      return { kind: 'browser_extension_status', json };
    }
    if (action === 'sessions') {
      return { kind: 'browser_extension_session_list', json };
    }
    if (action === 'nuke-stale') {
      const queueRaw = readFlagValue(filtered, '--queue');
      const queue = queueRaw === 'keep' || queueRaw === 'matching' || queueRaw === 'all'
        ? queueRaw
        : 'matching';
      return {
        kind: 'browser_extension_session_nuke',
        site: readFlagValue(filtered, '--site'),
        staleOnly: true,
        connectedOnly: false,
        disconnectedOnly: false,
        queue,
        json
      };
    }
    if (action === 'clear-queue') {
      const statusRaw = readFlagValue(filtered, '--status');
      if (statusRaw && !['pending', 'in_progress', 'completed', 'failed'].includes(statusRaw)) {
        throw new Error('bex clear-queue requires --status pending|in_progress|completed|failed when provided');
      }
      return {
        kind: 'browser_extension_queue_clear',
        sessionId: readFlagValue(filtered, '--session'),
        site: readFlagValue(filtered, '--site'),
        status: statusRaw as 'pending' | 'in_progress' | 'completed' | 'failed' | undefined,
        json
      };
    }
    if (action === 'clear-in-progress') {
      return {
        kind: 'browser_extension_queue_clear',
        sessionId: readFlagValue(filtered, '--session'),
        site: readFlagValue(filtered, '--site'),
        status: 'in_progress',
        json
      };
    }
  }

  if (domain === 'clipboard' && action === 'read') return { kind: 'clipboard_read', json };
  if (domain === 'clipboard' && action === 'clear') return { kind: 'clipboard_clear', json };
  if (domain === 'clipboard' && action === 'status') return { kind: 'clipboard_status', json };
  if (domain === 'clipboard' && action === 'write' && filtered.length >= 3) {
    return { kind: 'clipboard_write', text: filtered.slice(2).join(' '), json };
  }

  if (domain === 'session') {
    if (action === 'list') return { kind: 'session_list', json };
    if (action === 'create') {
      const clientKind = readFlagValue(filtered, '--client-kind');
      return {
        kind: 'session_create',
        clientKind: clientKind === 'operator' || clientKind === 'python' || clientKind === 'mcp' || clientKind === 'http' || clientKind === 'websocket' || clientKind === 'internal' ? clientKind : undefined,
        name: readFlagValue(filtered, '--name'),
        json
      };
    }
    if (action === 'list-idle') {
      const maxIdleRaw = readFlagValue(filtered, '--max-idle-ms');
      const maxIdleMs = maxIdleRaw ? Number.parseInt(maxIdleRaw, 10) : NaN;
      if (!Number.isNaN(maxIdleMs)) {
        const clientKind = readFlagValue(filtered, '--client-kind');
        return {
          kind: 'session_list_idle',
          maxIdleMs,
          clientKind: clientKind === 'operator' || clientKind === 'python' || clientKind === 'mcp' || clientKind === 'http' || clientKind === 'websocket' || clientKind === 'internal' ? clientKind : undefined,
          json
        };
      }
    }
    if (action === 'reap-idle') {
      const maxIdleRaw = readFlagValue(filtered, '--max-idle-ms');
      const maxIdleMs = maxIdleRaw ? Number.parseInt(maxIdleRaw, 10) : NaN;
      if (!Number.isNaN(maxIdleMs)) {
        const clientKind = readFlagValue(filtered, '--client-kind');
        return {
          kind: 'session_reap_idle',
          maxIdleMs,
          clientKind: clientKind === 'operator' || clientKind === 'python' || clientKind === 'mcp' || clientKind === 'http' || clientKind === 'websocket' || clientKind === 'internal' ? clientKind : undefined,
          cleanupOwnedResources: !filtered.includes('--no-cleanup'),
          json
        };
      }
    }
    if (action === 'resources') {
      return {
        kind: 'session_resources',
        resourceType: readResourceType(readFlagValue(filtered, '--type')),
        sessionId: readFlagValue(filtered, '--session'),
        json
      };
    }
    if (action === 'owners') {
      const resourceType = readResourceType(value);
      const resourceId = filtered[3];
      if (resourceType && resourceId) {
        return {
          kind: 'session_resource_owners',
          resourceType,
          resourceId,
          json
        };
      }
    }
    if (action === 'claim') {
      const sessionId = value;
      const resourceType = readResourceType(filtered[3]);
      const resourceId = filtered[4];
      if (sessionId && resourceType && resourceId) {
        return {
          kind: 'session_claim_resource',
          sessionId,
          resourceType,
          resourceId,
          takeover: filtered.includes('--takeover'),
          json
        };
      }
    }
    if (action === 'info' && value) return { kind: 'session_info', sessionId: value, json };
    if (action === 'close' && value) return { kind: 'session_close', sessionId: value, cleanupOwnedResources: !filtered.includes('--no-cleanup'), json };
  }

  if (domain === 'trace') {
    if (action === 'list') return { kind: 'trace_list', json };
    if (action === 'start') return { kind: 'trace_start', name: readFlagValue(filtered, '--name'), ownerSessionId: readFlagValue(filtered, '--owner-session'), json };
    if (action === 'info' && value) return { kind: 'trace_info', traceId: value, json };
    if (action === 'export' && value) return { kind: 'trace_export', traceId: value, path: readFlagValue(filtered, '--file'), json };
    if (action === 'stop' && value) return { kind: 'trace_stop', traceId: value, json };
  }

  if (domain === 'trajectory') {
    if (action === 'list') return { kind: 'trajectory_list', json };
    if (action === 'start') return { kind: 'trajectory_start', name: readFlagValue(filtered, '--name'), ownerSessionId: readFlagValue(filtered, '--owner-session'), json };
    if (action === 'info' && value) return { kind: 'trajectory_info', trajectoryId: value, json };
    if (action === 'export' && value) return { kind: 'trajectory_export', trajectoryId: value, path: readFlagValue(filtered, '--file'), json };
    if (action === 'append-turn' && value) {
      const turnId = readFlagValue(filtered, '--turn-id');
      if (turnId) {
        return {
          kind: 'trajectory_append_turn',
          trajectoryId: value,
          turnId,
          role: readFlagValue(filtered, '--role'),
          prompt: readFlagValue(filtered, '--prompt'),
          response: readFlagValue(filtered, '--response'),
          json
        };
      }
    }
    if (action === 'stop' && value) return { kind: 'trajectory_stop', trajectoryId: value, json };
  }

  if (domain === 'scope') {
    if (action === 'list') return { kind: 'desktop_scope_list', json };
    if (action === 'create') {
      const windowHandles = readFlagValues(filtered, '--window').map((value) => Number.parseInt(value, 10)).filter((value) => !Number.isNaN(value));
      const processIds = readFlagValues(filtered, '--pid').map((value) => Number.parseInt(value, 10)).filter((value) => !Number.isNaN(value));
      const titleQuery = readFlagValue(filtered, '--title-query');
      const name = readFlagValue(filtered, '--name');
      return {
        kind: 'desktop_scope_create',
        windowHandles: windowHandles.length ? windowHandles : undefined,
        processIds: processIds.length ? processIds : undefined,
        titleQuery,
        name,
        ownerSessionId: readFlagValue(filtered, '--owner-session'),
        json
      };
    }
    if (action === 'info' && value) return { kind: 'desktop_scope_info', scopeId: value, json };
    if (action === 'focus' && value) return { kind: 'desktop_scope_focus', scopeId: value, json };
    if (action === 'screenshot' && value) return { kind: 'desktop_scope_screenshot', scopeId: value, filename: readFlagValue(filtered, '--file'), json };
    if (action === 'click' && value) {
      const x = Number.parseInt(filtered[3] || '', 10);
      const y = Number.parseInt(filtered[4] || '', 10);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        const buttonRaw = readFlagValue(filtered, '--button');
        const button = buttonRaw === 'right' || buttonRaw === 'middle' ? buttonRaw : 'left';
        return { kind: 'desktop_scope_click', scopeId: value, x, y, button, json };
      }
    }
    if (action === 'type' && value && filtered.length >= 4) return { kind: 'desktop_scope_type', scopeId: value, text: filtered.slice(3).join(' '), json };
    if (action === 'close' && value) return { kind: 'desktop_scope_close', scopeId: value, json };
  }

  if (domain === 'shell' && action === 'run' && filtered.length >= 3) {
    const shell = filtered.includes('--cmd') ? 'cmd' : 'pwsh';
    const cwd = readFlagValue(filtered, '--cwd');
    const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
    const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
    const commandTokens: string[] = [];
    let index = 2;
    while (index < filtered.length) {
      const token = filtered[index];
      if (token === '--cwd' || token === '--timeout-ms') {
        index += 2;
        continue;
      }
      if (token === '--cmd' || token === '--pwsh') {
        index += 1;
        continue;
      }
      commandTokens.push(token);
      index += 1;
    }
    return {
      kind: 'shell_run',
      command: commandTokens.join(' '),
      shell,
      cwd,
      timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
      json
    };
  }

  if (domain === 'terminal') {
    if (action === 'list') {
      const kindFlag = readFlagValue(filtered, '--kind');
      return { kind: 'terminal_list', terminalKind: kindFlag === 'cmd' || kindFlag === 'pwsh' ? kindFlag : undefined, json };
    }

    const terminalKind = value === 'cmd' || value === 'pwsh' ? value : undefined;
    if (action === 'spawn' && terminalKind) {
      const title = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      const delayRaw = readFlagValue(filtered, '--delay-ms');
      const parsedDelay = delayRaw ? Number.parseInt(delayRaw, 10) : undefined;
      return {
        kind: 'terminal_spawn',
        terminalKind,
        title,
        cwd: readFlagValue(filtered, '--dir'),
        text: readFlagValue(filtered, '--text'),
        delayMs: parsedDelay !== undefined && !Number.isNaN(parsedDelay) ? parsedDelay : undefined,
        ownerSessionId: readFlagValue(filtered, '--owner-session'),
        json
      };
    }
    if (action === 'status' && terminalKind && filtered[3]) return { kind: 'terminal_status', terminalKind, sessionId: filtered[3], json };
    if (action === 'focus' && terminalKind && filtered[3]) return { kind: 'terminal_focus', terminalKind, sessionId: filtered[3], json };
    if (action === 'type' && terminalKind && filtered[3] && filtered.length >= 5) return { kind: 'terminal_type', terminalKind, sessionId: filtered[3], text: filtered.slice(4).join(' '), json };
    if (action === 'exec' && terminalKind && filtered[3] && filtered.length >= 5) return { kind: 'terminal_exec', terminalKind, sessionId: filtered[3], command: filtered.slice(4).join(' '), json };
    if (action === 'close' && terminalKind && filtered[3]) return { kind: 'terminal_close', terminalKind, sessionId: filtered[3], json };
  }

  if (domain === 'daemon' && action === 'start') return { kind: 'daemon_start', json };
  if (domain === 'daemon' && action === 'status') return { kind: 'daemon_status', json };
  if (domain === 'daemon' && action === 'stop') return { kind: 'daemon_stop', json };

  if (domain === 'browsers' && action === 'list') {
    return { kind: 'browsers_list', json };
  }

  if (domain === 'browser' && action === 'profiles' && value) {
    return { kind: 'browser_profiles', browserId: value, json };
  }

  if (domain === 'browserext' || domain === 'browser-extension') {
    if (action === 'status') return { kind: 'browser_extension_status', json };
    if (action === 'capabilities' || action === 'caps') return { kind: 'browser_extension_capabilities', json };
    if (action === 'sites') return { kind: 'browser_extension_sites', json };
    if (action === 'wait-provider') {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      return {
        kind: 'browser_extension_wait_provider',
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'tabs' && value) return { kind: 'browser_extension_tabs', sessionId: value, json };
    if (action === 'frames' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_frames',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'markdown' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_markdown',
        sessionId: value,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'readability' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_readability',
        sessionId: value,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'dialogs' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_dialogs',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'dialog-actions' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_dialog_actions',
        sessionId: value,
        query,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'banners' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_banners',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'banner-dismiss' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_banner_dismiss',
        sessionId: value,
        query,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'loading-states' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_loading_states',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'empty-states' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_empty_states',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'dialog-close' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_dialog_close',
        sessionId: value,
        query,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'dialog-action' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const actionQuery = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_dialog_action',
        sessionId: value,
        actionQuery,
        dialogQuery: readFlagValue(filtered, '--dialog'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'menus' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_menus',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'menu-select' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_menu_select',
        sessionId: value,
        optionQuery: filtered[3],
        menuQuery: readFlagValue(filtered, '--menu'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'disclosures' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_disclosures',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'wait-dialog' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_wait_dialog',
        sessionId: value,
        query,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-no-dialog' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_wait_no_dialog',
        sessionId: value,
        query,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-menu' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_wait_menu',
        sessionId: value,
        query,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-no-menu' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_wait_no_menu',
        sessionId: value,
        query,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-disclosure' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const state = readFlagValue(filtered, '--state');
      if (state && !['open', 'closed'].includes(state)) {
        throw new Error('browserext wait-disclosure requires --state open|closed when provided');
      }
      return {
        kind: 'browser_extension_wait_disclosure',
        sessionId: value,
        query: filtered[3],
        state: state as 'open' | 'closed' | undefined,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'disclosure-toggle' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const desiredStateRaw = readFlagValue(filtered, '--state');
      const desiredState = desiredStateRaw === 'open' || desiredStateRaw === 'closed' || desiredStateRaw === 'toggle'
        ? desiredStateRaw
        : undefined;
      return {
        kind: 'browser_extension_disclosure_toggle',
        sessionId: value,
        query: filtered[3],
        desiredState,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collections' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collections',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-controls' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_controls',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-active-filters' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_active_filters',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-sort-state' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_sort_state',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-filter-tokens' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_filter_tokens',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-rows' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_rows',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-find' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_find',
        sessionId: value,
        query: filtered[3],
        cellQuery: readFlagValue(filtered, '--cell'),
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-values' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_values',
        sessionId: value,
        cellQuery: filtered[3],
        rowQuery: readFlagValue(filtered, '--row'),
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-values-diff' && value && filtered[3]) {
      const againstFile = readFlagValue(filtered, '--against-file');
      if (!againstFile) {
        throw new Error('browserext collection-values-diff requires --against-file <path>');
      }
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_values_diff',
        sessionId: value,
        cellQuery: filtered[3],
        againstFile,
        rowQuery: readFlagValue(filtered, '--row'),
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-stats' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_stats',
        sessionId: value,
        cellQuery: readFlagValue(filtered, '--cell'),
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-stats-diff' && value) {
      const againstFile = readFlagValue(filtered, '--against-file');
      if (!againstFile) {
        throw new Error('browserext collection-stats-diff requires --against-file <path>');
      }
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_stats_diff',
        sessionId: value,
        againstFile,
        cellQuery: readFlagValue(filtered, '--cell'),
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-row' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_row',
        sessionId: value,
        rowQuery: filtered[3],
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-cell' && value && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_cell',
        sessionId: value,
        rowQuery: filtered[3],
        cellQuery: filtered[4],
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'wait-collection-row' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_wait_collection_row',
        sessionId: value,
        rowQuery: filtered[3],
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-collection-count' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const parsedCount = Number.parseInt(filtered[3], 10);
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_wait_collection_count',
        sessionId: value,
        count: Number.isNaN(parsedCount) ? 0 : parsedCount,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'collection-row-actions' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_row_actions',
        sessionId: value,
        rowQuery: filtered[3],
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-selection-state' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_selection_state',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-sort' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_sort',
        sessionId: value,
        valueQuery: filtered[3],
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-filter' && value && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_filter',
        sessionId: value,
        query: filtered[3],
        value: filtered[4],
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-filter-clear' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_filter_clear',
        sessionId: value,
        query: filtered[3],
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-filter-token-clear' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_filter_token_clear',
        sessionId: value,
        query: filtered[3],
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-clear-all-filters' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_clear_all_filters',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        continueOnError: filtered.includes('--continue-on-error'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-row-click' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_row_click',
        sessionId: value,
        rowQuery: filtered[3],
        actionQuery: readFlagValue(filtered, '--action'),
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-row-select' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const desiredStateRaw = readFlagValue(filtered, '--state');
      const desiredState = desiredStateRaw === 'on' || desiredStateRaw === 'off' || desiredStateRaw === 'toggle'
        ? desiredStateRaw
        : undefined;
      return {
        kind: 'browser_extension_collection_row_select',
        sessionId: value,
        rowQuery: filtered[3],
        desiredState,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-select-all' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const desiredStateRaw = readFlagValue(filtered, '--state');
      const desiredState = desiredStateRaw === 'on' || desiredStateRaw === 'off' || desiredStateRaw === 'toggle'
        ? desiredStateRaw
        : undefined;
      return {
        kind: 'browser_extension_collection_select_all',
        sessionId: value,
        desiredState,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-row-details' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_row_details',
        sessionId: value,
        rowQuery: filtered[3],
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-row-expand' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const desiredStateRaw = readFlagValue(filtered, '--state');
      const desiredState = desiredStateRaw === 'open' || desiredStateRaw === 'closed' || desiredStateRaw === 'toggle'
        ? desiredStateRaw
        : undefined;
      return {
        kind: 'browser_extension_collection_row_expand',
        sessionId: value,
        rowQuery: filtered[3],
        desiredState,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-bulk-action' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_bulk_action',
        sessionId: value,
        rowQueries: readFlagValues(filtered, '--row'),
        actionQuery: readFlagValue(filtered, '--action'),
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        continueOnError: filtered.includes('--continue-on-error'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-export' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const formatRaw = readFlagValue(filtered, '--format');
      const format = formatRaw === 'json' || formatRaw === 'markdown' ? formatRaw : undefined;
      return {
        kind: 'browser_extension_collection_export',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        includeSelection: filtered.includes('--include-selection'),
        includeDetails: filtered.includes('--include-details'),
        format,
        filePath: readFlagValue(filtered, '--file'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-diff' && value) {
      const againstFile = readFlagValue(filtered, '--against-file');
      if (!againstFile) {
        throw new Error('browserext collection-diff requires --against-file <path>');
      }
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const dedupeByRaw = readFlagValue(filtered, '--dedupe-by');
      const dedupeBy = dedupeByRaw === 'auto' || dedupeByRaw === 'selector' || dedupeByRaw === 'text' || dedupeByRaw === 'cells'
        ? dedupeByRaw
        : undefined;
      return {
        kind: 'browser_extension_collection_diff',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        againstFile,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        dedupeBy,
        includeSelection: filtered.includes('--include-selection'),
        includeDetails: filtered.includes('--include-details'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'wait-collection-diff' && value) {
      const againstFile = readFlagValue(filtered, '--against-file');
      if (!againstFile) {
        throw new Error('browserext wait-collection-diff requires --against-file <path>');
      }
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const dedupeByRaw = readFlagValue(filtered, '--dedupe-by');
      const dedupeBy = dedupeByRaw === 'auto' || dedupeByRaw === 'selector' || dedupeByRaw === 'text' || dedupeByRaw === 'cells'
        ? dedupeByRaw
        : undefined;
      const parseOptionalInt = (flag: string) => {
        const raw = readFlagValue(filtered, flag);
        if (!raw) {
          return undefined;
        }
        const parsed = Number.parseInt(raw, 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      };
      return {
        kind: 'browser_extension_wait_collection_diff',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        againstFile,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        dedupeBy,
        includeSelection: filtered.includes('--include-selection'),
        includeDetails: filtered.includes('--include-details'),
        addedAtLeast: parseOptionalInt('--added-at-least'),
        removedAtLeast: parseOptionalInt('--removed-at-least'),
        changedAtLeast: parseOptionalInt('--changed-at-least'),
        unchangedAtLeast: parseOptionalInt('--unchanged-at-least'),
        rowAdded: readFlagValue(filtered, '--row-added'),
        rowRemoved: readFlagValue(filtered, '--row-removed'),
        rowChanged: readFlagValue(filtered, '--row-changed'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'collection-click' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_collection_click',
        sessionId: value,
        itemQuery: filtered[3],
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'paginations' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_paginations',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'pagination-click' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_pagination_click',
        sessionId: value,
        query: filtered[3],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'load-more' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const positionalQuery = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_load_more',
        sessionId: value,
        query: positionalQuery,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'collection-harvest' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const maxIterationsRaw = readFlagValue(filtered, '--max-iterations');
      const parsedMaxIterations = maxIterationsRaw ? Number.parseInt(maxIterationsRaw, 10) : undefined;
      const stableIterationsRaw = readFlagValue(filtered, '--stable-iterations');
      const parsedStableIterations = stableIterationsRaw ? Number.parseInt(stableIterationsRaw, 10) : undefined;
      const settleQuietMsRaw = readFlagValue(filtered, '--settle-quiet-ms');
      const parsedSettleQuietMs = settleQuietMsRaw ? Number.parseInt(settleQuietMsRaw, 10) : undefined;
      const scrollAmountRaw = readFlagValue(filtered, '--scroll-amount');
      const parsedScrollAmount = scrollAmountRaw ? Number.parseFloat(scrollAmountRaw) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const strategyRaw = readFlagValue(filtered, '--strategy');
      const strategy = strategyRaw === 'auto' || strategyRaw === 'load_more' || strategyRaw === 'scroll' ? strategyRaw : undefined;
      const dedupeByRaw = readFlagValue(filtered, '--dedupe-by');
      const dedupeBy = dedupeByRaw === 'auto' || dedupeByRaw === 'selector' || dedupeByRaw === 'text' || dedupeByRaw === 'cells'
        ? dedupeByRaw
        : undefined;
      return {
        kind: 'browser_extension_collection_harvest',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        strategy,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        maxIterations: parsedMaxIterations !== undefined && !Number.isNaN(parsedMaxIterations) ? parsedMaxIterations : undefined,
        stableIterations: parsedStableIterations !== undefined && !Number.isNaN(parsedStableIterations) ? parsedStableIterations : undefined,
        settleQuietMs: parsedSettleQuietMs !== undefined && !Number.isNaN(parsedSettleQuietMs) ? parsedSettleQuietMs : undefined,
        dedupeBy,
        scrollAmount: parsedScrollAmount !== undefined && !Number.isNaN(parsedScrollAmount) ? parsedScrollAmount : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'session' && value === 'wait-ready' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      return {
        kind: 'browser_extension_session_wait_ready',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'session' && value === 'refresh' && filtered[3]) {
      return {
        kind: 'browser_extension_session_refresh',
        sessionId: filtered[3],
        json
      };
    }
    if (action === 'session' && value === 'reconnect' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      return {
        kind: 'browser_extension_session_reconnect',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'session' && value === 'nuke') {
      const queueRaw = readFlagValue(filtered, '--queue');
      const queue = queueRaw === 'keep' || queueRaw === 'matching' || queueRaw === 'all'
        ? queueRaw
        : 'matching';
      return {
        kind: 'browser_extension_session_nuke',
        site: readFlagValue(filtered, '--site'),
        staleOnly: filtered.includes('--stale'),
        connectedOnly: filtered.includes('--connected'),
        disconnectedOnly: filtered.includes('--disconnected'),
        queue,
        json
      };
    }
    if (action === 'queue' && value === 'clear') {
      const statusRaw = readFlagValue(filtered, '--status');
      if (statusRaw && !['pending', 'in_progress', 'completed', 'failed'].includes(statusRaw)) {
        throw new Error('browserext queue clear requires --status pending|in_progress|completed|failed when provided');
      }
      return {
        kind: 'browser_extension_queue_clear',
        sessionId: readFlagValue(filtered, '--session'),
        site: readFlagValue(filtered, '--site'),
        status: statusRaw as 'pending' | 'in_progress' | 'completed' | 'failed' | undefined,
        json
      };
    }
    if (action === 'navigate' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_navigate',
        sessionId: value,
        targetUrl: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'back' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_back',
        sessionId: value,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'forward' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_forward',
        sessionId: value,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'reload' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_reload',
        sessionId: value,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'metadata' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_metadata',
        sessionId: value,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'url-parts' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_url_parts',
        sessionId: value,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'storage-list' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const scopeRaw = readFlagValue(filtered, '--scope');
      const scope = scopeRaw === 'session' ? 'session' : scopeRaw === 'local' ? 'local' : undefined;
      return {
        kind: 'browser_extension_storage_list',
        sessionId: value,
        scope,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'storage-get' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const scopeRaw = readFlagValue(filtered, '--scope');
      const scope = scopeRaw === 'session' ? 'session' : scopeRaw === 'local' ? 'local' : undefined;
      return {
        kind: 'browser_extension_storage_get',
        sessionId: value,
        key: filtered[3],
        scope,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'storage-set' && value && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const scopeRaw = readFlagValue(filtered, '--scope');
      const scope = scopeRaw === 'session' ? 'session' : scopeRaw === 'local' ? 'local' : undefined;
      return {
        kind: 'browser_extension_storage_set',
        sessionId: value,
        key: filtered[3],
        value: filtered[4],
        scope,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'storage-remove' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const scopeRaw = readFlagValue(filtered, '--scope');
      const scope = scopeRaw === 'session' ? 'session' : scopeRaw === 'local' ? 'local' : undefined;
      return {
        kind: 'browser_extension_storage_remove',
        sessionId: value,
        key: filtered[3],
        scope,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'focus-tab' && value && filtered[3]) {
      const tabId = Number.parseInt(filtered[3], 10);
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      if (!Number.isNaN(tabId)) {
        return {
          kind: 'browser_extension_focus_tab',
          sessionId: value,
          tabId,
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
    if (action === 'snapshot' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_snapshot',
        sessionId: value,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'scroll-page' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const amountRaw = readFlagValue(filtered, '--amount');
      const parsedAmount = amountRaw ? Number.parseFloat(amountRaw) : undefined;
      const directionRaw = readFlagValue(filtered, '--direction');
      const direction = directionRaw === 'up' || directionRaw === 'down' ? directionRaw : undefined;
      return {
        kind: 'browser_extension_scroll_page',
        sessionId: value,
        direction,
        amount: parsedAmount !== undefined && !Number.isNaN(parsedAmount) ? parsedAmount : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'dom-tree' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const depthRaw = readFlagValue(filtered, '--max-depth');
      const parsedDepth = depthRaw ? Number.parseInt(depthRaw, 10) : undefined;
      const childrenRaw = readFlagValue(filtered, '--max-children');
      const parsedChildren = childrenRaw ? Number.parseInt(childrenRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_dom_tree',
        sessionId: value,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        maxDepth: parsedDepth !== undefined && !Number.isNaN(parsedDepth) ? parsedDepth : undefined,
        maxChildren: parsedChildren !== undefined && !Number.isNaN(parsedChildren) ? parsedChildren : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'screenshot' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_screenshot',
        sessionId: value,
        filename: readFlagValue(filtered, '--file'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'inspect' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_inspect',
        sessionId: value,
        selector: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'inspect-all' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_inspect_all',
        sessionId: value,
        selector: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'links' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_links',
        sessionId: value,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'actionables' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_actionables',
        sessionId: value,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'page-state' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const limitRaw = readFlagValue(filtered, '--limit');
      const depthRaw = readFlagValue(filtered, '--max-depth');
      const childrenRaw = readFlagValue(filtered, '--max-children');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const parsedDepth = depthRaw ? Number.parseInt(depthRaw, 10) : undefined;
      const parsedChildren = childrenRaw ? Number.parseInt(childrenRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_page_state',
        sessionId: value,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        maxDepth: parsedDepth !== undefined && !Number.isNaN(parsedDepth) ? parsedDepth : undefined,
        maxChildren: parsedChildren !== undefined && !Number.isNaN(parsedChildren) ? parsedChildren : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'page-diff' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const maxDepthRaw = readFlagValue(filtered, '--max-depth');
      const parsedMaxDepth = maxDepthRaw ? Number.parseInt(maxDepthRaw, 10) : undefined;
      const maxChildrenRaw = readFlagValue(filtered, '--max-children');
      const parsedMaxChildren = maxChildrenRaw ? Number.parseInt(maxChildrenRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const againstFile = readFlagValue(filtered, '--against-file');
      if (!againstFile) {
        throw new Error('browserext page-diff requires --against-file <path>');
      }
      return {
        kind: 'browser_extension_page_diff',
        sessionId: value,
        againstFile,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        maxDepth: parsedMaxDepth !== undefined && !Number.isNaN(parsedMaxDepth) ? parsedMaxDepth : undefined,
        maxChildren: parsedMaxChildren !== undefined && !Number.isNaN(parsedMaxChildren) ? parsedMaxChildren : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'page-blockers' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_page_blockers',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'page-outcomes' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_page_outcomes',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'page-recover' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_page_recover',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        continueOnError: filtered.includes('--continue-on-error'),
        json
      };
    }
    if (action === 'page-ready' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_page_ready',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        continueOnError: filtered.includes('--continue-on-error'),
        json
      };
    }
    if (action === 'next-actions' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const limitRaw = readFlagValue(filtered, '--limit');
      const depthRaw = readFlagValue(filtered, '--max-depth');
      const childrenRaw = readFlagValue(filtered, '--max-children');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const parsedDepth = depthRaw ? Number.parseInt(depthRaw, 10) : undefined;
      const parsedChildren = childrenRaw ? Number.parseInt(childrenRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_next_actions',
        sessionId: value,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        maxDepth: parsedDepth !== undefined && !Number.isNaN(parsedDepth) ? parsedDepth : undefined,
        maxChildren: parsedChildren !== undefined && !Number.isNaN(parsedChildren) ? parsedChildren : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'locate' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const depthRaw = readFlagValue(filtered, '--max-depth');
      const parsedDepth = depthRaw ? Number.parseInt(depthRaw, 10) : undefined;
      const childrenRaw = readFlagValue(filtered, '--max-children');
      const parsedChildren = childrenRaw ? Number.parseInt(childrenRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const byRaw = readFlagValue(filtered, '--by');
      const by = byRaw === 'selector' || byRaw === 'role' || byRaw === 'id' || byRaw === 'name' || byRaw === 'placeholder' || byRaw === 'tag' || byRaw === 'text'
        ? byRaw
        : undefined;
      return {
        kind: 'browser_extension_locate',
        sessionId: value,
        query: filtered[3],
        by,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        maxDepth: parsedDepth !== undefined && !Number.isNaN(parsedDepth) ? parsedDepth : undefined,
        maxChildren: parsedChildren !== undefined && !Number.isNaN(parsedChildren) ? parsedChildren : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'click-query' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const depthRaw = readFlagValue(filtered, '--max-depth');
      const parsedDepth = depthRaw ? Number.parseInt(depthRaw, 10) : undefined;
      const childrenRaw = readFlagValue(filtered, '--max-children');
      const parsedChildren = childrenRaw ? Number.parseInt(childrenRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const byRaw = readFlagValue(filtered, '--by');
      const by = byRaw === 'selector' || byRaw === 'role' || byRaw === 'id' || byRaw === 'name' || byRaw === 'placeholder' || byRaw === 'tag' || byRaw === 'text'
        ? byRaw
        : undefined;
      return {
        kind: 'browser_extension_click_query',
        sessionId: value,
        query: filtered[3],
        by,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        maxDepth: parsedDepth !== undefined && !Number.isNaN(parsedDepth) ? parsedDepth : undefined,
        maxChildren: parsedChildren !== undefined && !Number.isNaN(parsedChildren) ? parsedChildren : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'eval' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_evaluate',
        sessionId: value,
        expression: filtered.slice(3).filter((token, index, arr) => {
          if (token === '--timeout-ms') {
            return false;
          }
          if (index > 0 && arr[index - 1] === '--timeout-ms') {
            return false;
          }
          return true;
        }).join(' '),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'click' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_click',
        sessionId: value,
        selector: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'type' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_type',
        sessionId: value,
        selector: filtered[3],
        text: textTokens.join(' '),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'press' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_press',
        sessionId: value,
        key: filtered[3],
        selector: readFlagValue(filtered, '--selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'editor-read' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_editor_read',
        sessionId: value,
        selector: filtered[3],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'editor-fill' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_editor_fill',
        sessionId: value,
        selector: filtered[3],
        value: filtered[4],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-fill' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const valueTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--frame') {
          index += 1;
          continue;
        }
        valueTokens.push(token);
      }
      return {
        kind: 'browser_extension_form_fill',
        sessionId: value,
        selector: filtered[3],
        value: valueTokens.join(' '),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-fill-human' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const delayRaw = readFlagValue(filtered, '--delay-ms');
      const parsedDelay = delayRaw ? Number.parseInt(delayRaw, 10) : undefined;
      const jitterRaw = readFlagValue(filtered, '--jitter-ms');
      const parsedJitter = jitterRaw ? Number.parseInt(jitterRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_fill_human',
        sessionId: value,
        selector: filtered[3],
        value: filtered[4],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        delayMs: parsedDelay !== undefined && !Number.isNaN(parsedDelay) ? parsedDelay : undefined,
        jitterMs: parsedJitter !== undefined && !Number.isNaN(parsedJitter) ? parsedJitter : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-fill-many' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const fieldSpecs = readFlagValues(filtered, '--field');
      const fields = fieldSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --field value: ${spec}. Use --field "<selector>=<value>"`);
        }
        return {
          selector: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      return {
        kind: 'browser_extension_form_fill_many',
        sessionId: value,
        fields,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-workflow' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const delayRaw = readFlagValue(filtered, '--delay-ms');
      const parsedDelay = delayRaw ? Number.parseInt(delayRaw, 10) : undefined;
      const contextRaw = readFlagValue(filtered, '--context-index');
      const parsedContext = contextRaw ? Number.parseInt(contextRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const fieldSpecs = readFlagValues(filtered, '--field');
      const fields = fieldSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --field value: ${spec}. Use --field "<query>=<value>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      return {
        kind: 'browser_extension_form_workflow',
        sessionId: value,
        fields,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        contextIndex: parsedContext !== undefined && !Number.isNaN(parsedContext) ? parsedContext : undefined,
        contextQuery: readFlagValue(filtered, '--context-query'),
        frameQuery: readFlagValue(filtered, '--frame-query'),
        exact: filtered.includes('--exact'),
        submit: filtered.includes('--submit'),
        submitSelector: readFlagValue(filtered, '--submit-selector'),
        delayMs: parsedDelay !== undefined && !Number.isNaN(parsedDelay) ? parsedDelay : undefined,
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'query-workflow' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const delayRaw = readFlagValue(filtered, '--delay-ms');
      const parsedDelay = delayRaw ? Number.parseInt(delayRaw, 10) : undefined;
      const settleQuietRaw = readFlagValue(filtered, '--settle-quiet-ms');
      const parsedSettleQuiet = settleQuietRaw ? Number.parseInt(settleQuietRaw, 10) : undefined;
      const stableRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStable = stableRaw ? Number.parseInt(stableRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const fillSpecs = readFlagValues(filtered, '--fill');
      const fills = fillSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --fill value: ${spec}. Use --fill "<query>=<value>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const clicks = readFlagValues(filtered, '--click');
      const radioSpecs = readFlagValues(filtered, '--radio');
      const radios = radioSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --radio value: ${spec}. Use --radio "<group-query>=<option>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const segmentSpecs = readFlagValues(filtered, '--segment');
      const segmenteds = segmentSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --segment value: ${spec}. Use --segment "<group-query>=<option>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const tabSpecs = readFlagValues(filtered, '--tab');
      const tabs = tabSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --tab value: ${spec}. Use --tab "<group-query>=<option>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const stepNextSpecs = readFlagValues(filtered, '--step-next').map((query) => ({ query: query || undefined, direction: 'next' as const }));
      const stepPrevSpecs = readFlagValues(filtered, '--step-prev').map((query) => ({ query: query || undefined, direction: 'previous' as const }));
      const dateSpecs = readFlagValues(filtered, '--date');
      const dates = dateSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --date value: ${spec}. Use --date "<query>=<YYYY-MM-DD>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const timeSpecs = readFlagValues(filtered, '--time');
      const times = timeSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --time value: ${spec}. Use --time "<query>=<HH:MM>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const datetimeSpecs = readFlagValues(filtered, '--datetime');
      const datetimes = datetimeSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --datetime value: ${spec}. Use --datetime "<query>=<YYYY-MM-DDTHH:MM>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const rangeSpecs = readFlagValues(filtered, '--range');
      const ranges = rangeSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --range value: ${spec}. Use --range "<query>=<value>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const toggleSpecs = readFlagValues(filtered, '--toggle');
      const toggles: Array<{ query: string; desiredState?: 'on' | 'off' | 'toggle' }> = toggleSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          return {
            query: spec,
            desiredState: 'toggle' as const
          };
        }
        const desiredStateRaw = spec.slice(separatorIndex + 1);
        const desiredState = desiredStateRaw === 'on' || desiredStateRaw === 'off' || desiredStateRaw === 'toggle'
          ? desiredStateRaw
          : (() => { throw new Error(`Invalid --toggle state: ${desiredStateRaw}. Use on, off, or toggle.`); })();
        return {
          query: spec.slice(0, separatorIndex),
          desiredState
        };
      });
      return {
        kind: 'browser_extension_query_workflow',
        sessionId: value,
        fills,
        clicks,
        radios: radios.length > 0 ? radios : undefined,
        segmenteds: segmenteds.length > 0 ? segmenteds : undefined,
        tabs: tabs.length > 0 ? tabs : undefined,
        steppers: [...stepNextSpecs, ...stepPrevSpecs].length > 0 ? [...stepNextSpecs, ...stepPrevSpecs] : undefined,
        dates: dates.length > 0 ? dates : undefined,
        times: times.length > 0 ? times : undefined,
        datetimes: datetimes.length > 0 ? datetimes : undefined,
        ranges: ranges.length > 0 ? ranges : undefined,
        toggles: toggles.length > 0 ? toggles : undefined,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        contextQuery: readFlagValue(filtered, '--context-query'),
        frameQuery: readFlagValue(filtered, '--frame-query'),
        exact: filtered.includes('--exact'),
        submit: filtered.includes('--submit'),
        submitSelector: readFlagValue(filtered, '--submit-selector'),
        submitQuery: readFlagValue(filtered, '--submit-query'),
        delayMs: parsedDelay !== undefined && !Number.isNaN(parsedDelay) ? parsedDelay : undefined,
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        requireTexts: (() => {
          const values = readFlagValues(filtered, '--require-text');
          return values.length > 0 ? values : undefined;
        })(),
        requireNoTexts: (() => {
          const values = readFlagValues(filtered, '--require-no-text');
          return values.length > 0 ? values : undefined;
        })(),
        requireSelectors: (() => {
          const values = readFlagValues(filtered, '--require-selector');
          return values.length > 0 ? values : undefined;
        })(),
        requireNoSelectors: (() => {
          const values = readFlagValues(filtered, '--require-no-selector');
          return values.length > 0 ? values : undefined;
        })(),
        settleAfterEach: (() => {
          const raw = readFlagValue(filtered, '--settle-after-each');
          return raw === 'dom' || raw === 'network' || raw === 'page' ? raw : undefined;
        })(),
        settleQuietMs: parsedSettleQuiet !== undefined && !Number.isNaN(parsedSettleQuiet) ? parsedSettleQuiet : undefined,
        stableReads: parsedStable !== undefined && !Number.isNaN(parsedStable) ? parsedStable : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'query-plan' && value) {
      const frameSelectors = readFlagValues(filtered, '--frame');
      const fillSpecs = readFlagValues(filtered, '--fill');
      const fills = fillSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --fill value: ${spec}. Use --fill "<query>=<value>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const clicks = readFlagValues(filtered, '--click');
      const radioSpecs = readFlagValues(filtered, '--radio');
      const radios = radioSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --radio value: ${spec}. Use --radio "<group-query>=<option>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const segmentSpecs = readFlagValues(filtered, '--segment');
      const segmenteds = segmentSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --segment value: ${spec}. Use --segment "<group-query>=<option>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const tabSpecs = readFlagValues(filtered, '--tab');
      const tabs = tabSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --tab value: ${spec}. Use --tab "<group-query>=<option>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const stepNextSpecs = readFlagValues(filtered, '--step-next').map((query) => ({ query: query || undefined, direction: 'next' as const }));
      const stepPrevSpecs = readFlagValues(filtered, '--step-prev').map((query) => ({ query: query || undefined, direction: 'previous' as const }));
      const dateSpecs = readFlagValues(filtered, '--date');
      const dates = dateSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --date value: ${spec}. Use --date "<query>=<YYYY-MM-DD>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const timeSpecs = readFlagValues(filtered, '--time');
      const times = timeSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --time value: ${spec}. Use --time "<query>=<HH:MM>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const datetimeSpecs = readFlagValues(filtered, '--datetime');
      const datetimes = datetimeSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --datetime value: ${spec}. Use --datetime "<query>=<YYYY-MM-DDTHH:MM>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const rangeSpecs = readFlagValues(filtered, '--range');
      const ranges = rangeSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --range value: ${spec}. Use --range "<query>=<value>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      const toggleSpecs = readFlagValues(filtered, '--toggle');
      const toggles: Array<{ query: string; desiredState?: 'on' | 'off' | 'toggle' }> = toggleSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          return {
            query: spec,
            desiredState: 'toggle' as const
          };
        }
        const desiredStateRaw = spec.slice(separatorIndex + 1);
        const desiredState = desiredStateRaw === 'on' || desiredStateRaw === 'off' || desiredStateRaw === 'toggle'
          ? desiredStateRaw
          : (() => { throw new Error(`Invalid --toggle state: ${desiredStateRaw}. Use on, off, or toggle.`); })();
        return {
          query: spec.slice(0, separatorIndex),
          desiredState
        };
      });
      return {
        kind: 'browser_extension_query_plan',
        sessionId: value,
        fills,
        clicks,
        radios: radios.length > 0 ? radios : undefined,
        segmenteds: segmenteds.length > 0 ? segmenteds : undefined,
        tabs: tabs.length > 0 ? tabs : undefined,
        steppers: [...stepNextSpecs, ...stepPrevSpecs].length > 0 ? [...stepNextSpecs, ...stepPrevSpecs] : undefined,
        dates: dates.length > 0 ? dates : undefined,
        times: times.length > 0 ? times : undefined,
        datetimes: datetimes.length > 0 ? datetimes : undefined,
        ranges: ranges.length > 0 ? ranges : undefined,
        toggles: toggles.length > 0 ? toggles : undefined,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        contextQuery: readFlagValue(filtered, '--context-query'),
        frameQuery: readFlagValue(filtered, '--frame-query'),
        exact: filtered.includes('--exact'),
        submit: filtered.includes('--submit'),
        submitSelector: readFlagValue(filtered, '--submit-selector'),
        submitQuery: readFlagValue(filtered, '--submit-query'),
        json
      };
    }
    if (action === 'workflow-validate') {
      const filepath = readFlagValue(filtered, '--file');
      if (!filepath) {
        throw new Error('browserext workflow-validate requires --file <path>');
      }
      return {
        kind: 'browser_extension_workflow_validate',
        filepath,
        json
      };
    }
    if (action === 'workflow-plan') {
      const filepath = readFlagValue(filtered, '--file');
      if (!filepath) {
        throw new Error('browserext workflow-plan requires --file <path>');
      }
      const sessionId = value && !value.startsWith('--') ? value : readFlagValue(filtered, '--session');
      const variables = Object.fromEntries(readFlagValues(filtered, '--var').map((entry) => {
        const separatorIndex = entry.indexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --var value: ${entry}. Use --var "<name>=<value>"`);
        }
        return [entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1)];
      }));
      return {
        kind: 'browser_extension_workflow_plan',
        sessionId: sessionId || undefined,
        filepath,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
        json
      };
    }
    if (action === 'workflow-diagnose') {
      const filepath = readFlagValue(filtered, '--file');
      if (!filepath) {
        throw new Error('browserext workflow-diagnose requires --file <path>');
      }
      const sessionId = value && !value.startsWith('--') ? value : readFlagValue(filtered, '--session');
      const variables = Object.fromEntries(readFlagValues(filtered, '--var').map((entry) => {
        const separatorIndex = entry.indexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --var value: ${entry}. Use --var "<name>=<value>"`);
        }
        return [entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1)];
      }));
      return {
        kind: 'browser_extension_workflow_diagnose',
        sessionId: sessionId || undefined,
        filepath,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
        json
      };
    }
    if (action === 'workflow-run') {
      const filepath = readFlagValue(filtered, '--file');
      if (!filepath) {
        throw new Error('browserext workflow-run requires --file <path>');
      }
      const sessionId = value && !value.startsWith('--') ? value : readFlagValue(filtered, '--session');
      const variables = Object.fromEntries(readFlagValues(filtered, '--var').map((entry) => {
        const separatorIndex = entry.indexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --var value: ${entry}. Use --var "<name>=<value>"`);
        }
        return [entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1)];
      }));
      return {
        kind: 'browser_extension_workflow_run',
        sessionId: sessionId || undefined,
        filepath,
        variables: Object.keys(variables).length > 0 ? variables : undefined,
        json
      };
    }
    if (action === 'form-fields' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_fields',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-values' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_values',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        contextQuery: readFlagValue(filtered, '--context-query'),
        frameQuery: readFlagValue(filtered, '--frame-query'),
        exact: filtered.includes('--exact'),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-contexts' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_contexts',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'context-plan' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const contextRaw = readFlagValue(filtered, '--context-index');
      const parsedContext = contextRaw ? Number.parseInt(contextRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_context_plan',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        contextIndex: parsedContext !== undefined && !Number.isNaN(parsedContext) ? parsedContext : undefined,
        contextQuery: readFlagValue(filtered, '--context-query'),
        frameQuery: readFlagValue(filtered, '--frame-query'),
        exact: filtered.includes('--exact'),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'context-state' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const contextRaw = readFlagValue(filtered, '--context-index');
      const parsedContext = contextRaw ? Number.parseInt(contextRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_context_state',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        contextIndex: parsedContext !== undefined && !Number.isNaN(parsedContext) ? parsedContext : undefined,
        contextQuery: readFlagValue(filtered, '--context-query'),
        frameQuery: readFlagValue(filtered, '--frame-query'),
        exact: filtered.includes('--exact'),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-radio-groups' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_radio_groups',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-find-field' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_find_field',
        sessionId: value,
        query: filtered[3],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-radio-select' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_radio_select',
        sessionId: value,
        query: filtered[3],
        value: filtered[4],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-segmented-options' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_segmented_options',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-segmented-select' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_segmented_select',
        sessionId: value,
        query: filtered[3],
        value: filtered[4],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-tablist-options' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_tablist_options',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-tablist-select' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_tablist_select',
        sessionId: value,
        query: filtered[3],
        value: filtered[4],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-stepper' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_stepper',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if ((action === 'form-step-next' || action === 'form-step-prev') && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_form_stepper_move',
        sessionId: value,
        direction: action === 'form-step-prev' ? 'previous' : 'next',
        query,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-date-set' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_date_set',
        sessionId: value,
        query: filtered[3],
        value: filtered[4],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-time-set' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_time_set',
        sessionId: value,
        query: filtered[3],
        value: filtered[4],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-datetime-set' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_datetime_set',
        sessionId: value,
        query: filtered[3],
        value: filtered[4],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-toggle' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const stateRaw = readFlagValue(filtered, '--state');
      const desiredState = stateRaw === 'on' || stateRaw === 'off' || stateRaw === 'toggle'
        ? stateRaw
        : undefined;
      return {
        kind: 'browser_extension_form_toggle',
        sessionId: value,
        query: filtered[3],
        desiredState,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-range-set' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_range_set',
        sessionId: value,
        query: filtered[3],
        value: filtered[4],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-options' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_options',
        sessionId: value,
        selector: filtered[3],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-fill-label' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const valueTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--frame' || token === '--exact') {
          if (token !== '--exact') {
            index += 1;
          }
          continue;
        }
        valueTokens.push(token);
      }
      return {
        kind: 'browser_extension_form_fill_label',
        sessionId: value,
        query: filtered[3],
        value: valueTokens.join(' '),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-fill-query' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const valueTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--frame' || token === '--exact' || token === '--form') {
          if (token !== '--exact') {
            index += 1;
          }
          continue;
        }
        valueTokens.push(token);
      }
      return {
        kind: 'browser_extension_form_fill_query',
        sessionId: value,
        query: filtered[3],
        value: valueTokens.join(' '),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        formSelector: readFlagValue(filtered, '--form'),
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-select' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const byRaw = readFlagValue(filtered, '--by');
      const frameSelectors = readFlagValues(filtered, '--frame');
      const valueTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--frame' || token === '--by') {
          index += 1;
          continue;
        }
        valueTokens.push(token);
      }
      const by = byRaw === 'value' || byRaw === 'label' ? byRaw : byRaw === 'text' ? 'text' : undefined;
      return {
        kind: 'browser_extension_form_select',
        sessionId: value,
        selector: filtered[3],
        value: valueTokens.join(' '),
        by,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-upload' && value && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_upload',
        sessionId: value,
        selector: filtered[3],
        filepath: filtered[4],
        fileName: readFlagValue(filtered, '--name'),
        mimeType: readFlagValue(filtered, '--mime'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-combobox-options' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_combobox_options',
        sessionId: value,
        selector: filtered[3],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-combobox-select' && value && filtered[3] && filtered[4] !== undefined) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const matchRaw = readFlagValue(filtered, '--match');
      const valueTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--frame' || token === '--match') {
          index += 1;
          continue;
        }
        valueTokens.push(token);
      }
      return {
        kind: 'browser_extension_form_combobox_select',
        sessionId: value,
        selector: filtered[3],
        value: valueTokens.join(' '),
        match: matchRaw === 'exact' ? 'exact' : matchRaw === 'includes' ? 'includes' : undefined,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-submit' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_submit',
        sessionId: value,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'form-submit-wait' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_form_submit_wait',
        sessionId: value,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'auth-login' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const delayRaw = readFlagValue(filtered, '--delay-ms');
      const parsedDelay = delayRaw ? Number.parseInt(delayRaw, 10) : undefined;
      const jitterRaw = readFlagValue(filtered, '--jitter-ms');
      const parsedJitter = jitterRaw ? Number.parseInt(jitterRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const humanLike = filtered.includes('--plain-fill') ? false : true;
      const password = readFlagValue(filtered, '--password');
      if (!password) {
        throw new Error('auth-login requires --password');
      }
      return {
        kind: 'browser_extension_auth_login',
        sessionId: value,
        email: readFlagValue(filtered, '--email'),
        username: readFlagValue(filtered, '--username'),
        password,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        selector: readFlagValue(filtered, '--submit-selector'),
        humanLike,
        delayMs: parsedDelay !== undefined && !Number.isNaN(parsedDelay) ? parsedDelay : undefined,
        jitterMs: parsedJitter !== undefined && !Number.isNaN(parsedJitter) ? parsedJitter : undefined,
        skipSubmit: filtered.includes('--skip-submit'),
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'auth-signup' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const delayRaw = readFlagValue(filtered, '--delay-ms');
      const parsedDelay = delayRaw ? Number.parseInt(delayRaw, 10) : undefined;
      const jitterRaw = readFlagValue(filtered, '--jitter-ms');
      const parsedJitter = jitterRaw ? Number.parseInt(jitterRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const humanLike = filtered.includes('--plain-fill') ? false : true;
      const password = readFlagValue(filtered, '--password');
      if (!password) {
        throw new Error('auth-signup requires --password');
      }
      return {
        kind: 'browser_extension_auth_signup',
        sessionId: value,
        fullName: readFlagValue(filtered, '--full-name'),
        username: readFlagValue(filtered, '--username'),
        email: readFlagValue(filtered, '--email'),
        password,
        confirmPassword: readFlagValue(filtered, '--confirm-password'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        selector: readFlagValue(filtered, '--submit-selector'),
        humanLike,
        delayMs: parsedDelay !== undefined && !Number.isNaN(parsedDelay) ? parsedDelay : undefined,
        jitterMs: parsedJitter !== undefined && !Number.isNaN(parsedJitter) ? parsedJitter : undefined,
        skipSubmit: filtered.includes('--skip-submit'),
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'cookies' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_cookies',
        sessionId: value,
        targetUrl: readFlagValue(filtered, '--url'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'cookie-get' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_cookie_get',
        sessionId: value,
        name: filtered[3],
        targetUrl: readFlagValue(filtered, '--url'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'cookie-set' && value && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const expirationRaw = readFlagValue(filtered, '--expiration');
      const parsedExpiration = expirationRaw ? Number.parseFloat(expirationRaw) : undefined;
      const sameSiteRaw = readFlagValue(filtered, '--same-site');
      const sameSite = sameSiteRaw === 'no_restriction' || sameSiteRaw === 'lax' || sameSiteRaw === 'strict' || sameSiteRaw === 'unspecified'
        ? sameSiteRaw
        : undefined;
      return {
        kind: 'browser_extension_cookie_set',
        sessionId: value,
        name: filtered[3],
        value: filtered[4],
        targetUrl: readFlagValue(filtered, '--url'),
        domain: readFlagValue(filtered, '--domain'),
        path: readFlagValue(filtered, '--path'),
        secure: filtered.includes('--secure'),
        httpOnly: filtered.includes('--http-only'),
        sameSite,
        expirationDate: parsedExpiration !== undefined && !Number.isNaN(parsedExpiration) ? parsedExpiration : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'cookie-remove' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_cookie_remove',
        sessionId: value,
        name: filtered[3],
        targetUrl: readFlagValue(filtered, '--url'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'wait-cookie' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const existsRaw = readFlagValue(filtered, '--exists');
      const exists = existsRaw === 'true' ? true : existsRaw === 'false' ? false : undefined;
      return {
        kind: 'browser_extension_wait_cookie',
        sessionId: value,
        name: filtered[3],
        targetUrl: readFlagValue(filtered, '--url'),
        equals: readFlagValue(filtered, '--equals'),
        includes: readFlagValue(filtered, '--includes'),
        exists,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'downloads' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const state = readFlagValue(filtered, '--state');
      if (state && !['in_progress', 'interrupted', 'complete'].includes(state)) {
        throw new Error('browserext downloads requires --state in_progress|interrupted|complete when provided');
      }
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_downloads',
        sessionId: value,
        query,
        state: state as 'in_progress' | 'interrupted' | 'complete' | undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'download-cancel' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_download_cancel',
        sessionId: value,
        query,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'download-erase' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_download_erase',
        sessionId: value,
        query,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'wait-download' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const state = readFlagValue(filtered, '--state');
      if (state && !['in_progress', 'interrupted', 'complete'].includes(state)) {
        throw new Error('browserext wait-download requires --state in_progress|interrupted|complete when provided');
      }
      const query = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_wait_download',
        sessionId: value,
        query,
        state: state as 'in_progress' | 'interrupted' | 'complete' | undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        exact: filtered.includes('--exact'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'read-latest' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_read_latest',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'new-chat' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_new_chat',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'sidebar-state' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_sidebar_state',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'toggle-sidebar' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_toggle_sidebar',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'models' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_models',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'select-model' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const queryTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms') {
          index += 1;
          continue;
        }
        queryTokens.push(token);
      }
      return {
        kind: 'browser_extension_chatgpt_select_model',
        sessionId: filtered[3],
        query: queryTokens.join(' '),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'info' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_info',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'conversations' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_list_conversations',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'open-conversation' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_open_conversation',
        sessionId: filtered[3],
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'conversation-actions' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_conversation_actions',
        sessionId: filtered[3],
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'conversation-action' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const actionTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--title' || token === '--url' || token === '--index') {
          index += 1;
          continue;
        }
        actionTokens.push(token);
      }
      return {
        kind: 'browser_extension_chatgpt_conversation_action',
        sessionId: filtered[3],
        actionQuery: actionTokens.join(' '),
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'rename-conversation' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const titleTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--match-title' || token === '--url' || token === '--index') {
          index += 1;
          continue;
        }
        titleTokens.push(token);
      }
      return {
        kind: 'browser_extension_chatgpt_rename_conversation',
        sessionId: filtered[3],
        title: titleTokens.join(' '),
        titleQuery: readFlagValue(filtered, '--match-title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'stop' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_stop',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'continue' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_continue',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'response-controls' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_response_controls',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'previous-response' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_previous_response',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'next-response' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_next_response',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'list-response-versions' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const maxVersionsRaw = readFlagValue(filtered, '--max-versions');
      const parsedMaxVersions = maxVersionsRaw ? Number.parseInt(maxVersionsRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_list_response_versions',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        maxVersions: parsedMaxVersions !== undefined && !Number.isNaN(parsedMaxVersions) ? parsedMaxVersions : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'select-response-version' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const maxVersionsRaw = readFlagValue(filtered, '--max-versions');
      const parsedMaxVersions = maxVersionsRaw ? Number.parseInt(maxVersionsRaw, 10) : undefined;
      const parsedIndex = Number.parseInt(filtered[4]!, 10);
      return {
        kind: 'browser_extension_chatgpt_select_response_version',
        sessionId: filtered[3],
        count: !Number.isNaN(parsedIndex) ? parsedIndex : 0,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        maxVersions: parsedMaxVersions !== undefined && !Number.isNaN(parsedMaxVersions) ? parsedMaxVersions : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'regenerate' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_regenerate',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'edit-message' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const offsetRaw = readFlagValue(filtered, '--offset');
      const parsedOffset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--limit' || token === '--index' || token === '--offset' || token === '--role') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_chatgpt_edit_message',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        offset: parsedOffset !== undefined && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'edit-message' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const offsetRaw = readFlagValue(filtered, '--offset');
      const parsedOffset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--limit' || token === '--index' || token === '--offset' || token === '--role') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_chatgpt_edit_message',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        offset: parsedOffset !== undefined && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'read-thread' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_read_thread',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'read-message' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const offsetRaw = readFlagValue(filtered, '--offset');
      const parsedOffset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      return {
        kind: 'browser_extension_chatgpt_read_message',
        sessionId: filtered[3],
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        offset: parsedOffset !== undefined && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'current-conversation' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_current_conversation',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'export-thread' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const format = readFlagValue(filtered, '--format');
      return {
        kind: 'browser_extension_chatgpt_export_thread',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        format: format === 'json' || format === 'markdown' ? format : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'send' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_chatgpt_send',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'ask' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_chatgpt_ask',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'ask-thread' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--limit') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_chatgpt_ask_thread',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'rewrite-thread' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const offsetRaw = readFlagValue(filtered, '--offset');
      const parsedOffset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--limit' || token === '--index' || token === '--offset' || token === '--role') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_chatgpt_rewrite_thread',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        offset: parsedOffset !== undefined && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'rewrite-thread' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const offsetRaw = readFlagValue(filtered, '--offset');
      const parsedOffset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--limit' || token === '--index' || token === '--offset' || token === '--role') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_chatgpt_rewrite_thread',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        offset: parsedOffset !== undefined && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'wait-idle' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_wait_idle',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'wait-response' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStable = stableRaw ? Number.parseInt(stableRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_wait_response',
        sessionId: filtered[3],
        baselineText: readFlagValue(filtered, '--baseline'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStable !== undefined && !Number.isNaN(parsedStable) ? parsedStable : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'wait-sidebar' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableReadsRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStableReads = stableReadsRaw ? Number.parseInt(stableReadsRaw, 10) : undefined;
      const openRaw = readFlagValue(filtered, '--open');
      return {
        kind: 'browser_extension_chatgpt_wait_sidebar',
        sessionId: filtered[3],
        open: openRaw === 'true' ? true : openRaw === 'false' ? false : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStableReads !== undefined && !Number.isNaN(parsedStableReads) ? parsedStableReads : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'wait-model' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableReadsRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStableReads = stableReadsRaw ? Number.parseInt(stableReadsRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_wait_model',
        sessionId: filtered[3],
        query: readFlagValue(filtered, '--query'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStableReads !== undefined && !Number.isNaN(parsedStableReads) ? parsedStableReads : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'wait-conversation' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableReadsRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStableReads = stableReadsRaw ? Number.parseInt(stableReadsRaw, 10) : undefined;
      const activeRaw = readFlagValue(filtered, '--active');
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_wait_conversation',
        sessionId: filtered[3],
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        active: activeRaw === 'true' ? true : activeRaw === 'false' ? false : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStableReads !== undefined && !Number.isNaN(parsedStableReads) ? parsedStableReads : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'prepare' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_prepare',
        sessionId: filtered[3],
        ensureSidebarOpen: filtered.includes('--sidebar-open') ? true : undefined,
        model: readFlagValue(filtered, '--model'),
        newChat: filtered.includes('--new-chat') ? true : undefined,
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'delete-conversation' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_delete_conversation',
        sessionId: filtered[3],
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'archive-conversation' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_chatgpt_archive_conversation',
        sessionId: filtered[3],
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'chatgpt' && value === 'wait-message' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStable = stableRaw ? Number.parseInt(stableRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      return {
        kind: 'browser_extension_chatgpt_wait_message',
        sessionId: filtered[3],
        text: readFlagValue(filtered, '--text'),
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStable !== undefined && !Number.isNaN(parsedStable) ? parsedStable : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'read-latest' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_read_latest',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'new-chat' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_new_chat',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'sidebar-state' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_sidebar_state',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'toggle-sidebar' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_toggle_sidebar',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'models' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_models',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'select-model' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const queryTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms') {
          index += 1;
          continue;
        }
        queryTokens.push(token);
      }
      return {
        kind: 'browser_extension_deepseek_select_model',
        sessionId: filtered[3],
        query: queryTokens.join(' '),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'info' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_info',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'conversations' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_list_conversations',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'open-conversation' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_open_conversation',
        sessionId: filtered[3],
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'conversation-actions' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_conversation_actions',
        sessionId: filtered[3],
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'conversation-action' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const actionTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--title' || token === '--url' || token === '--index') {
          index += 1;
          continue;
        }
        actionTokens.push(token);
      }
      return {
        kind: 'browser_extension_deepseek_conversation_action',
        sessionId: filtered[3],
        actionQuery: actionTokens.join(' '),
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'rename-conversation' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const titleTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--match-title' || token === '--url' || token === '--index') {
          index += 1;
          continue;
        }
        titleTokens.push(token);
      }
      return {
        kind: 'browser_extension_deepseek_rename_conversation',
        sessionId: filtered[3],
        title: titleTokens.join(' '),
        titleQuery: readFlagValue(filtered, '--match-title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'stop' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_stop',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'continue' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_continue',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'response-controls' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_response_controls',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'previous-response' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_previous_response',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'next-response' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_next_response',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'list-response-versions' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const maxVersionsRaw = readFlagValue(filtered, '--max-versions');
      const parsedMaxVersions = maxVersionsRaw ? Number.parseInt(maxVersionsRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_list_response_versions',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        maxVersions: parsedMaxVersions !== undefined && !Number.isNaN(parsedMaxVersions) ? parsedMaxVersions : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'select-response-version' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const maxVersionsRaw = readFlagValue(filtered, '--max-versions');
      const parsedMaxVersions = maxVersionsRaw ? Number.parseInt(maxVersionsRaw, 10) : undefined;
      const parsedIndex = Number.parseInt(filtered[4]!, 10);
      return {
        kind: 'browser_extension_deepseek_select_response_version',
        sessionId: filtered[3],
        count: !Number.isNaN(parsedIndex) ? parsedIndex : 0,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        maxVersions: parsedMaxVersions !== undefined && !Number.isNaN(parsedMaxVersions) ? parsedMaxVersions : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'regenerate' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_regenerate',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'edit-message' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const offsetRaw = readFlagValue(filtered, '--offset');
      const parsedOffset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--limit' || token === '--index' || token === '--offset' || token === '--role') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_deepseek_edit_message',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        offset: parsedOffset !== undefined && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'edit-message' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const offsetRaw = readFlagValue(filtered, '--offset');
      const parsedOffset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--limit' || token === '--index' || token === '--offset' || token === '--role') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_deepseek_edit_message',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        offset: parsedOffset !== undefined && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'read-thread' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_read_thread',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'read-message' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const offsetRaw = readFlagValue(filtered, '--offset');
      const parsedOffset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      return {
        kind: 'browser_extension_deepseek_read_message',
        sessionId: filtered[3],
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        offset: parsedOffset !== undefined && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'current-conversation' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_current_conversation',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'export-thread' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const format = readFlagValue(filtered, '--format');
      return {
        kind: 'browser_extension_deepseek_export_thread',
        sessionId: filtered[3],
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        format: format === 'json' || format === 'markdown' ? format : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'send' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_deepseek_send',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'ask' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_deepseek_ask',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'ask-thread' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--limit') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_deepseek_ask_thread',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'rewrite-thread' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const offsetRaw = readFlagValue(filtered, '--offset');
      const parsedOffset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--limit' || token === '--index' || token === '--offset' || token === '--role') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_deepseek_rewrite_thread',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        offset: parsedOffset !== undefined && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'rewrite-thread' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      const offsetRaw = readFlagValue(filtered, '--offset');
      const parsedOffset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      const textTokens: string[] = [];
      for (let index = 4; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--limit' || token === '--index' || token === '--offset' || token === '--role') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_deepseek_rewrite_thread',
        sessionId: filtered[3],
        text: textTokens.join(' '),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        offset: parsedOffset !== undefined && !Number.isNaN(parsedOffset) ? parsedOffset : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'wait-idle' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_wait_idle',
        sessionId: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'wait-response' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStable = stableRaw ? Number.parseInt(stableRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_wait_response',
        sessionId: filtered[3],
        baselineText: readFlagValue(filtered, '--baseline'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStable !== undefined && !Number.isNaN(parsedStable) ? parsedStable : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'wait-sidebar' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableReadsRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStableReads = stableReadsRaw ? Number.parseInt(stableReadsRaw, 10) : undefined;
      const openRaw = readFlagValue(filtered, '--open');
      return {
        kind: 'browser_extension_deepseek_wait_sidebar',
        sessionId: filtered[3],
        open: openRaw === 'true' ? true : openRaw === 'false' ? false : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStableReads !== undefined && !Number.isNaN(parsedStableReads) ? parsedStableReads : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'wait-model' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableReadsRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStableReads = stableReadsRaw ? Number.parseInt(stableReadsRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_wait_model',
        sessionId: filtered[3],
        query: readFlagValue(filtered, '--query'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStableReads !== undefined && !Number.isNaN(parsedStableReads) ? parsedStableReads : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'wait-conversation' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableReadsRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStableReads = stableReadsRaw ? Number.parseInt(stableReadsRaw, 10) : undefined;
      const activeRaw = readFlagValue(filtered, '--active');
      return {
        kind: 'browser_extension_deepseek_wait_conversation',
        sessionId: filtered[3],
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        active: activeRaw === 'true' ? true : activeRaw === 'false' ? false : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStableReads !== undefined && !Number.isNaN(parsedStableReads) ? parsedStableReads : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'prepare' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_prepare',
        sessionId: filtered[3],
        ensureSidebarOpen: filtered.includes('--sidebar-open') ? true : undefined,
        model: readFlagValue(filtered, '--model'),
        newChat: filtered.includes('--new-chat') ? true : undefined,
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'delete-conversation' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_delete_conversation',
        sessionId: filtered[3],
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'archive-conversation' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const indexRaw = readFlagValue(filtered, '--index');
      const parsedIndex = indexRaw ? Number.parseInt(indexRaw, 10) : undefined;
      return {
        kind: 'browser_extension_deepseek_archive_conversation',
        sessionId: filtered[3],
        titleQuery: readFlagValue(filtered, '--title'),
        url: readFlagValue(filtered, '--url'),
        index: parsedIndex !== undefined && !Number.isNaN(parsedIndex) ? parsedIndex : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'deepseek' && value === 'wait-message' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStable = stableRaw ? Number.parseInt(stableRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const role = readFlagValue(filtered, '--role');
      return {
        kind: 'browser_extension_deepseek_wait_message',
        sessionId: filtered[3],
        text: readFlagValue(filtered, '--text'),
        role: role === 'user' || role === 'assistant' || role === 'system' ? role : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStable !== undefined && !Number.isNaN(parsedStable) ? parsedStable : undefined,
        json
      };
    }
    if (action === 'x' && value === 'search') {
      const sessionId = readBrowserExtensionSiteSessionId(filtered[3]);
      const argStart = readBrowserExtensionSiteArgStart(filtered[3]);
      const queryTokens: string[] = [];
      for (let index = argStart; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--mode' || token === '--limit' || token === '--timeout-ms') {
          break;
        }
        queryTokens.push(token);
      }
      if (queryTokens.length > 0) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        const limitRaw = readFlagValue(filtered, '--limit');
        const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
        const mode = readFlagValue(filtered, '--mode');
        return {
          kind: 'browser_extension_x_search',
          sessionId,
          query: queryTokens.join(' '),
          mode: mode === 'top' || mode === 'latest' || mode === 'live' || mode === 'people' || mode === 'media' ? mode : undefined,
          limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
    if (action === 'x' && value === 'timeline') {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const timelineType = readFlagValue(filtered, '--type');
      return {
        kind: 'browser_extension_x_timeline',
        sessionId: readBrowserExtensionSiteSessionId(filtered[3]),
        timelineType: timelineType === 'for-you' || timelineType === 'following' ? timelineType : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'x' && value === 'bookmarks') {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_x_bookmarks',
        sessionId: readBrowserExtensionSiteSessionId(filtered[3]),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'x' && value === 'notifications') {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_x_notifications',
        sessionId: readBrowserExtensionSiteSessionId(filtered[3]),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'x' && value === 'messages') {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_extension_x_messages',
        sessionId: readBrowserExtensionSiteSessionId(filtered[3]),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'x' && value === 'open-message-thread') {
      const sessionId = readBrowserExtensionSiteSessionId(filtered[3]);
      const argStart = readBrowserExtensionSiteArgStart(filtered[3]);
      if (filtered[argStart]) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        const limitRaw = readFlagValue(filtered, '--limit');
        const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
        return {
          kind: 'browser_extension_x_open_message_thread',
          sessionId,
          thread: filtered[argStart]!,
          limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
    if (action === 'x' && value === 'send-message') {
      const sessionId = readBrowserExtensionSiteSessionId(filtered[3]);
      const argStart = readBrowserExtensionSiteArgStart(filtered[3]);
      const textTokens: string[] = [];
      for (let index = argStart; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--thread' || token === '--timeout-ms') {
          break;
        }
        textTokens.push(token);
      }
      if (textTokens.length > 0) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        return {
          kind: 'browser_extension_x_send_message',
          sessionId,
          text: textTokens.join(' '),
          thread: readFlagValue(filtered, '--thread'),
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
    if (action === 'x' && value === 'read-thread') {
      const sessionId = readBrowserExtensionSiteSessionId(filtered[3]);
      const argStart = readBrowserExtensionSiteArgStart(filtered[3]);
      if (filtered[argStart]) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        const limitRaw = readFlagValue(filtered, '--limit');
        const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
        return {
          kind: 'browser_extension_x_read_thread',
          sessionId,
          postUrl: filtered[argStart]!,
          limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
    if (action === 'x' && value === 'post') {
      const sessionId = readBrowserExtensionSiteSessionId(filtered[3]);
      const argStart = readBrowserExtensionSiteArgStart(filtered[3]);
      const textTokens: string[] = [];
      for (let index = argStart; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms') {
          break;
        }
        textTokens.push(token);
      }
      if (textTokens.length > 0) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        return {
          kind: 'browser_extension_x_post',
          sessionId,
          text: textTokens.join(' '),
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
    if (action === 'x' && value === 'open-post') {
      const sessionId = readBrowserExtensionSiteSessionId(filtered[3]);
      const argStart = readBrowserExtensionSiteArgStart(filtered[3]);
      if (filtered[argStart]) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        return {
          kind: 'browser_extension_x_open_post',
          sessionId,
          postUrl: filtered[argStart]!,
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
    if (action === 'x' && value === 'profile') {
      const sessionId = readBrowserExtensionSiteSessionId(filtered[3]);
      const argStart = readBrowserExtensionSiteArgStart(filtered[3]);
      if (filtered[argStart]) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        const limitRaw = readFlagValue(filtered, '--limit');
        const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
        return {
          kind: 'browser_extension_x_profile',
          sessionId,
          handleOrUrl: filtered[argStart]!,
          limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
    if (action === 'x' && value === 'follow') {
      const sessionId = readBrowserExtensionSiteSessionId(filtered[3]);
      const argStart = readBrowserExtensionSiteArgStart(filtered[3]);
      if (filtered[argStart]) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        return {
          kind: 'browser_extension_x_follow',
          sessionId,
          handleOrUrl: filtered[argStart]!,
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
    if (action === 'x' && value === 'reply') {
      const sessionId = readBrowserExtensionSiteSessionId(filtered[3]);
      const argStart = readBrowserExtensionSiteArgStart(filtered[3]);
      const textTokens: string[] = [];
      for (let index = argStart; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--post-url' || token === '--timeout-ms') {
          break;
        }
        textTokens.push(token);
      }
      if (textTokens.length > 0) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        return {
          kind: 'browser_extension_x_reply',
          sessionId,
          text: textTokens.join(' '),
          postUrl: readFlagValue(filtered, '--post-url'),
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
    if (action === 'x' && value === 'like') {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_x_like',
        sessionId: readBrowserExtensionSiteSessionId(filtered[3]),
        postUrl: readFlagValue(filtered, '--post-url'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'x' && value === 'repost') {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_x_repost',
        sessionId: readBrowserExtensionSiteSessionId(filtered[3]),
        postUrl: readFlagValue(filtered, '--post-url'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'network-events' && value) {
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const stage = readFlagValue(filtered, '--stage');
      return {
        kind: 'browser_extension_network_events',
        sessionId: value,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        urlIncludes: readFlagValue(filtered, '--url-includes'),
        stage: stage === 'request' || stage === 'response' || stage === 'error' ? stage : undefined,
        method: readFlagValue(filtered, '--method'),
        json
      };
    }
    if (action === 'dom-events' && value) {
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const mutationTypeRaw = readFlagValue(filtered, '--mutation-type');
      return {
        kind: 'browser_extension_dom_events',
        sessionId: value,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        mutationType: mutationTypeRaw === 'childList' || mutationTypeRaw === 'attributes' || mutationTypeRaw === 'characterData'
          ? mutationTypeRaw
          : undefined,
        textIncludes: readFlagValue(filtered, '--text-includes'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'session-events' && value) {
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const okRaw = readFlagValue(filtered, '--ok');
      return {
        kind: 'browser_extension_session_events',
        sessionId: value,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        eventKind: readFlagValue(filtered, '--kind') ?? undefined,
        ok: okRaw === 'true' ? true : okRaw === 'false' ? false : undefined,
        json
      };
    }
    if (action === 'clear-session-events' && value) {
      return {
        kind: 'browser_extension_clear_session_events',
        sessionId: value,
        json
      };
    }
    if (action === 'wait-url' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const textTokens: string[] = [];
      for (let index = 3; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--interval-ms') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_wait_url',
        sessionId: value,
        text: textTokens.join(' '),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-dom-quiet' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const quietRaw = readFlagValue(filtered, '--quiet-ms');
      const parsedQuiet = quietRaw ? Number.parseInt(quietRaw, 10) : undefined;
      const mutationTypeRaw = readFlagValue(filtered, '--mutation-type');
      const mutationType = mutationTypeRaw === 'childList' || mutationTypeRaw === 'attributes' || mutationTypeRaw === 'characterData' ? mutationTypeRaw : undefined;
      return {
        kind: 'browser_extension_wait_dom_quiet',
        sessionId: value,
        quietMs: parsedQuiet !== undefined && !Number.isNaN(parsedQuiet) ? parsedQuiet : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        mutationType,
        textIncludes: readFlagValue(filtered, '--text-includes'),
        json
      };
    }
    if (action === 'wait-network-idle' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const quietRaw = readFlagValue(filtered, '--quiet-ms');
      const parsedQuiet = quietRaw ? Number.parseInt(quietRaw, 10) : undefined;
      const stageRaw = readFlagValue(filtered, '--stage');
      const stage = stageRaw === 'request' || stageRaw === 'response' || stageRaw === 'error' ? stageRaw : undefined;
      return {
        kind: 'browser_extension_wait_network_idle',
        sessionId: value,
        quietMs: parsedQuiet !== undefined && !Number.isNaN(parsedQuiet) ? parsedQuiet : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        urlIncludes: readFlagValue(filtered, '--url-includes'),
        stage,
        method: readFlagValue(filtered, '--method'),
        json
      };
    }
    if (action === 'wait-page-stable' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const quietRaw = readFlagValue(filtered, '--quiet-ms');
      const parsedQuiet = quietRaw ? Number.parseInt(quietRaw, 10) : undefined;
      const stableReadsRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStableReads = stableReadsRaw ? Number.parseInt(stableReadsRaw, 10) : undefined;
      return {
        kind: 'browser_extension_wait_page_stable',
        sessionId: value,
        quietMs: parsedQuiet !== undefined && !Number.isNaN(parsedQuiet) ? parsedQuiet : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStableReads !== undefined && !Number.isNaN(parsedStableReads) ? parsedStableReads : undefined,
        json
      };
    }
    if (action === 'wait-page-diff' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const maxDepthRaw = readFlagValue(filtered, '--max-depth');
      const parsedMaxDepth = maxDepthRaw ? Number.parseInt(maxDepthRaw, 10) : undefined;
      const maxChildrenRaw = readFlagValue(filtered, '--max-children');
      const parsedMaxChildren = maxChildrenRaw ? Number.parseInt(maxChildrenRaw, 10) : undefined;
      const textLengthRaw = readFlagValue(filtered, '--text-length-delta-at-least');
      const parsedTextLength = textLengthRaw ? Number.parseInt(textLengthRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const againstFile = readFlagValue(filtered, '--against-file');
      if (!againstFile) {
        throw new Error('browserext wait-page-diff requires --against-file <path>');
      }
      return {
        kind: 'browser_extension_wait_page_diff',
        sessionId: value,
        againstFile,
        selector: readFlagValue(filtered, '--selector'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        maxDepth: parsedMaxDepth !== undefined && !Number.isNaN(parsedMaxDepth) ? parsedMaxDepth : undefined,
        maxChildren: parsedMaxChildren !== undefined && !Number.isNaN(parsedMaxChildren) ? parsedMaxChildren : undefined,
        urlChanged: filtered.includes('--url-changed') ? true : undefined,
        titleChanged: filtered.includes('--title-changed') ? true : undefined,
        textChanged: filtered.includes('--text-changed') ? true : undefined,
        textLengthDeltaAtLeast: parsedTextLength !== undefined && !Number.isNaN(parsedTextLength) ? parsedTextLength : undefined,
        addedActionableQuery: readFlagValue(filtered, '--added-actionable'),
        removedActionableQuery: readFlagValue(filtered, '--removed-actionable'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-no-blockers' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_wait_no_blockers',
        sessionId: value,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-banner' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_wait_banner',
        sessionId: value,
        text: filtered[3],
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-no-banner' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const text = filtered[3] && !filtered[3].startsWith('--') ? filtered[3] : undefined;
      return {
        kind: 'browser_extension_wait_no_banner',
        sessionId: value,
        text,
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-page-outcome' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      const status = filtered[3];
      if (!['loading', 'blocked', 'error', 'warning', 'success', 'empty', 'ready'].includes(status)) {
        throw new Error('browserext wait-page-outcome requires one of: loading, blocked, error, warning, success, empty, ready');
      }
      return {
        kind: 'browser_extension_wait_page_outcome',
        sessionId: value,
        status: status as 'loading' | 'blocked' | 'error' | 'warning' | 'success' | 'empty' | 'ready',
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-no-collection-filters' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      const frameSelectors = readFlagValues(filtered, '--frame');
      return {
        kind: 'browser_extension_wait_no_collection_filters',
        sessionId: value,
        collectionQuery: readFlagValue(filtered, '--collection'),
        frameSelectors: frameSelectors.length > 0 ? frameSelectors : undefined,
        exact: filtered.includes('--exact'),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-selector' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      return {
        kind: 'browser_extension_wait_selector',
        sessionId: value,
        selector: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-no-selector' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      return {
        kind: 'browser_extension_wait_no_selector',
        sessionId: value,
        selector: filtered[3],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'wait-text' && value && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const textTokens: string[] = [];
      for (let index = 3; index < filtered.length; index += 1) {
        const token = filtered[index];
        if (token === '--timeout-ms' || token === '--interval-ms') {
          index += 1;
          continue;
        }
        textTokens.push(token);
      }
      return {
        kind: 'browser_extension_wait_text',
        sessionId: value,
        text: textTokens.join(' '),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (action === 'clear-network-events' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_clear_network_events',
        sessionId: value,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'clear-dom-events' && value) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      return {
        kind: 'browser_extension_clear_dom_events',
        sessionId: value,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        json
      };
    }
    if (action === 'workspace') {
      if (value === 'list') return { kind: 'browser_extension_workspace_list', json };
      if (value === 'get' && filtered[3]) return { kind: 'browser_extension_workspace_get', name: filtered[3], json };
      if (value === 'set' && filtered[3] && filtered[4]) {
        return {
          kind: 'browser_extension_workspace_set',
          name: filtered[3],
          path: filtered[4],
          sites: readFlagValues(filtered, '--site'),
          json
        };
      }
      if (value === 'clear' && filtered[3]) return { kind: 'browser_extension_workspace_clear', name: filtered[3], json };
    }
    if (action === 'session') {
      if (value === 'list') return { kind: 'browser_extension_session_list', json };
      if (value === 'create') {
        return {
          kind: 'browser_extension_session_create',
          workspace: readFlagValue(filtered, '--workspace'),
          site: readFlagValue(filtered, '--site'),
          targetUrl: readFlagValue(filtered, '--url'),
          name: readFlagValue(filtered, '--name'),
          privateMode: filtered.includes('--private'),
          json
        };
      }
      if (value === 'info' && filtered[3]) return { kind: 'browser_extension_session_info', sessionId: filtered[3], json };
      if (value === 'close' && filtered[3]) return { kind: 'browser_extension_session_close', sessionId: filtered[3], json };
      if (value === 'nuke') {
        const queueRaw = readFlagValue(filtered, '--queue');
        const queue = queueRaw === 'keep' || queueRaw === 'matching' || queueRaw === 'all'
          ? queueRaw
          : 'matching';
        return {
          kind: 'browser_extension_session_nuke',
          site: readFlagValue(filtered, '--site'),
          staleOnly: filtered.includes('--stale'),
          connectedOnly: filtered.includes('--connected'),
          disconnectedOnly: filtered.includes('--disconnected'),
          queue,
          json
        };
      }
    }
    if (action === 'queue' && value === 'clear') {
      const statusRaw = readFlagValue(filtered, '--status');
      if (statusRaw && !['pending', 'in_progress', 'completed', 'failed'].includes(statusRaw)) {
        throw new Error('browserext queue clear requires --status pending|in_progress|completed|failed when provided');
      }
      return {
        kind: 'browser_extension_queue_clear',
        sessionId: readFlagValue(filtered, '--session'),
        site: readFlagValue(filtered, '--site'),
        status: statusRaw as 'pending' | 'in_progress' | 'completed' | 'failed' | undefined,
        json
      };
    }
  }

  if (domain === 'browser' && action === 'launch' && value) {
    return {
      kind: 'browser_launch',
      browserId: value,
      profile: readFlagValue(filtered, '--profile'),
      url: readFlagValue(filtered, '--url'),
      privateMode: filtered.includes('--private'),
      headless: filtered.includes('--headless'),
      json
    };
  }

  if (domain === 'browser' && action === 'runtime') {
    if (value === 'policy') {
      const subAction = filtered[3];
      if (subAction === 'get') {
        return { kind: 'browser_policy_get', json };
      }
      if (subAction === 'set') {
        const allowList = readFlagValues(filtered, '--allow');
        const denyList = readFlagValues(filtered, '--deny');
        return {
          kind: 'browser_policy_set',
          enabled: filtered.includes('--enabled') ? true : filtered.includes('--disabled') ? false : undefined,
          allowList: allowList.length > 0 ? allowList : undefined,
          denyList: denyList.length > 0 ? denyList : undefined,
          json
        };
      }
    }
    if (value === 'list') {
      return { kind: 'browser_runtime_list', json };
    }
    if (value === 'info' && filtered[3]) {
      return { kind: 'browser_runtime_info', runtimeId: filtered[3], json };
    }
    if ((value === 'windows' || value === 'window') && (filtered[3] === undefined || filtered[3].startsWith('--'))) {
      const runtimeIds = readFlagValues(filtered, '--runtime');
      return {
        kind: 'browser_runtime_windows',
        runtimeIds: runtimeIds.length ? runtimeIds : undefined,
        json
      };
    }
    if (value === 'bind' && filtered[3]) {
      const windowHandleRaw = readFlagValue(filtered, '--window');
      const parsedWindowHandle = windowHandleRaw ? Number.parseInt(windowHandleRaw, 10) : undefined;
      return {
        kind: 'browser_runtime_bind',
        runtimeId: filtered[3],
        windowHandle: parsedWindowHandle !== undefined && !Number.isNaN(parsedWindowHandle) ? parsedWindowHandle : undefined,
        json
      };
    }
    if ((value === 'open-tab' || value === 'tab-open') && filtered[3]) {
      return {
        kind: 'browser_runtime_open_tab',
        runtimeId: filtered[3],
        url: filtered[4] && !filtered[4].startsWith('--') ? filtered[4] : readFlagValue(filtered, '--url'),
        json
      };
    }
    if (value === 'tile') {
      const runtimeIds = readFlagValues(filtered, '--runtime');
      const columnsRaw = readFlagValue(filtered, '--columns');
      const gapRaw = readFlagValue(filtered, '--gap');
      const xRaw = readFlagValue(filtered, '--x');
      const yRaw = readFlagValue(filtered, '--y');
      const widthRaw = readFlagValue(filtered, '--width');
      const heightRaw = readFlagValue(filtered, '--height');
      const presetRaw = readFlagValue(filtered, '--preset');
      const preset = presetRaw === '2-up' || presetRaw === '3-column' || presetRaw === '2x2' || presetRaw === 'main-left' || presetRaw === 'main-right' || presetRaw === 'newsroom-5' || presetRaw === 'newsroom-6'
        ? presetRaw
        : undefined;
      const x = xRaw ? Number.parseInt(xRaw, 10) : undefined;
      const y = yRaw ? Number.parseInt(yRaw, 10) : undefined;
      const width = widthRaw ? Number.parseInt(widthRaw, 10) : undefined;
      const height = heightRaw ? Number.parseInt(heightRaw, 10) : undefined;
      return {
        kind: 'browser_runtime_tile',
        runtimeIds: runtimeIds.length ? runtimeIds : undefined,
        preset,
        columns: columnsRaw ? Number.parseInt(columnsRaw, 10) : undefined,
        gap: gapRaw ? Number.parseInt(gapRaw, 10) : undefined,
        area: [x, y, width, height].every((entry) => typeof entry === 'number' && !Number.isNaN(entry))
          ? { x: x!, y: y!, width: width!, height: height! }
          : undefined,
        json
      };
    }
    if (value === 'close' && filtered[3]) {
      return { kind: 'browser_runtime_close', runtimeId: filtered[3], json };
    }
    if (value && filtered[3] === 'create') {
      const automationMode = readFlagValue(filtered, '--automation-mode');
      const debugPortRaw = readFlagValue(filtered, '--debug-port');
      const parsedDebugPort = debugPortRaw ? Number.parseInt(debugPortRaw, 10) : undefined;
      return {
        kind: 'browser_runtime_create',
        browserId: value,
        profile: readFlagValue(filtered, '--profile'),
        url: readFlagValue(filtered, '--url'),
        privateMode: filtered.includes('--private'),
        headless: filtered.includes('--headless'),
        automationMode: automationMode === 'debuggable' || automationMode === 'persistent-debuggable' ? automationMode : undefined,
        debugPort: parsedDebugPort !== undefined && !Number.isNaN(parsedDebugPort) ? parsedDebugPort : undefined,
        ownerSessionId: readFlagValue(filtered, '--owner-session'),
        json
      };
    }
  }

  if (domain === 'browser' && action === 'page') {
    const queryKindRaw = readFlagValue(filtered, '--kind');
    const queryKind = queryKindRaw === 'field' || queryKindRaw === 'button' || queryKindRaw === 'link' || queryKindRaw === 'any'
      ? queryKindRaw
      : undefined;
    if (value === 'dom' && filtered[3]) {
      return {
        kind: 'browser_page_dom',
        pageId: filtered[3],
        json
      };
    }
    if (value === 'fill-commit' && filtered[3] && filtered[4] && filtered[5]) {
      return {
        kind: 'browser_page_fill_commit',
        pageId: filtered[3],
        selector: filtered[4],
        value: filtered[5],
        json
      };
    }
    if (value === 'wait-ready' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const stableRaw = readFlagValue(filtered, '--stable-reads');
      const parsedStable = stableRaw ? Number.parseInt(stableRaw, 10) : undefined;
      const selectors = readFlagValues(filtered, '--selector');
      if (selectors.length === 0) {
        throw new Error('browser page wait-ready requires at least one --selector <selector>');
      }
      return {
        kind: 'browser_page_wait_ready',
        pageId: filtered[3],
        selectors,
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        stableReads: parsedStable !== undefined && !Number.isNaN(parsedStable) ? parsedStable : undefined,
        json
      };
    }
    if (value === 'click-text' && filtered[3] && filtered[4]) {
      const settleAfterRaw = readFlagValue(filtered, '--settle-after');
      const settleAfter = settleAfterRaw === 'dom' || settleAfterRaw === 'page' || settleAfterRaw === 'network' ? settleAfterRaw : undefined;
      const settleTimeoutRaw = readFlagValue(filtered, '--settle-timeout-ms');
      const parsedSettleTimeout = settleTimeoutRaw ? Number.parseInt(settleTimeoutRaw, 10) : undefined;
      const settleStableRaw = readFlagValue(filtered, '--settle-stable-reads');
      const parsedSettleStable = settleStableRaw ? Number.parseInt(settleStableRaw, 10) : undefined;
      const topMaxRaw = readFlagValue(filtered, '--top-max');
      const parsedTopMax = topMaxRaw ? Number.parseInt(topMaxRaw, 10) : undefined;
      return {
        kind: 'browser_page_click_text',
        pageId: filtered[3],
        text: filtered[4],
        exact: !filtered.includes('--contains'),
        withinSelector: readFlagValue(filtered, '--within'),
        topRegionOnly: filtered.includes('--top-region'),
        topRegionMax: parsedTopMax !== undefined && !Number.isNaN(parsedTopMax) ? parsedTopMax : undefined,
        allowLinks: !filtered.includes('--no-links'),
        settleAfter,
        settleTimeoutMs: parsedSettleTimeout !== undefined && !Number.isNaN(parsedSettleTimeout) ? parsedSettleTimeout : undefined,
        settleStableReads: parsedSettleStable !== undefined && !Number.isNaN(parsedSettleStable) ? parsedSettleStable : undefined,
        json
      };
    }
    if (value === 'check-agreement' && filtered[3]) {
      return {
        kind: 'browser_page_check_agreement',
        pageId: filtered[3],
        selector: readFlagValue(filtered, '--selector'),
        labelTextIncludes: readFlagValues(filtered, '--label'),
        json
      };
    }
    if (value === 'settle' && filtered[3] && filtered[4]) {
      const mode = filtered[4] === 'dom' || filtered[4] === 'page' || filtered[4] === 'network' ? filtered[4] : undefined;
      if (mode) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        const intervalRaw = readFlagValue(filtered, '--interval-ms');
        const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
        const stableRaw = readFlagValue(filtered, '--stable-reads');
        const parsedStable = stableRaw ? Number.parseInt(stableRaw, 10) : undefined;
        const quietRaw = readFlagValue(filtered, '--quiet-ms');
        const parsedQuiet = quietRaw ? Number.parseInt(quietRaw, 10) : undefined;
        return {
          kind: 'browser_page_settle',
          pageId: filtered[3],
          mode,
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
          stableReads: parsedStable !== undefined && !Number.isNaN(parsedStable) ? parsedStable : undefined,
          quietMs: parsedQuiet !== undefined && !Number.isNaN(parsedQuiet) ? parsedQuiet : undefined,
          json
        };
      }
    }
    if (value === 'complete-profile' && filtered[3]) {
      const email = readFlagValue(filtered, '--email');
      if (!email) {
        throw new Error('browser page complete-profile requires --email <value>');
      }
      const waitReadyTimeoutRaw = readFlagValue(filtered, '--wait-ready-timeout-ms');
      const parsedWaitReadyTimeout = waitReadyTimeoutRaw ? Number.parseInt(waitReadyTimeoutRaw, 10) : undefined;
      return {
        kind: 'browser_page_complete_profile',
        pageId: filtered[3],
        email,
        username: readFlagValue(filtered, '--username'),
        fullName: readFlagValue(filtered, '--full-name'),
        usernameSelector: readFlagValue(filtered, '--username-selector'),
        fullNameSelector: readFlagValue(filtered, '--full-name-selector'),
        agreementSelector: readFlagValue(filtered, '--agreement-selector'),
        agreementTextIncludes: readFlagValues(filtered, '--agreement-label'),
        submitText: readFlagValue(filtered, '--submit-text'),
        waitReadyTimeoutMs: parsedWaitReadyTimeout !== undefined && !Number.isNaN(parsedWaitReadyTimeout) ? parsedWaitReadyTimeout : undefined,
        json
      };
    }
    if (value === 'signup-step' && filtered[3]) {
      const email = readFlagValue(filtered, '--email');
      const password = readFlagValue(filtered, '--password');
      if (!email) {
        throw new Error('browser page signup-step requires --email <value>');
      }
      if (!password) {
        throw new Error('browser page signup-step requires --password <value>');
      }
      const waitReadyTimeoutRaw = readFlagValue(filtered, '--wait-ready-timeout-ms');
      const parsedWaitReadyTimeout = waitReadyTimeoutRaw ? Number.parseInt(waitReadyTimeoutRaw, 10) : undefined;
      return {
        kind: 'browser_page_signup_step',
        pageId: filtered[3],
        email,
        password,
        emailSelector: readFlagValue(filtered, '--email-selector'),
        passwordSelector: readFlagValue(filtered, '--password-selector'),
        submitText: readFlagValue(filtered, '--submit-text'),
        waitReadyTimeoutMs: parsedWaitReadyTimeout !== undefined && !Number.isNaN(parsedWaitReadyTimeout) ? parsedWaitReadyTimeout : undefined,
        json
      };
    }
    if (value === 'profile') {
      const subAction = filtered[3];
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      if (subAction === 'list') {
        return {
          kind: 'browser_page_profile_list',
          profileFile: readFlagValue(filtered, '--file'),
          json
        };
      }
      if (subAction === 'info' && filtered[4]) {
        return {
          kind: 'browser_page_profile_info',
          profileId: filtered[4],
          profileFile: readFlagValue(filtered, '--file'),
          json
        };
      }
      if ((subAction === 'login' || subAction === 'signup') && filtered[4] && filtered[5]) {
        return {
          kind: subAction === 'login' ? 'browser_page_profile_login' : 'browser_page_profile_signup',
          runtimeId: filtered[4],
          profileId: filtered[5],
          profileFile: readFlagValue(filtered, '--file'),
          url: readFlagValue(filtered, '--url'),
          email: readFlagValue(filtered, '--email'),
          username: readFlagValue(filtered, '--username'),
          password: readFlagValue(filtered, '--password'),
          confirmPassword: readFlagValue(filtered, '--confirm-password'),
          fullName: readFlagValue(filtered, '--full-name'),
          exact: filtered.includes('--exact'),
          formSelector: readFlagValue(filtered, '--form'),
          rootSelector: readFlagValue(filtered, '--root'),
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
          json
        };
      }
    }
    if (value === 'list') {
      return {
        kind: 'browser_page_list',
        runtimeId: readFlagValue(filtered, '--runtime'),
        json
      };
    }
    if (value === 'open' && filtered[3]) {
      return {
        kind: 'browser_page_open',
        runtimeId: filtered[3],
        url: filtered[4] && !filtered[4].startsWith('--') ? filtered[4] : readFlagValue(filtered, '--url'),
        json
      };
    }
    if (value === 'info' && filtered[3]) {
      return {
        kind: 'browser_page_info',
        pageId: filtered[3],
        json
      };
    }
    if (value === 'locate' && filtered[3] && filtered[4]) {
      const limitRaw = readFlagValue(filtered, '--limit');
      const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
      return {
        kind: 'browser_page_locate',
        pageId: filtered[3],
        query: filtered[4],
        queryKind,
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        limit: parsedLimit !== undefined && !Number.isNaN(parsedLimit) ? parsedLimit : undefined,
        json
      };
    }
    if (value === 'fill-query' && filtered[3] && filtered[4] && filtered[5]) {
      return {
        kind: 'browser_page_fill_query',
        pageId: filtered[3],
        query: filtered[4],
        value: filtered[5],
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        json
      };
    }
    if (value === 'click-query' && filtered[3] && filtered[4]) {
      return {
        kind: 'browser_page_click_query',
        pageId: filtered[3],
        query: filtered[4],
        queryKind,
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        json
      };
    }
    if (value === 'submit' && filtered[3]) {
      const query = filtered[4] && !filtered[4].startsWith('--')
        ? filtered[4]
        : readFlagValue(filtered, '--query');
      return {
        kind: 'browser_page_submit',
        pageId: filtered[3],
        query,
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        json
      };
    }
    if (value === 'scroll' && filtered[3] && filtered[4]) {
      const direction = filtered[4] === 'up' || filtered[4] === 'down' || filtered[4] === 'top' || filtered[4] === 'bottom'
        ? filtered[4]
        : undefined;
      if (direction) {
        return {
          kind: 'browser_page_scroll',
          pageId: filtered[3],
          direction,
          query: filtered[5] && !filtered[5].startsWith('--') ? filtered[5] : readFlagValue(filtered, '--query'),
          json
        };
      }
    }
    if (value === 'scroll-text' && filtered[3] && filtered[4]) {
      const nthRaw = readFlagValue(filtered, '--nth');
      const parsedNth = nthRaw ? Number.parseInt(nthRaw, 10) : undefined;
      return {
        kind: 'browser_page_scroll_text',
        pageId: filtered[3],
        text: filtered[4],
        nth: parsedNth !== undefined && !Number.isNaN(parsedNth) ? parsedNth : undefined,
        json
      };
    }
    if (value === 'send-keys' && filtered[3] && filtered[4]) {
      return {
        kind: 'browser_page_send_keys',
        pageId: filtered[3],
        keys: filtered[4],
        query: readFlagValue(filtered, '--query'),
        json
      };
    }
    if (value === 'options' && filtered[3] && filtered[4]) {
      return {
        kind: 'browser_page_select_options',
        pageId: filtered[3],
        query: filtered[4],
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        json
      };
    }
    if (value === 'select-option' && filtered[3] && filtered[4] && filtered[5]) {
      return {
        kind: 'browser_page_select_option',
        pageId: filtered[3],
        query: filtered[4],
        text: filtered[5],
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        json
      };
    }
    if (value === 'uploader' && filtered[3] && filtered[4]) {
      return {
        kind: 'browser_page_detect_file_uploader',
        pageId: filtered[3],
        query: filtered[4],
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        json
      };
    }
    if (value === 'replay' && filtered[3]) {
      const filePath = readFlagValue(filtered, '--file');
      if (!filePath) {
        throw new Error('browser page replay requires --file <path>');
      }
      return {
        kind: 'browser_page_replay',
        pageId: filtered[3],
        filePath,
        json
      };
    }
    if (value === 'wait-text' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      return {
        kind: 'browser_page_wait_text',
        pageId: filtered[3],
        text: filtered[4],
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (value === 'form-workflow' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const fieldSpecs = readFlagValues(filtered, '--field');
      const fields = fieldSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --field value: ${spec}. Use --field "<query>=<value>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      return {
        kind: 'browser_page_form_workflow',
        pageId: filtered[3],
        fields,
        submit: filtered.includes('--submit'),
        submitQuery: readFlagValue(filtered, '--submit-query'),
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (value === 'auth-login' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const password = readFlagValue(filtered, '--password');
      if (!password) {
        throw new Error('browser page auth-login requires --password');
      }
      const email = readFlagValue(filtered, '--email');
      const username = readFlagValue(filtered, '--username');
      if (!email && !username) {
        throw new Error('browser page auth-login requires --email or --username');
      }
      return {
        kind: 'browser_page_auth_login',
        pageId: filtered[3],
        email,
        username,
        password,
        submitQuery: readFlagValue(filtered, '--submit-query'),
        skipSubmit: filtered.includes('--skip-submit'),
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (value === 'auth-signup' && filtered[3]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const password = readFlagValue(filtered, '--password');
      if (!password) {
        throw new Error('browser page auth-signup requires --password');
      }
      return {
        kind: 'browser_page_auth_signup',
        pageId: filtered[3],
        fullName: readFlagValue(filtered, '--full-name'),
        username: readFlagValue(filtered, '--username'),
        email: readFlagValue(filtered, '--email'),
        password,
        confirmPassword: readFlagValue(filtered, '--confirm-password'),
        submitQuery: readFlagValue(filtered, '--submit-query'),
        skipSubmit: filtered.includes('--skip-submit'),
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (value === 'open-workflow' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const fieldSpecs = readFlagValues(filtered, '--field');
      const fields = fieldSpecs.map((spec) => {
        const separatorIndex = spec.lastIndexOf('=');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid --field value: ${spec}. Use --field "<query>=<value>"`);
        }
        return {
          query: spec.slice(0, separatorIndex),
          value: spec.slice(separatorIndex + 1)
        };
      });
      return {
        kind: 'browser_page_open_workflow',
        runtimeId: filtered[3],
        url: filtered[4],
        fields,
        submit: filtered.includes('--submit'),
        submitQuery: readFlagValue(filtered, '--submit-query'),
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (value === 'open-and-login' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const password = readFlagValue(filtered, '--password');
      if (!password) {
        throw new Error('browser page open-and-login requires --password');
      }
      const email = readFlagValue(filtered, '--email');
      const username = readFlagValue(filtered, '--username');
      if (!email && !username) {
        throw new Error('browser page open-and-login requires --email or --username');
      }
      return {
        kind: 'browser_page_open_and_login',
        runtimeId: filtered[3],
        url: filtered[4],
        email,
        username,
        password,
        submitQuery: readFlagValue(filtered, '--submit-query'),
        skipSubmit: filtered.includes('--skip-submit'),
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (value === 'open-and-signup' && filtered[3] && filtered[4]) {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
      const intervalRaw = readFlagValue(filtered, '--interval-ms');
      const parsedInterval = intervalRaw ? Number.parseInt(intervalRaw, 10) : undefined;
      const password = readFlagValue(filtered, '--password');
      if (!password) {
        throw new Error('browser page open-and-signup requires --password');
      }
      return {
        kind: 'browser_page_open_and_signup',
        runtimeId: filtered[3],
        url: filtered[4],
        fullName: readFlagValue(filtered, '--full-name'),
        username: readFlagValue(filtered, '--username'),
        email: readFlagValue(filtered, '--email'),
        password,
        confirmPassword: readFlagValue(filtered, '--confirm-password'),
        submitQuery: readFlagValue(filtered, '--submit-query'),
        skipSubmit: filtered.includes('--skip-submit'),
        exact: filtered.includes('--exact'),
        formSelector: readFlagValue(filtered, '--form'),
        rootSelector: readFlagValue(filtered, '--root'),
        waitUrlIncludes: readFlagValue(filtered, '--wait-url-includes'),
        waitText: readFlagValue(filtered, '--wait-text'),
        waitSelector: readFlagValue(filtered, '--wait-selector'),
        waitNoSelector: readFlagValue(filtered, '--wait-no-selector'),
        timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
        intervalMs: parsedInterval !== undefined && !Number.isNaN(parsedInterval) ? parsedInterval : undefined,
        json
      };
    }
    if (value === 'close' && filtered[3]) {
      return {
        kind: 'browser_page_close',
        pageId: filtered[3],
        json
      };
    }
  }

  if (domain === 'browser' && action === 'agent') {
    if (value === 'run' && filtered[3]) {
      const filePath = readFlagValue(filtered, '--file');
      if (!filePath) {
        throw new Error('browser agent run requires --file <path>');
      }
      return {
        kind: 'browser_agent_run',
        runtimeId: filtered[3],
        filePath,
        url: readFlagValue(filtered, '--url'),
        goal: readFlagValue(filtered, '--goal'),
        trajectoryId: readFlagValue(filtered, '--trajectory'),
        json
      };
    }
  }

  if (domain === 'opencli') {
    if (action === 'status') return { kind: 'opencli_status', json };
    if (action === 'doctor') {
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      return {
        kind: 'opencli_doctor',
        cwd: readFlagValue(filtered, '--cwd') ?? readFlagValue(filtered, '--dir'),
        workspace: readFlagValue(filtered, '--workspace'),
        ownerSessionId: readFlagValue(filtered, '--owner-session'),
        timeoutMs: timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined,
        json
      };
    }
    if (action === 'sites' || action === 'list') return { kind: 'opencli_sites', json };
    if (action === 'commands' && value) return { kind: 'opencli_commands', site: value, json };
    if (action === 'workspace') {
      if (value === 'list') return { kind: 'opencli_workspace_list', json };
      const target = filtered[3];
      if (value === 'get' && target) return { kind: 'opencli_workspace_get', name: target, json };
      if (value === 'set' && target && filtered[4]) return { kind: 'opencli_workspace_set', name: target, path: filtered.slice(4).join(' '), json };
      if (value === 'clear' && target) return { kind: 'opencli_workspace_clear', name: target, json };
      if (value === 'bind' && target && filtered[4]) return { kind: 'opencli_workspace_bind_session', sessionId: target, workspace: filtered[4], json };
      if (value === 'unbind' && target) return { kind: 'opencli_workspace_unbind_session', sessionId: target, json };
      if (value === 'session' && target) return { kind: 'opencli_workspace_session', sessionId: target, json };
    }
    if (action === 'run') {
      const site = value;
      const commandName = filtered[3];
      if (site && commandName) {
        const cwd = readFlagValue(filtered, '--cwd') ?? readFlagValue(filtered, '--dir');
        const workspace = readFlagValue(filtered, '--workspace');
        const ownerSessionId = readFlagValue(filtered, '--owner-session');
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const timeoutMs = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        const args: string[] = [];
        for (let index = 4; index < filtered.length; index += 1) {
          const token = filtered[index];
          if (token === '--cwd' || token === '--dir' || token === '--timeout-ms' || token === '--workspace' || token === '--owner-session' || token === '--wait-ms') {
            index += 1;
            continue;
          }
          if (token === '--keep-browser-open' || token === '--maximize-browser') {
            continue;
          }
          args.push(token);
        }
        return {
          kind: 'opencli_run',
          site,
          command: commandName,
          args,
          cwd,
          workspace,
          ownerSessionId,
          timeoutMs: timeoutMs !== undefined && !Number.isNaN(timeoutMs) ? timeoutMs : undefined,
          keepBrowserOpen,
          waitAfterMs,
          maximizeBrowser,
          json
        };
      }
    }
  }

  if (domain === 'hf') {
    const backendRaw = readFlagValue(filtered, '--backend');
    const backend = backendRaw === 'api' || backendRaw === 'cli' || backendRaw === 'auto'
      ? backendRaw
      : undefined;
    const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
    const timeoutMs = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
    const limitRaw = readFlagValue(filtered, '--limit');
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const token = readFlagValue(filtered, '--token');
    const includeRaw = filtered.includes('--include-raw');

    if (action === 'status') {
      return { kind: 'hf_papers_status', json };
    }

    if (action === 'doctor') {
      return {
        kind: 'hf_papers_doctor',
        backend,
        timeoutMs: timeoutMs !== undefined && !Number.isNaN(timeoutMs) ? timeoutMs : undefined,
        json
      };
    }

    if (action === 'papers') {
      const subAction = value;
      const target = filtered[3];
      if (subAction === 'search') {
        const queryTokens: string[] = [];
        for (let index = 3; index < filtered.length; index += 1) {
          const tokenValue = filtered[index];
          if (tokenValue.startsWith('--')) {
            break;
          }
          queryTokens.push(tokenValue);
        }
        const query = queryTokens.join(' ');
        if (!query) {
          throw new Error('hf papers search requires a query');
        }
        return {
          kind: 'hf_papers_search',
          query,
          limit: limit !== undefined && !Number.isNaN(limit) ? limit : undefined,
          backend,
          token,
          includeRaw,
          timeoutMs: timeoutMs !== undefined && !Number.isNaN(timeoutMs) ? timeoutMs : undefined,
          json
        };
      }
      if (subAction === 'info' && target) {
        return {
          kind: 'hf_papers_info',
          paperId: target,
          backend,
          token,
          includeRaw,
          timeoutMs: timeoutMs !== undefined && !Number.isNaN(timeoutMs) ? timeoutMs : undefined,
          json
        };
      }
      if (subAction === 'read' && target) {
        return {
          kind: 'hf_papers_read',
          paperId: target,
          backend,
          token,
          savePath: readFlagValue(filtered, '--save'),
          timeoutMs: timeoutMs !== undefined && !Number.isNaN(timeoutMs) ? timeoutMs : undefined,
          json
        };
      }
      if (subAction === 'ls' || subAction === 'list') {
        const sortRaw = readFlagValue(filtered, '--sort');
        return {
          kind: 'hf_papers_list_daily',
          date: readFlagValue(filtered, '--date'),
          week: readFlagValue(filtered, '--week'),
          month: readFlagValue(filtered, '--month'),
          submitter: readFlagValue(filtered, '--submitter'),
          sort: sortRaw === 'publishedAt' || sortRaw === 'trending' ? sortRaw : undefined,
          limit: limit !== undefined && !Number.isNaN(limit) ? limit : undefined,
          backend,
          token,
          includeRaw,
          timeoutMs: timeoutMs !== undefined && !Number.isNaN(timeoutMs) ? timeoutMs : undefined,
          json
        };
      }
    }
  }

  if (domain === 'twitter') {
      if (action === 'search' && filtered.length >= 3) {
        const queryTokens: string[] = [];
        for (let index = 2; index < filtered.length; index += 1) {
          const token = filtered[index];
          if (token === '--limit' || token === '--mode' || token === '--cwd' || token === '--dir' || token === '--timeout-ms' || token === '--workspace' || token === '--owner-session' || token === '--wait-ms' || token === '--keep-browser-open' || token === '--maximize-browser') {
            break;
          }
          queryTokens.push(token);
      }
      if (queryTokens.length > 0) {
        const limitRaw = readFlagValue(filtered, '--limit');
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        return {
            kind: 'twitter_search',
            query: queryTokens.join(' '),
            mode: (() => {
              const mode = readFlagValue(filtered, '--mode');
              return mode === 'top' || mode === 'latest' || mode === 'live' || mode === 'people' || mode === 'media'
                ? mode
                : undefined;
            })(),
            limit: limitRaw ? Number.parseInt(limitRaw, 10) : undefined,
            cwd: readFlagValue(filtered, '--cwd') ?? readFlagValue(filtered, '--dir'),
            workspace: readFlagValue(filtered, '--workspace'),
            ownerSessionId: readFlagValue(filtered, '--owner-session'),
            timeoutMs: timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined,
            keepBrowserOpen,
            waitAfterMs,
            maximizeBrowser,
            json
          };
      }
    }
    if (action === 'timeline') {
      const timelineType = readFlagValue(filtered, '--type');
      const limitRaw = readFlagValue(filtered, '--limit');
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      return {
          kind: 'twitter_timeline',
          timelineType: timelineType === 'for-you' || timelineType === 'following' ? timelineType : undefined,
          limit: limitRaw ? Number.parseInt(limitRaw, 10) : undefined,
          cwd: readFlagValue(filtered, '--cwd') ?? readFlagValue(filtered, '--dir'),
          workspace: readFlagValue(filtered, '--workspace'),
          ownerSessionId: readFlagValue(filtered, '--owner-session'),
          timeoutMs: timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined,
          keepBrowserOpen,
          waitAfterMs,
          maximizeBrowser,
          json
        };
    }
    if (action === 'bookmarks') {
      const limitRaw = readFlagValue(filtered, '--limit');
      const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
      return {
          kind: 'twitter_bookmarks',
          limit: limitRaw ? Number.parseInt(limitRaw, 10) : undefined,
          cwd: readFlagValue(filtered, '--cwd') ?? readFlagValue(filtered, '--dir'),
          workspace: readFlagValue(filtered, '--workspace'),
          ownerSessionId: readFlagValue(filtered, '--owner-session'),
          timeoutMs: timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined,
          keepBrowserOpen,
          waitAfterMs,
          maximizeBrowser,
          json
        };
    }
    if (action === 'post' && filtered.length >= 3) {
      const textTokens: string[] = [];
      for (let index = 2; index < filtered.length; index += 1) {
        const token = filtered[index];
          if (token === '--cwd' || token === '--dir' || token === '--timeout-ms' || token === '--workspace' || token === '--owner-session' || token === '--wait-ms' || token === '--keep-browser-open' || token === '--maximize-browser') {
            break;
          }
          textTokens.push(token);
      }
      if (textTokens.length > 0) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        return {
            kind: 'twitter_post',
            text: textTokens.join(' '),
            cwd: readFlagValue(filtered, '--cwd') ?? readFlagValue(filtered, '--dir'),
            workspace: readFlagValue(filtered, '--workspace'),
            ownerSessionId: readFlagValue(filtered, '--owner-session'),
            timeoutMs: timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined,
            keepBrowserOpen,
            waitAfterMs,
            maximizeBrowser,
            json
          };
      }
    }
  }

  if (domain === 'coder' || domain === 'coders') {
    if (action === 'list') return { kind: 'local_coder_list', json };
    if (action === 'status' && value) return { kind: 'local_coder_status', appId: value, json };
    if (action === 'open' && value) {
      const promptTokens: string[] = [];
      let index = 3;
      while (index < filtered.length) {
        const token = filtered[index];
        if (token === '--dir' || token === '--delay-ms') {
          index += 2;
          continue;
        }
        promptTokens.push(token);
        index += 1;
      }
      const delayRaw = readFlagValue(filtered, '--delay-ms');
      const parsedDelay = delayRaw ? Number.parseInt(delayRaw, 10) : undefined;
      return {
        kind: 'local_coder_open',
        appId: value,
        prompt: promptTokens.length > 0 ? promptTokens.join(' ') : undefined,
        workingDirectory: readFlagValue(filtered, '--dir'),
        inputDelayMs: parsedDelay !== undefined && !Number.isNaN(parsedDelay) ? parsedDelay : undefined,
        json
      };
    }
    if (action === 'focus' && value) return { kind: 'local_coder_focus', appId: value, json };
    if (action === 'close' && value) return { kind: 'local_coder_close', appId: value, json };
    if (action === 'maximize' && value) return { kind: 'local_coder_maximize', appId: value, json };
    if (action === 'minimize' && value) return { kind: 'local_coder_minimize', appId: value, json };
    if (action === 'restore' && value) return { kind: 'local_coder_restore', appId: value, json };
    if (action === 'move' && value) {
      const x = Number.parseInt(filtered[3] || '', 10);
      const y = Number.parseInt(filtered[4] || '', 10);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        return { kind: 'local_coder_move', appId: value, x, y, json };
      }
    }
    if (action === 'resize' && value) {
      const width = Number.parseInt(filtered[3] || '', 10);
      const height = Number.parseInt(filtered[4] || '', 10);
      if (!Number.isNaN(width) && !Number.isNaN(height)) {
        return { kind: 'local_coder_resize', appId: value, width, height, json };
      }
    }
    if (action === 'run' && value) {
      const promptTokens: string[] = [];
      let index = 3;
      while (index < filtered.length) {
        const token = filtered[index];
        if (token === '--dir' || token === '--timeout-ms') {
          index += 2;
          continue;
        }
        promptTokens.push(token);
        index += 1;
      }
      const prompt = promptTokens.join(' ');
      if (prompt) {
        const timeoutRaw = readFlagValue(filtered, '--timeout-ms');
        const parsedTimeout = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
        return {
          kind: 'local_coder_run',
          appId: value,
          prompt,
          workingDirectory: readFlagValue(filtered, '--dir'),
          timeoutMs: parsedTimeout !== undefined && !Number.isNaN(parsedTimeout) ? parsedTimeout : undefined,
          json
        };
      }
    }
  }

  if (domain === 'cmd') {
    if (action === 'spawn') {
      const delayRaw = readFlagValue(filtered, '--delay-ms');
      const parsedDelay = delayRaw ? Number.parseInt(delayRaw, 10) : undefined;
      return {
        kind: 'cmd_spawn',
        title: value && !value.startsWith('--') ? value : undefined,
        cwd: readFlagValue(filtered, '--dir'),
        text: readFlagValue(filtered, '--text'),
        delayMs: parsedDelay !== undefined && !Number.isNaN(parsedDelay) ? parsedDelay : undefined,
        json
      };
    }
    if (action === 'list' || action === 'tabs') return { kind: 'cmd_list', json };
    if (action === 'type' && value && filtered.length >= 4) {
      return { kind: 'cmd_type', sessionId: value, text: filtered.slice(3).join(' '), json };
    }
    if (action === 'exec' && value && filtered.length >= 4) {
      return { kind: 'cmd_exec', sessionId: value, command: filtered.slice(3).join(' '), json };
    }
    if (action === 'screenshot' && value) {
      return { kind: 'cmd_screenshot', sessionId: value, filename: readFlagValue(filtered, '--file'), json };
    }
    if (action === 'status' && value) return { kind: 'cmd_status', sessionId: value, json };
    if (action === 'focus' && value) return { kind: 'cmd_focus', sessionId: value, json };
    if (action === 'activate' && value) return { kind: 'cmd_activate', titleQuery: value, json };
    if (action === 'close' && value) return { kind: 'cmd_close', sessionId: value, json };
  }

  if (domain === 'pwsh') {
    if (action === 'spawn') {
      const delayRaw = readFlagValue(filtered, '--delay-ms');
      const parsedDelay = delayRaw ? Number.parseInt(delayRaw, 10) : undefined;
      return {
        kind: 'pwsh_spawn',
        title: value && !value.startsWith('--') ? value : undefined,
        cwd: readFlagValue(filtered, '--dir'),
        text: readFlagValue(filtered, '--text'),
        delayMs: parsedDelay !== undefined && !Number.isNaN(parsedDelay) ? parsedDelay : undefined,
        json
      };
    }
    if (action === 'list' || action === 'tabs') return { kind: 'pwsh_list', json };
    if (action === 'type' && value && filtered.length >= 4) {
      return { kind: 'pwsh_type', sessionId: value, text: filtered.slice(3).join(' '), json };
    }
    if (action === 'exec' && value && filtered.length >= 4) {
      return { kind: 'pwsh_exec', sessionId: value, command: filtered.slice(3).join(' '), json };
    }
    if (action === 'screenshot' && value) {
      return { kind: 'pwsh_screenshot', sessionId: value, filename: readFlagValue(filtered, '--file'), json };
    }
    if (action === 'status' && value) return { kind: 'pwsh_status', sessionId: value, json };
    if (action === 'focus' && value) return { kind: 'pwsh_focus', sessionId: value, json };
    if (action === 'activate' && value) return { kind: 'pwsh_activate', titleQuery: value, json };
    if (action === 'close' && value) return { kind: 'pwsh_close', sessionId: value, json };
  }

  throw new Error(`Unknown command: ${filtered.join(' ')}`);
}

export function getOperatorHelpText(): string {
  return OPERATOR_HELP_TEXT;
}
