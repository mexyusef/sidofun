import {
  buildDomTree,
  buildDomSnapshot,
  blurDomElement,
  clickDomElement,
  clickDomElementHuman,
  commitDomField,
  clickDomCollectionItem,
  clickDomCollectionRowAction,
  getDomCollectionRowDetails,
  getDomCollectionSelectionState,
  applyDomCollectionFilter,
  applyDomCollectionSort,
  clearDomCollectionFilter,
  clearDomCollectionFilterToken,
  clickDomLoadMore,
  clickDomPagination,
  clickDomDialogAction,
  closeDomDialog,
  collectDomLinks,
  listDomBanners,
  dismissDomBanner,
  listDomActionables,
  listDomCollections,
  listDomCollectionRows,
  listDomCollectionControls,
  listDomCollectionFilterTokens,
  listDomCollectionRowActions,
  listDomDialogActions,
  listDomDialogs,
  listDomEmptyStates,
  listDomRadioGroups,
  listDomDisclosures,
  listDomLoadingStates,
  listDomMenus,
  listDomPaginations,
  listDomSegmentedGroups,
  listDomSteppers,
  listDomTablists,
  clearDomFormField,
  readDomFormValidation,
  fillDomFormField,
  fillDomFormFieldHuman,
  fillDomFormFieldByLabel,
  fillDomFormFields,
  focusDomElement,
  fillDomEditor,
  findDomFormField,
  inspectAllDomSelectors,
  inspectDomSelector,
  listDomFormContexts,
  listDomFormFields,
  listDomFrames,
  listDomSelectOptions,
  readDomPageState,
  readDomEditor,
  readDomMarkdown,
  readDomReadability,
  scrollDomPage,
  selectDomRadio,
  selectDomSegmentedOption,
  selectDomTabOption,
  setDomTypedFieldByQuery,
  setDomRangeByQuery,
  selectDomOption,
  selectDomMenuOption,
  selectAllDomCollectionRows,
  selectDomCollectionRow,
  moveDomStepper,
  submitDomFormInFrame,
  toggleDomDisclosure,
  toggleDomCollectionRowExpansion,
  toggleDomControl
} from './dom-service.js';
import {
  createAiReadApi,
} from './content/ai-read-api.js';
import {
  createXReadApi,
} from './content/x-read-api.js';

type DomBridgeCommand =
  | 'snapshot'
  | 'dom_tree'
  | 'frames'
  | 'inspect'
  | 'inspect_all'
  | 'click'
  | 'click_human'
  | 'focus'
  | 'blur'
  | 'links'
  | 'actionables'
  | 'page_state'
  | 'markdown'
  | 'readability'
  | 'scroll_page'
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
  | 'editor_read'
  | 'editor_fill'
  | 'form_fields'
  | 'form_contexts'
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
  | 'form_fill'
  | 'form_fill_human'
  | 'form_clear'
  | 'form_validation'
  | 'form_fill_many'
  | 'form_fill_label'
  | 'form_options'
  | 'form_select'
  | 'form_commit'
  | 'form_submit'
  | 'chatgpt_sidebar_state'
  | 'chatgpt_toggle_sidebar'
  | 'chatgpt_models'
  | 'chatgpt_list_conversations'
  | 'chatgpt_read_latest'
  | 'chatgpt_read_thread'
  | 'chatgpt_response_controls'
  | 'chatgpt_new_chat'
  | 'chatgpt_busy'
  | 'x_search_extract'
  | 'x_timeline_extract'
  | 'x_notifications_extract'
  | 'x_profile_read'
  | 'x_thread_read'
  | 'x_open_post_read'
  | 'deepseek_sidebar_state'
  | 'deepseek_toggle_sidebar'
  | 'deepseek_models'
  | 'deepseek_list_conversations'
  | 'deepseek_read_latest'
  | 'deepseek_read_thread'
  | 'deepseek_response_controls'
  | 'deepseek_new_chat'
  | 'deepseek_busy';

const domBridgeGlobal = globalThis as typeof globalThis & {
  __sidofunDomBridge?: {
    run: (kind: DomBridgeCommand, payload?: Record<string, unknown>) => unknown;
  };
};

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : undefined;
}

