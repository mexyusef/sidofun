import type { PlatformAdapter } from '../platforms/platform-adapter.js';
import type { CMDTerminalCore } from '../services/terminal/cmd-terminal-core.js';
import type { BrowserAutomationAdapter } from '../services/browser/browser-automation-adapter.js';
import type { BrowserExtensionService } from '../services/browser-extension/browser-extension-service.js';
import type { ClipboardService } from '../services/clipboard/clipboard-service.js';
import type { DesktopScopeService } from '../services/desktop-scope/desktop-scope-service.js';
import type { HfPapersService } from '../services/hf-papers/hf-papers-service.js';
import type { LocalCoderAppsService } from '../services/local-coder-apps/local-coder-apps-service.js';
import type { OpenCliService } from '../services/opencli/opencli-service.js';
import type { ProcessWindowService } from '../services/process-window/process-window-service.js';
import type { SessionManagerService } from '../services/session-manager/session-manager-service.js';
import type { ShellService } from '../services/shell/shell-service.js';
import type { TelemetryService } from '../services/telemetry/telemetry-service.js';
import type { TerminalService } from '../services/terminal/terminal-service.js';

export class SidofunCore {
  constructor(
    private readonly platform: PlatformAdapter,
    private readonly cmdTerminalCore: CMDTerminalCore,
    private readonly clipboardService: ClipboardService,
    private readonly desktopScopeService: DesktopScopeService,
    private readonly shellService: ShellService,
    private readonly sessionManagerService: SessionManagerService,
    private readonly telemetryService: TelemetryService,
    private readonly terminalService: TerminalService,
    private readonly browserAdapter: BrowserAutomationAdapter,
    private readonly browserExtensionService: BrowserExtensionService,
    private readonly localCoderAppsService: LocalCoderAppsService,
    private readonly hfPapersService: HfPapersService,
    private readonly openCliService: OpenCliService,
    private readonly processWindowService: ProcessWindowService
  ) {}

  private async maximizeOpenCliBrowserWindow(): Promise<number | undefined> {
    const activeWindow = await this.platform.executeDesktopAction({ type: 'get_active_window' }) as {
      handle?: number;
      processName?: string;
      title?: string;
    };
    const activeProcess = activeWindow.processName?.toLowerCase();
    const activeTitle = activeWindow.title ?? '';
    const matchesTwitterWindow = /x\.com|twitter|search\s*\/\s*x/i.test(activeTitle);
    if (activeWindow.handle && activeProcess?.includes('chrome') && matchesTwitterWindow) {
      await this.processWindowService.maximize(activeWindow.handle);
      return activeWindow.handle;
    }

    const windows = await this.processWindowService.listWindows();
    const browserWindow =
      windows.find((window) =>
        window.visible &&
        window.processName?.toLowerCase().includes('chrome') &&
        /x\.com|twitter|search\s*\/\s*x/i.test(window.title)
      ) ??
      windows.find((window) =>
        window.visible &&
        window.processName?.toLowerCase().includes('chrome')
      );

    if (!browserWindow) {
      return undefined;
    }
    await this.processWindowService.maximize(browserWindow.handle);
    return browserWindow.handle;
  }