function numberValue(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

if (!domBridgeGlobal.__sidofunDomBridge) {
  const aiReadApi = createAiReadApi();
  const xReadApi = createXReadApi();
  domBridgeGlobal.__sidofunDomBridge = {
    async run(kind: DomBridgeCommand, payload?: Record<string, unknown>) {
      switch (kind) {
        case 'snapshot':
          return buildDomSnapshot(numberValue(payload?.limit, 6000));
        case 'dom_tree':
          return buildDomTree(
            typeof payload?.selector === 'string' ? payload.selector : undefined,
            stringArray(payload?.frameSelectors),
            numberValue(payload?.maxDepth, 4),
            numberValue(payload?.maxChildren, 20)
          );
        case 'frames':
          return listDomFrames(stringArray(payload?.frameSelectors));
        case 'inspect':
          return inspectDomSelector(String(payload?.selector || ''), stringArray(payload?.frameSelectors));
        case 'inspect_all':
          return inspectAllDomSelectors(
            String(payload?.selector || ''),
            numberValue(payload?.limit, 20),
            stringArray(payload?.frameSelectors)
          );
        case 'click':
          return clickDomElement(
            String(payload?.selector || ''),
            stringArray(payload?.frameSelectors)
          );
        case 'click_human':
          return clickDomElementHuman(
            String(payload?.selector || ''),
            stringArray(payload?.frameSelectors)
          );
        case 'focus':
          return focusDomElement(
            String(payload?.selector || ''),
            stringArray(payload?.frameSelectors)
          );
        case 'blur':
          return blurDomElement(
            typeof payload?.selector === 'string' ? payload.selector : undefined,
            stringArray(payload?.frameSelectors)
          );
        case 'links':
          return collectDomLinks(numberValue(payload?.limit, 50), stringArray(payload?.frameSelectors));
        case 'actionables':
          return listDomActionables(
            numberValue(payload?.limit, 50),
            stringArray(payload?.frameSelectors),
            typeof payload?.selector === 'string' ? payload.selector : undefined
          );
        case 'page_state':
          return readDomPageState(
            numberValue(payload?.limit, 20),
            stringArray(payload?.frameSelectors),
            typeof payload?.selector === 'string' ? payload.selector : undefined,
            numberValue(payload?.maxDepth, 3),
            numberValue(payload?.maxChildren, 12)
          );
        case 'markdown':
          return readDomMarkdown(
            typeof payload?.selector === 'string' ? payload.selector : undefined,
            stringArray(payload?.frameSelectors)
          );
        case 'readability':
          return readDomReadability(
            typeof payload?.selector === 'string' ? payload.selector : undefined,
            stringArray(payload?.frameSelectors)
          );
        case 'scroll_page':
          return scrollDomPage(
            stringValue(payload?.direction) === 'up' ? 'up' : 'down',
            numberValue(payload?.amount, 0.85)
          );
        case 'dialogs':
          return listDomDialogs(numberValue(payload?.limit, 20), stringArray(payload?.frameSelectors));
        case 'dialog_actions':
          return listDomDialogActions(
            stringValue(payload?.query),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'banners':
          return listDomBanners(numberValue(payload?.limit, 20), stringArray(payload?.frameSelectors));
        case 'banner_dismiss':
          return dismissDomBanner(stringValue(payload?.query), stringArray(payload?.frameSelectors), booleanValue(payload?.exact));
        case 'loading_states':
          return listDomLoadingStates(numberValue(payload?.limit, 20), stringArray(payload?.frameSelectors));
        case 'empty_states':
          return listDomEmptyStates(numberValue(payload?.limit, 20), stringArray(payload?.frameSelectors));
        case 'dialog_close':
          return closeDomDialog(
            typeof payload?.query === 'string' ? payload.query : undefined,
            stringArray(payload?.frameSelectors),
            payload?.exact === true
          );
        case 'dialog_action':
          return clickDomDialogAction(
            stringValue(payload?.dialogQuery),
            stringValue(payload?.actionQuery),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'menus':
          return listDomMenus(numberValue(payload?.limit, 20), stringArray(payload?.frameSelectors));
        case 'menu_select':
          return selectDomMenuOption(
            typeof payload?.menuQuery === 'string' ? payload.menuQuery : undefined,
            String(payload?.optionQuery || payload?.query || payload?.value || ''),
            stringArray(payload?.frameSelectors),
            payload?.exact === true
          );
        case 'disclosures':
          return listDomDisclosures(numberValue(payload?.limit, 50), stringArray(payload?.frameSelectors));
        case 'disclosure_toggle':
          return toggleDomDisclosure(
            String(payload?.query || ''),
            String(payload?.desiredState || 'toggle') === 'open'
              ? 'open'
              : String(payload?.desiredState || 'toggle') === 'closed'
                ? 'closed'
                : 'toggle',
            stringArray(payload?.frameSelectors),
            payload?.exact === true
          );
        case 'collections':
          return listDomCollections(numberValue(payload?.limit, 20), stringArray(payload?.frameSelectors));
        case 'collection_controls':
          return listDomCollectionControls(
            stringValue(payload?.collectionQuery),
            numberValue(payload?.limit, 20),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_active_filters':
          return listDomCollectionControls(
            stringValue(payload?.collectionQuery),
            numberValue(payload?.limit, 20),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          ).filter((entry) =>
            (entry.controlType === 'filter' || entry.controlType === 'search') && entry.active === true
          );
        case 'collection_filter_tokens':
          return listDomCollectionFilterTokens(
            stringValue(payload?.collectionQuery),
            numberValue(payload?.limit, 20),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_rows':
          return listDomCollectionRows(
            typeof payload?.collectionQuery === 'string' ? payload.collectionQuery : undefined,
            numberValue(payload?.limit, 20),
            stringArray(payload?.frameSelectors),
            payload?.exact === true
          );
        case 'collection_row_actions':
          return listDomCollectionRowActions(
            stringValue(payload?.collectionQuery),
            String(payload?.rowQuery || payload?.query || ''),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_selection_state':
          return getDomCollectionSelectionState(
            stringValue(payload?.collectionQuery),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_click':
          return clickDomCollectionItem(
            typeof payload?.collectionQuery === 'string' ? payload.collectionQuery : undefined,
            String(payload?.itemQuery || payload?.query || ''),
            stringArray(payload?.frameSelectors),
            payload?.exact === true
          );
        case 'collection_row_click':
          return clickDomCollectionRowAction(
            stringValue(payload?.collectionQuery),
            String(payload?.rowQuery || payload?.query || ''),
            stringValue(payload?.actionQuery),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_row_select':
          return selectDomCollectionRow(
            stringValue(payload?.collectionQuery),
            String(payload?.rowQuery || payload?.query || ''),
            String(payload?.desiredState || 'toggle') === 'on'
              ? 'on'
              : String(payload?.desiredState || 'toggle') === 'off'
                ? 'off'
                : 'toggle',
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_select_all':
          return selectAllDomCollectionRows(
            stringValue(payload?.collectionQuery),
            String(payload?.desiredState || 'toggle') === 'on'
              ? 'on'
              : String(payload?.desiredState || 'toggle') === 'off'
                ? 'off'
                : 'toggle',
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_row_details':
          return getDomCollectionRowDetails(
            stringValue(payload?.collectionQuery),
            String(payload?.rowQuery || payload?.query || ''),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_row_expand':
          return toggleDomCollectionRowExpansion(
            stringValue(payload?.collectionQuery),
            String(payload?.rowQuery || payload?.query || ''),
            String(payload?.desiredState || 'toggle') === 'open'
              ? 'open'
              : String(payload?.desiredState || 'toggle') === 'closed'
                ? 'closed'
                : 'toggle',
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_sort':
          return applyDomCollectionSort(
            stringValue(payload?.collectionQuery),
            String(payload?.valueQuery || payload?.query || payload?.value || ''),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_filter':
          return applyDomCollectionFilter(
            stringValue(payload?.collectionQuery),
            String(payload?.query || ''),
            String(payload?.value ?? ''),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_filter_clear':
          return clearDomCollectionFilter(
            stringValue(payload?.collectionQuery),
            String(payload?.query || ''),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'collection_filter_token_clear':
          return clearDomCollectionFilterToken(
            stringValue(payload?.collectionQuery),
            String(payload?.query || ''),
            stringArray(payload?.frameSelectors),
            booleanValue(payload?.exact, false)
          );
        case 'paginations':
          return listDomPaginations(numberValue(payload?.limit, 20), stringArray(payload?.frameSelectors));
        case 'pagination_click':
          return clickDomPagination(
            String(payload?.query || ''),
            stringArray(payload?.frameSelectors),
            payload?.exact === true
          );
        case 'load_more':
          return clickDomLoadMore(
            typeof payload?.query === 'string' ? payload.query : undefined,
            stringArray(payload?.frameSelectors),
            payload?.exact === true
          );
        case 'editor_read':
          return readDomEditor(String(payload?.selector || ''), stringArray(payload?.frameSelectors));
        case 'editor_fill':
          return fillDomEditor(
            String(payload?.selector || ''),
            String(payload?.value ?? payload?.text ?? ''),
            stringArray(payload?.frameSelectors)
          );
        case 'form_fields':
          return listDomFormFields(numberValue(payload?.limit, 50), stringArray(payload?.frameSelectors));
        case 'form_contexts':
          return listDomFormContexts(numberValue(payload?.limit, 50), stringArray(payload?.frameSelectors));
        case 'form_find_field':
          return findDomFormField(
            String(payload?.query || ''),
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_radio_groups':
          return listDomRadioGroups(
            numberValue(payload?.limit, 50),
            stringArray(payload?.frameSelectors)
          );
        case 'form_radio_select':
          return selectDomRadio(
            String(payload?.query || ''),
            String(payload?.option ?? payload?.value ?? ''),
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_segmented_options':
          return listDomSegmentedGroups(
            numberValue(payload?.limit, 50),
            stringArray(payload?.frameSelectors)
          );
        case 'form_segmented_select':
          return selectDomSegmentedOption(
            String(payload?.query || ''),
            String(payload?.option ?? payload?.value ?? ''),
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_tablist_options':
          return listDomTablists(
            numberValue(payload?.limit, 50),
            stringArray(payload?.frameSelectors)
          );
        case 'form_tablist_select':
          return selectDomTabOption(
            String(payload?.query || ''),
            String(payload?.option ?? payload?.value ?? ''),
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_stepper':
          return listDomSteppers(
            numberValue(payload?.limit, 50),
            stringArray(payload?.frameSelectors)
          );
        case 'form_stepper_move':
          return moveDomStepper(
            typeof payload?.query === 'string' ? payload.query : undefined,
            String(payload?.direction || 'next') === 'previous' ? 'previous' : 'next',
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_date_set':
          return setDomTypedFieldByQuery(
            String(payload?.query || ''),
            String(payload?.value ?? ''),
            'date',
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_time_set':
          return setDomTypedFieldByQuery(
            String(payload?.query || ''),
            String(payload?.value ?? ''),
            'time',
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_datetime_set':
          return setDomTypedFieldByQuery(
            String(payload?.query || ''),
            String(payload?.value ?? ''),
            'datetime-local',
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_toggle':
          return toggleDomControl(
            String(payload?.query || ''),
            String(payload?.desiredState || 'toggle') === 'on'
              ? 'on'
              : String(payload?.desiredState || 'toggle') === 'off'
                ? 'off'
                : 'toggle',
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_range_set':
          return setDomRangeByQuery(
            String(payload?.query || ''),
            String(payload?.value ?? ''),
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_fill':
          return fillDomFormField(
            String(payload?.selector || ''),
            String(payload?.value ?? payload?.text ?? ''),
            stringArray(payload?.frameSelectors)
          );
        case 'form_clear':
          return clearDomFormField(
            String(payload?.selector || ''),
            stringArray(payload?.frameSelectors)
          );
        case 'form_validation':
          return readDomFormValidation(
            String(payload?.selector || ''),
            stringArray(payload?.frameSelectors)
          );
        case 'form_fill_human':
          return fillDomFormFieldHuman(
            String(payload?.selector || ''),
            String(payload?.value ?? payload?.text ?? ''),
            stringArray(payload?.frameSelectors),
            numberValue(payload?.delayMs, 60),
            numberValue(payload?.jitterMs, 20)
          );
        case 'form_fill_many':
          return fillDomFormFields(Array.isArray(payload?.fields) ? payload.fields as Array<{ selector: string; value: string; frameSelectors?: string[] }> : []);
        case 'form_fill_label':
          return fillDomFormFieldByLabel(
            String(payload?.query || ''),
            String(payload?.value ?? payload?.text ?? ''),
            stringArray(payload?.frameSelectors),
            payload?.exact === true,
            typeof payload?.preferredFormSelector === 'string' ? payload.preferredFormSelector : undefined
          );
        case 'form_options':
          return listDomSelectOptions(
            String(payload?.selector || ''),
            stringArray(payload?.frameSelectors),
            numberValue(payload?.limit, 100)
          );
        case 'form_select':
          return selectDomOption(
            String(payload?.selector || ''),
            String(payload?.option ?? payload?.value ?? ''),
            String(payload?.by || 'text') === 'value'
              ? 'value'
              : String(payload?.by || 'text') === 'label'
                ? 'label'
                : 'text',
            stringArray(payload?.frameSelectors)
          );
        case 'form_commit':
          return commitDomField(
            typeof payload?.selector === 'string' ? payload.selector : undefined,
            stringArray(payload?.frameSelectors)
          );
        case 'form_submit':
          return submitDomFormInFrame(
            typeof payload?.selector === 'string' ? payload.selector : undefined,
            stringArray(payload?.frameSelectors)
          );
        case 'chatgpt_sidebar_state':
          return { sidebar: aiReadApi.readChatGptSidebarState() };
        case 'chatgpt_toggle_sidebar':
          return { sidebar: aiReadApi.toggleChatGptSidebar() };
        case 'chatgpt_models':
          return aiReadApi.listChatGptModels();
        case 'chatgpt_list_conversations':
          return { conversations: aiReadApi.listChatGptConversations(numberValue(payload?.limit, 20)) };
        case 'chatgpt_read_latest':
          return { text: aiReadApi.readChatGptLatestAssistantMessage() };
        case 'chatgpt_read_thread':
          return aiReadApi.readChatGptThread(numberValue(payload?.limit, 20));
        case 'chatgpt_response_controls':
          return { controls: aiReadApi.readChatGptResponseControls() };
        case 'chatgpt_new_chat':
          aiReadApi.startChatGptNewChat();
          return { started: true };
        case 'chatgpt_busy':
          return { busy: aiReadApi.isChatGptBusy() };
        case 'x_search_extract':
          return { posts: xReadApi.collectXSearchPosts(numberValue(payload?.limit, 10)) };
        case 'x_timeline_extract':
          return {
            posts: xReadApi.collectXTimelinePosts(
              String(payload?.timelineType || 'for-you') === 'following' ? 'following' : 'for-you',
              numberValue(payload?.limit, 10)
            )
          };
        case 'x_notifications_extract':
          return { posts: xReadApi.collectXNotifications(numberValue(payload?.limit, 10)) };
        case 'x_profile_read':
          return { profile: xReadApi.collectXProfile(numberValue(payload?.limit, 5)) };
        case 'x_thread_read':
          return {
            posts: xReadApi.collectXThread(
              numberValue(payload?.limit, 10),
              typeof payload?.postUrl === 'string' ? payload.postUrl : undefined
            )
          };
        case 'x_open_post_read':
          return { post: xReadApi.collectSingleXPost(typeof payload?.postUrl === 'string' ? payload.postUrl : undefined) };
        case 'deepseek_sidebar_state':
          return { sidebar: aiReadApi.readDeepSeekSidebarState() };
        case 'deepseek_toggle_sidebar':
          return { sidebar: aiReadApi.toggleDeepSeekSidebar() };
        case 'deepseek_models':
          return aiReadApi.listDeepSeekModels();
        case 'deepseek_list_conversations':
          return { conversations: aiReadApi.listDeepSeekConversations(numberValue(payload?.limit, 20)) };
        case 'deepseek_read_latest':
          return { text: aiReadApi.readDeepSeekLatestAssistantMessage() };
        case 'deepseek_read_thread':
          return aiReadApi.readDeepSeekThread(numberValue(payload?.limit, 20));
        case 'deepseek_response_controls':
          return { controls: aiReadApi.readDeepSeekResponseControls() };
        case 'deepseek_new_chat':
          aiReadApi.startDeepSeekNewChat();
          return { started: true };
        case 'deepseek_busy':
          return { busy: aiReadApi.isDeepSeekBusy() };
        default:
          throw new Error(`Unsupported dom bridge command: ${kind}`);
      }
    }
  };
}