  async executeAutomationAction(action: string, params: Record<string, any>): Promise<any> {
    switch (action) {
      case 'browser_list':
      case 'browser_info':
      case 'browser_profiles':
      case 'browser_launch_plan':
      case 'browser_launch':
      case 'browser_windows':
      case 'browser_focus_window':
      case 'browser_runtime_create':
        {
          const result = await this.browserAdapter.execute(action, params);
          if (params?.ownerSessionId && result && typeof result === 'object' && typeof result.id === 'string') {
            this.sessionManagerService.ownResource(params.ownerSessionId, {
              type: 'browser_runtime',
              id: result.id
            });
          }
          return result;
        }

      case 'browser_runtime_list':
      case 'browser_runtime_info':
      case 'browser_runtime_close':
      case 'browser_page_list':
      case 'browser_page_info':
      case 'browser_page_navigate':
      case 'browser_page_click':
      case 'browser_page_fill':
      case 'browser_page_press':
      case 'browser_page_wait_for':
      case 'browser_page_evaluate':
      case 'browser_page_content':
      case 'browser_page_screenshot':
      case 'browser_page_pdf':
      case 'browser_page_download_url':
      case 'browser_page_network_events':
      case 'browser_page_events':
      case 'browser_page_console_events':
      case 'browser_page_clear_events':
      case 'browser_page_wait_for_network':
      case 'browser_page_close':
        return this.browserAdapter.execute(action, params);

      case 'browser_page_open':
        {
          const result = await this.browserAdapter.execute(action, params);
          if (params?.ownerSessionId && result && typeof result === 'object' && typeof result.id === 'string') {
            this.sessionManagerService.ownResource(params.ownerSessionId, {
              type: 'browser_page',
              id: result.id,
              metadata: typeof result.runtimeId === 'string' ? { runtimeId: result.runtimeId } : undefined
            });
          }
          return result;
        }

      case 'local_coder_list':
        return this.localCoderAppsService.listApps();

      case 'local_coder_status':
        return await this.localCoderAppsService.getStatus(params?.appId);

      case 'local_coder_open':
        return await this.localCoderAppsService.open(params?.appId, {
          initialPrompt: params?.prompt,
          workingDirectory: params?.workingDirectory,
          inputDelayMs: params?.inputDelayMs
        });

      case 'local_coder_focus':
        return await this.localCoderAppsService.focus(params?.appId);

      case 'local_coder_close':
        return await this.localCoderAppsService.close(params?.appId);

      case 'local_coder_maximize':
        return await this.localCoderAppsService.maximize(params?.appId);

      case 'local_coder_minimize':
        return await this.localCoderAppsService.minimize(params?.appId);

      case 'local_coder_restore':
        return await this.localCoderAppsService.restore(params?.appId);

      case 'local_coder_move':
        return await this.localCoderAppsService.move(params?.appId, params?.x, params?.y);

      case 'local_coder_resize':
        return await this.localCoderAppsService.resize(params?.appId, params?.width, params?.height);

      case 'local_coder_run':
        return await this.localCoderAppsService.run(params?.appId, {
          prompt: params?.prompt,
          workingDirectory: params?.workingDirectory,
          timeoutMs: params?.timeoutMs
        });

      case 'hf_papers_status':
        return await this.hfPapersService.getStatus();

      case 'hf_papers_doctor':
        return await this.hfPapersService.doctor({
          backend: params?.backend,
          timeoutMs: params?.timeoutMs
        });

      case 'hf_papers_search':
        return await this.hfPapersService.search({
          query: params?.query,
          limit: params?.limit,
          backend: params?.backend,
          token: params?.token,
          includeRaw: params?.includeRaw,
          timeoutMs: params?.timeoutMs
        });

      case 'hf_papers_info':
        return await this.hfPapersService.info({
          paperId: params?.paperId,
          backend: params?.backend,
          token: params?.token,
          includeRaw: params?.includeRaw,
          timeoutMs: params?.timeoutMs
        });

      case 'hf_papers_read':
        return await this.hfPapersService.read({
          paperId: params?.paperId,
          backend: params?.backend,
          token: params?.token,
          savePath: params?.savePath,
          timeoutMs: params?.timeoutMs
        });

      case 'hf_papers_list_daily':
        return await this.hfPapersService.listDaily({
          date: params?.date,
          week: params?.week,
          month: params?.month,
          submitter: params?.submitter,
          sort: params?.sort,
          limit: params?.limit,
          backend: params?.backend,
          token: params?.token,
          includeRaw: params?.includeRaw,
          timeoutMs: params?.timeoutMs
        });

      case 'browser_extension_status':
        return this.browserExtensionService.getStatus();

      case 'browser_extension_capabilities':
        return this.browserExtensionService.getCapabilities();

      case 'browser_extension_sites':
        return this.browserExtensionService.listSites();

      case 'browser_extension_wait_provider':
        return await this.browserExtensionService.waitForProviderConnected({
          timeoutMs: params?.timeoutMs,
          intervalMs: params?.intervalMs
        });

      case 'browser_extension_workspace_list':
        return this.browserExtensionService.listWorkspaces();

      case 'browser_extension_workspace_get':
        return this.browserExtensionService.getWorkspace(params?.name);

      case 'browser_extension_workspace_set':
        return this.browserExtensionService.setWorkspace(params?.name, params?.path, params?.sites);

      case 'browser_extension_workspace_clear':
        return this.browserExtensionService.clearWorkspace(params?.name);

      case 'browser_extension_session_create':
        return this.browserExtensionService.createSession({
          workspace: params?.workspace,
          site: params?.site,
          targetUrl: params?.targetUrl,
          name: params?.name,
          privateMode: params?.privateMode
        });

      case 'browser_extension_session_list':
        return this.browserExtensionService.listSessions();

      case 'browser_extension_session_info':
        return this.browserExtensionService.getSession(params?.sessionId);

      case 'browser_extension_session_refresh':
        return this.browserExtensionService.refreshSession(params?.sessionId);

      case 'browser_extension_session_reconnect':
        return await this.browserExtensionService.reconnectSession(params?.sessionId, {
          timeoutMs: params?.timeoutMs,
          intervalMs: params?.intervalMs
        });

      case 'browser_extension_session_close':
        return this.browserExtensionService.closeSession(params?.sessionId);

      case 'browser_extension_session_nuke':
        return this.browserExtensionService.nukeSessions({
          site: params?.site,
          staleOnly: params?.staleOnly,
          connectedOnly: params?.connectedOnly,
          disconnectedOnly: params?.disconnectedOnly,
          queue: params?.queue
        });

      case 'browser_extension_session_wait_ready':
        return await this.browserExtensionService.waitForSessionReady(params?.sessionId, {
          timeoutMs: params?.timeoutMs,
          intervalMs: params?.intervalMs
        });

      case 'browser_extension_queue_clear':
        return this.browserExtensionService.clearQueuedCommands({
          sessionId: params?.sessionId,
          site: params?.site,
          status: params?.status
        });

      case 'browser_extension_tabs':
        return await this.browserExtensionService.listTabs(params?.sessionId);

      case 'browser_extension_navigate':
        return await this.browserExtensionService.navigate(params?.sessionId, params?.targetUrl, params?.timeoutMs);

      case 'browser_extension_focus_tab':
        return await this.browserExtensionService.focusTab(params?.sessionId, params?.tabId, params?.timeoutMs);

      case 'browser_extension_snapshot':
        return await this.browserExtensionService.snapshot(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_actionables':
        return await this.browserExtensionService.listActionables(params?.sessionId, {
          selector: params?.selector,
          frameSelectors: params?.frameSelectors,
          limit: params?.limit,
          timeoutMs: params?.timeoutMs
        });

      case 'browser_extension_page_state':
        return await this.browserExtensionService.pageState(params?.sessionId, {
          selector: params?.selector,
          frameSelectors: params?.frameSelectors,
          limit: params?.limit,
          maxDepth: params?.maxDepth,
          maxChildren: params?.maxChildren,
          timeoutMs: params?.timeoutMs
        });

      case 'browser_extension_next_actions':
        return await this.browserExtensionService.suggestNextActions(params?.sessionId, {
          selector: params?.selector,
          frameSelectors: params?.frameSelectors,
          limit: params?.limit,
          maxDepth: params?.maxDepth,
          maxChildren: params?.maxChildren,
          timeoutMs: params?.timeoutMs
        });

      case 'browser_extension_screenshot':
        return await this.browserExtensionService.screenshot(params?.sessionId, {
          filename: params?.filename,
          returnBase64: params?.returnBase64,
          timeoutMs: params?.timeoutMs
        });

      case 'browser_extension_inspect':
        return await this.browserExtensionService.inspect(params?.sessionId, params?.selector, params?.timeoutMs);

      case 'browser_extension_inspect_all':
        return await this.browserExtensionService.inspectAll(params?.sessionId, params?.selector, params?.count, params?.timeoutMs);

      case 'browser_extension_links':
        return await this.browserExtensionService.links(params?.sessionId, params?.count, params?.timeoutMs);

      case 'browser_extension_evaluate':
        return await this.browserExtensionService.evaluate(params?.sessionId, params?.expression, params?.timeoutMs);

      case 'browser_extension_click':
        return await this.browserExtensionService.click(params?.sessionId, params?.selector, params?.timeoutMs);

      case 'browser_extension_type':
        return await this.browserExtensionService.type(params?.sessionId, params?.selector, params?.text ?? '', params?.timeoutMs);

      case 'browser_extension_press':
        return await this.browserExtensionService.press(params?.sessionId, params?.selector, params?.key, params?.timeoutMs);

      case 'browser_extension_form_fill':
        return await this.browserExtensionService.formFillInFrames(
          params?.sessionId,
          params?.selector ?? '',
          params?.text ?? params?.value ?? '',
          params?.frameSelectors,
          params?.timeoutMs
        );

      case 'browser_extension_form_fill_human':
        return await this.browserExtensionService.formFillHuman(
          params?.sessionId,
          params?.selector ?? '',
          params?.text ?? params?.value ?? '',
          {
            frameSelectors: params?.frameSelectors,
            delayMs: params?.delayMs,
            jitterMs: params?.jitterMs,
            timeoutMs: params?.timeoutMs
          }
        );

      case 'browser_extension_form_fill_many':
        return await this.browserExtensionService.formFillMany(
          params?.sessionId,
          Array.isArray(params?.fields) ? params.fields : [],
          params?.frameSelectors,
          params?.timeoutMs
        );

      case 'browser_extension_form_fields':
        return await this.browserExtensionService.listFormFields(
          params?.sessionId,
          params?.frameSelectors,
          params?.limit,
          params?.timeoutMs
        );

      case 'browser_extension_form_find_field':
        return await this.browserExtensionService.findFormField(
          params?.sessionId,
          params?.query ?? '',
          params?.frameSelectors,
          params?.exact,
          params?.timeoutMs
        );

      case 'browser_extension_form_options':
        return await this.browserExtensionService.listFormOptions(
          params?.sessionId,
          params?.selector ?? '',
          params?.frameSelectors,
          params?.limit,
          params?.timeoutMs
        );

      case 'browser_extension_form_select':
        return await this.browserExtensionService.selectFormOption(
          params?.sessionId,
          params?.selector ?? '',
          params?.value ?? '',
          params?.by,
          params?.frameSelectors,
          params?.timeoutMs
        );

      case 'browser_extension_form_upload':
        return await this.browserExtensionService.uploadFormFile(
          params?.sessionId,
          params?.selector ?? '',
          params?.filepath ?? '',
          {
            frameSelectors: params?.frameSelectors,
            filename: params?.fileName,
            mimeType: params?.mimeType,
            timeoutMs: params?.timeoutMs
          }
        );

      case 'browser_extension_form_combobox_options':
        return await this.browserExtensionService.listFormComboboxOptions(
          params?.sessionId,
          params?.selector ?? '',
          {
            frameSelectors: params?.frameSelectors,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          }
        );

      case 'browser_extension_form_combobox_select':
        return await this.browserExtensionService.selectFormComboboxOption(
          params?.sessionId,
          params?.selector ?? '',
          params?.value ?? '',
          {
            frameSelectors: params?.frameSelectors,
            match: params?.match,
            timeoutMs: params?.timeoutMs
          }
        );

      case 'browser_extension_form_fill_label':
        return await this.browserExtensionService.fillFormFieldByLabel(
          params?.sessionId,
          params?.query ?? '',
          params?.value ?? params?.text ?? '',
          params?.frameSelectors,
          params?.exact,
          params?.timeoutMs
        );

      case 'browser_extension_form_submit':
        return await this.browserExtensionService.formSubmit(params?.sessionId, params?.selector, params?.timeoutMs, params?.frameSelectors);

      case 'browser_extension_form_submit_wait':
        return await this.browserExtensionService.formSubmitAndWait(params?.sessionId, {
          selector: params?.selector,
          frameSelectors: params?.frameSelectors,
          waitUrlIncludes: params?.waitUrlIncludes,
          waitText: params?.waitText,
          waitSelector: params?.waitSelector,
          waitNoSelector: params?.waitNoSelector,
          timeoutMs: params?.timeoutMs,
          intervalMs: params?.intervalMs
        });

      case 'browser_extension_auth_login':
        return await this.browserExtensionService.authLogin(params?.sessionId, {
          email: params?.email,
          username: params?.username,
          password: params?.password ?? '',
          frameSelectors: params?.frameSelectors,
          delayMs: params?.delayMs,
          jitterMs: params?.jitterMs,
          humanLike: params?.humanLike,
          skipSubmit: params?.skipSubmit,
          submitSelector: params?.selector,
          waitUrlIncludes: params?.waitUrlIncludes,
          waitText: params?.waitText,
          waitSelector: params?.waitSelector,
          waitNoSelector: params?.waitNoSelector,
          timeoutMs: params?.timeoutMs,
          intervalMs: params?.intervalMs
        });

      case 'browser_extension_auth_signup':
        return await this.browserExtensionService.authSignup(params?.sessionId, {
          fullName: params?.fullName,
          username: params?.username,
          email: params?.email,
          password: params?.password ?? '',
          confirmPassword: params?.confirmPassword,
          frameSelectors: params?.frameSelectors,
          delayMs: params?.delayMs,
          jitterMs: params?.jitterMs,
          humanLike: params?.humanLike,
          skipSubmit: params?.skipSubmit,
          submitSelector: params?.selector,
          waitUrlIncludes: params?.waitUrlIncludes,
          waitText: params?.waitText,
          waitSelector: params?.waitSelector,
          waitNoSelector: params?.waitNoSelector,
          timeoutMs: params?.timeoutMs,
          intervalMs: params?.intervalMs
        });

      case 'browser_extension_cookies':
          return await this.browserExtensionService.cookies(params?.sessionId, params?.targetUrl, params?.timeoutMs);

      case 'browser_extension_x_search':
          return await this.browserExtensionService.xSearch(params?.sessionId, params?.query, {
            mode: params?.mode,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_timeline':
          return await this.browserExtensionService.xTimeline(params?.sessionId, {
            timelineType: params?.timelineType,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_bookmarks':
          return await this.browserExtensionService.xBookmarks(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_notifications':
          return await this.browserExtensionService.xNotifications(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_messages':
          return await this.browserExtensionService.xMessages(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_open_message_thread':
          return await this.browserExtensionService.xOpenMessageThread(params?.sessionId, params?.targetUrl ?? '', {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_send_message':
          return await this.browserExtensionService.xSendMessage(params?.sessionId, params?.text ?? '', {
            thread: params?.targetUrl,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_read_thread':
          return await this.browserExtensionService.xReadThread(params?.sessionId, params?.targetUrl ?? '', {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_post':
          return await this.browserExtensionService.xPost(params?.sessionId, params?.text ?? '', params?.timeoutMs);

      case 'browser_extension_x_open_post':
          return await this.browserExtensionService.xOpenPost(params?.sessionId, params?.targetUrl ?? '', params?.timeoutMs);

      case 'browser_extension_x_profile':
          return await this.browserExtensionService.xProfile(params?.sessionId, params?.targetUrl ?? '', {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_follow':
          return await this.browserExtensionService.xFollow(params?.sessionId, params?.targetUrl ?? '', {
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_reply':
          return await this.browserExtensionService.xReply(params?.sessionId, params?.text ?? '', {
            postUrl: params?.targetUrl,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_like':
          return await this.browserExtensionService.xLike(params?.sessionId, {
            postUrl: params?.targetUrl,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_x_repost':
          return await this.browserExtensionService.xRepost(params?.sessionId, {
            postUrl: params?.targetUrl,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_new_chat':
          return await this.browserExtensionService.chatGptNewChat(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_chatgpt_sidebar_state':
          return await this.browserExtensionService.chatGptSidebarState(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_chatgpt_toggle_sidebar':
          return await this.browserExtensionService.chatGptToggleSidebar(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_chatgpt_models':
          return await this.browserExtensionService.chatGptModels(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_chatgpt_select_model':
          return await this.browserExtensionService.chatGptSelectModel(params?.sessionId, params?.text ?? '', params?.timeoutMs);

      case 'browser_extension_chatgpt_info':
          return await this.browserExtensionService.chatGptInfo(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_list_conversations':
          return await this.browserExtensionService.chatGptListConversations(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_open_conversation':
          return await this.browserExtensionService.chatGptOpenConversation(params?.sessionId, {
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_conversation_actions':
          return await this.browserExtensionService.chatGptConversationActions(params?.sessionId, {
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_conversation_action':
          return await this.browserExtensionService.chatGptConversationAction(params?.sessionId, params?.text ?? '', {
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_rename_conversation':
          return await this.browserExtensionService.chatGptRenameConversation(params?.sessionId, params?.text ?? '', {
            titleQuery: params?.selector,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_stop':
          return await this.browserExtensionService.chatGptStop(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_chatgpt_continue':
          return await this.browserExtensionService.chatGptContinue(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_chatgpt_response_controls':
          return await this.browserExtensionService.chatGptResponseControls(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_previous_response':
          return await this.browserExtensionService.chatGptPreviousResponse(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_next_response':
          return await this.browserExtensionService.chatGptNextResponse(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_list_response_versions':
          return await this.browserExtensionService.chatGptListResponseVersions(params?.sessionId, {
            limit: params?.limit,
            maxVersions: params?.maxVersions,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_select_response_version':
          return await this.browserExtensionService.chatGptSelectResponseVersion(params?.sessionId, params?.count ?? 0, {
            limit: params?.limit,
            maxVersions: params?.maxVersions,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_regenerate':
          return await this.browserExtensionService.chatGptRegenerate(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_chatgpt_edit_message':
          return await this.browserExtensionService.chatGptEditMessage(params?.sessionId, params?.text ?? '', {
            index: params?.count,
            role: params?.role,
            offset: params?.offset,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_read_thread':
          return await this.browserExtensionService.chatGptReadThread(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_read_message':
          return await this.browserExtensionService.chatGptReadMessage(params?.sessionId, {
            index: params?.count,
            role: params?.role,
            offset: params?.offset,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_read_latest':
          return await this.browserExtensionService.chatGptReadLatest(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_chatgpt_send':
          return await this.browserExtensionService.chatGptSend(params?.sessionId, params?.text ?? '', params?.timeoutMs);

      case 'browser_extension_chatgpt_ask':
          return await this.browserExtensionService.chatGptAsk(params?.sessionId, params?.text ?? '', params?.timeoutMs);

      case 'browser_extension_chatgpt_ask_thread':
          return await this.browserExtensionService.chatGptAskThread(params?.sessionId, params?.text ?? '', {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_rewrite_thread':
          return await this.browserExtensionService.chatGptRewriteThread(params?.sessionId, params?.text ?? '', {
            index: params?.count,
            role: params?.role,
            offset: params?.offset,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_wait_idle':
          return await this.browserExtensionService.chatGptWaitIdle(params?.sessionId, {
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs
          });

      case 'browser_extension_chatgpt_wait_response':
          return await this.browserExtensionService.chatGptWaitResponse(params?.sessionId, {
            baselineText: params?.text,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs,
            stableReads: params?.count
          });

      case 'browser_extension_chatgpt_wait_message':
          return await this.browserExtensionService.chatGptWaitMessage(params?.sessionId, {
            text: params?.text,
            role: params?.role,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs,
            stableReads: params?.count,
            limit: params?.limit
          });

      case 'browser_extension_chatgpt_wait_sidebar':
          return await this.browserExtensionService.chatGptWaitSidebar(params?.sessionId, {
            open: typeof params?.ok === 'boolean' ? params.ok : undefined,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs,
            stableReads: params?.count
          });

      case 'browser_extension_chatgpt_wait_model':
          return await this.browserExtensionService.chatGptWaitModel(params?.sessionId, {
            query: params?.text,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs,
            stableReads: params?.count
          });

      case 'browser_extension_chatgpt_wait_conversation':
          return await this.browserExtensionService.chatGptWaitConversation(params?.sessionId, {
            titleQuery: params?.targetUrl,
            url: params?.url,
            active: typeof params?.ok === 'boolean' ? params.ok : undefined,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs,
            stableReads: params?.count
          });

      case 'browser_extension_chatgpt_prepare':
          return await this.browserExtensionService.chatGptPrepare(params?.sessionId, {
            ensureSidebarOpen: params?.waitForReady === true ? true : undefined,
            model: params?.text,
            newChat: params?.createNewSession === true ? true : undefined,
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs
          });

      case 'browser_extension_chatgpt_delete_conversation':
          return await this.browserExtensionService.chatGptDeleteConversation(params?.sessionId, {
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_chatgpt_archive_conversation':
          return await this.browserExtensionService.chatGptArchiveConversation(params?.sessionId, {
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_new_chat':
          return await this.browserExtensionService.deepSeekNewChat(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_deepseek_sidebar_state':
          return await this.browserExtensionService.deepSeekSidebarState(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_deepseek_toggle_sidebar':
          return await this.browserExtensionService.deepSeekToggleSidebar(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_deepseek_models':
          return await this.browserExtensionService.deepSeekModels(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_deepseek_select_model':
          return await this.browserExtensionService.deepSeekSelectModel(params?.sessionId, params?.text ?? '', params?.timeoutMs);

      case 'browser_extension_deepseek_info':
          return await this.browserExtensionService.deepSeekInfo(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_list_conversations':
          return await this.browserExtensionService.deepSeekListConversations(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_open_conversation':
          return await this.browserExtensionService.deepSeekOpenConversation(params?.sessionId, {
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_conversation_actions':
          return await this.browserExtensionService.deepSeekConversationActions(params?.sessionId, {
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_conversation_action':
          return await this.browserExtensionService.deepSeekConversationAction(params?.sessionId, params?.text ?? '', {
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_rename_conversation':
          return await this.browserExtensionService.deepSeekRenameConversation(params?.sessionId, params?.text ?? '', {
            titleQuery: params?.selector,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_stop':
          return await this.browserExtensionService.deepSeekStop(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_deepseek_continue':
          return await this.browserExtensionService.deepSeekContinue(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_deepseek_response_controls':
          return await this.browserExtensionService.deepSeekResponseControls(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_previous_response':
          return await this.browserExtensionService.deepSeekPreviousResponse(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_next_response':
          return await this.browserExtensionService.deepSeekNextResponse(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_list_response_versions':
          return await this.browserExtensionService.deepSeekListResponseVersions(params?.sessionId, {
            limit: params?.limit,
            maxVersions: params?.maxVersions,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_select_response_version':
          return await this.browserExtensionService.deepSeekSelectResponseVersion(params?.sessionId, params?.count ?? 0, {
            limit: params?.limit,
            maxVersions: params?.maxVersions,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_regenerate':
          return await this.browserExtensionService.deepSeekRegenerate(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_deepseek_edit_message':
          return await this.browserExtensionService.deepSeekEditMessage(params?.sessionId, params?.text ?? '', {
            index: params?.count,
            role: params?.role,
            offset: params?.offset,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_read_thread':
          return await this.browserExtensionService.deepSeekReadThread(params?.sessionId, {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_read_message':
          return await this.browserExtensionService.deepSeekReadMessage(params?.sessionId, {
            index: params?.count,
            role: params?.role,
            offset: params?.offset,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_read_latest':
          return await this.browserExtensionService.deepSeekReadLatest(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_deepseek_send':
          return await this.browserExtensionService.deepSeekSend(params?.sessionId, params?.text ?? '', params?.timeoutMs);

      case 'browser_extension_deepseek_ask':
          return await this.browserExtensionService.deepSeekAsk(params?.sessionId, params?.text ?? '', params?.timeoutMs);

      case 'browser_extension_deepseek_ask_thread':
          return await this.browserExtensionService.deepSeekAskThread(params?.sessionId, params?.text ?? '', {
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_rewrite_thread':
          return await this.browserExtensionService.deepSeekRewriteThread(params?.sessionId, params?.text ?? '', {
            index: params?.count,
            role: params?.role,
            offset: params?.offset,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_wait_idle':
          return await this.browserExtensionService.deepSeekWaitIdle(params?.sessionId, {
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs
          });

      case 'browser_extension_deepseek_wait_response':
          return await this.browserExtensionService.deepSeekWaitResponse(params?.sessionId, {
            baselineText: params?.text,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs,
            stableReads: params?.count
          });

      case 'browser_extension_deepseek_wait_message':
          return await this.browserExtensionService.deepSeekWaitMessage(params?.sessionId, {
            text: params?.text,
            role: params?.role,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs,
            stableReads: params?.count,
            limit: params?.limit
          });

      case 'browser_extension_deepseek_wait_sidebar':
          return await this.browserExtensionService.deepSeekWaitSidebar(params?.sessionId, {
            open: typeof params?.ok === 'boolean' ? params.ok : undefined,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs,
            stableReads: params?.count
          });

      case 'browser_extension_deepseek_wait_model':
          return await this.browserExtensionService.deepSeekWaitModel(params?.sessionId, {
            query: params?.text,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs,
            stableReads: params?.count
          });

      case 'browser_extension_deepseek_wait_conversation':
          return await this.browserExtensionService.deepSeekWaitConversation(params?.sessionId, {
            titleQuery: params?.targetUrl,
            url: params?.url,
            active: typeof params?.ok === 'boolean' ? params.ok : undefined,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs,
            stableReads: params?.count
          });

      case 'browser_extension_deepseek_prepare':
          return await this.browserExtensionService.deepSeekPrepare(params?.sessionId, {
            ensureSidebarOpen: params?.waitForReady === true ? true : undefined,
            model: params?.text,
            newChat: params?.createNewSession === true ? true : undefined,
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            limit: params?.limit,
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs
          });

      case 'browser_extension_deepseek_delete_conversation':
          return await this.browserExtensionService.deepSeekDeleteConversation(params?.sessionId, {
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_deepseek_archive_conversation':
          return await this.browserExtensionService.deepSeekArchiveConversation(params?.sessionId, {
            titleQuery: params?.targetUrl,
            url: params?.url,
            index: params?.count,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_network_events':
          return this.browserExtensionService.listNetworkEvents(params?.sessionId, {
            limit: params?.count,
            urlIncludes: params?.targetUrl,
            stage: params?.status as 'request' | 'response' | 'error' | undefined,
            method: params?.text
          });

      case 'browser_extension_dom_events':
          return await this.browserExtensionService.listDomEvents(params?.sessionId, {
            limit: params?.count,
            mutationType: params?.mutationType as 'childList' | 'attributes' | 'characterData' | undefined,
            textIncludes: params?.textIncludes,
            timeoutMs: params?.timeoutMs
          });

      case 'browser_extension_clear_network_events':
          return await this.browserExtensionService.clearNetworkEvents(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_clear_dom_events':
          return await this.browserExtensionService.clearDomEvents(params?.sessionId, params?.timeoutMs);

      case 'browser_extension_session_events':
          return this.browserExtensionService.listSessionEvents(params?.sessionId, {
            limit: params?.count,
            kind: params?.kind,
            ok: typeof params?.ok === 'boolean' ? params.ok : undefined
          });

      case 'browser_extension_clear_session_events':
          return this.browserExtensionService.clearSessionEvents(params?.sessionId);

      case 'browser_extension_wait_url':
          return await this.browserExtensionService.waitForUrl(params?.sessionId, params?.text ?? '', {
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs
          });

      case 'browser_extension_wait_selector':
          return await this.browserExtensionService.waitForSelector(params?.sessionId, params?.selector ?? '', {
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs
          });

      case 'browser_extension_wait_no_selector':
          return await this.browserExtensionService.waitForNoSelector(params?.sessionId, params?.selector ?? '', {
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs
          });

      case 'browser_extension_wait_text':
          return await this.browserExtensionService.waitForText(params?.sessionId, params?.text ?? '', {
            timeoutMs: params?.timeoutMs,
            intervalMs: params?.intervalMs
          });

      case 'browser_extension_provider_register':
        return this.browserExtensionService.registerProvider({
          extensionId: params?.extensionId,
          protocolVersion: params?.protocolVersion,
          buildId: params?.buildId,
          browserName: params?.browserName,
          browserVersion: params?.browserVersion,
          userAgent: params?.userAgent
        });

      case 'browser_extension_provider_heartbeat':
        return this.browserExtensionService.heartbeat({
          extensionId: params?.extensionId,
          protocolVersion: params?.protocolVersion,
          buildId: params?.buildId,
          sessions: params?.sessions
        });

      case 'browser_extension_provider_state_upsert':
        return this.browserExtensionService.upsertProviderSessionState({
          extensionId: params?.extensionId,
          protocolVersion: params?.protocolVersion,
          buildId: params?.buildId,
          session: params?.session
        });

      case 'browser_extension_provider_events_upsert':
        return this.browserExtensionService.upsertProviderEvents({
          extensionId: params?.extensionId,
          protocolVersion: params?.protocolVersion,
          buildId: params?.buildId,
          sessionId: params?.sessionId,
          networkEvents: params?.networkEvents,
          domEvents: params?.domEvents,
          events: params?.events
        });

      case 'browser_extension_provider_poll':
          return await this.browserExtensionService.waitForCommands(params?.extensionId, {
            limit: params?.limit,
            waitMs: params?.waitMs
          });

      case 'browser_extension_provider_command_result':
        return this.browserExtensionService.completeCommand({
          extensionId: params?.extensionId,
          sessionId: params?.sessionId,
          commandId: params?.commandId,
          ok: params?.ok,
          result: params?.result,
          error: params?.error?.message || params?.error || undefined
        });

      case 'opencli_status':
        return this.openCliService.getStatus();

      case 'opencli_doctor':
        return await this.openCliService.doctor({
          cwd: params?.cwd,
          workspace: params?.workspace,
          ownerSessionId: params?.ownerSessionId,
          timeoutMs: params?.timeoutMs
        });

      case 'opencli_sites':
        return this.openCliService.listSites();

      case 'opencli_commands':
        return this.openCliService.listCommands(params?.site);

      case 'opencli_run':
        {
          const result = await this.openCliService.run({
            site: params?.site,
            command: params?.command,
            args: params?.args,
            cwd: params?.cwd,
            workspace: params?.workspace,
            ownerSessionId: params?.ownerSessionId,
            timeoutMs: params?.timeoutMs,
            keepBrowserOpen: params?.keepBrowserOpen,
            waitAfterMs: params?.waitAfterMs,
            maximizeBrowser: params?.maximizeBrowser,
            format: params?.format
          });
          if (params?.maximizeBrowser && result?.success) {
            await this.maximizeOpenCliBrowserWindow();
          }
          return result;
        }

      case 'opencli_workspace_list':
        return this.openCliService.listWorkspaces();

      case 'opencli_workspace_get':
        return this.openCliService.getWorkspace(params?.name);

      case 'opencli_workspace_set':
        return this.openCliService.setWorkspace(params?.name, params?.path);

      case 'opencli_workspace_clear':
        return this.openCliService.clearWorkspace(params?.name);

      case 'opencli_workspace_bind_session':
        return this.openCliService.bindSessionWorkspace(params?.sessionId, params?.workspace);

      case 'opencli_workspace_unbind_session':
        return this.openCliService.unbindSessionWorkspace(params?.sessionId);

      case 'opencli_workspace_session':
        return this.openCliService.getSessionWorkspace(params?.sessionId);

      case 'twitter_search':
        {
          const result = await this.openCliService.twitterSearch({
            query: params?.query,
            mode: params?.mode,
            limit: params?.limit,
            cwd: params?.cwd,
            workspace: params?.workspace,
            ownerSessionId: params?.ownerSessionId,
            timeoutMs: params?.timeoutMs,
            keepBrowserOpen: params?.keepBrowserOpen,
            waitAfterMs: params?.waitAfterMs,
            maximizeBrowser: params?.maximizeBrowser
          });
          if (params?.maximizeBrowser && result?.success) {
            await this.maximizeOpenCliBrowserWindow();
          }
          return result;
        }

      case 'twitter_timeline':
        {
          const result = await this.openCliService.twitterTimeline({
            type: params?.timelineType,
            limit: params?.limit,
            cwd: params?.cwd,
            workspace: params?.workspace,
            ownerSessionId: params?.ownerSessionId,
            timeoutMs: params?.timeoutMs,
            keepBrowserOpen: params?.keepBrowserOpen,
            waitAfterMs: params?.waitAfterMs,
            maximizeBrowser: params?.maximizeBrowser
          });
          if (params?.maximizeBrowser && result?.success) {
            await this.maximizeOpenCliBrowserWindow();
          }
          return result;
        }

      case 'twitter_bookmarks':
        {
          const result = await this.openCliService.twitterBookmarks({
            limit: params?.limit,
            cwd: params?.cwd,
            workspace: params?.workspace,
            ownerSessionId: params?.ownerSessionId,
            timeoutMs: params?.timeoutMs,
            keepBrowserOpen: params?.keepBrowserOpen,
            waitAfterMs: params?.waitAfterMs,
            maximizeBrowser: params?.maximizeBrowser
          });
          if (params?.maximizeBrowser && result?.success) {
            await this.maximizeOpenCliBrowserWindow();
          }
          return result;
        }

      case 'twitter_post':
        {
          const result = await this.openCliService.twitterPost({
            text: params?.text,
            cwd: params?.cwd,
            workspace: params?.workspace,
            ownerSessionId: params?.ownerSessionId,
            timeoutMs: params?.timeoutMs,
            keepBrowserOpen: params?.keepBrowserOpen,
            waitAfterMs: params?.waitAfterMs,
            maximizeBrowser: params?.maximizeBrowser
          });
          if (params?.maximizeBrowser && result?.success) {
            await this.maximizeOpenCliBrowserWindow();
          }
          return result;
        }

      case 'clipboard_read':
        return await this.clipboardService.read();

      case 'clipboard_write':
        return await this.clipboardService.write(params?.text ?? '');

      case 'clipboard_clear':
        return await this.clipboardService.clear();

      case 'clipboard_status':
        return await this.clipboardService.status();

      case 'desktop_scope_create':
        {
          const result = await this.desktopScopeService.create({
            windowHandles: params?.windowHandles,
            processIds: params?.processIds,
            titleQuery: params?.titleQuery,
            name: params?.name
          });
          if (params?.ownerSessionId) {
            this.sessionManagerService.ownResource(params.ownerSessionId, {
              type: 'desktop_scope',
              id: result.id
            });
          }
          return result;
        }

      case 'desktop_scope_list':
        return await this.desktopScopeService.list();

      case 'desktop_scope_info':
        return await this.desktopScopeService.getInfo(params?.scopeId);

      case 'desktop_scope_focus':
        return await this.desktopScopeService.focus(params?.scopeId);

      case 'desktop_scope_screenshot':
        return await this.desktopScopeService.screenshot(params?.scopeId, {
          filename: params?.filename,
          returnBase64: params?.returnBase64,
          format: params?.format
        });

      case 'desktop_scope_click':
        return await this.desktopScopeService.click(
          params?.scopeId,
          { x: params?.x, y: params?.y },
          params?.button
        );

      case 'desktop_scope_type':
        return await this.desktopScopeService.type(params?.scopeId, params?.text ?? '');

      case 'desktop_scope_close':
        return await this.desktopScopeService.close(params?.scopeId);

      case 'trace_start':
        {
          const result = await this.telemetryService.startTrace({
            name: params?.name,
            metadata: params?.metadata
          });
          if (params?.ownerSessionId) {
            this.sessionManagerService.ownResource(params.ownerSessionId, {
              type: 'trace',
              id: result.id
            });
          }
          return result;
        }

      case 'trace_list':
        return this.telemetryService.listTraces();

      case 'trace_info':
        return this.telemetryService.getTrace(params?.traceId);

      case 'trace_add_metadata':
        return await this.telemetryService.addTraceMetadata(params?.traceId, params?.metadata ?? {});

      case 'trace_record':
        return await this.telemetryService.appendTrace(params?.traceId, {
          timestamp: params?.timestamp,
          source: params?.source,
          operation: params?.operation,
          status: params?.status,
          durationMs: params?.durationMs ?? 0,
          input: params?.input,
          output: params?.output,
          error: params?.error,
          metadata: params?.metadata
        });

      case 'trace_export':
        return await this.telemetryService.exportTrace(params?.traceId, params?.path);

      case 'trace_stop':
        return await this.telemetryService.stopTrace(params?.traceId);

      case 'trajectory_start':
        {
          const result = await this.telemetryService.startTrajectory({
            name: params?.name,
            metadata: params?.metadata
          });
          if (params?.ownerSessionId) {
            this.sessionManagerService.ownResource(params.ownerSessionId, {
              type: 'trajectory',
              id: result.id
            });
          }
          return result;
        }

      case 'trajectory_list':
        return this.telemetryService.listTrajectories();

      case 'trajectory_info':
        return this.telemetryService.getTrajectory(params?.trajectoryId);

      case 'trajectory_append_turn':
        return await this.telemetryService.appendTurn(params?.trajectoryId, {
          timestamp: params?.timestamp,
          turnId: params?.turnId,
          role: params?.role,
          prompt: params?.prompt,
          response: params?.response,
          actions: params?.actions,
          screenshots: params?.screenshots,
          metadata: params?.metadata
        });

      case 'trajectory_export':
        return await this.telemetryService.exportTrajectory(params?.trajectoryId, params?.path);

      case 'trajectory_stop':
        return await this.telemetryService.stopTrajectory(params?.trajectoryId);

      case 'shell_run':
        return await this.shellService.run({
          command: params?.command,
          cwd: params?.cwd,
          env: params?.env,
          timeoutMs: params?.timeoutMs,
          shell: params?.shell
        });

      case 'shell_run_cmd':
        return await this.shellService.run({
          command: params?.command,
          cwd: params?.cwd,
          env: params?.env,
          timeoutMs: params?.timeoutMs,
          shell: 'cmd'
        });

      case 'shell_run_pwsh':
        return await this.shellService.run({
          command: params?.command,
          cwd: params?.cwd,
          env: params?.env,
          timeoutMs: params?.timeoutMs,
          shell: 'pwsh'
        });

      case 'terminal_spawn':
        {
          const result = await this.terminalService.spawn({
            kind: params?.kind,
            title: params?.title,
            executionPolicy: params?.executionPolicy,
            usePwsh7: params?.usePwsh7
          });
          if (params?.ownerSessionId && result?.sessionId && result?.kind) {
            this.sessionManagerService.ownResource(params.ownerSessionId, {
              type: 'terminal',
              id: result.sessionId,
              metadata: { kind: result.kind }
            });
          }
          return result;
        }

      case 'session_create':
        return this.sessionManagerService.createSession({
          clientKind: params?.clientKind,
          name: params?.name
        });

      case 'session_list':
        return this.sessionManagerService.listSessions();

      case 'session_info':
        return this.sessionManagerService.getSession(params?.sessionId);

      case 'session_touch':
        return this.sessionManagerService.touchSession(params?.sessionId);

      case 'session_resources':
        return this.sessionManagerService.listOwnedResources({
          type: params?.resourceType,
          sessionId: params?.sessionId
        });

      case 'session_resource_owners':
        return this.sessionManagerService.getResourceOwners(params?.resourceType, params?.resourceId);

      case 'session_claim_resource':
        return this.sessionManagerService.claimResource(params?.sessionId, {
          type: params?.resourceType,
          id: params?.resourceId,
          metadata: params?.metadata
        }, {
          exclusive: true,
          takeover: params?.takeover
        });

      case 'session_own_resource':
        return this.sessionManagerService.ownResource(params?.sessionId, {
          type: params?.resourceType,
          id: params?.resourceId,
          metadata: params?.metadata
        });

      case 'session_release_resource':
        return this.sessionManagerService.releaseResource(
          params?.sessionId,
          params?.resourceType,
          params?.resourceId
        );

      case 'session_list_idle':
        return this.sessionManagerService.listIdleSessions(params?.maxIdleMs, {
          clientKind: params?.clientKind
        });

      case 'session_close':
        return await this.sessionManagerService.closeSession(params?.sessionId, {
          cleanupOwnedResources: params?.cleanupOwnedResources
        });

      case 'session_reap_idle':
        return await this.sessionManagerService.reapIdleSessions(params?.maxIdleMs, {
          clientKind: params?.clientKind,
          cleanupOwnedResources: params?.cleanupOwnedResources
        });

      case 'terminal_list':
        return await this.terminalService.list(params?.kind);

      case 'terminal_status':
        return await this.terminalService.status(
          { kind: params?.kind, sessionId: params?.sessionId },
          {
            screenshot: params?.screenshot,
            filename: params?.filename,
            returnBase64: params?.returnBase64
          }
        );

      case 'terminal_focus':
        return await this.terminalService.focus({ kind: params?.kind, sessionId: params?.sessionId });

      case 'terminal_type':
        return await this.terminalService.type({ kind: params?.kind, sessionId: params?.sessionId }, params?.text ?? '');

      case 'terminal_exec':
        return await this.terminalService.exec(
          { kind: params?.kind, sessionId: params?.sessionId },
          params?.command,
          {
            wait: params?.wait,
            timeout: params?.timeout,
            screenshot: params?.screenshot,
            outputFormat: params?.outputFormat
          }
        );

      case 'terminal_close':
        return await this.terminalService.close({ kind: params?.kind, sessionId: params?.sessionId });

      case 'screenshot':
        return await this.platform.takeScreenshot(params?.format || 'png', params?.filename, params?.returnBase64);

      case 'screenshot_raw':
      case 'screenshot_all':
      case 'screenshot_secondary':
        return await this.platform.executeDesktopAction({
          type: action,
          format: params?.format || 'png',
          filename: params?.filename,
          returnBase64: params?.returnBase64
        });

      case 'screenshot_win32':
        return await this.platform.screenshotWin32(params?.filename, params?.returnBase64);

      case 'click':
        return await this.platform.executeDesktopAction({
          type: 'click',
          coordinates: { x: params?.x, y: params?.y },
          button: params?.button || 'left'
        });

      case 'move_mouse':
        return await this.platform.executeDesktopAction({
          type: 'move_mouse',
          coordinates: { x: params?.x, y: params?.y }
        });

      case 'drag_mouse':
        return await this.platform.executeDesktopAction({
          type: 'drag_mouse',
          path: params?.path || [{ x: params?.x, y: params?.y }],
          button: params?.button || 'left'
        });

      case 'scroll':
        return await this.platform.executeDesktopAction({
          type: 'scroll',
          direction: params?.direction || 'up',
          count: params?.count || 1
        });

      case 'type':
        return await this.platform.executeDesktopAction({
          type: 'type',
          text: params?.text
        });

      case 'key_press':
        return await this.platform.executeDesktopAction({
          type: 'key_press',
          key: params?.key
        });

      case 'key_toggle':
        return await this.platform.executeDesktopAction({
          type: 'key_toggle',
          key: params?.key,
          direction: params?.direction
        });

      case 'get_screen_size':
      case 'screen_size':
        return await this.platform.getScreenSize();

      case 'get_mouse_position':
      case 'mouse_position':
        return await this.platform.getMousePosition();

      case 'get_active_window':
      case 'active_window':
        return await this.platform.executeDesktopAction({ type: 'get_active_window' });

      case 'get_window_rect':
        return await this.platform.executeDesktopAction({
          type: 'get_window_rect',
          windowHandle: params?.windowHandle
        });

      case 'list_processes':
        return await this.processWindowService.listProcesses();

      case 'list_windows':
        return await this.processWindowService.listWindows();

      case 'get_window_info':
        return await this.processWindowService.getWindowInfo(params?.windowHandle);

      case 'move_window':
        return await this.platform.executeDesktopAction({
          type: 'move_window',
          windowHandle: params?.windowHandle,
          x: params?.x,
          y: params?.y
        });

      case 'resize_window':
        return await this.platform.executeDesktopAction({
          type: 'resize_window',
          windowHandle: params?.windowHandle,
          width: params?.width,
          height: params?.height
        });

      case 'focus_window':
        return await this.processWindowService.focus({
          windowTitle: params?.windowTitle,
          processName: params?.processName
        });

      case 'maximize_window':
      case 'minimize_window':
      case 'restore_window':
        return await this.platform.executeDesktopAction({
          type: action,
          windowHandle: params?.windowHandle
        });

      case 'show_window':
        return await this.processWindowService.show(params?.windowHandle);

      case 'hide_window':
        return await this.processWindowService.hide(params?.windowHandle);

      case 'close_window':
        return await this.processWindowService.close(params?.windowHandle);

      case 'drag_window_move':
        return await this.processWindowService.dragMove(params?.windowHandle, params?.x, params?.y);

      case 'drag_window_resize':
        return await this.processWindowService.dragResize(params?.windowHandle, params?.width, params?.height);

      case 'launch_application':
        return await this.platform.executeDesktopAction({
          type: 'launch_application',
          application: params?.application,
          args: params?.args
        });

      case 'set_mouse_delay':
        return await this.platform.executeDesktopAction({
          type: 'set_mouse_delay',
          delay: params?.delay
        });

      case 'set_keyboard_delay':
        return await this.platform.executeDesktopAction({
          type: 'set_keyboard_delay',
          delay: params?.delay
        });

      case 'type_delayed':
        return await this.platform.executeDesktopAction({
          type: 'type_delayed',
          text: params?.text,
          cpm: params?.cpm
        });

      case 'highlight':
        return await this.platform.executeDesktopAction({
          type: 'highlight',
          x: params?.x,
          y: params?.y,
          width: params?.width,
          height: params?.height,
          duration: params?.duration,
          opacity: params?.opacity
        });

      default:
        throw new Error(`Unknown automation action: ${action}`);
    }
  }

  async executeCMDAction(action: string, params: Record<string, any>): Promise<any> {
    switch (action) {
      case 'cmd_spawn':
        {
          const result = await this.cmdTerminalCore.spawn(params?.title);
          if (params?.ownerSessionId && result?.sessionId) {
            this.sessionManagerService.ownResource(params.ownerSessionId, {
              type: 'terminal',
              id: result.sessionId,
              metadata: { kind: 'cmd' }
            });
          }
          return result;
        }

      case 'cmd_attach':
        return await this.cmdTerminalCore.attach(params!.titlePattern!);

      case 'cmd_list':
        return await this.cmdTerminalCore.listSessions();

      case 'cmd_tabs':
        return await this.cmdTerminalCore.listTabs();

      case 'cmd_find':
        return await this.cmdTerminalCore.findSessionsByTitle(params!.titleQuery!);

      case 'cmd_focus':
        return await this.cmdTerminalCore.focus(params!.sessionId!);

      case 'cmd_activate_by_title':
        return await this.cmdTerminalCore.activateSessionByTitle(params!.titleQuery!);

      case 'cmd_info':
        return await this.cmdTerminalCore.getSessionInfo(params?.sessionId);

      case 'cmd_status':
        return await this.cmdTerminalCore.getSessionStatus(params?.sessionId, {
          screenshot: params?.screenshot,
          filename: params?.filename,
          returnBase64: params?.returnBase64
        });

      case 'cmd_exec':
        return await this.cmdTerminalCore.exec(params!.sessionId!, params!.command!, {
          wait: params?.wait,
          timeout: params?.timeout,
          screenshot: params?.screenshot
        });

      case 'cmd_type':
        return { message: (await this.cmdTerminalCore.typeEscaped(params!.sessionId!, params!.text!)).message };

      case 'cmd_press':
        return await this.cmdTerminalCore.press(params!.sessionId!, params!.key!);

      case 'cmd_screenshot':
        return await this.cmdTerminalCore.screenshot(params!.sessionId!, {
          filename: params?.filename,
          returnBase64: params?.returnBase64
        });

      case 'cmd_break':
        return await this.cmdTerminalCore.sendBreak(params!.sessionId!);

      case 'cmd_eof':
        return await this.cmdTerminalCore.sendEOF(params!.sessionId!);

      case 'cmd_key_toggle':
        return await this.cmdTerminalCore.keyToggle(
          params!.sessionId!,
          params!.key!,
          params!.direction || 'down'
        );

      case 'cmd_close':
        return await this.cmdTerminalCore.close(params!.sessionId!);

      case 'cmd_new_tab':
        return await this.cmdTerminalCore.executeShortcut(params!.sessionId!, 'new_tab');

      case 'cmd_next_tab':
        return await this.cmdTerminalCore.executeShortcut(params!.sessionId!, 'next_tab');

      case 'cmd_prev_tab':
        return await this.cmdTerminalCore.executeShortcut(params!.sessionId!, 'prev_tab');

      case 'cmd_split_vertical':
        return await this.cmdTerminalCore.executeShortcut(params!.sessionId!, 'split_vertical');

      case 'cmd_split_horizontal':
        return await this.cmdTerminalCore.executeShortcut(params!.sessionId!, 'split_horizontal');

      case 'cmd_pane_up':
        return await this.cmdTerminalCore.executeShortcut(params!.sessionId!, 'pane_up');

      case 'cmd_pane_down':
        return await this.cmdTerminalCore.executeShortcut(params!.sessionId!, 'pane_down');

      case 'cmd_pane_left':
        return await this.cmdTerminalCore.executeShortcut(params!.sessionId!, 'pane_left');

      case 'cmd_pane_right':
        return await this.cmdTerminalCore.executeShortcut(params!.sessionId!, 'pane_right');

      default:
        throw new Error(`Unknown CMD action: ${action}`);
    }
  }
}
