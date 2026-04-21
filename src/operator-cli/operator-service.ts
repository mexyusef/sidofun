import { createSidofunRuntime, type SidofunRuntime } from '../runtime/sidofun-runtime.js';
import { LIBNUT_PATH } from '../config/index.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import type { DoctorStatus, OperatorSnapshot, SessionInfo } from './types.js';
import type { BrowserId } from '../services/browser/types.js';
import type { LocalCoderAppId } from '../services/local-coder-apps/types.js';
import { parseEscapeSequences } from '../services/terminal/escape-sequences.js';
import type { BrowserRuntimeCreateOptions } from '../services/browser-automation/types.js';
import type { ShellKind } from '../services/shell/shell-service.js';
import type { TerminalKind } from '../services/terminal/terminal-service.js';
import type { PowerShellSessionService } from '../services/powershell/powershell-session-service.js';
import type { CMDSession } from '../services/cmd/cmd-session-service.js';
import type { PowerShellSession } from '../services/powershell/powershell-session-service.js';
import { ensureServerRunning, getServerHealth } from './server-client.js';
import {
  loadBrowserExtensionWorkflowFile,
  validateBrowserExtensionWorkflowFile
} from '../services/browser-extension/workflows/browserext-workflow-file-service.js';
import {
  loadBrowserPageProfilesFromFile,
  resolveBrowserPageProfileFile
} from '../services/browser-page-query/browser-page-profile-file-service.js';
import type {
  BrowserExtensionNormalizedWorkflowFile,
  BrowserExtensionNormalizedWorkflowMetadata,
  BrowserExtensionWorkflowSettleMode
} from '../services/browser-extension/workflows/browserext-workflow-types.js';
import {
  resolveBrowserExtensionWorkflowSettleConfig,
  shouldAutoSettleBrowserExtensionWorkflowStep
} from '../services/browser-extension/workflows/browserext-workflow-runtime.js';
import {
  type BrowserExtensionWorkflowRuntimeState,
} from '../services/browser-extension/workflows/browserext-workflow-execution-state.js';
import {
  classifyBrowserExtensionSubmitOutcome,
} from '../services/browser-extension/workflows/browserext-workflow-submit.js';
import {
  assertBrowserExtensionWorkflowOwnership,
  resolveBrowserExtensionWorkflowOwnership,
} from '../services/browser-extension/workflows/browserext-workflow-ownership.js';
import {
  ensureBrowserExtensionWorkflowOutputs,
  extractBrowserExtensionOutputComparable,
  getBrowserExtensionWorkflowOutput,
  getBrowserExtensionWorkflowReference,
  interpolateBrowserExtensionWorkflowValue,
  resolveBrowserExtensionOutputPath,
  setBrowserExtensionWorkflowOutput,
} from '../services/browser-extension/workflows/browserext-workflow-output.js';
import {
  prepareBrowserExtensionWorkflowRuntime,
} from '../services/browser-extension/workflows/browserext-workflow-preparation.js';
import {
  executeBrowserExtensionWorkflowFormStep,
} from '../services/browser-extension/workflows/browserext-workflow-form-step-executor.js';
import {
  executeBrowserExtensionWorkflowOutputStep,
} from '../services/browser-extension/workflows/browserext-workflow-output-step-executor.js';
import {
  executeBrowserExtensionWorkflowDiscoveryStep,
} from '../services/browser-extension/workflows/browserext-workflow-discovery-step-executor.js';

const AUTO_BROWSER_EXTENSION_SESSION_ID = '__auto_browserext_site_session__';

type BrowserExtensionScenarioCondition = {
  textIncludes?: string;
  noTextIncludes?: string;
  selectorExists?: string;
  selectorMissing?: string;
  urlIncludes?: string;
  metadataValue?: {
    key: string;
    equals?: string;
    includes?: string;
    exists?: boolean;
  };
  urlPart?: {
    part: string;
    equals?: string;
    includes?: string;
    exists?: boolean;
  };
  storageValue?: {
    scope?: 'local' | 'session';
    key: string;
    equals?: string;
    includes?: string;
    exists?: boolean;
  };
  cookieValue?: {
    name: string;
    targetUrl?: string;
    equals?: string;
    includes?: string;
    exists?: boolean;
  };
  fieldExists?: string;
  fieldValue?: {
    query: string;
    equals?: string;
    includes?: string;
    exists?: boolean;
  };
  nextActionExists?: string;
  bannerExists?: string;
  loadingStateExists?: string;
  noLoadingState?: string;
  emptyStateExists?: string;
  blockerExists?: string;
  noBlockers?: boolean;
  pageOutcomeStatus?: 'loading' | 'blocked' | 'error' | 'warning' | 'success' | 'empty' | 'ready';
  pageReady?: boolean;
  downloadExists?: {
    query?: string;
    state?: 'in_progress' | 'interrupted' | 'complete';
  };
  dialogExists?: string;
  noDialogs?: boolean;
  dialogActionExists?: {
    dialog?: string;
    action: string;
  };
  menuExists?: string;
  menuOptionExists?: {
    menu?: string;
    option: string;
  };
  noMenus?: boolean;
  disclosureExists?: string;
  disclosureExpanded?: {
    query: string;
    expanded: boolean;
  };
  collectionExists?: string;
  collectionCountAtLeast?: {
    collection?: string;
    count: number;
  };
  collectionItemExists?: {
    collection?: string;
    item: string;
  };
  collectionCellIncludes?: {
    collection?: string;
    row: string;
    cell: string;
    text: string;
  };
  collectionRowActionExists?: {
    collection?: string;
    row: string;
    action?: string;
  };
  collectionFilterExists?: {
    collection?: string;
    query: string;
  };
  collectionFilterTokenExists?: {
    collection?: string;
    query: string;
  };
  collectionSortExists?: {
    collection?: string;
    query: string;
  };
  noCollectionFilters?: {
    collection?: string;
  };
  collectionSelectionCountAtLeast?: {
    collection?: string;
    count: number;
  };
  collectionSelectionCountAtMost?: {
    collection?: string;
    count: number;
  };
  collectionRowExpanded?: {
    collection?: string;
    row: string;
    expanded: boolean;
  };
  collectionDetailTextIncludes?: {
    collection?: string;
    row: string;
    text: string;
  };
  collectionDiff?: {
    against?: string;
    collection?: string;
    dedupeBy?: 'auto' | 'selector' | 'text' | 'cells';
    includeSelection?: boolean;
    includeDetails?: boolean;
    addedAtLeast?: number;
    removedAtLeast?: number;
    changedAtLeast?: number;
    unchangedAtLeast?: number;
    rowAdded?: string;
    rowRemoved?: string;
    rowChanged?: string;
  };
  collectionValuesDiff?: {
    against: string;
    cell: string;
    collection?: string;
    row?: string;
    addedValue?: string;
    removedValue?: string;
    countDeltaAtLeast?: number;
    uniqueCountDeltaAtLeast?: number;
  };
  collectionStatsDiff?: {
    against: string;
    collection?: string;
    cell?: string;
    countDeltaAtLeast?: number;
    selectedDeltaAtLeast?: number;
    expandedDeltaAtLeast?: number;
    detailDeltaAtLeast?: number;
    rowActionDeltaAtLeast?: number;
  };
  paginationExists?: string;
  loadMoreExists?: string;
  output?: {
    name: string;
    equals?: string;
    includes?: string;
    exists?: boolean;
  };
  outputPath?: {
    output: string;
    path: string;
    equals?: string;
    includes?: string;
    exists?: boolean;
  };
  stateDiff?: {
    against?: string;
    urlChanged?: boolean;
    titleChanged?: boolean;
    textChanged?: boolean;
    textLengthDeltaAtLeast?: number;
    addedActionableQuery?: string;
    removedActionableQuery?: string;
  };
};

type BrowserExtensionScenarioStepBase = {
  name?: string;
  saveAs?: string;
  optional?: boolean;
  retryCount?: number;
  retryDelayMs?: number;
  formSelector?: string;
  contextQuery?: string;
  frameQuery?: string;
  exact?: boolean;
  frameSelectors?: string[];
  settleAfter?: BrowserExtensionWorkflowSettleMode;
  settleQuietMs?: number;
  settleIntervalMs?: number;
  stableReads?: number;
  skipSettle?: boolean;
};

type BrowserExtensionScenarioStep =
  | (BrowserExtensionScenarioStepBase & { kind: 'navigate'; url: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'back' })
  | (BrowserExtensionScenarioStepBase & { kind: 'forward' })
  | (BrowserExtensionScenarioStepBase & { kind: 'reload' })
  | (BrowserExtensionScenarioStepBase & { kind: 'metadata' })
  | (BrowserExtensionScenarioStepBase & { kind: 'url-parts' })
  | (BrowserExtensionScenarioStepBase & { kind: 'storage-list'; scope?: 'local' | 'session'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'storage-get'; scope?: 'local' | 'session'; key: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'storage-set'; scope?: 'local' | 'session'; key: string; value: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'storage-remove'; scope?: 'local' | 'session'; key: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'capture-url' })
  | (BrowserExtensionScenarioStepBase & { kind: 'capture-text'; selector?: string; maxChars?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'capture-field'; query: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'capture-form-values'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'capture-next-action'; query: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'extract-output'; output: string; path: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-output'; output: string; equals?: string; includes?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-output-path'; output: string; path: string; equals?: string; includes?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-metadata'; key: string; equals?: string; includes?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-url-part'; part: string; equals?: string; includes?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-storage'; scope?: 'local' | 'session'; key: string; equals?: string; includes?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-field-value'; query: string; equals?: string; includes?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'state-diff'; against?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'snapshot' })
  | (BrowserExtensionScenarioStepBase & { kind: 'dom-tree'; selector?: string; maxDepth?: number; maxChildren?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'inspect'; selector: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'inspect-all'; selector: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'links'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'frames'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'form-contexts'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'actionables'; selector?: string; limit?: number; maxDepth?: number; maxChildren?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'banners'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'banner-dismiss'; query?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-banner'; text: string; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-no-banner'; text?: string; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'loading-states'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'empty-states'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'dialogs'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'dialog-actions'; query?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'dialog-close'; query?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'dialog-action'; dialog?: string; action?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'menus'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'menu-select'; option: string; menu?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'disclosures'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'disclosure-toggle'; query: string; desiredState?: 'open' | 'closed' | 'toggle' })
  | (BrowserExtensionScenarioStepBase & { kind: 'collections'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-active-filters'; collection?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-filter-tokens'; collection?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-sort-state'; collection?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-rows'; collection?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-find'; query: string; cell?: string; collection?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-values'; cell: string; collection?: string; row?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-values-diff'; cell: string; collection?: string; row?: string; againstFile?: string; againstOutput?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-stats'; collection?: string; cell?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-stats-diff'; collection?: string; cell?: string; againstFile?: string; againstOutput?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-row'; row: string; collection?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-cell'; row: string; cell: string; collection?: string; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-collection-row'; row: string; collection?: string; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-collection-count'; count: number; collection?: string; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-row-actions'; row: string; collection?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-selection-state'; collection?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-click'; item: string; collection?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-row-click'; row: string; action?: string; collection?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-row-select'; row: string; desiredState?: 'on' | 'off' | 'toggle'; collection?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-select-all'; desiredState?: 'on' | 'off' | 'toggle'; collection?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-row-details'; row: string; collection?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-row-expand'; row: string; desiredState?: 'open' | 'closed' | 'toggle'; collection?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-collection-cell'; row: string; cell: string; collection?: string; equals?: string; includes?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-collection-selection'; collection?: string; atLeast?: number; atMost?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-collection-detail'; row: string; collection?: string; includes?: string; expanded?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-collection-values-diff'; cell: string; collection?: string; row?: string; againstFile?: string; againstOutput?: string; addedValue?: string; removedValue?: string; countDeltaAtLeast?: number; uniqueCountDeltaAtLeast?: number; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-collection-stats-diff'; collection?: string; cell?: string; againstFile?: string; againstOutput?: string; countDeltaAtLeast?: number; selectedDeltaAtLeast?: number; expandedDeltaAtLeast?: number; detailDeltaAtLeast?: number; rowActionDeltaAtLeast?: number; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-bulk-action'; rows: string[]; action?: string; collection?: string; continueOnError?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-clear-all-filters'; collection?: string; continueOnError?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-export'; collection?: string; includeSelection?: boolean; includeDetails?: boolean; format?: 'json' | 'markdown'; file?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-diff'; collection?: string; againstFile?: string; againstOutput?: string; dedupeBy?: 'auto' | 'selector' | 'text' | 'cells'; includeSelection?: boolean; includeDetails?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-collection-diff'; collection?: string; againstFile?: string; againstOutput?: string; dedupeBy?: 'auto' | 'selector' | 'text' | 'cells'; includeSelection?: boolean; includeDetails?: boolean; addedAtLeast?: number; removedAtLeast?: number; changedAtLeast?: number; unchangedAtLeast?: number; rowAdded?: string; rowRemoved?: string; rowChanged?: string; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-collection-diff'; collection?: string; againstFile?: string; againstOutput?: string; dedupeBy?: 'auto' | 'selector' | 'text' | 'cells'; includeSelection?: boolean; includeDetails?: boolean; addedAtLeast?: number; removedAtLeast?: number; changedAtLeast?: number; unchangedAtLeast?: number; rowAdded?: string; rowRemoved?: string; rowChanged?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'collection-harvest'; collection?: string; strategy?: 'auto' | 'load_more' | 'scroll'; limit?: number; maxIterations?: number; stableIterations?: number; settleQuietMs?: number; dedupeBy?: 'auto' | 'selector' | 'text' | 'cells'; scrollAmount?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'paginations'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'pagination-click'; query: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'load-more'; query?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'markdown'; selector?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'readability'; selector?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'page-state'; selector?: string; limit?: number; maxDepth?: number; maxChildren?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'cookies'; targetUrl?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'cookie-get'; name: string; targetUrl?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'cookie-set'; name: string; value: string; targetUrl?: string; domain?: string; path?: string; secure?: boolean; httpOnly?: boolean; sameSite?: 'no_restriction' | 'lax' | 'strict' | 'unspecified'; expirationDate?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'cookie-remove'; name: string; targetUrl?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'downloads'; query?: string; state?: 'in_progress' | 'interrupted' | 'complete'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'page-blockers'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'page-outcomes'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'page-recover'; collection?: string; continueOnError?: boolean; limit?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'next-actions'; selector?: string; limit?: number; maxDepth?: number; maxChildren?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'context-state'; limit?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'fill'; query: string; value: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'fill-selector'; selector: string; value: string })
  | (BrowserExtensionScenarioStepBase & {
      kind: 'signup-form';
      emailSelector: string;
      passwordSelector: string;
      emailValue: string;
      passwordValue: string;
      submitSelector?: string;
    })
  | (BrowserExtensionScenarioStepBase & { kind: 'clear-selector'; selector: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'field-validation'; selector: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'click'; query: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'click-selector'; selector: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'click-human-selector'; selector: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'focus-selector'; selector: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'blur-selector'; selector?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'commit-selector'; selector?: string })
  | (BrowserExtensionScenarioStepBase & {
      kind: 'complete-profile';
      usernameSelector: string;
      fullNameSelector: string;
      usernameValue: string;
      fullNameValue: string;
      agreementSelector?: string;
      submitSelector?: string;
    })
  | (BrowserExtensionScenarioStepBase & { kind: 'radio'; query: string; value: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'segment'; query: string; value: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'tab'; query: string; value: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'step'; query?: string; direction?: 'next' | 'previous' })
  | (BrowserExtensionScenarioStepBase & { kind: 'date'; query: string; value: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'time'; query: string; value: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'datetime'; query: string; value: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'range'; query: string; value: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'toggle'; query: string; desiredState?: 'on' | 'off' | 'toggle' })
  | (BrowserExtensionScenarioStepBase & { kind: 'submit'; selector?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'submit-query'; query: string })
  | (BrowserExtensionScenarioStepBase & {
      kind: 'auth-login';
      email?: string;
      username?: string;
      password: string;
      selector?: string;
      humanLike?: boolean;
      delayMs?: number;
      jitterMs?: number;
      skipSubmit?: boolean;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
    })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-text'; text: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-no-loading-state'; query?: string; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-dialog'; query?: string; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-no-dialog'; query?: string; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-menu'; query?: string; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-no-menu'; query?: string; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-disclosure'; query: string; state?: 'open' | 'closed'; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-page-outcome'; status: 'loading' | 'blocked' | 'error' | 'warning' | 'success' | 'empty' | 'ready'; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-cookie'; name: string; targetUrl?: string; equals?: string; includes?: string; exists?: boolean; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-download'; query?: string; state?: 'in_progress' | 'interrupted' | 'complete'; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-no-blockers'; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'page-ready'; collection?: string; limit?: number; timeoutMs?: number; intervalMs?: number; continueOnError?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-no-collection-filters'; collection?: string; limit?: number; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-selector'; selector: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-no-selector'; selector: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-field-validation'; selector: string; state?: 'valid' | 'invalid'; messageIncludes?: string; messageEquals?: string; timeoutMs?: number; intervalMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'wait-url'; text: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'require-field'; query: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'require-field-value'; query: string; equals?: string; includes?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'require-next-action'; query: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'require-text'; text: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'require-no-text'; text: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'require-selector'; selector: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'require-no-selector'; selector: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-field-validation'; selector: string; state?: 'valid' | 'invalid'; messageIncludes?: string; messageEquals?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-banner'; text?: string; variant?: 'info' | 'success' | 'warning' | 'error' | 'status'; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-empty-state'; text?: string; kindMatch?: 'empty' | 'no_results' | 'not_found'; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-page-ready'; collection?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-cookie'; name: string; targetUrl?: string; equals?: string; includes?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-download'; query?: string; state?: 'in_progress' | 'interrupted' | 'complete'; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-dialog'; query?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-dialog-action'; dialog?: string; action: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-menu'; query?: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-menu-option'; menu?: string; option: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-disclosure-state'; query: string; state: 'open' | 'closed'; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-no-blockers' })
  | (BrowserExtensionScenarioStepBase & { kind: 'download-cancel'; query?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'download-erase'; query?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-no-collection-filters'; collection?: string })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-collection-filter'; collection?: string; query: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-collection-filter-token'; collection?: string; query: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'assert-collection-sort'; collection?: string; query: string; exists?: boolean })
  | (BrowserExtensionScenarioStepBase & { kind: 'settle'; mode?: 'dom' | 'network' | 'page'; quietMs?: number; stableReads?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'repeat-until'; condition: BrowserExtensionScenarioCondition; steps: BrowserExtensionScenarioStep[]; maxAttempts?: number; delayMs?: number })
  | (BrowserExtensionScenarioStepBase & { kind: 'branch'; condition: BrowserExtensionScenarioCondition; then?: BrowserExtensionScenarioStep[]; else?: BrowserExtensionScenarioStep[] });

type BrowserExtensionScenarioDocument = {
  name?: string;
  description?: string;
  frameSelectors?: string[];
  formSelector?: string;
  contextQuery?: string;
  frameQuery?: string;
  exact?: boolean;
  delayMs?: number;
  timeoutMs?: number;
  intervalMs?: number;
  settleAfterEach?: BrowserExtensionWorkflowSettleMode;
  settleQuietMs?: number;
  stableReads?: number;
  retryCount?: number;
  retryDelayMs?: number;
  lockContext?: boolean;
  variables?: Record<string, unknown>;
  steps: BrowserExtensionScenarioStep[];
};

type BrowserExtensionResolvedContextCandidate = {
  context: Record<string, unknown>;
  score: number;
  reasons: string[];
  matchedValues: string[];
  frameMatchedValues: string[];
};

type BrowserExtensionResolvedContextResult = {
  contexts: Awaited<ReturnType<OperatorService['runtime']['browserExtensionService']['listFormContexts']>>;
  frames: Awaited<ReturnType<OperatorService['runtime']['browserExtensionService']['listFrames']>>;
  candidates: BrowserExtensionResolvedContextCandidate[];
  selectedContext?: Awaited<ReturnType<OperatorService['runtime']['browserExtensionService']['listFormContexts']>>['contexts'][number];
  preferredFormSelector?: string;
};

type BrowserExtensionScenarioRuntimeState = BrowserExtensionWorkflowRuntimeState & {
  lockedContext?: BrowserExtensionResolvedContextResult;
};

export class OperatorService {
  readonly runtime: SidofunRuntime;
  readonly psService: PowerShellSessionService;

  constructor() {
    this.runtime = createSidofunRuntime();
    this.psService = this.runtime.psService;
  }

  getDoctorStatus(): DoctorStatus {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      bunVersion: Bun.version,
      cwd: process.cwd(),
      cliPath: process.argv[1] || import.meta.path,
      libnutPath: LIBNUT_PATH,
      libnutPresent: Bun.file(LIBNUT_PATH).size > 0
    };
  }

  listBrowsers() {
    return this.runtime.browserService.listBrowsers();
  }

  listBrowserProfiles(browserId: BrowserId) {
    return this.runtime.browserService.listProfiles(browserId);
  }

  launchBrowser(options: {
      browserId: BrowserId;
      profile?: string;
      url?: string;
      privateMode?: boolean;
      headless?: boolean;
    }) {
    const args = !options.headless && options.url
      ? ['--new-window']
      : undefined;

    return this.runtime.browserService.launchBrowser({
      browserId: options.browserId,
      profile: options.profile,
      url: options.url,
      privateMode: options.privateMode,
      headless: options.headless,
      args
    });
  }

  createBrowserRuntime(options: BrowserRuntimeCreateOptions & { ownerSessionId?: string }) {
    const result = this.runtime.browserAutomationService.createRuntime(options);
    if (!options.ownerSessionId) {
      return result;
    }
    return Promise.resolve(result).then((runtime) => {
      this.runtime.sessionManagerService.ownResource(options.ownerSessionId!, {
        type: 'browser_runtime',
        id: runtime.id
      });
      return runtime;
    });
  }

  listBrowserRuntimes() {
    return this.runtime.browserAutomationService.listRuntimes();
  }

  getBrowserRuntime(runtimeId: string) {
    return this.runtime.browserAutomationService.getRuntime(runtimeId);
  }

  listBrowserRuntimeWindows(runtimeIds?: string[]) {
    return this.runtime.browserWindowLayoutService.listRuntimeWindows(runtimeIds);
  }

  bindBrowserRuntimeWindow(runtimeId: string, windowHandle?: number) {
    return this.runtime.browserWindowLayoutService.bindRuntimeWindow(runtimeId, windowHandle);
  }

  tileBrowserRuntimeWindows(options?: {
    runtimeIds?: string[];
    preset?: '2-up' | '3-column' | '2x2' | 'main-left' | 'main-right' | 'newsroom-5' | 'newsroom-6';
    columns?: number;
    gap?: number;
    area?: { x: number; y: number; width: number; height: number };
  }) {
    return this.runtime.browserWindowLayoutService.tileRuntimeWindows(options);
  }

  closeBrowserRuntime(runtimeId: string) {
    return this.runtime.browserPlaywrightService.closeRuntimePages(runtimeId)
      .catch(() => ({ runtimeId, closedPageIds: [] }))
      .then(() => this.runtime.browserAutomationService.closeRuntime(runtimeId));
  }

  listBrowserPages(runtimeId?: string) {
    return this.runtime.browserPlaywrightService.listPages(runtimeId);
  }

  openBrowserPage(runtimeId: string, url?: string) {
    return this.runtime.browserPlaywrightService.openPage(runtimeId, url);
  }

  getBrowserPage(pageId: string) {
    return this.runtime.browserPlaywrightService.getPage(pageId);
  }

  closeBrowserPage(pageId: string) {
    return this.runtime.browserPlaywrightService.closePage(pageId);
  }

  locateBrowserPage(pageId: string, query: string, options?: {
    kind?: 'field' | 'button' | 'link' | 'any';
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
    limit?: number;
  }) {
    return this.runtime.browserPageQueryService.locate(pageId, query, options);
  }

  fillBrowserPageQuery(pageId: string, query: string, value: string, options?: {
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
  }) {
    return this.runtime.browserPageQueryService.fillQuery(pageId, query, value, options);
  }

  clickBrowserPageQuery(pageId: string, query: string, options?: {
    kind?: 'button' | 'link' | 'any' | 'field';
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
  }) {
    return this.runtime.browserPageQueryService.clickQuery(pageId, query, options);
  }

  submitBrowserPage(pageId: string, options?: {
    query?: string;
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
  }) {
    return this.runtime.browserPageQueryService.submit(pageId, options);
  }

  waitForBrowserPageText(pageId: string, text: string, options?: {
    timeoutMs?: number;
    intervalMs?: number;
  }) {
    return this.runtime.browserPageQueryService.waitForText(pageId, text, options);
  }

  formWorkflowBrowserPage(pageId: string, options: {
    fields: Array<{ query: string; value: string }>;
    submit?: boolean;
    submitQuery?: string;
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
    waitUrlIncludes?: string;
    waitText?: string;
    waitSelector?: string;
    waitNoSelector?: string;
    timeoutMs?: number;
    intervalMs?: number;
  }) {
    return this.runtime.browserPageQueryService.formWorkflow(pageId, options);
  }

  authLoginBrowserPage(pageId: string, options: {
    email?: string;
    username?: string;
    password: string;
    submitQuery?: string;
    skipSubmit?: boolean;
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
    waitUrlIncludes?: string;
    waitText?: string;
    waitSelector?: string;
    waitNoSelector?: string;
    timeoutMs?: number;
    intervalMs?: number;
  }) {
    return this.runtime.browserPageMacroService.authLogin(pageId, options);
  }

  authSignupBrowserPage(pageId: string, options: {
    fullName?: string;
    username?: string;
    email?: string;
    password: string;
    confirmPassword?: string;
    submitQuery?: string;
    skipSubmit?: boolean;
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
    waitUrlIncludes?: string;
    waitText?: string;
    waitSelector?: string;
    waitNoSelector?: string;
    timeoutMs?: number;
    intervalMs?: number;
  }) {
    return this.runtime.browserPageMacroService.authSignup(pageId, options);
  }

  openWorkflowBrowserPage(runtimeId: string, options: {
    url: string;
    fields: Array<{ query: string; value: string }>;
    submit?: boolean;
    submitQuery?: string;
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
    waitUrlIncludes?: string;
    waitText?: string;
    waitSelector?: string;
    waitNoSelector?: string;
    timeoutMs?: number;
    intervalMs?: number;
  }) {
    return this.runtime.browserPageMacroService.openWorkflow(runtimeId, options);
  }

  openAndLoginBrowserPage(runtimeId: string, options: {
    url: string;
    email?: string;
    username?: string;
    password: string;
    submitQuery?: string;
    skipSubmit?: boolean;
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
    waitUrlIncludes?: string;
    waitText?: string;
    waitSelector?: string;
    waitNoSelector?: string;
    timeoutMs?: number;
    intervalMs?: number;
  }) {
    return this.runtime.browserPageMacroService.openAndLogin(runtimeId, options);
  }

  openAndSignupBrowserPage(runtimeId: string, options: {
    url: string;
    fullName?: string;
    username?: string;
    email?: string;
    password: string;
    confirmPassword?: string;
    submitQuery?: string;
    skipSubmit?: boolean;
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
    waitUrlIncludes?: string;
    waitText?: string;
    waitSelector?: string;
    waitNoSelector?: string;
    timeoutMs?: number;
    intervalMs?: number;
  }) {
    return this.runtime.browserPageMacroService.openAndSignup(runtimeId, options);
  }

  listBrowserPageProfiles(profileFile?: string) {
    return this.resolveBrowserPageProfileService(profileFile).listProfiles();
  }

  getBrowserNavigationPolicy() {
    return this.runtime.browserAutomationService.getNavigationPolicy();
  }

  setBrowserNavigationPolicy(options: {
    enabled?: boolean;
    allowList?: string[];
    denyList?: string[];
  }) {
    return this.runtime.browserAutomationService.setNavigationPolicy(options);
  }

  getBrowserPageProfile(profileId: string, profileFile?: string) {
    return this.resolveBrowserPageProfileService(profileFile).getProfile(profileId);
  }

  loginBrowserPageProfile(runtimeId: string, profileId: string, options: {
    profileFile?: string;
    url?: string;
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    fullName?: string;
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
    timeoutMs?: number;
    intervalMs?: number;
  }) {
    const { profileFile, ...profileOptions } = options;
    return this.resolveBrowserPageProfileService(profileFile).login(runtimeId, profileId, profileOptions);
  }

  signupBrowserPageProfile(runtimeId: string, profileId: string, options: {
    profileFile?: string;
    url?: string;
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    fullName?: string;
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
    timeoutMs?: number;
    intervalMs?: number;
  }) {
    const { profileFile, ...profileOptions } = options;
    return this.resolveBrowserPageProfileService(profileFile).signup(runtimeId, profileId, profileOptions);
  }

  snapshotBrowserPageDom(pageId: string) {
    return this.runtime.browserPageDomService.snapshot(pageId);
  }

  fillCommitBrowserPage(pageId: string, selector: string, value: string) {
    return this.runtime.browserPageQueryService.fillCommit(pageId, selector, value);
  }

  waitReadyBrowserPage(pageId: string, selectors: string[], options?: { timeoutMs?: number; intervalMs?: number; stableReads?: number }) {
    return this.runtime.browserPageQueryService.waitReady(pageId, selectors, options);
  }

  clickTextBrowserPage(pageId: string, text: string, options?: {
    exact?: boolean;
    withinSelector?: string;
    topRegionOnly?: boolean;
    topRegionMax?: number;
    allowLinks?: boolean;
    settleAfter?: 'dom' | 'page' | 'network';
    settleTimeoutMs?: number;
    settleStableReads?: number;
  }) {
    return this.runtime.browserPageQueryService.clickButtonText(pageId, text, options);
  }

  checkAgreementBrowserPage(pageId: string, options?: { selector?: string; labelTextIncludes?: string[] }) {
    return this.runtime.browserPageQueryService.checkAgreement(pageId, options);
  }

  settleBrowserPage(pageId: string, mode: 'dom' | 'page' | 'network', options?: { timeoutMs?: number; intervalMs?: number; stableReads?: number; quietMs?: number }) {
    return this.runtime.browserPageQueryService.settle(pageId, mode, options);
  }

  completeProfileBrowserPage(pageId: string, options: {
    email: string;
    username?: string;
    fullName?: string;
    usernameSelector?: string;
    fullNameSelector?: string;
    agreementSelector?: string;
    agreementTextIncludes?: string[];
    submitText?: string;
    waitReadyTimeoutMs?: number;
  }) {
    return this.runtime.browserPageQueryService.completeProfile(pageId, options);
  }

  signupStepBrowserPage(pageId: string, options: {
    email: string;
    password: string;
    emailSelector?: string;
    passwordSelector?: string;
    submitText?: string;
    waitReadyTimeoutMs?: number;
  }) {
    return this.runtime.browserPageQueryService.signupStep(pageId, options);
  }

  scrollBrowserPage(pageId: string, direction: 'up' | 'down' | 'top' | 'bottom', query?: string) {
    return this.runtime.browserPageQueryService.scroll(pageId, direction, query);
  }

  scrollBrowserPageToText(pageId: string, text: string, nth?: number) {
    return this.runtime.browserPageQueryService.scrollToText(pageId, text, nth);
  }

  sendKeysBrowserPage(pageId: string, keys: string, query?: string) {
    return this.runtime.browserPageQueryService.sendKeys(pageId, keys, query);
  }

  getBrowserPageSelectOptions(pageId: string, query: string, options: {
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
  } = {}) {
    return this.runtime.browserPageQueryService.getSelectOptions(pageId, query, options);
  }

  selectBrowserPageOption(pageId: string, query: string, text: string, options: {
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
  } = {}) {
    return this.runtime.browserPageQueryService.selectOption(pageId, query, text, options);
  }

  detectBrowserPageFileUploader(pageId: string, query: string, options: {
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
  } = {}) {
    return this.runtime.browserPageQueryService.detectFileUploader(pageId, query, options);
  }

  replayBrowserPage(pageId: string, actions: import('../services/browser-automation/types.js').BrowserPageRecordedAction[]) {
    return this.runtime.browserPageReplayService.replay(pageId, actions);
  }

  runBrowserAgent(options: import('../services/browser-page-query/browser-agent-service.js').BrowserAgentRunOptions) {
    return this.runtime.browserAgentService.run(options);
  }

  private resolveBrowserPageProfileService(profileFile?: string) {
    const resolved = resolveBrowserPageProfileFile(profileFile);
    if (!resolved) {
      return this.runtime.browserPageProfileService;
    }
    const profiles = loadBrowserPageProfilesFromFile(resolved);
    return this.runtime.browserPageProfileService.withProfiles(profiles);
  }

  listLocalCoders() {
    return this.runtime.localCoderAppsService.listApps();
  }

  getLocalCoderStatus(appId: LocalCoderAppId) {
    return this.runtime.localCoderAppsService.getStatus(appId);
  }

  openLocalCoder(appId: LocalCoderAppId, prompt?: string, workingDirectory?: string, inputDelayMs?: number) {
    return this.runtime.localCoderAppsService.open(appId, {
      initialPrompt: prompt,
      workingDirectory,
      inputDelayMs
    });
  }

  focusLocalCoder(appId: LocalCoderAppId) {
    return this.runtime.localCoderAppsService.focus(appId);
  }

  closeLocalCoder(appId: LocalCoderAppId) {
    return this.runtime.localCoderAppsService.close(appId);
  }

  maximizeLocalCoder(appId: LocalCoderAppId) {
    return this.runtime.localCoderAppsService.maximize(appId);
  }

  minimizeLocalCoder(appId: LocalCoderAppId) {
    return this.runtime.localCoderAppsService.minimize(appId);
  }

  restoreLocalCoder(appId: LocalCoderAppId) {
    return this.runtime.localCoderAppsService.restore(appId);
  }

  moveLocalCoder(appId: LocalCoderAppId, x: number, y: number) {
    return this.runtime.localCoderAppsService.move(appId, x, y);
  }

  resizeLocalCoder(appId: LocalCoderAppId, width: number, height: number) {
    return this.runtime.localCoderAppsService.resize(appId, width, height);
  }

  runLocalCoder(appId: LocalCoderAppId, prompt: string, workingDirectory?: string, timeoutMs?: number) {
    return this.runtime.localCoderAppsService.run(appId, {
      prompt,
      workingDirectory,
      timeoutMs
    });
  }

  getOpenCliStatus() {
    return this.runtime.openCliService.getStatus();
  }

  getHfPapersStatus() {
    return this.runtime.hfPapersService.getStatus();
  }

  doctorHfPapers(backend?: 'api' | 'cli' | 'auto', timeoutMs?: number) {
    return this.runtime.hfPapersService.doctor({ backend, timeoutMs });
  }

  searchHfPapers(
    query: string,
    options?: { limit?: number; backend?: 'api' | 'cli' | 'auto'; token?: string; includeRaw?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.hfPapersService.search({
      query,
      limit: options?.limit,
      backend: options?.backend,
      token: options?.token,
      includeRaw: options?.includeRaw,
      timeoutMs: options?.timeoutMs
    });
  }

  getHfPaperInfo(
    paperId: string,
    options?: { backend?: 'api' | 'cli' | 'auto'; token?: string; includeRaw?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.hfPapersService.info({
      paperId,
      backend: options?.backend,
      token: options?.token,
      includeRaw: options?.includeRaw,
      timeoutMs: options?.timeoutMs
    });
  }

  readHfPaper(
    paperId: string,
    options?: { backend?: 'api' | 'cli' | 'auto'; token?: string; savePath?: string; timeoutMs?: number }
  ) {
    return this.runtime.hfPapersService.read({
      paperId,
      backend: options?.backend,
      token: options?.token,
      savePath: options?.savePath,
      timeoutMs: options?.timeoutMs
    });
  }

  listDailyHfPapers(
    options?: {
      date?: string;
      week?: string;
      month?: string;
      submitter?: string;
      sort?: 'publishedAt' | 'trending';
      limit?: number;
      backend?: 'api' | 'cli' | 'auto';
      token?: string;
      includeRaw?: boolean;
      timeoutMs?: number;
    }
  ) {
    return this.runtime.hfPapersService.listDaily(options);
  }

  async getBrowserExtensionStatus() {
    let status = this.runtime.browserExtensionService.getStatus();
    let serverHealth = await getServerHealth();
    if (!serverHealth?.ready) {
      try {
        serverHealth = await ensureServerRunning();
        status = this.runtime.browserExtensionService.getStatus();
      } catch {
        serverHealth = null;
      }
    }
    const notes = [...status.notes];
    if (!serverHealth?.ready) {
      notes.unshift(`Sidofun HTTP server is not reachable at http://127.0.0.1:9995/health`);
    } else if (!status.providerConnected && status.activeProviderBuildId) {
      notes.unshift(
        `Active provider build ${status.activeProviderBuildId} is persisted stale state because no live browser-extension provider is connected`
      );
    }
    return {
      ...status,
      serverBaseUrl: this.runtime.browserExtensionService.getServerBaseUrl(),
      serverReachable: Boolean(serverHealth?.ready),
      notes
    };
  }

  getBrowserExtensionCapabilities() {
    return this.runtime.browserExtensionService.getCapabilities();
  }

  listBrowserExtensionSites() {
    return this.runtime.browserExtensionService.listSites();
  }

  waitForBrowserExtensionProvider(timeoutMs?: number, intervalMs?: number) {
    return ensureServerRunning().then(() => (
      this.runtime.browserExtensionService.waitForProviderConnected({ timeoutMs, intervalMs })
    ));
  }

  listBrowserExtensionWorkspaces() {
    return this.runtime.browserExtensionService.listWorkspaces();
  }

  getBrowserExtensionWorkspace(name: string) {
    return this.runtime.browserExtensionService.getWorkspace(name);
  }

  setBrowserExtensionWorkspace(name: string, workspacePath: string, sites?: string[]) {
    return this.runtime.browserExtensionService.setWorkspace(name, workspacePath, sites);
  }

  clearBrowserExtensionWorkspace(name: string) {
    return this.runtime.browserExtensionService.clearWorkspace(name);
  }

  createBrowserExtensionSession(options?: {
    workspace?: string;
    site?: string;
    targetUrl?: string;
    name?: string;
    privateMode?: boolean;
  }) {
    return this.runtime.browserExtensionService.createSession(options);
  }

  listBrowserExtensionSessions() {
    return this.runtime.browserExtensionService.listSessions();
  }

  getBrowserExtensionSession(sessionId: string) {
    return this.runtime.browserExtensionService.getSession(sessionId);
  }

  refreshBrowserExtensionSession(sessionId: string) {
    return this.runtime.browserExtensionService.refreshSession(sessionId);
  }

  reconnectBrowserExtensionSession(sessionId: string, timeoutMs?: number, intervalMs?: number) {
    return this.runtime.browserExtensionService.reconnectSession(sessionId, { timeoutMs, intervalMs });
  }

  waitForBrowserExtensionSessionReady(sessionId: string, timeoutMs?: number, intervalMs?: number) {
    return this.runtime.browserExtensionService.waitForSessionReady(sessionId, { timeoutMs, intervalMs });
  }

  closeBrowserExtensionSession(sessionId: string) {
    return this.runtime.browserExtensionService.closeSession(sessionId);
  }

  nukeBrowserExtensionSessions(options?: {
    site?: string;
    staleOnly?: boolean;
    connectedOnly?: boolean;
    disconnectedOnly?: boolean;
    queue?: 'keep' | 'matching' | 'all';
  }) {
    return this.runtime.browserExtensionService.nukeSessions(options);
  }

  clearBrowserExtensionQueuedCommands(options?: {
    sessionId?: string;
    site?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  }) {
    return this.runtime.browserExtensionService.clearQueuedCommands(options);
  }

  listBrowserExtensionTabs(sessionId: string) {
    return this.runtime.browserExtensionService.listTabs(sessionId);
  }

  listBrowserExtensionFrames(sessionId: string, frameSelectors?: string[], timeoutMs?: number) {
    return this.runtime.browserExtensionService.listFrames(sessionId, frameSelectors, timeoutMs);
  }

  navigateBrowserExtensionSession(sessionId: string, targetUrl: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.navigate(sessionId, targetUrl, timeoutMs);
  }

  focusBrowserExtensionTab(sessionId: string, tabId: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.focusTab(sessionId, tabId, timeoutMs);
  }

  snapshotBrowserExtensionSession(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.snapshot(sessionId, timeoutMs);
  }

  domTreeBrowserExtensionSession(
    sessionId: string,
    selector?: string,
    frameSelectors?: string[],
    maxDepth?: number,
    maxChildren?: number,
    timeoutMs?: number
  ) {
    return this.runtime.browserExtensionService.pageDomTree(sessionId, {
      selector,
      frameSelectors,
      maxDepth,
      maxChildren,
      timeoutMs
    });
  }

  screenshotBrowserExtensionSession(
    sessionId: string,
    options?: { filename?: string; returnBase64?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.screenshot(sessionId, options);
  }

  inspectBrowserExtensionSession(sessionId: string, selector: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.inspect(sessionId, selector, timeoutMs);
  }

  inspectAllBrowserExtensionSession(sessionId: string, selector: string, limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.inspectAll(sessionId, selector, limit, timeoutMs);
  }

  browserExtensionLinks(sessionId: string, limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.links(sessionId, limit, timeoutMs);
  }

  browserExtensionMarkdown(sessionId: string, selector?: string, timeoutMs?: number, frameSelectors?: string[]) {
    return this.runtime.browserExtensionService.pageMarkdown(sessionId, { selector, timeoutMs, frameSelectors });
  }

  browserExtensionReadability(sessionId: string, selector?: string, timeoutMs?: number, frameSelectors?: string[]) {
    return this.runtime.browserExtensionService.pageReadability(sessionId, { selector, timeoutMs, frameSelectors });
  }

  listBrowserExtensionDialogs(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listDialogs(sessionId, frameSelectors, limit, timeoutMs);
  }

  listBrowserExtensionBanners(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listBanners(sessionId, frameSelectors, limit, timeoutMs);
  }

  dismissBrowserExtensionBanner(
    sessionId: string,
    query?: string,
    options?: { frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.dismissBanner(sessionId, query, options);
  }

  listBrowserExtensionLoadingStates(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listLoadingStates(sessionId, frameSelectors, limit, timeoutMs);
  }

  listBrowserExtensionEmptyStates(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listEmptyStates(sessionId, frameSelectors, limit, timeoutMs);
  }

  closeBrowserExtensionDialog(
    sessionId: string,
    query?: string,
    options?: { frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.closeDialog(sessionId, query, options);
  }

  listBrowserExtensionDialogActions(
    sessionId: string,
    query?: string,
    options?: { frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.listDialogActions(sessionId, query, options);
  }

  clickBrowserExtensionDialogAction(
    sessionId: string,
    actionQuery?: string,
    options?: { dialogQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.clickDialogAction(sessionId, actionQuery, options);
  }

  listBrowserExtensionMenus(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listMenus(sessionId, frameSelectors, limit, timeoutMs);
  }

  selectBrowserExtensionMenuOption(
    sessionId: string,
    optionQuery: string,
    options?: { menuQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.selectMenuOption(sessionId, optionQuery, options);
  }

  listBrowserExtensionDisclosures(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listDisclosures(sessionId, frameSelectors, limit, timeoutMs);
  }

  toggleBrowserExtensionDisclosure(
    sessionId: string,
    query: string,
    options?: {
      desiredState?: 'open' | 'closed' | 'toggle';
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.toggleDisclosure(sessionId, query, options);
  }

  listBrowserExtensionCollections(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listCollections(sessionId, frameSelectors, limit, timeoutMs);
  }

  listBrowserExtensionCollectionControls(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.listCollectionControls(sessionId, options);
  }

  listBrowserExtensionCollectionFilterTokens(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.listCollectionFilterTokens(sessionId, options);
  }

  listBrowserExtensionActiveCollectionFilters(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.listActiveCollectionFilters(sessionId, options);
  }

  async listBrowserExtensionCollectionSortState(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number }
  ) {
    const controls = await this.runtime.browserExtensionService.listCollectionControls(sessionId, options);
    const active = controls.controls.filter((entry) =>
      entry.controlType === 'sort' && (entry.active === true || typeof entry.sortDirection === 'string')
    );
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      count: active.length,
      controls: active
    };
  }

  listBrowserExtensionCollectionRows(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.listCollectionRows(sessionId, options);
  }

  listBrowserExtensionCollectionRowActions(
    sessionId: string,
    options: { rowQuery: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.listCollectionRowActions(sessionId, options);
  }

  clickBrowserExtensionCollectionItem(
    sessionId: string,
    itemQuery: string,
    options?: {
      collectionQuery?: string;
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.clickCollectionItem(sessionId, itemQuery, options);
  }

  clickBrowserExtensionCollectionRowAction(
    sessionId: string,
    options: { rowQuery: string; actionQuery?: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.clickCollectionRowAction(sessionId, options);
  }

  getBrowserExtensionCollectionSelectionState(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.getCollectionSelectionState(sessionId, options);
  }

  selectBrowserExtensionCollectionRow(
    sessionId: string,
    options: { rowQuery: string; desiredState?: 'on' | 'off' | 'toggle'; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.selectCollectionRow(sessionId, options);
  }

  selectAllBrowserExtensionCollectionRows(
    sessionId: string,
    options?: { desiredState?: 'on' | 'off' | 'toggle'; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.selectAllCollectionRows(sessionId, options);
  }

  getBrowserExtensionCollectionRowDetails(
    sessionId: string,
    options: { rowQuery: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.getCollectionRowDetails(sessionId, options);
  }

  expandBrowserExtensionCollectionRow(
    sessionId: string,
    options: { rowQuery: string; desiredState?: 'open' | 'closed' | 'toggle'; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.expandCollectionRow(sessionId, options);
  }

  sortBrowserExtensionCollection(
    sessionId: string,
    valueQuery: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.sortCollection(sessionId, valueQuery, options);
  }

  filterBrowserExtensionCollection(
    sessionId: string,
    query: string,
    value: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.filterCollection(sessionId, query, value, options);
  }

  clearBrowserExtensionCollectionFilter(
    sessionId: string,
    query: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.clearCollectionFilter(sessionId, query, options);
  }

  clearBrowserExtensionCollectionFilterToken(
    sessionId: string,
    query: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.clearCollectionFilterToken(sessionId, query, options);
  }

  async clearAllBrowserExtensionCollectionFilters(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number; continueOnError?: boolean }
  ) {
    const tokens = await this.listBrowserExtensionCollectionFilterTokens(sessionId, {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact,
      limit: 100,
      timeoutMs: options?.timeoutMs
    }).catch(() => ({ tokens: [] as Array<{ label?: string; value?: string; selector?: string }> }));
    const results: Array<Record<string, unknown>> = [];
    for (const token of tokens.tokens) {
      const tokenQuery = token.label ?? token.value ?? token.selector;
      if (!tokenQuery) {
        continue;
      }
      try {
        const cleared = await this.clearBrowserExtensionCollectionFilterToken(sessionId, tokenQuery, {
          collectionQuery: options?.collectionQuery,
          frameSelectors: options?.frameSelectors,
          exact: options?.exact,
          timeoutMs: options?.timeoutMs
        });
        results.push({ query: tokenQuery, source: 'token', result: cleared });
      } catch (error) {
        const failure = { query: tokenQuery, source: 'token', error: String(error) };
        results.push(failure);
        if (!options?.continueOnError) {
          throw new Error(`Failed clearing active filter token "${tokenQuery}": ${String(error)}`);
        }
      }
    }
    const active = await this.listBrowserExtensionActiveCollectionFilters(sessionId, {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact,
      limit: 100,
      timeoutMs: options?.timeoutMs
    });
    for (const control of active.controls) {
      try {
        const cleared = await this.clearBrowserExtensionCollectionFilter(sessionId, control.label ?? control.selector, {
          collectionQuery: options?.collectionQuery,
          frameSelectors: options?.frameSelectors,
          exact: options?.exact,
          timeoutMs: options?.timeoutMs
        });
        results.push({ query: control.label ?? control.selector, source: 'control', result: cleared });
      } catch (error) {
        const failure = { query: control.label ?? control.selector, source: 'control', error: String(error) };
        results.push(failure);
        if (!options?.continueOnError) {
          throw new Error(`Failed clearing active filter "${control.label ?? control.selector}": ${String(error)}`);
        }
      }
    }
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      attempted: tokens.tokens.length + active.controls.length,
      clearedCount: results.filter((entry) => !(entry.error)).length,
      results
    };
  }

  async waitForNoActiveBrowserExtensionCollectionFilters(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; limit?: number; timeoutMs?: number; intervalMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = options?.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastResult = await this.listBrowserExtensionActiveCollectionFilters(sessionId, {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact,
      limit: options?.limit ?? 50,
      timeoutMs: options?.timeoutMs
    }).catch(() => undefined);
    let lastTokens = await this.listBrowserExtensionCollectionFilterTokens(sessionId, {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact,
      limit: options?.limit ?? 50,
      timeoutMs: options?.timeoutMs
    }).catch(() => undefined);
    while (Date.now() - startedAt <= timeoutMs) {
      if ((lastResult?.count ?? 0) === 0 && (lastTokens?.count ?? 0) === 0) {
        return {
          ...(lastResult ?? {
            sessionId,
            collectionQuery: options?.collectionQuery,
            frameSelectors: options?.frameSelectors,
            exact: options?.exact ?? false,
            count: 0,
            controls: []
          }),
          tokenCount: lastTokens?.count ?? 0,
          tokens: lastTokens?.tokens ?? [],
          timedOut: false,
          waitedMs: Date.now() - startedAt
        };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      lastResult = await this.listBrowserExtensionActiveCollectionFilters(sessionId, {
        collectionQuery: options?.collectionQuery,
        frameSelectors: options?.frameSelectors,
        exact: options?.exact,
        limit: options?.limit ?? 50,
        timeoutMs: options?.timeoutMs
      }).catch(() => lastResult);
      lastTokens = await this.listBrowserExtensionCollectionFilterTokens(sessionId, {
        collectionQuery: options?.collectionQuery,
        frameSelectors: options?.frameSelectors,
        exact: options?.exact,
        limit: options?.limit ?? 50,
        timeoutMs: options?.timeoutMs
      }).catch(() => lastTokens);
    }
    return {
      ...(lastResult ?? {
        sessionId,
        collectionQuery: options?.collectionQuery,
        frameSelectors: options?.frameSelectors,
        exact: options?.exact ?? false,
        count: 0,
        controls: []
      }),
      tokenCount: lastTokens?.count ?? 0,
      tokens: lastTokens?.tokens ?? [],
      timedOut: true,
      waitedMs: Date.now() - startedAt
    };
  }

  listBrowserExtensionPaginations(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listPaginations(sessionId, frameSelectors, limit, timeoutMs);
  }

  clickBrowserExtensionPagination(
    sessionId: string,
    query: string,
    options?: { frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.clickPagination(sessionId, query, options);
  }

  clickBrowserExtensionLoadMore(
    sessionId: string,
    options?: { query?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.clickLoadMore(sessionId, options);
  }

  scrollBrowserExtensionPage(
    sessionId: string,
    options?: { direction?: 'down' | 'up'; amount?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.scrollPage(sessionId, options);
  }

  async harvestBrowserExtensionCollection(
    sessionId: string,
    options?: {
      collectionQuery?: string;
      strategy?: 'auto' | 'load_more' | 'scroll';
      frameSelectors?: string[];
      exact?: boolean;
      limit?: number;
      maxIterations?: number;
      stableIterations?: number;
      settleQuietMs?: number;
      dedupeBy?: 'auto' | 'selector' | 'text' | 'cells';
      scrollAmount?: number;
      timeoutMs?: number;
    }
  ) {
    await this.ensureBrowserExtensionSessionUsable(sessionId, options?.timeoutMs);
    const maxIterations = Math.max(1, options?.maxIterations ?? 6);
    const stableIterationsTarget = Math.max(1, options?.stableIterations ?? 2);
    const dedupeBy = options?.dedupeBy ?? 'auto';
    const scrollAmount = Math.min(1, Math.max(0.1, options?.scrollAmount ?? 0.9));
    const uniqueRows = new Map<string, Record<string, unknown>>();
    const iterations: Array<Record<string, unknown>> = [];
    let stableIterations = 0;

    for (let attempt = 0; attempt < maxIterations; attempt += 1) {
      const rowsResult = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
        collectionQuery: options?.collectionQuery,
        frameSelectors: options?.frameSelectors,
        limit: options?.limit ?? 100,
        exact: options?.exact,
        timeoutMs: options?.timeoutMs
      }));
      const beforeCount = uniqueRows.size;
      for (const row of rowsResult.rows) {
        const key = this.buildBrowserExtensionCollectionRowKey(row, dedupeBy);
        if (!uniqueRows.has(key)) {
          uniqueRows.set(key, row as unknown as Record<string, unknown>);
        }
      }
      const addedRows = uniqueRows.size - beforeCount;
      if (addedRows === 0) {
        stableIterations += 1;
      } else {
        stableIterations = 0;
      }
      const paginations = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listPaginations(
        sessionId,
        options?.frameSelectors,
        20,
        options?.timeoutMs
      )).catch(() => ({ paginations: [] as Array<{ options: Array<{ kind?: string; disabled?: boolean; label?: string }> }> }));
      const loadMoreOption = paginations.paginations?.flatMap((entry) => entry.options.map((option) => ({ entry, option }))).find((entry) => entry.option.kind === 'load_more' && entry.option.disabled !== true);
      const canLoadMore = Boolean(loadMoreOption);
      const strategy = options?.strategy ?? 'auto';
      let action: Record<string, unknown> | undefined;
      if (stableIterations < stableIterationsTarget && (strategy === 'load_more' || (strategy === 'auto' && canLoadMore))) {
        action = await this.clickBrowserExtensionLoadMore(sessionId, {
          query: loadMoreOption?.option.label,
          frameSelectors: options?.frameSelectors,
          timeoutMs: options?.timeoutMs
        }).catch((error) => ({ error: String(error) }));
      } else if (stableIterations < stableIterationsTarget) {
        action = await this.scrollBrowserExtensionPage(sessionId, {
          direction: 'down',
          amount: scrollAmount,
          timeoutMs: options?.timeoutMs
        }).catch((error) => ({ error: String(error) }));
      }
      if (action && !('error' in action)) {
        await this.waitForPageStableBrowserExtensionSession(sessionId, options?.settleQuietMs ?? 1200, options?.timeoutMs, 2).catch(() => undefined);
      }
      iterations.push({
        attempt: attempt + 1,
        rowsSeen: rowsResult.rows.length,
        uniqueRows: uniqueRows.size,
        addedRows,
        stableIterations,
        strategy,
        dedupeBy,
        scrollAmount,
        action
      });
      if (stableIterations >= stableIterationsTarget) {
        return {
          sessionId,
          collectionQuery: options?.collectionQuery,
          strategy,
          dedupeBy,
          scrollAmount,
          frameSelectors: options?.frameSelectors,
          exact: options?.exact ?? false,
          iterations,
          count: uniqueRows.size,
          rows: [...uniqueRows.values()]
        };
      }
    }

    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      strategy: options?.strategy ?? 'auto',
      dedupeBy,
      scrollAmount,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      iterations,
      count: uniqueRows.size,
      rows: [...uniqueRows.values()]
    };
  }

  locateBrowserExtensionPage(
    sessionId: string,
    query: string,
    by?: 'text' | 'selector' | 'role' | 'id' | 'name' | 'placeholder' | 'tag',
    selector?: string,
    frameSelectors?: string[],
    maxDepth?: number,
    maxChildren?: number,
    limit?: number,
    timeoutMs?: number
  ) {
    return this.runtime.browserExtensionService.locateInPage(sessionId, query, {
      by,
      selector,
      frameSelectors,
      maxDepth,
      maxChildren,
      limit,
      timeoutMs
    });
  }

  listBrowserExtensionActionables(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.listActionables(sessionId, options);
  }

  readBrowserExtensionPageState(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      limit?: number;
      maxDepth?: number;
      maxChildren?: number;
      timeoutMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.pageState(sessionId, options);
  }

  async readBrowserExtensionPageBlockers(
    sessionId: string,
    options?: {
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    await this.ensureBrowserExtensionSessionUsable(sessionId, options?.timeoutMs);
    const limit = Math.max(1, options?.limit ?? 20);
    const [dialogs, loadingStates, banners, emptyStates] = await Promise.all([
      this.listBrowserExtensionDialogs(sessionId, options?.frameSelectors, limit, options?.timeoutMs).catch(() => ({ dialogs: [] as unknown[] })),
      this.listBrowserExtensionLoadingStates(sessionId, options?.frameSelectors, limit, options?.timeoutMs).catch(() => ({ loadingStates: [] as unknown[] })),
      this.listBrowserExtensionBanners(sessionId, options?.frameSelectors, limit, options?.timeoutMs).catch(() => ({ banners: [] as unknown[] })),
      this.listBrowserExtensionEmptyStates(sessionId, options?.frameSelectors, limit, options?.timeoutMs).catch(() => ({ emptyStates: [] as unknown[] }))
    ]);
    const blockingDialogs = (dialogs.dialogs ?? []).filter((entry: any) => entry.open !== false && entry.modal !== false);
    const blockingLoadingStates = (loadingStates.loadingStates ?? []).filter((entry: any) => entry.blocking !== false);
    return {
      sessionId,
      frameSelectors: options?.frameSelectors,
      limit,
      count: blockingDialogs.length + blockingLoadingStates.length + (banners.banners?.length ?? 0) + (emptyStates.emptyStates?.length ?? 0),
      blockingCount: blockingDialogs.length + blockingLoadingStates.length,
      statusCount: (banners.banners?.length ?? 0) + (emptyStates.emptyStates?.length ?? 0),
      hasBlockers: blockingDialogs.length > 0 || blockingLoadingStates.length > 0,
      dialogs: dialogs.dialogs ?? [],
      blockingDialogs,
      loadingStates: loadingStates.loadingStates ?? [],
      blockingLoadingStates,
      banners: banners.banners ?? [],
      emptyStates: emptyStates.emptyStates ?? []
    };
  }

  listBrowserExtensionNextActions(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      limit?: number;
      maxDepth?: number;
      maxChildren?: number;
      timeoutMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.suggestNextActions(sessionId, options);
  }

  async waitForBrowserExtensionNoBlockers(
    sessionId: string,
    options?: {
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = options?.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastResult = await this.readBrowserExtensionPageBlockers(sessionId, options).catch(() => undefined);
    while (Date.now() - startedAt <= timeoutMs) {
      if (lastResult && lastResult.hasBlockers === false) {
        return {
          ...lastResult,
          timedOut: false,
          waitedMs: Date.now() - startedAt
        };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      lastResult = await this.readBrowserExtensionPageBlockers(sessionId, options).catch(() => lastResult);
    }
    return {
      ...(lastResult ?? {
        sessionId,
        frameSelectors: options?.frameSelectors,
        limit: Math.max(1, options?.limit ?? 20),
        count: 0,
        blockingCount: 0,
        statusCount: 0,
        hasBlockers: false,
        dialogs: [],
        blockingDialogs: [],
        loadingStates: [],
        blockingLoadingStates: [],
        banners: [],
        emptyStates: []
      }),
      timedOut: true,
      waitedMs: Date.now() - startedAt
    };
  }

  async readBrowserExtensionPageOutcomes(
    sessionId: string,
    options?: { frameSelectors?: string[]; collectionQuery?: string; limit?: number; timeoutMs?: number }
  ) {
    const [banners, loadingStates, emptyStates, blockers, filters, tokens] = await Promise.all([
      this.listBrowserExtensionBanners(sessionId, options?.frameSelectors, options?.limit ?? 20, options?.timeoutMs).catch(() => ({ count: 0, banners: [] as Array<Record<string, unknown>> })),
      this.listBrowserExtensionLoadingStates(sessionId, options?.frameSelectors, options?.limit ?? 20, options?.timeoutMs).catch(() => ({ count: 0, loadingStates: [] as Array<Record<string, unknown>> })),
      this.listBrowserExtensionEmptyStates(sessionId, options?.frameSelectors, options?.limit ?? 20, options?.timeoutMs).catch(() => ({ count: 0, emptyStates: [] as Array<Record<string, unknown>> })),
      this.readBrowserExtensionPageBlockers(sessionId, { frameSelectors: options?.frameSelectors, limit: options?.limit, timeoutMs: options?.timeoutMs }).catch(() => undefined),
      this.listBrowserExtensionActiveCollectionFilters(sessionId, { collectionQuery: options?.collectionQuery, frameSelectors: options?.frameSelectors, limit: options?.limit ?? 20, timeoutMs: options?.timeoutMs }).catch(() => ({ count: 0, controls: [] as Array<Record<string, unknown>> })),
      this.listBrowserExtensionCollectionFilterTokens(sessionId, { collectionQuery: options?.collectionQuery, frameSelectors: options?.frameSelectors, limit: options?.limit ?? 20, timeoutMs: options?.timeoutMs }).catch(() => ({ count: 0, tokens: [] as Array<Record<string, unknown>> }))
    ]);
    const hasBlockingLoading = (loadingStates.loadingStates ?? []).some((entry) => entry.blocking === true);
    const errorBanner = (banners.banners ?? []).find((entry) => entry.variant === 'error');
    const warningBanner = (banners.banners ?? []).find((entry) => entry.variant === 'warning');
    const successBanner = (banners.banners ?? []).find((entry) => entry.variant === 'success');
    const hasEmpty = (emptyStates.emptyStates?.length ?? 0) > 0;
    const status: 'loading' | 'blocked' | 'error' | 'warning' | 'success' | 'empty' | 'ready' =
      hasBlockingLoading ? 'loading'
      : blockers?.hasBlockers === true ? 'blocked'
      : errorBanner ? 'error'
      : warningBanner ? 'warning'
      : successBanner ? 'success'
      : hasEmpty ? 'empty'
      : 'ready';
    return {
      sessionId,
      frameSelectors: options?.frameSelectors,
      collectionQuery: options?.collectionQuery,
      status,
      banners,
      loadingStates,
      emptyStates,
      blockers,
      activeCollectionFilters: filters,
      collectionFilterTokens: tokens
    };
  }

  async waitForBrowserExtensionPageOutcome(
    sessionId: string,
    options: {
      status: 'loading' | 'blocked' | 'error' | 'warning' | 'success' | 'empty' | 'ready';
      frameSelectors?: string[];
      collectionQuery?: string;
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const intervalMs = options.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastResult = await this.readBrowserExtensionPageOutcomes(sessionId, options).catch(() => undefined);
    while (Date.now() - startedAt <= timeoutMs) {
      if (lastResult?.status === options.status) {
        return {
          ...lastResult,
          timedOut: false,
          waitedMs: Date.now() - startedAt
        };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      lastResult = await this.readBrowserExtensionPageOutcomes(sessionId, options).catch(() => lastResult);
    }
    return {
      ...(lastResult ?? { sessionId, status: 'ready' as const }),
      timedOut: true,
      waitedMs: Date.now() - startedAt
    };
  }

  async waitForBrowserExtensionBanner(
    sessionId: string,
    options: {
      text: string;
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const intervalMs = options.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastResult = await this.listBrowserExtensionBanners(
      sessionId,
      options.frameSelectors,
      options.limit ?? 20,
      timeoutMs
    ).catch(() => undefined);
    while (Date.now() - startedAt <= timeoutMs) {
      const matched = lastResult?.banners?.find((entry) =>
        this.matchesBrowserextQuery(entry.text, options.text, false)
        || this.matchesBrowserextQuery(entry.label, options.text, false)
        || this.matchesBrowserextQuery(entry.selector, options.text, false)
      );
      if (matched) {
        return {
          ...(lastResult ?? { sessionId, count: 0, banners: [] }),
          query: options.text,
          matched,
          timedOut: false,
          waitedMs: Date.now() - startedAt
        };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      lastResult = await this.listBrowserExtensionBanners(
        sessionId,
        options.frameSelectors,
        options.limit ?? 20,
        timeoutMs
      ).catch(() => lastResult);
    }
    return {
      ...(lastResult ?? { sessionId, count: 0, banners: [] }),
      query: options.text,
      matched: undefined,
      timedOut: true,
      waitedMs: Date.now() - startedAt
    };
  }

  async waitForNoBrowserExtensionBanner(
    sessionId: string,
    options?: {
      text?: string;
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = options?.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastResult = await this.listBrowserExtensionBanners(
      sessionId,
      options?.frameSelectors,
      options?.limit ?? 20,
      timeoutMs
    ).catch(() => undefined);
    while (Date.now() - startedAt <= timeoutMs) {
      const matched = lastResult?.banners?.filter((entry) =>
        !options?.text
        || this.matchesBrowserextQuery(entry.text, options.text, false)
        || this.matchesBrowserextQuery(entry.label, options.text, false)
        || this.matchesBrowserextQuery(entry.selector, options.text, false)
      ) ?? [];
      if (matched.length === 0) {
        return {
          ...(lastResult ?? { sessionId, count: 0, banners: [] }),
          query: options?.text,
          timedOut: false,
          waitedMs: Date.now() - startedAt
        };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      lastResult = await this.listBrowserExtensionBanners(
        sessionId,
        options?.frameSelectors,
        options?.limit ?? 20,
        timeoutMs
      ).catch(() => lastResult);
    }
    return {
      ...(lastResult ?? { sessionId, count: 0, banners: [] }),
      query: options?.text,
      timedOut: true,
      waitedMs: Date.now() - startedAt
    };
  }

  async waitForBrowserExtensionDialog(
    sessionId: string,
    options?: {
      query?: string;
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = options?.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastDialogs: unknown[] | undefined;
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(
        sessionId,
        options?.frameSelectors,
        options?.limit ?? 20,
        timeoutMs
      )).catch(() => undefined);
      if (result) {
        lastDialogs = result.dialogs;
        const matched = result.dialogs.filter((entry) =>
          !options?.query
          || this.matchesBrowserextQuery(entry.label, options.query, false)
          || this.matchesBrowserextQuery(entry.selector, options.query, false)
          || (entry.actions ?? []).some((action) =>
            this.matchesBrowserextQuery(action.label, options.query!, false)
            || this.matchesBrowserextQuery(action.selector, options.query!, false))
        );
        if (matched.length > 0) {
          return {
            sessionId,
            query: options?.query,
            frameSelectors: options?.frameSelectors,
            timedOut: false,
            waitedMs: Date.now() - startedAt,
            count: matched.length,
            dialogs: matched
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      query: options?.query,
      frameSelectors: options?.frameSelectors,
      timedOut: true,
      waitedMs: Date.now() - startedAt,
      count: 0,
      dialogs: lastDialogs ?? []
    };
  }

  async waitForNoBrowserExtensionDialog(
    sessionId: string,
    options?: {
      query?: string;
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = options?.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastDialogs: unknown[] | undefined;
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(
        sessionId,
        options?.frameSelectors,
        options?.limit ?? 20,
        timeoutMs
      )).catch(() => undefined);
      if (result) {
        lastDialogs = result.dialogs;
        const matched = result.dialogs.filter((entry) =>
          !options?.query
          || this.matchesBrowserextQuery(entry.label, options.query, false)
          || this.matchesBrowserextQuery(entry.selector, options.query, false)
          || (entry.actions ?? []).some((action) =>
            this.matchesBrowserextQuery(action.label, options.query!, false)
            || this.matchesBrowserextQuery(action.selector, options.query!, false))
        );
        if (matched.length === 0) {
          return {
            sessionId,
            query: options?.query,
            frameSelectors: options?.frameSelectors,
            timedOut: false,
            waitedMs: Date.now() - startedAt,
            count: 0,
            dialogs: []
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      query: options?.query,
      frameSelectors: options?.frameSelectors,
      timedOut: true,
      waitedMs: Date.now() - startedAt,
      count: Array.isArray(lastDialogs) ? lastDialogs.length : 0,
      dialogs: lastDialogs ?? []
    };
  }

  async waitForBrowserExtensionMenu(
    sessionId: string,
    options?: {
      query?: string;
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = options?.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastMenus: unknown[] | undefined;
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(
        sessionId,
        options?.frameSelectors,
        options?.limit ?? 20,
        timeoutMs
      )).catch(() => undefined);
      if (result) {
        lastMenus = result.menus;
        const matched = result.menus.filter((entry) =>
          !options?.query
          || this.matchesBrowserextQuery(entry.label, options.query, false)
          || this.matchesBrowserextQuery(entry.selector, options.query, false)
          || entry.options.some((option) =>
            this.matchesBrowserextQuery(option.label, options.query!, false)
            || this.matchesBrowserextQuery(option.value, options.query!, false))
        );
        if (matched.length > 0) {
          return {
            sessionId,
            query: options?.query,
            frameSelectors: options?.frameSelectors,
            timedOut: false,
            waitedMs: Date.now() - startedAt,
            count: matched.length,
            menus: matched
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      query: options?.query,
      frameSelectors: options?.frameSelectors,
      timedOut: true,
      waitedMs: Date.now() - startedAt,
      count: 0,
      menus: lastMenus ?? []
    };
  }

  async waitForNoBrowserExtensionMenu(
    sessionId: string,
    options?: {
      query?: string;
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = options?.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastMenus: unknown[] | undefined;
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(
        sessionId,
        options?.frameSelectors,
        options?.limit ?? 20,
        timeoutMs
      )).catch(() => undefined);
      if (result) {
        lastMenus = result.menus;
        const matched = result.menus.filter((entry) =>
          !options?.query
          || this.matchesBrowserextQuery(entry.label, options.query, false)
          || this.matchesBrowserextQuery(entry.selector, options.query, false)
          || entry.options.some((option) =>
            this.matchesBrowserextQuery(option.label, options.query!, false)
            || this.matchesBrowserextQuery(option.value, options.query!, false))
        );
        if (matched.length === 0) {
          return {
            sessionId,
            query: options?.query,
            frameSelectors: options?.frameSelectors,
            timedOut: false,
            waitedMs: Date.now() - startedAt,
            count: 0,
            menus: []
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      query: options?.query,
      frameSelectors: options?.frameSelectors,
      timedOut: true,
      waitedMs: Date.now() - startedAt,
      count: Array.isArray(lastMenus) ? lastMenus.length : 0,
      menus: lastMenus ?? []
    };
  }

  async waitForBrowserExtensionDisclosureState(
    sessionId: string,
    options: {
      query: string;
      expanded?: boolean;
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const intervalMs = options.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastDisclosure: unknown;
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDisclosures(
        sessionId,
        options.frameSelectors,
        options.limit ?? 50,
        timeoutMs
      )).catch(() => undefined);
      if (result) {
        const matched = result.disclosures.find((entry) =>
          this.matchesBrowserextQuery(entry.label, options.query, false)
          || this.matchesBrowserextQuery(entry.selector, options.query, false)
        );
        lastDisclosure = matched;
        if (matched && (options.expanded === undefined || Boolean(matched.expanded) === options.expanded)) {
          return {
            sessionId,
            query: options.query,
            frameSelectors: options.frameSelectors,
            desiredState: options.expanded === undefined ? undefined : (options.expanded ? 'open' : 'closed'),
            timedOut: false,
            waitedMs: Date.now() - startedAt,
            disclosure: matched
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      query: options.query,
      frameSelectors: options.frameSelectors,
      desiredState: options.expanded === undefined ? undefined : (options.expanded ? 'open' : 'closed'),
      timedOut: true,
      waitedMs: Date.now() - startedAt,
      disclosure: lastDisclosure
    };
  }

  async recoverBrowserExtensionPage(
    sessionId: string,
    options?: {
      frameSelectors?: string[];
      collectionQuery?: string;
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
      continueOnError?: boolean;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const limit = Math.max(1, options?.limit ?? 20);
    const dialogResults: Array<Record<string, unknown>> = [];
    const bannerResults: Array<Record<string, unknown>> = [];
    let blockersBefore = await this.readBrowserExtensionPageBlockers(sessionId, {
      frameSelectors: options?.frameSelectors,
      limit,
      timeoutMs
    }).catch(() => undefined);

    for (let attempt = 0; attempt < limit; attempt += 1) {
      const dialogs = await this.runtime.browserExtensionService.listDialogs(sessionId, options?.frameSelectors, limit, timeoutMs).catch(() => ({ dialogs: [] as Array<{ label?: string; selector?: string }> }));
      const dialog = dialogs.dialogs?.[0];
      if (!dialog) {
        break;
      }
      try {
        const closed = await this.closeBrowserExtensionDialog(sessionId, dialog.label ?? dialog.selector, {
          frameSelectors: options?.frameSelectors,
          exact: false,
          timeoutMs
        });
        dialogResults.push(closed as Record<string, unknown>);
      } catch (error) {
        const failure = { query: dialog.label ?? dialog.selector, error: String(error) };
        dialogResults.push(failure);
        if (!options?.continueOnError) {
          throw new Error(`Failed dismissing dialog "${dialog.label ?? dialog.selector}": ${String(error)}`);
        }
      }
    }

    for (let attempt = 0; attempt < limit; attempt += 1) {
      const banners = await this.listBrowserExtensionBanners(sessionId, options?.frameSelectors, limit, timeoutMs).catch(() => ({ banners: [] as Array<{ text?: string; label?: string; selector?: string; dismissSelectors?: string[] }> }));
      const dismissable = banners.banners.find((entry) => (entry.dismissSelectors?.length ?? 0) > 0);
      if (!dismissable) {
        break;
      }
      const query = dismissable.text ?? dismissable.label ?? dismissable.selector;
      try {
        const dismissed = await this.dismissBrowserExtensionBanner(sessionId, query, {
          frameSelectors: options?.frameSelectors,
          exact: false,
          timeoutMs
        });
        bannerResults.push(dismissed as Record<string, unknown>);
      } catch (error) {
        const failure = { query, error: String(error) };
        bannerResults.push(failure);
        if (!options?.continueOnError) {
          throw new Error(`Failed dismissing banner "${query}": ${String(error)}`);
        }
      }
    }

    const clearedFilters = await this.clearAllBrowserExtensionCollectionFilters(sessionId, {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact,
      timeoutMs,
      continueOnError: options?.continueOnError ?? true
    }).catch((error) => ({ error: String(error) }));

    const blockersAfter = await this.readBrowserExtensionPageBlockers(sessionId, {
      frameSelectors: options?.frameSelectors,
      limit,
      timeoutMs
    }).catch(() => blockersBefore);

    const noBanners = await this.waitForNoBrowserExtensionBanner(sessionId, {
      frameSelectors: options?.frameSelectors,
      limit,
      timeoutMs,
      intervalMs: options?.intervalMs
    }).catch(() => undefined);
    const noFilters = await this.waitForNoActiveBrowserExtensionCollectionFilters(sessionId, {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact,
      limit,
      timeoutMs,
      intervalMs: options?.intervalMs
    }).catch(() => undefined);

    return {
      sessionId,
      frameSelectors: options?.frameSelectors,
      collectionQuery: options?.collectionQuery,
      exact: options?.exact ?? false,
      blockersBefore,
      dialogResults,
      bannerResults,
      clearedFilters,
      blockersAfter,
      bannersCleared: bannerResults.filter((entry) => !entry.error).length,
      dialogsClosed: dialogResults.filter((entry) => !entry.error).length,
      noBanners,
      noFilters
    };
  }

  async ensureBrowserExtensionPageReady(
    sessionId: string,
    options?: {
      frameSelectors?: string[];
      collectionQuery?: string;
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
      continueOnError?: boolean;
    }
  ) {
    const recovery = await this.recoverBrowserExtensionPage(sessionId, options);
    const noBlockers = await this.waitForBrowserExtensionNoBlockers(sessionId, {
      frameSelectors: options?.frameSelectors,
      limit: options?.limit,
      timeoutMs: options?.timeoutMs,
      intervalMs: options?.intervalMs
    }).catch(() => undefined);
    const noFilters = await this.waitForNoActiveBrowserExtensionCollectionFilters(sessionId, {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact,
      limit: options?.limit,
      timeoutMs: options?.timeoutMs,
      intervalMs: options?.intervalMs
    }).catch(() => undefined);
    const outcomes = await this.readBrowserExtensionPageOutcomes(sessionId, {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      limit: options?.limit,
      timeoutMs: options?.timeoutMs
    }).catch(() => undefined);
    return {
      sessionId,
      frameSelectors: options?.frameSelectors,
      collectionQuery: options?.collectionQuery,
      exact: options?.exact ?? false,
      ready: (noBlockers?.hasBlockers ?? false) === false
        && ((noFilters?.count ?? 0) === 0)
        && ((noFilters as { tokenCount?: number } | undefined)?.tokenCount ?? 0) === 0
        && ['ready', 'success', 'empty', 'warning'].includes(outcomes?.status ?? 'ready'),
      recovery,
      noBlockers,
      noFilters,
      outcomes
    };
  }

  private normalizeBrowserextQuery(value?: string) {
    return value?.trim().toLowerCase() ?? '';
  }

  private matchesBrowserextQuery(value: string | undefined, query: string, exact = false) {
    const normalizedValue = this.normalizeBrowserextQuery(value);
    const normalizedQuery = this.normalizeBrowserextQuery(query);
    return exact ? normalizedValue === normalizedQuery : normalizedValue.includes(normalizedQuery);
  }

  private scoreBrowserextMatch(value: string | undefined, query: string, exact = false) {
    const normalizedValue = this.normalizeBrowserextQuery(value);
    const normalizedQuery = this.normalizeBrowserextQuery(query);
    if (!normalizedValue || !normalizedQuery) {
      return undefined;
    }
    if (exact) {
      return normalizedValue === normalizedQuery ? 20_000 - Math.abs(normalizedValue.length - normalizedQuery.length) : undefined;
    }
    if (!normalizedValue.includes(normalizedQuery)) {
      return undefined;
    }
    const exactBoost = normalizedValue === normalizedQuery ? 10_000 : 0;
    const startsBoost = normalizedValue.startsWith(normalizedQuery) ? 3_000 : 0;
    const wordBoost = normalizedValue.split(/\W+/).includes(normalizedQuery) ? 1_500 : 0;
    return exactBoost + startsBoost + wordBoost + 1_000 - Math.abs(normalizedValue.length - normalizedQuery.length);
  }

  private buildBrowserExtensionCollectionRowKey(
    row: {
      selector?: string;
      label?: string;
      text?: string;
      href?: string;
      cells?: Array<{ key?: string; value: string }>;
      actions?: Array<{ selector: string; label?: string; actionableType?: string }>;
    },
    dedupeBy: 'auto' | 'selector' | 'text' | 'cells' = 'auto'
  ) {
    const cellSignature = JSON.stringify((row.cells ?? []).map((cell) => ({
      key: cell.key ?? '',
      value: cell.value
    })));
    const actionSignature = JSON.stringify((row.actions ?? []).map((action) => ({
      selector: action.selector,
      label: action.label ?? '',
      type: action.actionableType ?? ''
    })));
    const textSignature = [row.label, row.text, row.href].filter(Boolean).join('::');
    if (dedupeBy === 'selector') {
      return row.selector || textSignature || cellSignature || actionSignature;
    }
    if (dedupeBy === 'text') {
      return textSignature || cellSignature || row.selector || actionSignature;
    }
    if (dedupeBy === 'cells') {
      return cellSignature || textSignature || row.selector || actionSignature;
    }
    return cellSignature || textSignature || actionSignature || row.selector || JSON.stringify(row);
  }

  private describeBrowserExtensionCollectionRow(
    row?: {
      selector?: string;
      label?: string;
      text?: string;
      href?: string;
      cells?: Array<{ key?: string; value: string }>;
      actions?: Array<{ selector?: string; label?: string; actionableType?: string }>;
      detailText?: string;
    }
  ) {
    if (!row) {
      return '';
    }
    return [
      row.label,
      row.text,
      row.href,
      row.selector,
      row.detailText,
      ...(row.cells ?? []).flatMap((cell) => [cell.key, cell.value, `${cell.key ?? ''} ${cell.value}`.trim()]),
      ...(row.actions ?? []).flatMap((action) => [action.label, action.actionableType, action.selector])
    ].filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
  }

  private renderBrowserExtensionCollectionExportMarkdown(payload: {
    collection?: { label?: string; selector?: string; collectionType?: string; itemCount?: number; selectedCount?: number; expandedCount?: number; detailCount?: number };
    rows: Array<{
      rowIndex?: number;
      label?: string;
      text?: string;
      href?: string;
      selected?: boolean;
      expanded?: boolean;
      detailText?: string;
      cells?: Array<{ key?: string; value: string }>;
      actions?: Array<{ label?: string; actionableType?: string; selector: string }>;
    }>;
  }) {
    const lines: string[] = [];
    const title = payload.collection?.label ?? payload.collection?.selector ?? 'Collection export';
    lines.push(`# ${title}`);
    lines.push('');
    lines.push(`- Type: ${payload.collection?.collectionType ?? 'unknown'}`);
    lines.push(`- Rows: ${payload.collection?.itemCount ?? payload.rows.length}`);
    lines.push(`- Selected: ${payload.collection?.selectedCount ?? payload.rows.filter((row) => row.selected).length}`);
    lines.push(`- Expanded: ${payload.collection?.expandedCount ?? payload.rows.filter((row) => row.expanded).length}`);
    lines.push('');
    for (const row of payload.rows) {
      const heading = row.label ?? row.text ?? row.href ?? row.rowIndex?.toString() ?? 'row';
      lines.push(`## ${heading}`);
      lines.push('');
      lines.push(`- Row index: ${row.rowIndex ?? 'n/a'}`);
      lines.push(`- Selected: ${row.selected === true ? 'yes' : 'no'}`);
      lines.push(`- Expanded: ${row.expanded === true ? 'yes' : 'no'}`);
      if (row.href) lines.push(`- Link: ${row.href}`);
      if (row.text) lines.push(`- Text: ${row.text}`);
      if (row.cells && row.cells.length > 0) {
        lines.push(`- Cells: ${row.cells.map((cell) => `${cell.key ?? 'value'}=${cell.value}`).join(' | ')}`);
      }
      if (row.actions && row.actions.length > 0) {
        lines.push(`- Actions: ${row.actions.map((action) => action.label ?? action.actionableType ?? action.selector).join(' | ')}`);
      }
      if (row.detailText) {
        lines.push('');
        lines.push('```text');
        lines.push(row.detailText);
        lines.push('```');
      }
      lines.push('');
    }
    return lines.join('\n').trimEnd();
  }

  private matchBrowserExtensionCollectionRow(
    rows: Array<{
      selector?: string;
      label?: string;
      text?: string;
      href?: string;
      cells?: Array<{ key?: string; value: string }>;
    }>,
    rowQuery: string,
    exact = false
  ) {
    return rows.find((row) =>
      [
        row.label,
        row.text,
        row.href,
        row.selector,
        ...(row.cells ?? []).flatMap((cell) => [cell.key, cell.value, `${cell.key ?? ''} ${cell.value}`.trim()])
      ].some((value) => this.matchesBrowserextQuery(value, rowQuery, exact))
    );
  }

  private matchBrowserExtensionCollectionCell(
    row: { cells?: Array<{ key?: string; value: string }> },
    cellQuery: string,
    exact = false
  ) {
    return row.cells?.find((cell) =>
      this.matchesBrowserextQuery(cell.key, cellQuery, exact)
      || this.matchesBrowserextQuery(cell.value, cellQuery, exact)
      || this.matchesBrowserextQuery(`${cell.key ?? ''} ${cell.value}`.trim(), cellQuery, exact)
    );
  }

  private buildBrowserExtensionContextCandidates(
    contexts: Awaited<ReturnType<typeof this.runtime.browserExtensionService.listFormContexts>>,
    frames: Awaited<ReturnType<typeof this.runtime.browserExtensionService.listFrames>>,
    options?: {
      formSelector?: string;
      contextIndex?: number;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
    }
  ): BrowserExtensionResolvedContextCandidate[] {
    const frameBySelector = new Map<string, Array<Record<string, unknown>>>();
    for (const frame of frames.frames ?? []) {
      for (const selector of frame.path ?? []) {
        const list = frameBySelector.get(selector) ?? [];
        list.push(frame as unknown as Record<string, unknown>);
        frameBySelector.set(selector, list);
      }
    }

    return contexts.contexts.map((context, index) => {
      let score = 0;
      const reasons: string[] = [];
      const matchedValues: string[] = [];
      const frameMatchedValues: string[] = [];

      if (options?.formSelector && context.formSelector === options.formSelector) {
        score += 100_000;
        reasons.push(`form selector matched ${options.formSelector}`);
      }
      if (Number.isInteger(options?.contextIndex) && index === options!.contextIndex) {
        score += 95_000;
        reasons.push(`context index matched ${index}`);
      }

      const haystack = [
        context.formSelector,
        context.formAction,
        context.formMethod,
        ...context.submitSelectors,
        ...context.fields.flatMap((field) => [
          field.selector,
          field.name,
          field.type,
          field.placeholder,
          ...(field.labels ?? [])
        ])
      ];
      if (options?.contextQuery) {
        const contextTokens = this.normalizeBrowserextQuery(options.contextQuery).split(/\W+/).filter(Boolean);
        let tokenHits = 0;
        for (const value of haystack) {
          const matchScore = this.scoreBrowserextMatch(value, options.contextQuery, options.exact === true);
          if (matchScore !== undefined) {
            score += matchScore;
            matchedValues.push(String(value));
          }
          const normalizedValue = this.normalizeBrowserextQuery(value);
          if (!normalizedValue) {
            continue;
          }
          for (const token of contextTokens) {
            if (normalizedValue.includes(token)) {
              score += 400;
              tokenHits += 1;
              matchedValues.push(String(value));
            }
          }
        }
        if (matchedValues.length > 0) {
          reasons.push(`context query matched ${matchedValues.length} values`);
        }
        if (tokenHits > 0) {
          reasons.push(`context query token hits: ${tokenHits}`);
        }
      }

      const relatedFrames = (context.frameSelectors ?? []).flatMap((selector) => frameBySelector.get(selector) ?? []);
      const frameHaystack = relatedFrames.flatMap((frame) => [
        ...(Array.isArray(frame.path) ? frame.path.map(String) : []),
        typeof frame.selector === 'string' ? frame.selector : undefined,
        typeof frame.name === 'string' ? frame.name : undefined,
        typeof frame.title === 'string' ? frame.title : undefined,
        typeof frame.url === 'string' ? frame.url : undefined
      ]);
      if (options?.frameQuery) {
        const frameTokens = this.normalizeBrowserextQuery(options.frameQuery).split(/\W+/).filter(Boolean);
        let frameTokenHits = 0;
        for (const value of frameHaystack) {
          const matchScore = this.scoreBrowserextMatch(typeof value === 'string' ? value : undefined, options.frameQuery, options.exact === true);
          if (matchScore !== undefined) {
            score += matchScore;
            frameMatchedValues.push(String(value));
          }
          const normalizedValue = this.normalizeBrowserextQuery(typeof value === 'string' ? value : undefined);
          if (!normalizedValue) {
            continue;
          }
          for (const token of frameTokens) {
            if (normalizedValue.includes(token)) {
              score += 300;
              frameTokenHits += 1;
              frameMatchedValues.push(String(value));
            }
          }
        }
        if (frameMatchedValues.length > 0) {
          reasons.push(`frame query matched ${frameMatchedValues.length} frame values`);
        }
        if (frameTokenHits > 0) {
          reasons.push(`frame query token hits: ${frameTokenHits}`);
        }
      }

      score += Math.min(500, context.fieldCount * 25);
      if ((context.submitSelectors?.length ?? 0) > 0) {
        score += 200;
      }
      if (context.formAction) {
        score += 100;
      }
      if (context.formMethod) {
        score += 50;
      }

      return {
        context: context as unknown as Record<string, unknown>,
        score,
        reasons,
        matchedValues: [...new Set(matchedValues)].slice(0, 10),
        frameMatchedValues: [...new Set(frameMatchedValues)].slice(0, 10)
      };
    }).sort((left, right) => right.score - left.score);
  }

  async planBrowserExtensionContexts(
    sessionId: string,
    options?: {
      frameSelectors?: string[];
      formSelector?: string;
      contextIndex?: number;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    await this.ensureBrowserExtensionSessionUsable(sessionId, options?.timeoutMs);
    const [contexts, frames] = await Promise.all([
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listFormContexts(
        sessionId,
        options?.frameSelectors,
        100,
        options?.timeoutMs
      )),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listFrames(
        sessionId,
        options?.frameSelectors,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: options?.frameSelectors, frames: [] }))
    ]);
    const candidates = this.buildBrowserExtensionContextCandidates(contexts, frames, options);
    const limit = Math.max(1, options?.limit ?? 10);
    return {
      sessionId,
      frameSelectors: options?.frameSelectors,
      formSelector: options?.formSelector,
      contextIndex: options?.contextIndex,
      contextQuery: options?.contextQuery,
      frameQuery: options?.frameQuery,
      exact: options?.exact ?? false,
      count: Math.min(limit, candidates.length),
      totalCount: candidates.length,
      frames: frames.frames,
      candidates: candidates.slice(0, limit)
    };
  }

  async waitForBrowserExtensionCollectionRow(
    sessionId: string,
    options: {
      rowQuery: string;
      collectionQuery?: string;
      frameSelectors?: string[];
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const intervalMs = options.intervalMs ?? 1_000;
    const startedAt = Date.now();
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
        collectionQuery: options.collectionQuery,
        frameSelectors: options.frameSelectors,
        exact: options.exact,
        limit: options.limit ?? 200,
        timeoutMs
      })).catch(() => undefined);
      const row = result?.rows.find((entry) => this.matchesBrowserextQuery(
        [entry.label, entry.text, entry.selector, ...(entry.cells ?? []).map((cell) => `${cell.key ?? ''} ${cell.value}`.trim())].filter(Boolean).join(' '),
        options.rowQuery,
        options.exact === true
      ));
      if (row) {
        return {
          sessionId,
          collectionQuery: options.collectionQuery,
          rowQuery: options.rowQuery,
          frameSelectors: options.frameSelectors,
          exact: options.exact ?? false,
          timedOut: false,
          waitedMs: Date.now() - startedAt,
          row,
          collection: result?.collection
        };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      timedOut: true,
      waitedMs: Date.now() - startedAt
    };
  }

  async getBrowserExtensionCollectionRow(
    sessionId: string,
    options: {
      rowQuery: string;
      collectionQuery?: string;
      frameSelectors?: string[];
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
      collectionQuery: options.collectionQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact,
      limit: options.limit ?? 200,
      timeoutMs: options.timeoutMs
    }));
    const row = this.matchBrowserExtensionCollectionRow(result.rows, options.rowQuery, options.exact === true);
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      found: Boolean(row),
      row,
      collection: result.collection
    };
  }

  async getBrowserExtensionCollectionCell(
    sessionId: string,
    options: {
      rowQuery: string;
      cellQuery: string;
      collectionQuery?: string;
      frameSelectors?: string[];
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const rowResult = await this.getBrowserExtensionCollectionRow(sessionId, {
      rowQuery: options.rowQuery,
      collectionQuery: options.collectionQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact,
      limit: options.limit,
      timeoutMs: options.timeoutMs
    });
    const cell = rowResult.row ? this.matchBrowserExtensionCollectionCell(rowResult.row, options.cellQuery, options.exact === true) : undefined;
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      cellQuery: options.cellQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      found: Boolean(cell),
      row: rowResult.row,
      cell,
      collection: rowResult.collection
    };
  }

  async findBrowserExtensionCollectionRows(
    sessionId: string,
    options: {
      query: string;
      cellQuery?: string;
      collectionQuery?: string;
      frameSelectors?: string[];
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
      collectionQuery: options.collectionQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact,
      limit: Math.max(options.limit ?? 50, 1),
      timeoutMs: options.timeoutMs
    }));
    const matches = result.rows.filter((row) => {
      if (options.cellQuery) {
        const cell = this.matchBrowserExtensionCollectionCell(row, options.cellQuery, options.exact === true);
        return Boolean(cell && this.matchesBrowserextQuery(cell.value, options.query, options.exact === true));
      }
      return Boolean(this.matchBrowserExtensionCollectionRow([row], options.query, options.exact === true));
    });
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      query: options.query,
      cellQuery: options.cellQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      count: matches.length,
      rows: matches,
      collection: result.collection
    };
  }

  async diffBrowserExtensionCollection(
    sessionId: string,
    options: {
      collectionQuery?: string;
      againstFile?: string;
      againstOutput?: Record<string, unknown>;
      frameSelectors?: string[];
      exact?: boolean;
      dedupeBy?: 'auto' | 'selector' | 'text' | 'cells';
      includeSelection?: boolean;
      includeDetails?: boolean;
      timeoutMs?: number;
    }
  ) {
    const current = await this.exportBrowserExtensionCollection(sessionId, {
      collectionQuery: options.collectionQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact,
      includeSelection: options.includeSelection,
      includeDetails: options.includeDetails,
      format: 'json',
      timeoutMs: options.timeoutMs
    });
    const baselineRaw = options.againstOutput
      ? options.againstOutput
      : options.againstFile
        ? JSON.parse(readFileSync(resolvePath(options.againstFile), 'utf8')) as Record<string, unknown>
        : undefined;
    if (!baselineRaw) {
      throw new Error('collection-diff requires --against-file or a saved workflow output baseline');
    }
    const baselineRows = Array.isArray(baselineRaw.rows) ? baselineRaw.rows as Array<Record<string, unknown>> : [];
    const currentRows = Array.isArray(current.rows) ? current.rows as Array<Record<string, unknown>> : [];
    const dedupeBy = options.dedupeBy ?? 'auto';
    const baselineMap = new Map<string, Record<string, unknown>>();
    for (const row of baselineRows) {
      baselineMap.set(this.buildBrowserExtensionCollectionRowKey(row as {
        selector?: string;
        label?: string;
        text?: string;
        href?: string;
        cells?: Array<{ key?: string; value: string }>;
        actions?: Array<{ selector: string; label?: string; actionableType?: string }>;
      }, dedupeBy), row);
    }
    const currentMap = new Map<string, Record<string, unknown>>();
    for (const row of currentRows) {
      currentMap.set(this.buildBrowserExtensionCollectionRowKey(row as {
        selector?: string;
        label?: string;
        text?: string;
        href?: string;
        cells?: Array<{ key?: string; value: string }>;
        actions?: Array<{ selector: string; label?: string; actionableType?: string }>;
      }, dedupeBy), row);
    }
    const addedRows: Array<Record<string, unknown>> = [];
    const removedRows: Array<Record<string, unknown>> = [];
    const changedRows: Array<{ key: string; before: Record<string, unknown>; after: Record<string, unknown> }> = [];
    const unchangedRows: Array<Record<string, unknown>> = [];
    for (const [key, row] of currentMap.entries()) {
      const previous = baselineMap.get(key);
      if (!previous) {
        addedRows.push(row);
        continue;
      }
      if (JSON.stringify(previous) !== JSON.stringify(row)) {
        changedRows.push({ key, before: previous, after: row });
      } else {
        unchangedRows.push(row);
      }
    }
    for (const [key, row] of baselineMap.entries()) {
      if (!currentMap.has(key)) {
        removedRows.push(row);
      }
    }
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      dedupeBy,
      againstFile: options.againstFile,
      baselineCount: baselineRows.length,
      currentCount: currentRows.length,
      addedCount: addedRows.length,
      removedCount: removedRows.length,
      changedCount: changedRows.length,
      unchangedCount: unchangedRows.length,
      addedRows,
      removedRows,
      changedRows,
      unchangedRows,
      current
    };
  }

  private browserExtensionCollectionDiffMatches(
    diff: {
      addedCount?: number;
      removedCount?: number;
      changedCount?: number;
      unchangedCount?: number;
      addedRows?: Array<Record<string, unknown>>;
      removedRows?: Array<Record<string, unknown>>;
      changedRows?: Array<{ before?: Record<string, unknown>; after?: Record<string, unknown> }>;
    },
    expectation: {
      addedAtLeast?: number;
      removedAtLeast?: number;
      changedAtLeast?: number;
      unchangedAtLeast?: number;
      rowAdded?: string;
      rowRemoved?: string;
      rowChanged?: string;
    },
    exact = false
  ) {
    if (typeof expectation.addedAtLeast === 'number' && (diff.addedCount ?? 0) < expectation.addedAtLeast) {
      return false;
    }
    if (typeof expectation.removedAtLeast === 'number' && (diff.removedCount ?? 0) < expectation.removedAtLeast) {
      return false;
    }
    if (typeof expectation.changedAtLeast === 'number' && (diff.changedCount ?? 0) < expectation.changedAtLeast) {
      return false;
    }
    if (typeof expectation.unchangedAtLeast === 'number' && (diff.unchangedCount ?? 0) < expectation.unchangedAtLeast) {
      return false;
    }
    if (expectation.rowAdded) {
      const matched = (diff.addedRows ?? []).some((row) =>
        this.matchesBrowserextQuery(this.describeBrowserExtensionCollectionRow(row), expectation.rowAdded!, exact)
      );
      if (!matched) {
        return false;
      }
    }
    if (expectation.rowRemoved) {
      const matched = (diff.removedRows ?? []).some((row) =>
        this.matchesBrowserextQuery(this.describeBrowserExtensionCollectionRow(row), expectation.rowRemoved!, exact)
      );
      if (!matched) {
        return false;
      }
    }
    if (expectation.rowChanged) {
      const matched = (diff.changedRows ?? []).some((entry) =>
        this.matchesBrowserextQuery(this.describeBrowserExtensionCollectionRow(entry.after ?? entry.before), expectation.rowChanged!, exact)
        || this.matchesBrowserextQuery(this.describeBrowserExtensionCollectionRow(entry.before ?? entry.after), expectation.rowChanged!, exact)
      );
      if (!matched) {
        return false;
      }
    }
    return true;
  }

  async waitForBrowserExtensionCollectionDiff(
    sessionId: string,
    options: {
      collectionQuery?: string;
      againstFile?: string;
      againstOutput?: Record<string, unknown>;
      frameSelectors?: string[];
      exact?: boolean;
      dedupeBy?: 'auto' | 'selector' | 'text' | 'cells';
      includeSelection?: boolean;
      includeDetails?: boolean;
      addedAtLeast?: number;
      removedAtLeast?: number;
      changedAtLeast?: number;
      unchangedAtLeast?: number;
      rowAdded?: string;
      rowRemoved?: string;
      rowChanged?: string;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const intervalMs = options.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastDiff: Record<string, unknown> | undefined;
    while (Date.now() - startedAt <= timeoutMs) {
      const diff = await this.diffBrowserExtensionCollection(sessionId, {
        collectionQuery: options.collectionQuery,
        againstFile: options.againstFile,
        againstOutput: options.againstOutput,
        frameSelectors: options.frameSelectors,
        exact: options.exact,
        dedupeBy: options.dedupeBy,
        includeSelection: options.includeSelection,
        includeDetails: options.includeDetails,
        timeoutMs
      }).catch(() => undefined);
      if (diff) {
        lastDiff = diff as Record<string, unknown>;
        const matched = this.browserExtensionCollectionDiffMatches(diff, {
          addedAtLeast: options.addedAtLeast,
          removedAtLeast: options.removedAtLeast,
          changedAtLeast: options.changedAtLeast,
          unchangedAtLeast: options.unchangedAtLeast,
          rowAdded: options.rowAdded,
          rowRemoved: options.rowRemoved,
          rowChanged: options.rowChanged
        }, options.exact === true);
        if (matched) {
          return {
            sessionId,
            collectionQuery: options.collectionQuery,
            againstFile: options.againstFile,
            frameSelectors: options.frameSelectors,
            exact: options.exact ?? false,
            timedOut: false,
            waitedMs: Date.now() - startedAt,
            result: diff
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      againstFile: options.againstFile,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      timedOut: true,
      waitedMs: Date.now() - startedAt,
      result: lastDiff
    };
  }

  async getBrowserExtensionCollectionValues(
    sessionId: string,
    options: {
      cellQuery: string;
      collectionQuery?: string;
      rowQuery?: string;
      frameSelectors?: string[];
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
      collectionQuery: options.collectionQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact,
      limit: Math.max(options.limit ?? 200, 1),
      timeoutMs: options.timeoutMs
    }));
    const rows = options.rowQuery
      ? result.rows.filter((row) => Boolean(this.matchBrowserExtensionCollectionRow([row], options.rowQuery!, options.exact === true)))
      : result.rows;
    const values = rows.flatMap((row) => {
      const cell = this.matchBrowserExtensionCollectionCell(row, options.cellQuery, options.exact === true);
      return cell?.value ? [cell.value] : [];
    });
    const uniqueValues = [...new Set(values)];
    const counts = uniqueValues.map((value) => ({
      value,
      count: values.filter((entry) => entry === value).length
    })).sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      cellQuery: options.cellQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      matchedRowCount: rows.length,
      count: values.length,
      values,
      uniqueCount: uniqueValues.length,
      uniqueValues,
      counts,
      collection: result.collection
    };
  }

  async getBrowserExtensionCollectionStats(
    sessionId: string,
    options?: {
      collectionQuery?: string;
      cellQuery?: string;
      frameSelectors?: string[];
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact,
      limit: Math.max(options?.limit ?? 200, 1),
      timeoutMs: options?.timeoutMs
    }));
    const rows = result.rows;
    const selectedCount = rows.filter((row) => row.selected).length;
    const expandedCount = rows.filter((row) => row.expanded).length;
    const detailCount = rows.filter((row) => Boolean(row.detailText)).length;
    const actionCount = rows.reduce((sum, row) => sum + (row.actions?.length ?? 0), 0);
    const stats: Record<string, unknown> = {
      sessionId,
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      count: rows.length,
      selectedCount,
      expandedCount,
      detailCount,
      rowActionCount: actionCount,
      collection: result.collection
    };
    if (options?.cellQuery) {
      const values = await this.getBrowserExtensionCollectionValues(sessionId, {
        cellQuery: options.cellQuery,
        collectionQuery: options.collectionQuery,
        frameSelectors: options.frameSelectors,
        exact: options.exact,
        limit: options.limit,
        timeoutMs: options.timeoutMs
      });
      stats.cellQuery = options.cellQuery;
      stats.valueCount = values.count;
      stats.uniqueValueCount = values.uniqueCount;
      stats.values = values.values;
      stats.uniqueValues = values.uniqueValues;
      stats.valueFrequencies = values.counts;
    }
    return stats;
  }

  async diffBrowserExtensionCollectionValues(
    sessionId: string,
    options: {
      cellQuery: string;
      collectionQuery?: string;
      rowQuery?: string;
      againstFile?: string;
      againstOutput?: Record<string, unknown>;
      frameSelectors?: string[];
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const current = await this.getBrowserExtensionCollectionValues(sessionId, {
      cellQuery: options.cellQuery,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact,
      limit: options.limit,
      timeoutMs: options.timeoutMs
    });
    const baselineRaw = options.againstOutput
      ? options.againstOutput
      : options.againstFile
        ? JSON.parse(readFileSync(resolvePath(options.againstFile), 'utf8')) as Record<string, unknown>
        : undefined;
    if (!baselineRaw) {
      throw new Error('collection-values-diff requires --against-file or a saved workflow output baseline');
    }
    const baselineValues = Array.isArray(baselineRaw.values)
      ? baselineRaw.values.filter((entry): entry is string => typeof entry === 'string')
      : [];
    const baselineCounts = Array.isArray(baselineRaw.counts)
      ? baselineRaw.counts.filter((entry): entry is { value: string; count: number } =>
        Boolean(entry)
        && typeof entry === 'object'
        && typeof (entry as { value?: unknown }).value === 'string'
        && typeof (entry as { count?: unknown }).count === 'number')
      : [];
    const currentCounts = Array.isArray(current.counts) ? current.counts : [];
    const currentCountMap = new Map(currentCounts.map((entry) => [entry.value, entry.count]));
    const baselineCountMap = new Map(baselineCounts.map((entry) => [entry.value, entry.count]));
    const currentUniqueValues = current.uniqueValues;
    const baselineUniqueValues = Array.isArray(baselineRaw.uniqueValues)
      ? baselineRaw.uniqueValues.filter((entry): entry is string => typeof entry === 'string')
      : [...new Set(baselineValues)];
    const addedValues = currentUniqueValues.filter((value) => !baselineUniqueValues.includes(value));
    const removedValues = baselineUniqueValues.filter((value) => !currentUniqueValues.includes(value));
    const changedValues = [...new Set([...currentUniqueValues, ...baselineUniqueValues])]
      .filter((value) => (currentCountMap.get(value) ?? 0) !== (baselineCountMap.get(value) ?? 0))
      .map((value) => ({
        value,
        beforeCount: baselineCountMap.get(value) ?? 0,
        afterCount: currentCountMap.get(value) ?? 0
      }));
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      cellQuery: options.cellQuery,
      againstFile: options.againstFile,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      baselineCount: baselineValues.length,
      currentCount: current.count,
      countDelta: current.count - baselineValues.length,
      baselineUniqueCount: baselineUniqueValues.length,
      currentUniqueCount: current.uniqueCount,
      uniqueCountDelta: current.uniqueCount - baselineUniqueValues.length,
      addedValues,
      removedValues,
      changedValues,
      baseline: baselineRaw,
      current
    };
  }

  async diffBrowserExtensionCollectionStats(
    sessionId: string,
    options: {
      collectionQuery?: string;
      cellQuery?: string;
      againstFile?: string;
      againstOutput?: Record<string, unknown>;
      frameSelectors?: string[];
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const current = await this.getBrowserExtensionCollectionStats(sessionId, {
      collectionQuery: options.collectionQuery,
      cellQuery: options.cellQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact,
      limit: options.limit,
      timeoutMs: options.timeoutMs
    });
    const baselineRaw = options.againstOutput
      ? options.againstOutput
      : options.againstFile
        ? JSON.parse(readFileSync(resolvePath(options.againstFile), 'utf8')) as Record<string, unknown>
        : undefined;
    if (!baselineRaw) {
      throw new Error('collection-stats-diff requires --against-file or a saved workflow output baseline');
    }
    const baselineCount = typeof baselineRaw.count === 'number' ? baselineRaw.count : 0;
    const baselineSelected = typeof baselineRaw.selectedCount === 'number' ? baselineRaw.selectedCount : 0;
    const baselineExpanded = typeof baselineRaw.expandedCount === 'number' ? baselineRaw.expandedCount : 0;
    const baselineDetail = typeof baselineRaw.detailCount === 'number' ? baselineRaw.detailCount : 0;
    const baselineRowAction = typeof baselineRaw.rowActionCount === 'number' ? baselineRaw.rowActionCount : 0;
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      cellQuery: options.cellQuery,
      againstFile: options.againstFile,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      baseline: baselineRaw,
      current,
      countDelta: (typeof current.count === 'number' ? current.count : 0) - baselineCount,
      selectedCountDelta: (typeof current.selectedCount === 'number' ? current.selectedCount : 0) - baselineSelected,
      expandedCountDelta: (typeof current.expandedCount === 'number' ? current.expandedCount : 0) - baselineExpanded,
      detailCountDelta: (typeof current.detailCount === 'number' ? current.detailCount : 0) - baselineDetail,
      rowActionCountDelta: (typeof current.rowActionCount === 'number' ? current.rowActionCount : 0) - baselineRowAction
    };
  }

  async waitForBrowserExtensionCollectionCount(
    sessionId: string,
    options: {
      count: number;
      collectionQuery?: string;
      frameSelectors?: string[];
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const intervalMs = options.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastCount = 0;
    let lastCollection: Record<string, unknown> | undefined;
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
        collectionQuery: options.collectionQuery,
        frameSelectors: options.frameSelectors,
        exact: options.exact,
        limit: Math.max(options.limit ?? options.count, options.count),
        timeoutMs
      })).catch(() => undefined);
      lastCount = result?.count ?? result?.rows.length ?? 0;
      lastCollection = result?.collection as Record<string, unknown> | undefined;
      if (lastCount >= options.count) {
        return {
          sessionId,
          collectionQuery: options.collectionQuery,
          expectedCount: options.count,
          frameSelectors: options.frameSelectors,
          exact: options.exact ?? false,
          timedOut: false,
          waitedMs: Date.now() - startedAt,
          count: lastCount,
          collection: result?.collection,
          rows: result?.rows ?? []
        };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      expectedCount: options.count,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      timedOut: true,
      waitedMs: Date.now() - startedAt,
      count: lastCount,
      collection: lastCollection
    };
  }

  async waitForBrowserExtensionNoLoadingState(
    sessionId: string,
    options?: {
      query?: string;
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = options?.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastStates: unknown[] | undefined;
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.listBrowserExtensionLoadingStates(
        sessionId,
        options?.frameSelectors,
        options?.limit ?? 20,
        timeoutMs
      ).catch(() => undefined);
      if (result) {
        lastStates = result.loadingStates;
        const matched = result.loadingStates.filter((entry) =>
          !options?.query
          || this.matchesBrowserextQuery(entry.text, options.query, false)
          || this.matchesBrowserextQuery(entry.label, options.query, false)
          || this.matchesBrowserextQuery(entry.selector, options.query, false)
          || this.matchesBrowserextQuery(entry.variant, options.query, false)
        );
        if (matched.length === 0) {
          return {
            sessionId,
            query: options?.query,
            frameSelectors: options?.frameSelectors,
            timedOut: false,
            waitedMs: Date.now() - startedAt,
            loadingStates: result.loadingStates
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      query: options?.query,
      frameSelectors: options?.frameSelectors,
      timedOut: true,
      waitedMs: Date.now() - startedAt,
      loadingStates: lastStates ?? []
    };
  }

  private async resolveBrowserExtensionFormContext(
    sessionId: string,
    options?: {
      frameSelectors?: string[];
      formSelector?: string;
      contextIndex?: number;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
      timeoutMs?: number;
    }
  ) {
    const [contexts, frames] = await Promise.all([
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listFormContexts(
        sessionId,
        options?.frameSelectors,
        100,
        options?.timeoutMs
      )),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listFrames(
        sessionId,
        options?.frameSelectors,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: options?.frameSelectors, frames: [] }))
    ]);
    const candidates = this.buildBrowserExtensionContextCandidates(contexts, frames, options);
    const selected = candidates[0]?.context as unknown as typeof contexts.contexts[number] | undefined;
    return {
      contexts,
      frames,
      candidates,
      selectedContext: selected ?? contexts.contexts[0],
      preferredFormSelector: (selected ?? contexts.contexts[0])?.formSelector
    };
  }

  private shouldReuseLockedBrowserExtensionContext(
    step: BrowserExtensionScenarioStep,
    defaults: Omit<BrowserExtensionScenarioDocument, 'steps'>,
    runtimeState?: BrowserExtensionScenarioRuntimeState
  ) {
    if (!runtimeState?.lockedContext?.selectedContext) {
      return false;
    }
    if (!['fill', 'click', 'radio', 'segment', 'range', 'toggle', 'submit', 'submit-query', 'context-state'].includes(step.kind)) {
      return false;
    }
    const stepFormSelector = 'formSelector' in step ? step.formSelector : undefined;
    const stepContextQuery = 'contextQuery' in step ? step.contextQuery : undefined;
    const stepFrameQuery = 'frameQuery' in step ? step.frameQuery : undefined;
    const stepFrameSelectors = 'frameSelectors' in step ? step.frameSelectors : undefined;
    return !stepFormSelector
      && !stepContextQuery
      && !stepFrameQuery
      && !stepFrameSelectors
      && Boolean(defaults.formSelector || defaults.contextQuery || defaults.frameQuery || defaults.frameSelectors?.length);
  }

  private loadBrowserExtensionScenario(filePath: string): BrowserExtensionNormalizedWorkflowFile {
    return loadBrowserExtensionWorkflowFile(filePath);
  }

  validateBrowserExtensionWorkflowFile(filePath: string) {
    return validateBrowserExtensionWorkflowFile(filePath);
  }

  private inferBrowserExtensionWorkflowSite(metadata: BrowserExtensionNormalizedWorkflowMetadata) {
    if (metadata.target?.site) {
      return metadata.target.site;
    }
    if (!metadata.target?.url) {
      return undefined;
    }
    try {
      return new URL(metadata.target.url).hostname;
    } catch {
      return undefined;
    }
  }

  private matchesBrowserExtensionWorkflowTarget(
    session: { site?: string; targetUrl?: string; privateMode?: boolean; connected?: boolean; ready?: boolean },
    metadata: BrowserExtensionNormalizedWorkflowMetadata
  ) {
    const targetSite = this.inferBrowserExtensionWorkflowSite(metadata);
    if (targetSite && session.site && session.site !== targetSite) {
      return false;
    }
    if (metadata.target?.url && session.targetUrl) {
      try {
        const targetUrl = new URL(metadata.target.url);
        const sessionUrl = new URL(session.targetUrl);
        if (targetUrl.hostname !== sessionUrl.hostname) {
          return false;
        }
      } catch {
        if (session.targetUrl !== metadata.target.url) {
          return false;
        }
      }
    }
    if (metadata.target?.privateMode === true && session.privateMode !== true) {
      return false;
    }
    return true;
  }

  private async resolveBrowserExtensionWorkflowSession(
    metadata: BrowserExtensionNormalizedWorkflowMetadata,
    sessionId?: string,
    options?: { navigateToTarget?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const provider = await this.runtime.browserExtensionService.waitForProviderConnected({
      timeoutMs: Math.min(timeoutMs, 15_000),
      intervalMs: 500
    });
    if (!provider.connected) {
      const notes = Array.isArray(provider.status.notes) ? provider.status.notes.filter((entry) => typeof entry === 'string') : [];
      const details = [
        'No live browserext provider is connected.',
        ...notes
      ].join(' ');
      throw new Error(`${details} Run "sidofun browserext status --json" and reload the unpacked extension before workflow-run.`);
    }
    if (sessionId) {
      await this.ensureBrowserExtensionSessionUsable(sessionId, timeoutMs);
      await this.focusBrowserExtensionWorkflowTargetTab(sessionId, metadata, timeoutMs).catch(() => undefined);
      if (metadata.target?.url && options?.navigateToTarget) {
        const current = await this.browserExtensionMetadata(sessionId, timeoutMs).catch(() => undefined);
        if (current?.url !== metadata.target.url) {
          await this.runtime.browserExtensionService.navigate(sessionId, metadata.target.url, timeoutMs);
        }
      }
      return {
        sessionId,
        acquisition: 'provided',
        created: false,
        reconnected: false
      } as const;
    }

    const targetSite = this.inferBrowserExtensionWorkflowSite(metadata);
    const targetUrl = metadata.target?.url;
    const sessionPolicy = metadata.sessionPolicy ?? 'reuse';
    const existing = this.listBrowserExtensionSessions()
      .filter((entry) => this.matchesBrowserExtensionWorkflowTarget(entry, metadata))
      .sort((left, right) => Number(Boolean(right.connected && right.ready)) - Number(Boolean(left.connected && left.ready)));

    if (sessionPolicy === 'fail') {
      const reusable = existing.find((entry) => entry.connected && entry.ready);
      if (!reusable) {
        throw new Error('Workflow requires an existing ready browserext session, but none matched the target.');
      }
      return {
        sessionId: reusable.id,
        acquisition: 'matched-existing',
        created: false,
        reconnected: false
      } as const;
    }

    if (sessionPolicy === 'reuse' || sessionPolicy === 'reconnect') {
      for (const candidate of existing) {
        if (candidate.connected && candidate.ready) {
          await this.focusBrowserExtensionWorkflowTargetTab(candidate.id, metadata, timeoutMs).catch(() => undefined);
          if (targetUrl && options?.navigateToTarget) {
            const current = await this.browserExtensionMetadata(candidate.id, timeoutMs).catch(() => undefined);
            if (current?.url !== targetUrl) {
              await this.runtime.browserExtensionService.navigate(candidate.id, targetUrl, timeoutMs);
            }
          }
          return {
            sessionId: candidate.id,
            acquisition: 'matched-existing',
            created: false,
            reconnected: false
          } as const;
        }
        if (sessionPolicy === 'reconnect') {
          await this.runtime.browserExtensionService.reconnectSession(candidate.id, { timeoutMs, intervalMs: 1_000 });
          const ready = await this.runtime.browserExtensionService.waitForSessionReady(candidate.id, { timeoutMs, intervalMs: 1_000 });
          if (ready.ready) {
            await this.focusBrowserExtensionWorkflowTargetTab(candidate.id, metadata, timeoutMs).catch(() => undefined);
            if (targetUrl && options?.navigateToTarget) {
              const current = await this.browserExtensionMetadata(candidate.id, timeoutMs).catch(() => undefined);
              if (current?.url !== targetUrl) {
                await this.runtime.browserExtensionService.navigate(candidate.id, targetUrl, timeoutMs);
              }
            }
            return {
              sessionId: candidate.id,
              acquisition: 'reconnected-existing',
              created: false,
              reconnected: true
            } as const;
          }
        }
      }
    }

    if (!targetUrl && !targetSite) {
      throw new Error('Workflow file requires either --session <id> or a target.url/target.site so Sidofun can acquire a browserext session.');
    }
    const created = this.createBrowserExtensionSession({
      workspace: metadata.target?.workspace,
      site: targetSite,
      targetUrl,
      name: metadata.target?.name ?? metadata.name,
      privateMode: metadata.target?.privateMode === true
    });
    const ready = await this.runtime.browserExtensionService.waitForSessionReady(created.id, { timeoutMs, intervalMs: 1_000 });
    if (!ready.ready) {
      throw new Error(`Auto-created browserext workflow session ${created.id} did not become ready within ${timeoutMs}ms.`);
    }
    return {
      sessionId: created.id,
      acquisition: 'created-new',
      created: true,
      reconnected: false
    } as const;
  }

  private async focusBrowserExtensionWorkflowTargetTab(
    sessionId: string,
    metadata: BrowserExtensionNormalizedWorkflowMetadata,
    timeoutMs: number
  ) {
    const ownership = await this.captureBrowserExtensionWorkflowOwnership(sessionId, metadata, timeoutMs);
    if (ownership.pinnedTabId) {
      await this.focusBrowserExtensionTab(sessionId, ownership.pinnedTabId, timeoutMs);
    }
  }

  private normalizeBrowserExtensionWorkflowUrl(rawUrl?: string) {
    if (!rawUrl) {
      return undefined;
    }
    try {
      const parsed = new URL(rawUrl);
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  }

  private matchesBrowserExtensionWorkflowUrl(tabUrl: string | undefined, targetUrl: string | undefined) {
    if (!tabUrl || !targetUrl) {
      return false;
    }
    const normalizedTab = this.normalizeBrowserExtensionWorkflowUrl(tabUrl);
    const normalizedTarget = this.normalizeBrowserExtensionWorkflowUrl(targetUrl);
    if (normalizedTab && normalizedTarget && normalizedTab === normalizedTarget) {
      return true;
    }
    try {
      const tab = new URL(tabUrl);
      const target = new URL(targetUrl);
      return tab.hostname === target.hostname
        && tab.pathname === target.pathname
        && (target.search ? tab.search === target.search : true);
    } catch {
      return false;
    }
  }

  private async captureBrowserExtensionWorkflowOwnership(
    sessionId: string,
    metadata: BrowserExtensionNormalizedWorkflowMetadata,
    timeoutMs: number,
    preferredTabId?: number
  ) {
    const session = this.getBrowserExtensionSession(sessionId);
    const listedTabs = session?.tabs?.length ? session.tabs : (await this.listBrowserExtensionTabs(sessionId).catch(() => ({ tabs: [] }))).tabs;
    const targetUrl = metadata.target?.url;
    const targetHost = this.inferBrowserExtensionWorkflowSite(metadata);
    const ownership = resolveBrowserExtensionWorkflowOwnership(sessionId, listedTabs, {
      targetUrl,
      targetHost,
      privateMode: metadata.target?.privateMode === true,
      preferredTabId,
      matchesUrl: (tabUrl, workflowTargetUrl) => this.matchesBrowserExtensionWorkflowUrl(tabUrl, workflowTargetUrl)
    });
    if (ownership.pinnedTabId) {
      await this.focusBrowserExtensionTab(sessionId, ownership.pinnedTabId, timeoutMs).catch(() => undefined);
    }
    return ownership;
  }

  private async ensureBrowserExtensionWorkflowTabOwnership(
    sessionId: string,
    metadata: BrowserExtensionNormalizedWorkflowMetadata,
    runtimeState: BrowserExtensionScenarioRuntimeState | undefined,
    timeoutMs: number
  ) {
    const ownership = runtimeState?.sessionOwnership;
    const refreshed = await this.captureBrowserExtensionWorkflowOwnership(
      sessionId,
      metadata,
      timeoutMs,
      ownership?.pinnedTabId
    );
    assertBrowserExtensionWorkflowOwnership(sessionId, ownership, refreshed);
    if (runtimeState) {
      runtimeState.sessionOwnership = {
        ...refreshed,
        acquisition: ownership?.acquisition
      };
    }
    return refreshed;
  }

  private async browserExtensionSelectorExists(
    sessionId: string,
    selector: string,
    timeoutMs?: number
  ) {
    try {
      const result = await this.runtime.browserExtensionService.inspect(sessionId, selector, Math.min(timeoutMs ?? 1_000, 1_000));
      return Boolean(result.element?.selector);
    } catch {
      return false;
    }
  }

  private matchesBrowserExtensionValidationState(
    validation: Record<string, unknown> | undefined,
    expected?: {
      state?: 'valid' | 'invalid';
      messageIncludes?: string;
      messageEquals?: string;
    }
  ) {
    if (!expected) {
      return true;
    }
    const valid = validation?.valid === true;
    const invalid = validation?.invalid === true;
    const message = typeof validation?.validationMessage === 'string' ? validation.validationMessage : '';
    if (expected.state === 'valid' && !valid) {
      return false;
    }
    if (expected.state === 'invalid' && !invalid) {
      return false;
    }
    if (expected.messageEquals !== undefined && message !== expected.messageEquals) {
      return false;
    }
    if (expected.messageIncludes !== undefined && !message.includes(expected.messageIncludes)) {
      return false;
    }
    return true;
  }

  private async waitForBrowserExtensionFieldValidation(
    sessionId: string,
    selector: string,
    options?: {
      state?: 'valid' | 'invalid';
      messageIncludes?: string;
      messageEquals?: string;
      frameSelectors?: string[];
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = Math.max(250, options?.timeoutMs ?? 30_000);
    const intervalMs = Math.max(100, options?.intervalMs ?? 250);
    const startedAt = Date.now();
    let lastValidation: Record<string, unknown> | undefined;
    while (Date.now() - startedAt < timeoutMs) {
      const result = await this.runtime.browserExtensionService.formValidation(sessionId, selector, {
        frameSelectors: options?.frameSelectors,
        timeoutMs: Math.min(intervalMs, 1_500)
      }).catch(() => undefined);
      lastValidation = result?.validation as Record<string, unknown> | undefined;
      if (this.matchesBrowserExtensionValidationState(lastValidation, options)) {
        return {
          sessionId,
          selector,
          matched: true,
          elapsedMs: Date.now() - startedAt,
          validation: lastValidation
        };
      }
      await Bun.sleep(intervalMs);
    }
    return {
      sessionId,
      selector,
      matched: false,
      elapsedMs: Date.now() - startedAt,
      validation: lastValidation
    };
  }

  private async evaluateBrowserExtensionScenarioCondition(
    sessionId: string,
    condition: BrowserExtensionScenarioCondition,
    options: {
      timeoutMs?: number;
      intervalMs?: number;
    },
    runtimeState?: BrowserExtensionScenarioRuntimeState
  ) {
    if (condition.metadataValue) {
      const metadata = await this.browserExtensionMetadata(sessionId, options.timeoutMs).catch(() => undefined);
      const value = this.readBrowserExtensionMetadataValue(metadata as Record<string, unknown> | undefined, condition.metadataValue.key);
      const comparable = this.extractBrowserExtensionOutputComparable(value);
      const exists = value !== undefined && value !== null && comparable.length > 0;
      if (condition.metadataValue.exists === true && !exists) {
        return false;
      }
      if (condition.metadataValue.exists === false && exists) {
        return false;
      }
      if (condition.metadataValue.equals !== undefined && comparable !== condition.metadataValue.equals) {
        return false;
      }
      if (condition.metadataValue.includes !== undefined && !comparable.includes(condition.metadataValue.includes)) {
        return false;
      }
    }
    if (condition.urlPart) {
      const urlParts = await this.browserExtensionUrlParts(sessionId, options.timeoutMs).catch(() => undefined);
      const value = this.readBrowserExtensionUrlPartValue(urlParts as Record<string, unknown> | undefined, condition.urlPart.part);
      const comparable = this.extractBrowserExtensionOutputComparable(value);
      const exists = value !== undefined && value !== null && comparable.length > 0;
      if (condition.urlPart.exists === true && !exists) {
        return false;
      }
      if (condition.urlPart.exists === false && exists) {
        return false;
      }
      if (condition.urlPart.equals !== undefined && comparable !== condition.urlPart.equals) {
        return false;
      }
      if (condition.urlPart.includes !== undefined && !comparable.includes(condition.urlPart.includes)) {
        return false;
      }
    }
    if (condition.storageValue) {
      const storage = await this.browserExtensionGetStorageEntry(sessionId, condition.storageValue.key, {
        scope: condition.storageValue.scope,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      const comparable = this.extractBrowserExtensionOutputComparable(storage?.entry?.value);
      if (condition.storageValue.exists === true && !storage?.found) {
        return false;
      }
      if (condition.storageValue.exists === false && storage?.found) {
        return false;
      }
      if (condition.storageValue.equals !== undefined && comparable !== condition.storageValue.equals) {
        return false;
      }
      if (condition.storageValue.includes !== undefined && !comparable.includes(condition.storageValue.includes)) {
        return false;
      }
    }
    if (condition.cookieValue) {
      const cookie = await this.browserExtensionGetCookie(sessionId, condition.cookieValue.name, {
        targetUrl: condition.cookieValue.targetUrl,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      const comparable = this.extractBrowserExtensionOutputComparable(cookie?.cookie?.value);
      if (condition.cookieValue.exists === true && !cookie?.found) {
        return false;
      }
      if (condition.cookieValue.exists === false && cookie?.found) {
        return false;
      }
      if (condition.cookieValue.equals !== undefined && comparable !== condition.cookieValue.equals) {
        return false;
      }
      if (condition.cookieValue.includes !== undefined && !comparable.includes(condition.cookieValue.includes)) {
        return false;
      }
    }
    if (condition.fieldExists) {
      const found = await this.runtime.browserExtensionService.findFormField(
        sessionId,
        condition.fieldExists,
        undefined,
        false,
        options.timeoutMs
      ).catch(() => undefined);
      if (!found?.field?.selector) {
        return false;
      }
    }
    if (condition.fieldValue) {
      const values = await this.listFormValuesBrowserExtensionSession(sessionId, {
        limit: 100,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      const entry = values?.entries.find((field) =>
        this.matchesBrowserextQuery(field.name, condition.fieldValue!.query, false)
        || this.matchesBrowserextQuery(field.selector, condition.fieldValue!.query, false)
        || (field.labels ?? []).some((label) => this.matchesBrowserextQuery(label, condition.fieldValue!.query, false))
      );
      const comparable = this.extractBrowserExtensionOutputComparable(entry?.type === 'checkbox' || entry?.type === 'radio' ? Boolean(entry?.checked) : entry?.value);
      if (condition.fieldValue.exists === true && !entry) {
        return false;
      }
      if (condition.fieldValue.exists === false && entry) {
        return false;
      }
      if (condition.fieldValue.equals !== undefined && comparable !== condition.fieldValue.equals) {
        return false;
      }
      if (condition.fieldValue.includes !== undefined && !comparable.includes(condition.fieldValue.includes)) {
        return false;
      }
    }
    if (condition.nextActionExists) {
      const nextActionQuery = condition.nextActionExists;
      const suggestions = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.suggestNextActions(sessionId, {
        limit: 20,
        timeoutMs: options.timeoutMs
      })).catch(() => undefined);
      const matched = suggestions?.suggestions?.some((entry) =>
        this.matchesBrowserextQuery(entry.query, nextActionQuery, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.bannerExists) {
      const banners = await this.listBrowserExtensionBanners(sessionId, undefined, 20, options.timeoutMs).catch(() => undefined);
      const matched = banners?.banners?.some((entry) =>
        this.matchesBrowserextQuery(entry.text, condition.bannerExists!, false)
        || this.matchesBrowserextQuery(entry.label, condition.bannerExists!, false)
        || this.matchesBrowserextQuery(entry.selector, condition.bannerExists!, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.loadingStateExists) {
      const loadingStates = await this.listBrowserExtensionLoadingStates(sessionId, undefined, 20, options.timeoutMs).catch(() => undefined);
      const matched = loadingStates?.loadingStates?.some((entry) =>
        this.matchesBrowserextQuery(entry.text, condition.loadingStateExists!, false)
        || this.matchesBrowserextQuery(entry.label, condition.loadingStateExists!, false)
        || this.matchesBrowserextQuery(entry.selector, condition.loadingStateExists!, false)
        || this.matchesBrowserextQuery(entry.variant, condition.loadingStateExists!, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.noLoadingState) {
      const loadingStates = await this.listBrowserExtensionLoadingStates(sessionId, undefined, 20, options.timeoutMs).catch(() => undefined);
      const matched = loadingStates?.loadingStates?.some((entry) =>
        this.matchesBrowserextQuery(entry.text, condition.noLoadingState!, false)
        || this.matchesBrowserextQuery(entry.label, condition.noLoadingState!, false)
        || this.matchesBrowserextQuery(entry.selector, condition.noLoadingState!, false)
        || this.matchesBrowserextQuery(entry.variant, condition.noLoadingState!, false)
      );
      if (matched) {
        return false;
      }
    }
    if (condition.emptyStateExists) {
      const emptyStates = await this.listBrowserExtensionEmptyStates(sessionId, undefined, 20, options.timeoutMs).catch(() => undefined);
      const matched = emptyStates?.emptyStates?.some((entry) =>
        this.matchesBrowserextQuery(entry.text, condition.emptyStateExists!, false)
        || this.matchesBrowserextQuery(entry.label, condition.emptyStateExists!, false)
        || this.matchesBrowserextQuery(entry.selector, condition.emptyStateExists!, false)
        || this.matchesBrowserextQuery(entry.kind, condition.emptyStateExists!, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.blockerExists) {
      const blockers = await this.readBrowserExtensionPageBlockers(sessionId, { limit: 20, timeoutMs: options.timeoutMs }).catch(() => undefined);
      const matched = [...(blockers?.blockingDialogs ?? []), ...(blockers?.blockingLoadingStates ?? [])].some((entry) =>
        this.matchesBrowserextQuery(String((entry as Record<string, unknown>).text ?? ''), condition.blockerExists!, false)
        || this.matchesBrowserextQuery(String((entry as Record<string, unknown>).label ?? ''), condition.blockerExists!, false)
        || this.matchesBrowserextQuery(String((entry as Record<string, unknown>).selector ?? ''), condition.blockerExists!, false)
        || this.matchesBrowserextQuery(String((entry as Record<string, unknown>).role ?? ''), condition.blockerExists!, false)
        || this.matchesBrowserextQuery(String((entry as Record<string, unknown>).variant ?? ''), condition.blockerExists!, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.noBlockers === true) {
      const blockers = await this.readBrowserExtensionPageBlockers(sessionId, { limit: 20, timeoutMs: options.timeoutMs }).catch(() => undefined);
      if (blockers?.hasBlockers) {
        return false;
      }
    }
    if (condition.pageOutcomeStatus) {
      const outcomes = await this.readBrowserExtensionPageOutcomes(sessionId, {
        limit: 20,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      if (outcomes?.status !== condition.pageOutcomeStatus) {
        return false;
      }
    }
    if (condition.pageReady === true) {
      const ready = await this.ensureBrowserExtensionPageReady(sessionId, {
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      if (ready?.ready !== true) {
        return false;
      }
    }
    if (condition.downloadExists) {
      const downloads = await this.browserExtensionDownloads(sessionId, {
        query: condition.downloadExists.query,
        state: condition.downloadExists.state,
        limit: 20,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      if ((downloads?.count ?? 0) <= 0) {
        return false;
      }
    }
    if (condition.dialogExists) {
      const dialogs = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      const matched = dialogs?.dialogs?.some((entry) =>
        this.matchesBrowserextQuery(entry.label, condition.dialogExists!, false)
        || this.matchesBrowserextQuery(entry.selector, condition.dialogExists!, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.noDialogs === true) {
      const dialogs = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      if ((dialogs?.dialogs?.length ?? 0) > 0) {
        return false;
      }
    }
    if (condition.dialogActionExists) {
      const result = await this.listBrowserExtensionDialogActions(sessionId, condition.dialogActionExists.dialog, {
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      const matched = result?.actions?.some((entry) =>
        this.matchesBrowserextQuery(entry.label, condition.dialogActionExists!.action, false)
        || this.matchesBrowserextQuery(entry.selector, condition.dialogActionExists!.action, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.menuExists) {
      const menus = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      const matched = menus?.menus?.some((entry) =>
        this.matchesBrowserextQuery(entry.label, condition.menuExists!, false)
        || this.matchesBrowserextQuery(entry.selector, condition.menuExists!, false)
        || entry.options.some((option) =>
          this.matchesBrowserextQuery(option.label, condition.menuExists!, false)
          || this.matchesBrowserextQuery(option.value, condition.menuExists!, false)
        )
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.menuOptionExists) {
      const menus = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      const matched = menus?.menus?.some((entry) =>
        (!condition.menuOptionExists?.menu
          || this.matchesBrowserextQuery(entry.label, condition.menuOptionExists.menu, false)
          || this.matchesBrowserextQuery(entry.selector, condition.menuOptionExists.menu, false))
        && entry.options.some((option) =>
          this.matchesBrowserextQuery(option.label, condition.menuOptionExists!.option, false)
          || this.matchesBrowserextQuery(option.value, condition.menuOptionExists!.option, false))
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.noMenus === true) {
      const menus = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      if ((menus?.menus?.length ?? 0) > 0) {
        return false;
      }
    }
    if (condition.disclosureExists) {
      const disclosures = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDisclosures(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      const matched = disclosures?.disclosures?.some((entry) =>
        this.matchesBrowserextQuery(entry.label, condition.disclosureExists!, false)
        || this.matchesBrowserextQuery(entry.selector, condition.disclosureExists!, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.disclosureExpanded) {
      const disclosures = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDisclosures(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      const matched = disclosures?.disclosures?.find((entry) =>
        this.matchesBrowserextQuery(entry.label, condition.disclosureExpanded!.query, false)
        || this.matchesBrowserextQuery(entry.selector, condition.disclosureExpanded!.query, false)
      );
      if (!matched || Boolean(matched.expanded) !== condition.disclosureExpanded.expanded) {
        return false;
      }
    }
    if (condition.collectionExists) {
      const collections = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollections(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      const matched = collections?.collections?.some((entry) =>
        this.matchesBrowserextQuery(entry.label, condition.collectionExists!, false)
        || this.matchesBrowserextQuery(entry.selector, condition.collectionExists!, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.collectionCountAtLeast) {
      const countCondition = condition.collectionCountAtLeast;
      const collections = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
        collectionQuery: countCondition.collection,
        limit: Math.max(200, countCondition.count),
        timeoutMs: options.timeoutMs
      })).catch(() => undefined);
      if ((collections?.count ?? collections?.rows.length ?? 0) < countCondition.count) {
        return false;
      }
    }
    if (condition.collectionItemExists) {
      const collections = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollections(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      const matched = collections?.collections?.some((entry) => {
        if (condition.collectionItemExists?.collection) {
          const collectionMatched = this.matchesBrowserextQuery(entry.label, condition.collectionItemExists.collection, false)
            || this.matchesBrowserextQuery(entry.selector, condition.collectionItemExists.collection, false);
          if (!collectionMatched) {
            return false;
          }
        }
        return entry.items.some((item) =>
          this.matchesBrowserextQuery(item.label, condition.collectionItemExists!.item, false)
          || this.matchesBrowserextQuery(item.text, condition.collectionItemExists!.item, false)
          || this.matchesBrowserextQuery(item.selector, condition.collectionItemExists!.item, false)
        );
      });
      if (!matched) {
        return false;
      }
    }
    if (condition.collectionCellIncludes) {
      const result = await this.getBrowserExtensionCollectionCell(sessionId, {
        collectionQuery: condition.collectionCellIncludes.collection,
        rowQuery: condition.collectionCellIncludes.row,
        cellQuery: condition.collectionCellIncludes.cell,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      if (!(result?.cell?.value ?? '').includes(condition.collectionCellIncludes.text)) {
        return false;
      }
    }
    if (condition.collectionRowActionExists) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRowActions(sessionId, {
        collectionQuery: condition.collectionRowActionExists?.collection,
        rowQuery: condition.collectionRowActionExists!.row,
        timeoutMs: options.timeoutMs
      })).catch(() => undefined);
      const matched = result?.actions?.some((entry) =>
        !condition.collectionRowActionExists?.action
        || this.matchesBrowserextQuery(entry.label, condition.collectionRowActionExists.action, false)
        || this.matchesBrowserextQuery(entry.selector, condition.collectionRowActionExists.action, false)
        || this.matchesBrowserextQuery(entry.actionableType, condition.collectionRowActionExists.action, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.collectionFilterExists) {
      const result = await this.listBrowserExtensionActiveCollectionFilters(sessionId, {
        collectionQuery: condition.collectionFilterExists.collection,
        limit: 50,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      const matched = result?.controls?.some((entry) =>
        this.matchesBrowserextQuery(entry.label, condition.collectionFilterExists!.query, false)
        || this.matchesBrowserextQuery(entry.selector, condition.collectionFilterExists!.query, false)
        || this.matchesBrowserextQuery(entry.value, condition.collectionFilterExists!.query, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.collectionFilterTokenExists) {
      const result = await this.listBrowserExtensionCollectionFilterTokens(sessionId, {
        collectionQuery: condition.collectionFilterTokenExists.collection,
        limit: 50,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      const matched = result?.tokens?.some((entry) =>
        this.matchesBrowserextQuery(entry.label, condition.collectionFilterTokenExists!.query, false)
        || this.matchesBrowserextQuery(entry.selector, condition.collectionFilterTokenExists!.query, false)
        || this.matchesBrowserextQuery(entry.value, condition.collectionFilterTokenExists!.query, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.collectionSortExists) {
      const result = await this.listBrowserExtensionCollectionSortState(sessionId, {
        collectionQuery: condition.collectionSortExists.collection,
        limit: 50,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      const matched = result?.controls?.some((entry) =>
        this.matchesBrowserextQuery(entry.label, condition.collectionSortExists!.query, false)
        || this.matchesBrowserextQuery(entry.selector, condition.collectionSortExists!.query, false)
        || this.matchesBrowserextQuery(entry.value, condition.collectionSortExists!.query, false)
        || this.matchesBrowserextQuery(entry.sortDirection, condition.collectionSortExists!.query, false)
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.noCollectionFilters) {
      const [result, tokens] = await Promise.all([
        this.listBrowserExtensionActiveCollectionFilters(sessionId, {
          collectionQuery: condition.noCollectionFilters.collection,
          limit: 50,
          timeoutMs: options.timeoutMs
        }).catch(() => undefined),
        this.listBrowserExtensionCollectionFilterTokens(sessionId, {
          collectionQuery: condition.noCollectionFilters.collection,
          limit: 50,
          timeoutMs: options.timeoutMs
        }).catch(() => undefined)
      ]);
      if ((result?.count ?? 0) > 0 || (tokens?.count ?? 0) > 0) {
        return false;
      }
    }
    if (condition.collectionSelectionCountAtLeast) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionSelectionState(sessionId, {
        collectionQuery: condition.collectionSelectionCountAtLeast?.collection,
        timeoutMs: options.timeoutMs
      })).catch(() => undefined);
      if ((result?.selectedCount ?? 0) < condition.collectionSelectionCountAtLeast.count) {
        return false;
      }
    }
    if (condition.collectionSelectionCountAtMost) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionSelectionState(sessionId, {
        collectionQuery: condition.collectionSelectionCountAtMost?.collection,
        timeoutMs: options.timeoutMs
      })).catch(() => undefined);
      if ((result?.selectedCount ?? 0) > condition.collectionSelectionCountAtMost.count) {
        return false;
      }
    }
    if (condition.collectionRowExpanded) {
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionRowDetails(sessionId, {
        collectionQuery: condition.collectionRowExpanded?.collection,
        rowQuery: condition.collectionRowExpanded!.row,
        timeoutMs: options.timeoutMs
      })).catch(() => undefined);
      if (Boolean(result?.expanded) !== condition.collectionRowExpanded.expanded) {
        return false;
      }
    }
    if (condition.collectionDetailTextIncludes) {
      const detailCondition = condition.collectionDetailTextIncludes;
      const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionRowDetails(sessionId, {
        collectionQuery: detailCondition.collection,
        rowQuery: detailCondition.row,
        timeoutMs: options.timeoutMs
      })).catch(() => undefined);
      if (!(result?.detailText ?? '').includes(detailCondition.text)) {
        return false;
      }
    }
    if (condition.collectionDiff) {
      const diff = await this.diffBrowserExtensionCollection(sessionId, {
        collectionQuery: condition.collectionDiff.collection,
        againstOutput: condition.collectionDiff.against
          ? this.getBrowserExtensionWorkflowOutput(runtimeState, condition.collectionDiff.against) as Record<string, unknown> | undefined
          : undefined,
        dedupeBy: condition.collectionDiff.dedupeBy,
        includeSelection: condition.collectionDiff.includeSelection,
        includeDetails: condition.collectionDiff.includeDetails,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      if (!diff || !this.browserExtensionCollectionDiffMatches(diff, {
        addedAtLeast: condition.collectionDiff.addedAtLeast,
        removedAtLeast: condition.collectionDiff.removedAtLeast,
        changedAtLeast: condition.collectionDiff.changedAtLeast,
        unchangedAtLeast: condition.collectionDiff.unchangedAtLeast,
        rowAdded: condition.collectionDiff.rowAdded,
        rowRemoved: condition.collectionDiff.rowRemoved,
        rowChanged: condition.collectionDiff.rowChanged
      })) {
        return false;
      }
    }
    if (condition.collectionValuesDiff) {
      const diff = await this.diffBrowserExtensionCollectionValues(sessionId, {
        cellQuery: condition.collectionValuesDiff.cell,
        collectionQuery: condition.collectionValuesDiff.collection,
        rowQuery: condition.collectionValuesDiff.row,
        againstOutput: this.getBrowserExtensionWorkflowOutput(runtimeState, condition.collectionValuesDiff.against) as Record<string, unknown> | undefined,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      if (!diff) {
        return false;
      }
      if (typeof condition.collectionValuesDiff.countDeltaAtLeast === 'number' && diff.countDelta < condition.collectionValuesDiff.countDeltaAtLeast) {
        return false;
      }
      if (typeof condition.collectionValuesDiff.uniqueCountDeltaAtLeast === 'number' && diff.uniqueCountDelta < condition.collectionValuesDiff.uniqueCountDeltaAtLeast) {
        return false;
      }
      if (condition.collectionValuesDiff.addedValue && !diff.addedValues.some((value) => this.matchesBrowserextQuery(value, condition.collectionValuesDiff!.addedValue!, false))) {
        return false;
      }
      if (condition.collectionValuesDiff.removedValue && !diff.removedValues.some((value) => this.matchesBrowserextQuery(value, condition.collectionValuesDiff!.removedValue!, false))) {
        return false;
      }
    }
    if (condition.collectionStatsDiff) {
      const diff = await this.diffBrowserExtensionCollectionStats(sessionId, {
        collectionQuery: condition.collectionStatsDiff.collection,
        cellQuery: condition.collectionStatsDiff.cell,
        againstOutput: this.getBrowserExtensionWorkflowOutput(runtimeState, condition.collectionStatsDiff.against) as Record<string, unknown> | undefined,
        timeoutMs: options.timeoutMs
      }).catch(() => undefined);
      if (!diff) {
        return false;
      }
      if (typeof condition.collectionStatsDiff.countDeltaAtLeast === 'number' && diff.countDelta < condition.collectionStatsDiff.countDeltaAtLeast) {
        return false;
      }
      if (typeof condition.collectionStatsDiff.selectedDeltaAtLeast === 'number' && diff.selectedCountDelta < condition.collectionStatsDiff.selectedDeltaAtLeast) {
        return false;
      }
      if (typeof condition.collectionStatsDiff.expandedDeltaAtLeast === 'number' && diff.expandedCountDelta < condition.collectionStatsDiff.expandedDeltaAtLeast) {
        return false;
      }
      if (typeof condition.collectionStatsDiff.detailDeltaAtLeast === 'number' && diff.detailCountDelta < condition.collectionStatsDiff.detailDeltaAtLeast) {
        return false;
      }
      if (typeof condition.collectionStatsDiff.rowActionDeltaAtLeast === 'number' && diff.rowActionCountDelta < condition.collectionStatsDiff.rowActionDeltaAtLeast) {
        return false;
      }
    }
    if (condition.paginationExists) {
      const paginations = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listPaginations(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      const matched = paginations?.paginations?.some((entry) =>
        this.matchesBrowserextQuery(entry.label, condition.paginationExists!, false)
        || this.matchesBrowserextQuery(entry.selector, condition.paginationExists!, false)
        || entry.options.some((option) => this.matchesBrowserextQuery(option.label, condition.paginationExists!, false))
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.loadMoreExists) {
      const paginations = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listPaginations(sessionId, undefined, 20, options.timeoutMs)).catch(() => undefined);
      const matched = paginations?.paginations?.some((entry) =>
        entry.options.some((option) =>
          option.kind === 'load_more'
          && (this.matchesBrowserextQuery(option.label, condition.loadMoreExists!, false)
            || this.matchesBrowserextQuery(entry.label, condition.loadMoreExists!, false))
        )
      );
      if (!matched) {
        return false;
      }
    }
    if (condition.output) {
      const current = this.getBrowserExtensionWorkflowOutput(runtimeState, condition.output.name);
      const comparable = this.extractBrowserExtensionOutputComparable(current);
      if (condition.output.exists === true && current === undefined) {
        return false;
      }
      if (condition.output.exists === false && current !== undefined) {
        return false;
      }
      if (condition.output.equals !== undefined && comparable !== condition.output.equals) {
        return false;
      }
      if (condition.output.includes !== undefined && !comparable.includes(condition.output.includes)) {
        return false;
      }
    }
    if (condition.outputPath) {
      const source = this.getBrowserExtensionWorkflowOutput(runtimeState, condition.outputPath.output);
      const current = this.resolveBrowserExtensionOutputPath(source, condition.outputPath.path);
      const comparable = this.extractBrowserExtensionOutputComparable(current);
      if (condition.outputPath.exists === true && current === undefined) {
        return false;
      }
      if (condition.outputPath.exists === false && current !== undefined) {
        return false;
      }
      if (condition.outputPath.equals !== undefined && comparable !== condition.outputPath.equals) {
        return false;
      }
      if (condition.outputPath.includes !== undefined && !comparable.includes(condition.outputPath.includes)) {
        return false;
      }
    }
    if (condition.stateDiff) {
      const current = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, {
        timeoutMs: options.timeoutMs
      })) as Record<string, unknown>;
      const baseline = condition.stateDiff.against
        ? this.getBrowserExtensionWorkflowOutput(runtimeState, condition.stateDiff.against) as Record<string, unknown> | undefined
        : runtimeState?.lastPageState;
      const diff = this.diffBrowserExtensionPageStates(baseline, current);
      if (condition.stateDiff.urlChanged !== undefined && diff.urlChanged !== condition.stateDiff.urlChanged) {
        return false;
      }
      if (condition.stateDiff.titleChanged !== undefined && diff.titleChanged !== condition.stateDiff.titleChanged) {
        return false;
      }
      if (condition.stateDiff.textChanged !== undefined && diff.textChanged !== condition.stateDiff.textChanged) {
        return false;
      }
      if (typeof condition.stateDiff.textLengthDeltaAtLeast === 'number' && diff.textLengthDelta < condition.stateDiff.textLengthDeltaAtLeast) {
        return false;
      }
      if (condition.stateDiff.addedActionableQuery) {
        const matched = diff.addedActionables.some((entry) =>
          this.matchesBrowserextQuery(entry.query, condition.stateDiff!.addedActionableQuery!, false)
          || this.matchesBrowserextQuery(entry.selector, condition.stateDiff!.addedActionableQuery!, false)
        );
        if (!matched) {
          return false;
        }
      }
      if (condition.stateDiff.removedActionableQuery) {
        const matched = diff.removedActionables.some((entry) =>
          this.matchesBrowserextQuery(entry.query, condition.stateDiff!.removedActionableQuery!, false)
          || this.matchesBrowserextQuery(entry.selector, condition.stateDiff!.removedActionableQuery!, false)
        );
        if (!matched) {
          return false;
        }
      }
    }
    const pageState = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, {
      timeoutMs: options.timeoutMs
    }));
    const text = pageState.pageState?.snapshot?.text ?? '';
    const url = pageState.pageState?.snapshot?.url ?? '';
    if (condition.textIncludes && !text.includes(condition.textIncludes)) {
      return false;
    }
    if (condition.noTextIncludes && text.includes(condition.noTextIncludes)) {
      return false;
    }
    if (condition.urlIncludes && !url.includes(condition.urlIncludes)) {
      return false;
    }
    if (condition.selectorExists && !await this.browserExtensionSelectorExists(sessionId, condition.selectorExists, options.timeoutMs)) {
      return false;
    }
    if (condition.selectorMissing && await this.browserExtensionSelectorExists(sessionId, condition.selectorMissing, options.timeoutMs)) {
      return false;
    }
    return true;
  }

  private async delayBrowserExtensionWorkflow(ms?: number) {
    if ((ms ?? 0) <= 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isBrowserExtensionTransientCommandTimeout(error: unknown) {
    return String(error).includes('Timed out waiting for browser-extension command:');
  }

  private async withBrowserExtensionTransientRetry<T>(
    action: () => Promise<T>,
    options?: {
      retries?: number;
      delayMs?: number;
    }
  ) {
    const retries = Math.max(0, options?.retries ?? 2);
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await action();
      } catch (error) {
        lastError = error;
        if (!this.isBrowserExtensionTransientCommandTimeout(error) || attempt >= retries) {
          throw error;
        }
        await this.delayBrowserExtensionWorkflow(options?.delayMs ?? 500);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async settleBrowserExtensionWorkflow(
    sessionId: string,
    mode: 'dom' | 'network' | 'page' | undefined,
    options: {
      quietMs?: number;
      timeoutMs?: number;
      intervalMs?: number;
      stableReads?: number;
    }
  ) {
    if (!mode) {
      return undefined;
    }
    if (mode === 'dom') {
      return this.runtime.browserExtensionService.waitForDomQuiet(sessionId, {
        quietMs: options.quietMs,
        timeoutMs: options.timeoutMs,
        intervalMs: options.intervalMs
      });
    }
    if (mode === 'network') {
      return this.runtime.browserExtensionService.waitForNetworkIdle(sessionId, {
        quietMs: options.quietMs,
        timeoutMs: options.timeoutMs,
        intervalMs: options.intervalMs
      });
    }
    return this.runtime.browserExtensionService.waitForPageStable(sessionId, {
      quietMs: options.quietMs,
      timeoutMs: options.timeoutMs,
      intervalMs: options.intervalMs,
      stableReads: options.stableReads
    });
  }

  private async ensureBrowserExtensionSessionUsable(sessionId: string, timeoutMs?: number) {
    const session = this.runtime.browserExtensionService.getSession(sessionId);
    if (session?.connected && session?.ready && typeof session.activeTabId === 'number') {
      return session;
    }
    this.runtime.browserExtensionService.refreshSession(sessionId);
    const refreshed = this.runtime.browserExtensionService.getSession(sessionId);
    if (refreshed?.connected && refreshed?.ready && typeof refreshed.activeTabId === 'number') {
      return refreshed;
    }
    await this.runtime.browserExtensionService.reconnectSession(sessionId, {
      timeoutMs: timeoutMs ?? 30_000,
      intervalMs: 1_000
    });
    const ready = await this.runtime.browserExtensionService.waitForSessionReady(sessionId, {
      timeoutMs: timeoutMs ?? 30_000,
      intervalMs: 1_000
    });
    if (!ready.ready) {
      throw new Error(`Browser-extension session ${sessionId} is not ready`);
    }
    const finalSession = this.runtime.browserExtensionService.getSession(sessionId);
    if (!finalSession || typeof finalSession.activeTabId !== 'number') {
      throw new Error(`Browser-extension session ${sessionId} has no active tab after reconnect`);
    }
    return finalSession;
  }

  private async enforceBrowserExtensionWorkflowGuards(
    sessionId: string,
    stage: 'before' | 'after',
    options: {
      requireTexts?: string[];
      requireNoTexts?: string[];
      requireSelectors?: string[];
      requireNoSelectors?: string[];
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const results: Array<Record<string, unknown>> = [];
    for (const needle of options.requireTexts ?? []) {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.waitForText(sessionId, needle, {
          timeoutMs: options.timeoutMs,
          intervalMs: options.intervalMs
        }));
      if (!result.matched) {
        throw new Error(`query-workflow ${stage} guard failed: required text "${needle}" did not appear`);
      }
      results.push({ kind: 'require-text', stage, needle, result });
    }
    for (const needle of options.requireNoTexts ?? []) {
        const pageState = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, { timeoutMs: options.timeoutMs }));
      const matched = (pageState.pageState?.snapshot?.text ?? '').includes(needle);
      if (matched) {
        throw new Error(`query-workflow ${stage} guard failed: forbidden text "${needle}" is present`);
      }
      results.push({ kind: 'require-no-text', stage, needle, matched: false });
    }
    for (const selector of options.requireSelectors ?? []) {
      const result = await this.runtime.browserExtensionService.waitForSelector(sessionId, selector, {
        timeoutMs: options.timeoutMs,
        intervalMs: options.intervalMs
      });
      if (!result.matched) {
        throw new Error(`query-workflow ${stage} guard failed: required selector "${selector}" did not appear`);
      }
      results.push({ kind: 'require-selector', stage, selector, result });
    }
    for (const selector of options.requireNoSelectors ?? []) {
      const inspected = await this.runtime.browserExtensionService.waitForNoSelector(sessionId, selector, {
        timeoutMs: Math.min(options.timeoutMs ?? 5_000, 5_000),
        intervalMs: options.intervalMs
      });
      if (!inspected.missing) {
        throw new Error(`query-workflow ${stage} guard failed: forbidden selector "${selector}" is present`);
      }
      results.push({ kind: 'require-no-selector', stage, selector, result: inspected });
    }
    return results;
  }

  private async withBrowserExtensionScenarioRetry<T>(
    label: string,
    step: { optional?: boolean; retryCount?: number; retryDelayMs?: number },
    action: (attempt: number) => Promise<T>
  ) {
    const retries = Math.max(0, step.retryCount ?? 0);
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await action(attempt);
      } catch (error) {
        lastError = error;
        if (attempt >= retries) {
          if (step.optional) {
            return {
              ok: false,
              skipped: true,
              optional: true,
              error: String(error),
              attempts: attempt + 1
            } as T;
          }
          throw error;
        }
        await this.delayBrowserExtensionWorkflow(step.retryDelayMs ?? 250);
      }
    }
    throw new Error(`browserext workflow step failed without a captured error: ${label} ${String(lastError)}`);
  }

  private summarizeBrowserExtensionWorkflowSteps(steps: Array<Record<string, unknown>>) {
    const summary = {
      totalSteps: 0,
      executedSteps: 0,
      skippedSteps: 0,
      optionalSkippedSteps: 0,
      assertionSteps: 0,
      discoverySteps: 0,
      branchSteps: 0,
      repeatSteps: 0,
      repeatIterations: 0,
      retrySteps: 0,
      totalRetries: 0,
      branchPaths: [] as string[],
      stepNames: [] as string[]
    };
    const visit = (entries: Array<Record<string, unknown>>) => {
      for (const entry of entries) {
        summary.totalSteps += 1;
        const kind = typeof entry.kind === 'string' ? entry.kind : 'unknown';
        const name = typeof entry.name === 'string' ? entry.name : undefined;
        if (name) {
          summary.stepNames.push(name);
        }
        if (entry.skipped === true) {
          summary.skippedSteps += 1;
          if (entry.optional === true) {
            summary.optionalSkippedSteps += 1;
          }
        } else {
          summary.executedSteps += 1;
        }
        const attempts = typeof entry.attempts === 'number' ? entry.attempts : 1;
        if (attempts > 1) {
          summary.retrySteps += 1;
          summary.totalRetries += attempts - 1;
        }
        if (['capture-url', 'capture-text', 'capture-field', 'capture-form-values', 'capture-next-action', 'extract-output', 'assert-output', 'assert-output-path', 'assert-metadata', 'assert-url-part', 'assert-storage', 'assert-field-value', 'require-field', 'require-field-value', 'require-next-action', 'require-text', 'require-no-text', 'require-selector', 'require-no-selector', 'assert-banner', 'assert-empty-state', 'assert-page-ready', 'assert-cookie', 'assert-download', 'assert-dialog', 'assert-dialog-action', 'assert-menu', 'assert-menu-option', 'assert-disclosure-state', 'assert-no-blockers', 'assert-no-collection-filters', 'assert-collection-filter', 'assert-collection-filter-token', 'assert-collection-sort', 'assert-collection-cell', 'assert-collection-selection', 'assert-collection-detail', 'assert-collection-diff', 'assert-collection-values-diff', 'assert-collection-stats-diff', 'wait-page-outcome', 'wait-cookie', 'wait-download', 'wait-dialog', 'wait-no-dialog', 'wait-menu', 'wait-no-menu', 'wait-disclosure', 'page-ready', 'download-cancel', 'download-erase', 'cookie-remove'].includes(kind)) {
          summary.assertionSteps += 1;
        }
        if (['state-diff', 'snapshot', 'dom-tree', 'inspect', 'inspect-all', 'links', 'frames', 'form-contexts', 'actionables', 'banners', 'loading-states', 'empty-states', 'dialogs', 'dialog-actions', 'menus', 'disclosures', 'collections', 'collection-active-filters', 'collection-filter-tokens', 'collection-sort-state', 'collection-rows', 'collection-find', 'collection-values', 'collection-values-diff', 'collection-stats', 'collection-stats-diff', 'collection-row-actions', 'collection-selection-state', 'collection-row-details', 'collection-export', 'collection-diff', 'wait-collection-diff', 'collection-harvest', 'paginations', 'markdown', 'readability', 'page-state', 'metadata', 'url-parts', 'storage-list', 'storage-get', 'cookies', 'cookie-get', 'downloads', 'page-blockers', 'page-outcomes', 'next-actions', 'context-state', 'wait-cookie', 'wait-download', 'wait-dialog', 'wait-no-dialog', 'wait-menu', 'wait-no-menu', 'wait-disclosure', 'page-ready'].includes(kind)) {
          summary.discoverySteps += 1;
        }
        if (kind === 'branch') {
          summary.branchSteps += 1;
          const path = typeof entry.branch === 'string' ? entry.branch : 'unknown';
          summary.branchPaths.push(name ? `${name}:${path}` : path);
          if (Array.isArray(entry.steps)) {
            visit(entry.steps as Array<Record<string, unknown>>);
          }
        }
        if (kind === 'repeat-until') {
          summary.repeatSteps += 1;
          summary.repeatIterations += typeof entry.iterations === 'number' ? entry.iterations : 0;
          if (Array.isArray(entry.attemptsLog)) {
            for (const attempt of entry.attemptsLog as Array<Record<string, unknown>>) {
              if (Array.isArray(attempt.steps)) {
                visit(attempt.steps as Array<Record<string, unknown>>);
              }
            }
          }
        }
      }
    };
    visit(steps);
    return summary;
  }

  private ensureBrowserExtensionWorkflowOutputs(runtimeState?: BrowserExtensionScenarioRuntimeState) {
    return ensureBrowserExtensionWorkflowOutputs(runtimeState);
  }

  private getBrowserExtensionWorkflowOutput(runtimeState: BrowserExtensionScenarioRuntimeState | undefined, key: string) {
    return getBrowserExtensionWorkflowOutput(runtimeState, key);
  }

  private getBrowserExtensionWorkflowReference(runtimeState: BrowserExtensionScenarioRuntimeState | undefined, reference: string) {
    return getBrowserExtensionWorkflowReference(runtimeState, reference);
  }

  private setBrowserExtensionWorkflowOutput(runtimeState: BrowserExtensionScenarioRuntimeState | undefined, key: string | undefined, value: unknown) {
    setBrowserExtensionWorkflowOutput(runtimeState, key, value);
  }

  private interpolateBrowserExtensionWorkflowValue(value: unknown, runtimeState?: BrowserExtensionScenarioRuntimeState): unknown {
    return interpolateBrowserExtensionWorkflowValue(value, runtimeState);
  }

  private interpolateBrowserExtensionScenarioStep(step: BrowserExtensionScenarioStep, runtimeState?: BrowserExtensionScenarioRuntimeState): BrowserExtensionScenarioStep {
    return this.interpolateBrowserExtensionWorkflowValue(step, runtimeState) as BrowserExtensionScenarioStep;
  }

  private extractBrowserExtensionOutputComparable(value: unknown): string {
    return extractBrowserExtensionOutputComparable(value);
  }

  private readBrowserExtensionMetadataValue(metadata: Record<string, unknown> | undefined, key: string): unknown {
    if (!metadata || !key.trim()) {
      return undefined;
    }
    const normalized = key.trim().toLowerCase();
    if (normalized === 'title') {
      return metadata.title;
    }
    if (normalized === 'url') {
      return metadata.url;
    }
    if (normalized === 'description') {
      return metadata.description;
    }
    if (normalized === 'canonical' || normalized === 'canonicalurl') {
      return metadata.canonicalUrl;
    }
    if (normalized === 'language' || normalized === 'lang') {
      return metadata.language;
    }
    const metas = (metadata.metas ?? {}) as Record<string, unknown>;
    return metas[key] ?? metas[normalized];
  }

  private readBrowserExtensionUrlPartValue(urlParts: Record<string, unknown> | undefined, key: string): unknown {
    if (!urlParts || !key.trim()) {
      return undefined;
    }
    const normalized = key.trim();
    if (normalized.startsWith('query.')) {
      const query = (urlParts.query ?? {}) as Record<string, unknown>;
      const value = query[normalized.slice('query.'.length)];
      if (Array.isArray(value)) {
        return value.join(',');
      }
      return value;
    }
    return urlParts[normalized];
  }

  private resolveBrowserExtensionOutputPath(value: unknown, path: string): unknown {
    return resolveBrowserExtensionOutputPath(value, path);
  }

  private summarizeBrowserExtensionPageStateForDiff(result: Record<string, unknown> | undefined) {
    const pageState = result?.pageState as Record<string, unknown> | undefined;
    const snapshot = pageState?.snapshot as Record<string, unknown> | undefined;
    const actionables = Array.isArray(pageState?.actionables) ? pageState?.actionables as Array<Record<string, unknown>> : [];
    const links = Array.isArray(pageState?.links) ? pageState?.links as Array<Record<string, unknown>> : [];
    const text = typeof snapshot?.text === 'string' ? snapshot.text : '';
    return {
      url: typeof snapshot?.url === 'string' ? snapshot.url : '',
      title: typeof snapshot?.title === 'string' ? snapshot.title : '',
      text,
      textLength: text.length,
      actionables: actionables.map((entry) => ({
        query: typeof entry.query === 'string' ? entry.query : '',
        role: typeof entry.role === 'string' ? entry.role : '',
        selector: typeof entry.selector === 'string' ? entry.selector : ''
      })),
      links: links.map((entry) => ({
        text: typeof entry.text === 'string' ? entry.text : '',
        href: typeof entry.href === 'string' ? entry.href : ''
      }))
    };
  }

  private diffBrowserExtensionPageStates(previous: Record<string, unknown> | undefined, current: Record<string, unknown>) {
    const before = this.summarizeBrowserExtensionPageStateForDiff(previous);
    const after = this.summarizeBrowserExtensionPageStateForDiff(current);
    const beforeActionables = new Set(before.actionables.map((entry) => `${entry.query}|${entry.role}|${entry.selector}`));
    const afterActionables = new Set(after.actionables.map((entry) => `${entry.query}|${entry.role}|${entry.selector}`));
    const addedActionables = after.actionables.filter((entry) => !beforeActionables.has(`${entry.query}|${entry.role}|${entry.selector}`));
    const removedActionables = before.actionables.filter((entry) => !afterActionables.has(`${entry.query}|${entry.role}|${entry.selector}`));
    return {
      urlChanged: before.url !== after.url,
      titleChanged: before.title !== after.title,
      textChanged: before.text !== after.text,
      textLengthDelta: after.textLength - before.textLength,
      addedActionables,
      removedActionables,
      before,
      after
    };
  }

  async diffBrowserExtensionPageState(
    sessionId: string,
    options: {
      againstFile: string;
      selector?: string;
      frameSelectors?: string[];
      limit?: number;
      maxDepth?: number;
      maxChildren?: number;
      timeoutMs?: number;
    }
  ) {
    const current = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, {
      selector: options.selector,
      frameSelectors: options.frameSelectors,
      limit: options.limit,
      maxDepth: options.maxDepth,
      maxChildren: options.maxChildren,
      timeoutMs: options.timeoutMs
    })) as Record<string, unknown>;
    const baseline = JSON.parse(readFileSync(resolvePath(options.againstFile), 'utf8')) as Record<string, unknown>;
    return {
      sessionId,
      againstFile: options.againstFile,
      selector: options.selector,
      frameSelectors: options.frameSelectors,
      diff: this.diffBrowserExtensionPageStates(baseline, current),
      baseline,
      current
    };
  }

  async waitForBrowserExtensionPageDiff(
    sessionId: string,
    options: {
      againstFile: string;
      selector?: string;
      frameSelectors?: string[];
      limit?: number;
      maxDepth?: number;
      maxChildren?: number;
      urlChanged?: boolean;
      titleChanged?: boolean;
      textChanged?: boolean;
      textLengthDeltaAtLeast?: number;
      addedActionableQuery?: string;
      removedActionableQuery?: string;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const intervalMs = options.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastResult: Record<string, unknown> | undefined;
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.diffBrowserExtensionPageState(sessionId, options).catch(() => undefined);
      if (result) {
        lastResult = result as Record<string, unknown>;
        const diff = result.diff as Record<string, unknown>;
        const addedActionables = Array.isArray(diff.addedActionables) ? diff.addedActionables as Array<Record<string, unknown>> : [];
        const removedActionables = Array.isArray(diff.removedActionables) ? diff.removedActionables as Array<Record<string, unknown>> : [];
        const matched = (options.urlChanged === undefined || diff.urlChanged === options.urlChanged)
          && (options.titleChanged === undefined || diff.titleChanged === options.titleChanged)
          && (options.textChanged === undefined || diff.textChanged === options.textChanged)
          && (options.textLengthDeltaAtLeast === undefined || Number(diff.textLengthDelta ?? 0) >= options.textLengthDeltaAtLeast)
          && (!options.addedActionableQuery || addedActionables.some((entry) =>
            this.matchesBrowserextQuery(String(entry.query ?? ''), options.addedActionableQuery!, false)
            || this.matchesBrowserextQuery(String(entry.selector ?? ''), options.addedActionableQuery!, false)))
          && (!options.removedActionableQuery || removedActionables.some((entry) =>
            this.matchesBrowserextQuery(String(entry.query ?? ''), options.removedActionableQuery!, false)
            || this.matchesBrowserextQuery(String(entry.selector ?? ''), options.removedActionableQuery!, false)));
        if (matched) {
          return {
            sessionId,
            againstFile: options.againstFile,
            timedOut: false,
            waitedMs: Date.now() - startedAt,
            result
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      againstFile: options.againstFile,
      timedOut: true,
      waitedMs: Date.now() - startedAt,
      result: lastResult
    };
  }

  private async planBrowserExtensionScenarioStep(
    sessionId: string,
    step: BrowserExtensionScenarioStep,
    defaults: Omit<BrowserExtensionScenarioDocument, 'steps'>,
    runtimeState?: BrowserExtensionScenarioRuntimeState
  ): Promise<Record<string, unknown>> {
    const frameSelectors = 'frameSelectors' in step ? step.frameSelectors : defaults.frameSelectors;
    const exact = 'exact' in step && step.exact !== undefined ? step.exact : defaults.exact;
    const contextQuery = 'contextQuery' in step ? step.contextQuery : undefined;
    const frameQuery = 'frameQuery' in step ? step.frameQuery : undefined;
    const lockedContext = this.shouldReuseLockedBrowserExtensionContext(step, defaults, runtimeState)
      ? runtimeState?.lockedContext
      : undefined;
    const shouldResolveContext = ['fill', 'auth-login', 'radio', 'segment', 'tab', 'step', 'date', 'time', 'datetime', 'range', 'toggle', 'submit', 'submit-query', 'click', 'clear-selector', 'capture-field', 'capture-form-values', 'assert-field-value', 'require-field', 'require-field-value'].includes(step.kind)
      && Boolean(
        ('formSelector' in step ? step.formSelector : defaults.formSelector)
        || contextQuery
        || defaults.contextQuery
        || frameQuery
        || defaults.frameQuery
      );
    const resolvedContext = lockedContext ?? (shouldResolveContext
      ? await this.resolveBrowserExtensionFormContext(sessionId, {
          frameSelectors,
          formSelector: 'formSelector' in step ? step.formSelector : defaults.formSelector,
          contextQuery: contextQuery ?? defaults.contextQuery,
          frameQuery: frameQuery ?? defaults.frameQuery,
          exact,
          timeoutMs: defaults.timeoutMs
        })
      : undefined);
    const preferredFormSelector = resolvedContext?.preferredFormSelector;
    const effectiveFrameSelectors = frameSelectors ?? resolvedContext?.selectedContext?.frameSelectors;

    switch (step.kind) {
      case 'navigate':
        return { kind: step.kind, name: step.name, url: step.url };
      case 'back':
      case 'forward':
      case 'reload':
        return { kind: step.kind, name: step.name };
      case 'capture-url': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.snapshotBrowserExtensionSession(
          sessionId,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, saveAs: step.saveAs, result };
      }
      case 'capture-text': {
        const captureSelector = step.selector;
        const result = captureSelector
          ? await this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(sessionId, captureSelector, defaults.timeoutMs)).catch((error) => ({ error: String(error) }))
          : await this.withBrowserExtensionTransientRetry(() => this.snapshotBrowserExtensionSession(sessionId, defaults.timeoutMs)).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, selector: step.selector, saveAs: step.saveAs, result };
      }
      case 'capture-field': {
        const result = await this.runtime.browserExtensionService.findFormField(
          sessionId,
          step.query,
          effectiveFrameSelectors,
          exact === true,
          defaults.timeoutMs,
          preferredFormSelector
        ).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, saveAs: step.saveAs, result };
      }
      case 'capture-form-values': {
        const result = await this.listFormValuesBrowserExtensionSession(sessionId, {
          frameSelectors: effectiveFrameSelectors,
          formSelector: preferredFormSelector,
          contextQuery: contextQuery ?? defaults.contextQuery,
          frameQuery: frameQuery ?? defaults.frameQuery,
          exact,
          limit: step.limit ?? 100,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, saveAs: step.saveAs, result };
      }
      case 'capture-next-action': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.suggestNextActions(sessionId, {
          frameSelectors: effectiveFrameSelectors,
          limit: 20,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error), suggestions: [] }));
        const matched = (result as { suggestions?: Array<{ query?: string }> }).suggestions?.find((entry) =>
          this.matchesBrowserextQuery(entry.query, step.query, exact === true)
        );
        return { kind: step.kind, name: step.name, query: step.query, saveAs: step.saveAs, matched, result };
      }
      case 'extract-output': {
        const source = this.getBrowserExtensionWorkflowOutput(runtimeState, step.output);
        const value = this.resolveBrowserExtensionOutputPath(source, step.path);
        const comparable = this.extractBrowserExtensionOutputComparable(value);
        return { kind: step.kind, name: step.name, output: step.output, path: step.path, value, comparable, saveAs: step.saveAs };
      }
      case 'assert-output': {
        const current = this.getBrowserExtensionWorkflowOutput(runtimeState, step.output);
        const comparable = this.extractBrowserExtensionOutputComparable(current);
        return { kind: step.kind, name: step.name, output: step.output, current, comparable, equals: step.equals, includes: step.includes, exists: step.exists };
      }
      case 'assert-output-path': {
        const source = this.getBrowserExtensionWorkflowOutput(runtimeState, step.output);
        const current = this.resolveBrowserExtensionOutputPath(source, step.path);
        const comparable = this.extractBrowserExtensionOutputComparable(current);
        return { kind: step.kind, name: step.name, output: step.output, path: step.path, current, comparable, equals: step.equals, includes: step.includes, exists: step.exists };
      }
      case 'assert-field-value': {
        const result = await this.listFormValuesBrowserExtensionSession(sessionId, {
          frameSelectors: effectiveFrameSelectors,
          formSelector: preferredFormSelector,
          contextQuery: contextQuery ?? defaults.contextQuery,
          frameQuery: frameQuery ?? defaults.frameQuery,
          exact,
          limit: 100,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, equals: step.equals, includes: step.includes, exists: step.exists, result };
      }
      case 'state-diff': {
        const current = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, {
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        const baseline = step.against
          ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.against) as Record<string, unknown> | undefined
          : runtimeState?.lastPageState;
        return { kind: step.kind, name: step.name, against: step.against, result: current, diff: this.diffBrowserExtensionPageStates(baseline, current as Record<string, unknown>) };
      }
      case 'snapshot': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.snapshotBrowserExtensionSession(
          sessionId,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'dom-tree': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.domTreeBrowserExtensionSession(
          sessionId,
          step.selector,
          effectiveFrameSelectors,
          step.maxDepth,
          step.maxChildren,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'inspect': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(
          sessionId,
          step.selector,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'inspect-all': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.inspectAllBrowserExtensionSession(
          sessionId,
          step.selector,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'links': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.browserExtensionLinks(
          sessionId,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'frames': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.listBrowserExtensionFrames(
          sessionId,
          effectiveFrameSelectors,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'form-contexts': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.listFormContextsBrowserExtensionSession(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'actionables': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listActionables(sessionId, {
          selector: step.selector,
          frameSelectors: effectiveFrameSelectors,
          limit: step.limit ?? 20,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'banners': {
        const result = await this.listBrowserExtensionBanners(sessionId, effectiveFrameSelectors, step.limit ?? 20, defaults.timeoutMs).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'banner-dismiss': {
        const result = await this.listBrowserExtensionBanners(sessionId, effectiveFrameSelectors, 20, defaults.timeoutMs).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-banner': {
        const result = await this.listBrowserExtensionBanners(sessionId, effectiveFrameSelectors, step.limit ?? 20, defaults.timeoutMs).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, text: step.text, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-no-banner': {
        const result = await this.listBrowserExtensionBanners(sessionId, effectiveFrameSelectors, step.limit ?? 20, defaults.timeoutMs).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, text: step.text, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-dialog': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-no-dialog': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'loading-states': {
        const result = await this.listBrowserExtensionLoadingStates(sessionId, effectiveFrameSelectors, step.limit ?? 20, defaults.timeoutMs).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'empty-states': {
        const result = await this.listBrowserExtensionEmptyStates(sessionId, effectiveFrameSelectors, step.limit ?? 20, defaults.timeoutMs).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'dialogs': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'dialog-actions': {
        const result = await this.listBrowserExtensionDialogActions(sessionId, step.query, {
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'dialog-close': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(
          sessionId,
          effectiveFrameSelectors,
          20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'dialog-action': {
        const result = await this.listBrowserExtensionDialogActions(sessionId, step.dialog, {
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, dialog: step.dialog, action: step.action, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'menus': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-menu': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-no-menu': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'menu-select': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(
          sessionId,
          effectiveFrameSelectors,
          20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, menu: step.menu, option: step.option, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'disclosures': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDisclosures(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-disclosure': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDisclosures(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, state: step.state, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'disclosure-toggle': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDisclosures(
          sessionId,
          effectiveFrameSelectors,
          20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, desiredState: step.desiredState, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collections': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollections(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-active-filters': {
        const result = await this.listBrowserExtensionActiveCollectionFilters(sessionId, {
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          limit: step.limit ?? 20,
          exact,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-filter-tokens': {
        const result = await this.listBrowserExtensionCollectionFilterTokens(sessionId, {
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          limit: step.limit ?? 20,
          exact,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-sort-state': {
        const result = await this.listBrowserExtensionCollectionSortState(sessionId, {
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          limit: step.limit ?? 20,
          exact,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-rows': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          limit: step.limit ?? 20,
          exact,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-find': {
        const result = await this.findBrowserExtensionCollectionRows(sessionId, {
          query: step.query,
          cellQuery: step.cell,
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, query: step.query, cell: step.cell, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-values': {
        const result = await this.getBrowserExtensionCollectionValues(sessionId, {
          cellQuery: step.cell,
          rowQuery: step.row,
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, cell: step.cell, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-values-diff': {
        const result = await this.diffBrowserExtensionCollectionValues(sessionId, {
          cellQuery: step.cell,
          rowQuery: step.row,
          collectionQuery: step.collection,
          againstFile: step.againstFile,
          againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, cell: step.cell, againstFile: step.againstFile, againstOutput: step.againstOutput, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-stats': {
        const result = await this.getBrowserExtensionCollectionStats(sessionId, {
          cellQuery: step.cell,
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, cell: step.cell, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-stats-diff': {
        const result = await this.diffBrowserExtensionCollectionStats(sessionId, {
          cellQuery: step.cell,
          collectionQuery: step.collection,
          againstFile: step.againstFile,
          againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, cell: step.cell, againstFile: step.againstFile, againstOutput: step.againstOutput, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-row': {
        const result = await this.getBrowserExtensionCollectionRow(sessionId, {
          rowQuery: step.row,
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-cell': {
        const result = await this.getBrowserExtensionCollectionCell(sessionId, {
          rowQuery: step.row,
          cellQuery: step.cell,
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, cell: step.cell, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-collection-row': {
        const result = await this.waitForBrowserExtensionCollectionRow(sessionId, {
          rowQuery: step.row,
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
          intervalMs: step.intervalMs ?? defaults.intervalMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-collection-count': {
        const result = await this.waitForBrowserExtensionCollectionCount(sessionId, {
          count: step.count,
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
          intervalMs: step.intervalMs ?? defaults.intervalMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, count: step.count, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-row-actions': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRowActions(sessionId, {
          collectionQuery: step.collection,
          rowQuery: step.row,
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-selection-state': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionSelectionState(sessionId, {
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-click': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollections(
          sessionId,
          effectiveFrameSelectors,
          20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, item: step.item, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-row-click': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRowActions(sessionId, {
          collectionQuery: step.collection,
          rowQuery: step.row,
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, action: step.action, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-row-select': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionSelectionState(sessionId, {
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, desiredState: step.desiredState, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-select-all': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionSelectionState(sessionId, {
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, desiredState: step.desiredState, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-row-details': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionRowDetails(sessionId, {
          collectionQuery: step.collection,
          rowQuery: step.row,
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-row-expand': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionRowDetails(sessionId, {
          collectionQuery: step.collection,
          rowQuery: step.row,
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, desiredState: step.desiredState, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'assert-collection-cell': {
        const result = await this.getBrowserExtensionCollectionCell(sessionId, {
          rowQuery: step.row,
          cellQuery: step.cell,
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: 200,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, cell: step.cell, equals: step.equals, includes: step.includes, exists: step.exists, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'assert-collection-selection': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionSelectionState(sessionId, {
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, atLeast: step.atLeast, atMost: step.atMost, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'assert-collection-detail': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionRowDetails(sessionId, {
          collectionQuery: step.collection,
          rowQuery: step.row,
          frameSelectors: effectiveFrameSelectors,
          exact,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, includes: step.includes, expanded: step.expanded, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'assert-collection-values-diff': {
        const result = await this.diffBrowserExtensionCollectionValues(sessionId, {
          cellQuery: step.cell,
          rowQuery: step.row,
          collectionQuery: step.collection,
          againstFile: step.againstFile,
          againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, row: step.row, cell: step.cell, againstFile: step.againstFile, againstOutput: step.againstOutput, addedValue: step.addedValue, removedValue: step.removedValue, countDeltaAtLeast: step.countDeltaAtLeast, uniqueCountDeltaAtLeast: step.uniqueCountDeltaAtLeast, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'assert-collection-stats-diff': {
        const result = await this.diffBrowserExtensionCollectionStats(sessionId, {
          cellQuery: step.cell,
          collectionQuery: step.collection,
          againstFile: step.againstFile,
          againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, cell: step.cell, againstFile: step.againstFile, againstOutput: step.againstOutput, countDeltaAtLeast: step.countDeltaAtLeast, selectedDeltaAtLeast: step.selectedDeltaAtLeast, expandedDeltaAtLeast: step.expandedDeltaAtLeast, detailDeltaAtLeast: step.detailDeltaAtLeast, rowActionDeltaAtLeast: step.rowActionDeltaAtLeast, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-bulk-action': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.bulkClickBrowserExtensionCollectionRows(sessionId, {
          rowQueries: step.rows,
          actionQuery: step.action,
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          continueOnError: step.continueOnError,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, rows: step.rows, action: step.action, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-export': {
        const result = await this.exportBrowserExtensionCollection(sessionId, {
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          includeSelection: step.includeSelection,
          includeDetails: step.includeDetails,
          format: step.format,
          filePath: step.file,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, format: step.format, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-diff': {
        const againstOutput = step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined;
        const result = await this.diffBrowserExtensionCollection(sessionId, {
          collectionQuery: step.collection,
          againstFile: step.againstFile,
          againstOutput,
          frameSelectors: effectiveFrameSelectors,
          exact,
          dedupeBy: step.dedupeBy,
          includeSelection: step.includeSelection,
          includeDetails: step.includeDetails,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, againstFile: step.againstFile, againstOutput: step.againstOutput, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-collection-diff': {
        const againstOutput = step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined;
        const result = await this.waitForBrowserExtensionCollectionDiff(sessionId, {
          collectionQuery: step.collection,
          againstFile: step.againstFile,
          againstOutput,
          frameSelectors: effectiveFrameSelectors,
          exact,
          dedupeBy: step.dedupeBy,
          includeSelection: step.includeSelection,
          includeDetails: step.includeDetails,
          addedAtLeast: step.addedAtLeast,
          removedAtLeast: step.removedAtLeast,
          changedAtLeast: step.changedAtLeast,
          unchangedAtLeast: step.unchangedAtLeast,
          rowAdded: step.rowAdded,
          rowRemoved: step.rowRemoved,
          rowChanged: step.rowChanged,
          timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
          intervalMs: step.intervalMs ?? defaults.intervalMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, againstFile: step.againstFile, againstOutput: step.againstOutput, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'assert-collection-diff': {
        const againstOutput = step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined;
        const result = await this.diffBrowserExtensionCollection(sessionId, {
          collectionQuery: step.collection,
          againstFile: step.againstFile,
          againstOutput,
          frameSelectors: effectiveFrameSelectors,
          exact,
          dedupeBy: step.dedupeBy,
          includeSelection: step.includeSelection,
          includeDetails: step.includeDetails,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, againstFile: step.againstFile, againstOutput: step.againstOutput, addedAtLeast: step.addedAtLeast, removedAtLeast: step.removedAtLeast, changedAtLeast: step.changedAtLeast, unchangedAtLeast: step.unchangedAtLeast, rowAdded: step.rowAdded, rowRemoved: step.rowRemoved, rowChanged: step.rowChanged, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'collection-harvest': {
        const result = await this.harvestBrowserExtensionCollection(sessionId, {
          collectionQuery: step.collection,
          strategy: step.strategy,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit,
          maxIterations: step.maxIterations,
          stableIterations: step.stableIterations,
          settleQuietMs: step.settleQuietMs ?? defaults.settleQuietMs,
          dedupeBy: step.dedupeBy,
          scrollAmount: step.scrollAmount,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, strategy: step.strategy, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'paginations': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listPaginations(
          sessionId,
          effectiveFrameSelectors,
          step.limit ?? 20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'pagination-click': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listPaginations(
          sessionId,
          effectiveFrameSelectors,
          20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'load-more': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listPaginations(
          sessionId,
          effectiveFrameSelectors,
          20,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'markdown': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.browserExtensionMarkdown(
          sessionId,
          step.selector,
          defaults.timeoutMs,
          effectiveFrameSelectors
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'readability': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.browserExtensionReadability(
          sessionId,
          step.selector,
          defaults.timeoutMs,
          effectiveFrameSelectors
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'page-state': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, {
          selector: step.selector,
          frameSelectors: effectiveFrameSelectors,
          limit: step.limit ?? 20,
          maxDepth: step.maxDepth,
          maxChildren: step.maxChildren,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'metadata': {
        const result = await this.browserExtensionMetadata(sessionId, defaults.timeoutMs).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'url-parts': {
        const result = await this.browserExtensionUrlParts(sessionId, defaults.timeoutMs).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'storage-list': {
        const result = await this.browserExtensionListStorage(sessionId, {
          scope: step.scope,
          limit: step.limit,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, scope: step.scope, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'storage-get': {
        const result = await this.browserExtensionGetStorageEntry(sessionId, step.key, {
          scope: step.scope,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, key: step.key, scope: step.scope, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'storage-set': {
        const result = await this.browserExtensionSetStorageEntry(sessionId, step.key, step.value, {
          scope: step.scope,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, key: step.key, scope: step.scope, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'storage-remove': {
        const result = await this.browserExtensionRemoveStorageEntry(sessionId, step.key, {
          scope: step.scope,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, key: step.key, scope: step.scope, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'cookies': {
        const result = await this.browserExtensionCookies(sessionId, step.targetUrl, defaults.timeoutMs).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'cookie-get': {
        const result = await this.browserExtensionGetCookie(sessionId, step.name, {
          targetUrl: step.targetUrl,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'cookie-set': {
        const result = await this.browserExtensionSetCookie(sessionId, step.name, step.value, {
          targetUrl: step.targetUrl,
          domain: step.domain,
          path: step.path,
          secure: step.secure,
          httpOnly: step.httpOnly,
          sameSite: step.sameSite,
          expirationDate: step.expirationDate,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'cookie-remove': {
        const result = await this.browserExtensionRemoveCookie(sessionId, step.name, {
          targetUrl: step.targetUrl,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-cookie': {
        const result = await this.waitForBrowserExtensionCookie(sessionId, {
          name: step.name,
          targetUrl: step.targetUrl,
          equals: step.equals,
          includes: step.includes,
          exists: step.exists,
          timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
          intervalMs: step.intervalMs ?? defaults.intervalMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'downloads': {
        const result = await this.browserExtensionDownloads(sessionId, {
          query: step.query,
          state: step.state,
          limit: step.limit ?? 20,
          exact,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, state: step.state, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'wait-download': {
        const result = await this.browserExtensionDownloads(sessionId, {
          query: step.query,
          state: step.state,
          limit: step.limit ?? 20,
          exact,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, state: step.state, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'page-blockers': {
        const result = await this.readBrowserExtensionPageBlockers(sessionId, {
          frameSelectors: effectiveFrameSelectors,
          limit: step.limit ?? 20,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'page-outcomes': {
        const result = await this.readBrowserExtensionPageOutcomes(sessionId, {
          frameSelectors: effectiveFrameSelectors,
          limit: step.limit ?? 20,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'page-ready': {
        const result = await this.ensureBrowserExtensionPageReady(sessionId, {
          collectionQuery: step.collection,
          frameSelectors: effectiveFrameSelectors,
          exact,
          limit: step.limit ?? 20,
          timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
          intervalMs: step.intervalMs ?? defaults.intervalMs,
          continueOnError: step.continueOnError
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'page-recover': {
        const result = await this.readBrowserExtensionPageBlockers(sessionId, {
          frameSelectors: effectiveFrameSelectors,
          limit: step.limit ?? 20,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, collection: step.collection, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'next-actions': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.suggestNextActions(sessionId, {
          selector: step.selector,
          frameSelectors: effectiveFrameSelectors,
          limit: step.limit ?? 20,
          maxDepth: step.maxDepth,
          maxChildren: step.maxChildren,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'context-state': {
        const result = await this.browserExtensionContextState(sessionId, {
          frameSelectors: effectiveFrameSelectors,
          formSelector: preferredFormSelector,
          contextQuery: contextQuery ?? defaults.contextQuery,
          frameQuery: frameQuery ?? defaults.frameQuery,
          exact,
          limit: step.limit ?? 20,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, result, selectedContext: resolvedContext?.selectedContext };
      }
      case 'fill': {
        const result = await this.runtime.browserExtensionService.findFormField(sessionId, step.query, effectiveFrameSelectors, exact, defaults.timeoutMs, preferredFormSelector).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, value: step.value, preferredFormSelector, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'fill-selector': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(
          sessionId,
          step.selector,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, selector: step.selector, value: step.value, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'clear-selector': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(
          sessionId,
          step.selector,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, selector: step.selector, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'field-validation': {
        const result = await this.runtime.browserExtensionService.formValidation(sessionId, step.selector, {
          frameSelectors: effectiveFrameSelectors,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, selector: step.selector, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'auth-login': {
        const emailField = step.email
          ? await this.runtime.browserExtensionService.findFormField(sessionId, 'email', effectiveFrameSelectors, false, defaults.timeoutMs, preferredFormSelector).catch((error) => ({ error: String(error) }))
          : undefined;
        const usernameField = step.username
          ? await this.runtime.browserExtensionService.findFormField(sessionId, 'username', effectiveFrameSelectors, false, defaults.timeoutMs, preferredFormSelector).catch((error) => ({ error: String(error) }))
          : undefined;
        const passwordField = await this.runtime.browserExtensionService.findFormField(sessionId, 'password', effectiveFrameSelectors, false, defaults.timeoutMs, preferredFormSelector).catch((error) => ({ error: String(error) }));
        return {
          kind: step.kind,
          name: step.name,
          email: step.email,
          username: step.username,
          preferredFormSelector,
          selectedContext: resolvedContext?.selectedContext,
          emailField,
          usernameField,
          passwordField
        };
      }
      case 'click':
      case 'submit-query': {
        const result = await this.runtime.browserExtensionService.locateInPage(sessionId, step.query, {
          by: 'text',
          selector: preferredFormSelector,
          frameSelectors: effectiveFrameSelectors,
          limit: 1,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error), matches: [] }));
        return { kind: step.kind, name: step.name, query: step.query, preferredFormSelector, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'click-selector': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(
          sessionId,
          step.selector,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, selector: step.selector, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'click-human-selector':
      case 'focus-selector': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(
          sessionId,
          step.selector,
          defaults.timeoutMs
        )).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, selector: step.selector, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'blur-selector':
      case 'commit-selector': {
        const selector = step.selector;
        const result = selector
          ? await this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(
              sessionId,
              selector,
              defaults.timeoutMs
            )).catch((error) => ({ error: String(error) }))
          : { selector: undefined, active: true };
        return { kind: step.kind, name: step.name, selector, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'wait-field-validation': {
        const result = await this.runtime.browserExtensionService.formValidation(sessionId, step.selector, {
          frameSelectors: effectiveFrameSelectors,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return {
          kind: step.kind,
          name: step.name,
          selector: step.selector,
          expectedState: step.state,
          messageIncludes: step.messageIncludes,
          messageEquals: step.messageEquals,
          selectedContext: resolvedContext?.selectedContext,
          result
        };
      }
      case 'radio': {
        const groups = await this.runtime.browserExtensionService.listRadioGroups(sessionId, effectiveFrameSelectors, 100, defaults.timeoutMs);
        const group = groups.groups.find((entry) =>
          [entry.name, entry.formSelector, ...entry.options.map((option) => option.label ?? option.value ?? option.selector)]
            .some((value) => this.matchesBrowserextQuery(value, step.query, exact === true))
        );
        const option = group?.options.find((entry) =>
          [entry.label, entry.value, entry.selector].some((value) => this.matchesBrowserextQuery(value, step.value, exact === true))
        );
        return { kind: step.kind, name: step.name, query: step.query, value: step.value, preferredFormSelector, selectedContext: resolvedContext?.selectedContext, group, option };
      }
      case 'segment': {
        const groups = await this.runtime.browserExtensionService.listSegmentedGroups(sessionId, effectiveFrameSelectors, 100, defaults.timeoutMs);
        const group = groups.groups.find((entry) =>
          [entry.label, entry.selector, entry.formSelector, ...entry.options.map((option) => option.label ?? option.value ?? option.selector)]
            .some((value) => this.matchesBrowserextQuery(value, step.query, exact === true))
        );
        const option = group?.options.find((entry) =>
          [entry.label, entry.value, entry.selector].some((value) => this.matchesBrowserextQuery(value, step.value, exact === true))
        );
        return { kind: step.kind, name: step.name, query: step.query, value: step.value, preferredFormSelector, selectedContext: resolvedContext?.selectedContext, group, option };
      }
      case 'tab': {
        const groups = await this.runtime.browserExtensionService.listTablists(sessionId, effectiveFrameSelectors, 100, defaults.timeoutMs);
        const group = groups.groups.find((entry) =>
          [entry.label, entry.selector, entry.formSelector, ...entry.options.map((option) => option.label ?? option.value ?? option.selector)]
            .some((value) => this.matchesBrowserextQuery(value, step.query, exact === true))
        );
        const option = group?.options.find((entry) =>
          [entry.label, entry.value, entry.selector].some((value) => this.matchesBrowserextQuery(value, step.value, exact === true))
        );
        return { kind: step.kind, name: step.name, query: step.query, value: step.value, preferredFormSelector, selectedContext: resolvedContext?.selectedContext, group, option };
      }
      case 'step': {
        const result = await this.runtime.browserExtensionService.listSteppers(sessionId, effectiveFrameSelectors, 50, defaults.timeoutMs)
          .catch((error) => ({ error: String(error), steppers: [] }));
        const stepQuery = step.query;
        const matched = (result as { steppers?: Array<Record<string, unknown>> }).steppers?.find((entry) =>
          !stepQuery || [entry.label, entry.selector, (entry.next as Record<string, unknown> | undefined)?.label, (entry.previous as Record<string, unknown> | undefined)?.label]
            .some((value) => this.matchesBrowserextQuery(typeof value === 'string' ? value : undefined, stepQuery, exact === true))
        );
        return { kind: step.kind, name: step.name, query: step.query, direction: step.direction ?? 'next', preferredFormSelector, selectedContext: resolvedContext?.selectedContext, matched, result };
      }
      case 'date':
      case 'time':
      case 'datetime': {
        const result = await this.runtime.browserExtensionService.findFormField(
          sessionId,
          step.query,
          effectiveFrameSelectors,
          exact === true,
          defaults.timeoutMs,
          preferredFormSelector
        ).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, value: step.value, preferredFormSelector, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'range':
      case 'toggle': {
        const result = await this.runtime.browserExtensionService.locateInPage(sessionId, step.query, {
          by: 'text',
          selector: preferredFormSelector,
          frameSelectors: effectiveFrameSelectors,
          limit: 3,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error), matches: [] }));
        return { kind: step.kind, name: step.name, query: step.query, preferredFormSelector, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'submit': {
        return {
          kind: step.kind,
          name: step.name,
          selector: step.selector,
          preferredFormSelector,
          selectedContext: resolvedContext?.selectedContext,
          submitSelectors: resolvedContext?.selectedContext?.submitSelectors ?? []
        };
      }
      case 'require-field': {
        const result = await this.runtime.browserExtensionService.findFormField(
          sessionId,
          step.query,
          effectiveFrameSelectors,
          exact === true,
          defaults.timeoutMs,
          preferredFormSelector
        ).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, preferredFormSelector, selectedContext: resolvedContext?.selectedContext, result };
      }
      case 'require-field-value': {
        const result = await this.listFormValuesBrowserExtensionSession(sessionId, {
          frameSelectors: effectiveFrameSelectors,
          formSelector: preferredFormSelector,
          contextQuery: contextQuery ?? defaults.contextQuery,
          frameQuery: frameQuery ?? defaults.frameQuery,
          exact,
          limit: 100,
          timeoutMs: defaults.timeoutMs
        }).catch((error) => ({ error: String(error) }));
        return { kind: step.kind, name: step.name, query: step.query, equals: step.equals, includes: step.includes, exists: step.exists, result };
      }
      case 'require-next-action': {
        const result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.suggestNextActions(sessionId, {
          frameSelectors: effectiveFrameSelectors,
          limit: 20,
          timeoutMs: defaults.timeoutMs
        })).catch((error) => ({ error: String(error), suggestions: [] }));
        const matched = (result as { suggestions?: Array<{ query?: string }> }).suggestions?.find((entry) =>
          this.matchesBrowserextQuery(entry.query, step.query, exact === true)
        );
        return { kind: step.kind, name: step.name, query: step.query, preferredFormSelector, selectedContext: resolvedContext?.selectedContext, matched, result };
      }
      case 'branch': {
        const matched = await this.evaluateBrowserExtensionScenarioCondition(sessionId, step.condition, {
          timeoutMs: defaults.timeoutMs,
          intervalMs: defaults.intervalMs
        });
        const branchSteps = matched ? (step.then ?? []) : (step.else ?? []);
        const plannedChildren = await Promise.all(branchSteps.map((child) => this.planBrowserExtensionScenarioStep(sessionId, child, defaults, runtimeState)));
        return { kind: 'branch', name: step.name, condition: step.condition, matched, branch: matched ? 'then' : 'else', steps: plannedChildren };
      }
      case 'repeat-until': {
        const plannedChildren = await Promise.all((step.steps ?? []).map((child) => this.planBrowserExtensionScenarioStep(sessionId, child, defaults, runtimeState)));
        return {
          kind: 'repeat-until',
          name: step.name,
          condition: step.condition,
          maxAttempts: step.maxAttempts ?? 3,
          delayMs: step.delayMs,
          steps: plannedChildren
        };
      }
      default:
        return { kind: step.kind, name: step.name };
    }
  }

  private async executeBrowserExtensionScenarioStep(
    sessionId: string,
    step: BrowserExtensionScenarioStep,
    defaults: Omit<BrowserExtensionScenarioDocument, 'steps'>,
    workflowMetadata: BrowserExtensionNormalizedWorkflowMetadata,
    runtimeState?: BrowserExtensionScenarioRuntimeState
  ): Promise<Record<string, unknown>> {
    return this.withBrowserExtensionScenarioRetry(`browserext workflow ${step.kind}`, {
      optional: step.optional,
      retryCount: ('retryCount' in step ? step.retryCount : undefined) ?? defaults.retryCount,
      retryDelayMs: ('retryDelayMs' in step ? step.retryDelayMs : undefined) ?? defaults.retryDelayMs
    }, async (attempt) => {
      await this.ensureBrowserExtensionWorkflowTabOwnership(
        sessionId,
        workflowMetadata,
        runtimeState,
        defaults.timeoutMs ?? 45_000
      );
      const frameSelectors = 'frameSelectors' in step ? step.frameSelectors : defaults.frameSelectors;
      const exact = 'exact' in step && step.exact !== undefined ? step.exact : defaults.exact;
      const contextQuery = 'contextQuery' in step ? step.contextQuery : undefined;
      const frameQuery = 'frameQuery' in step ? step.frameQuery : undefined;
      const lockedContext = this.shouldReuseLockedBrowserExtensionContext(step, defaults, runtimeState)
        ? runtimeState?.lockedContext
        : undefined;
      const shouldResolveContext = ['fill', 'auth-login', 'radio', 'segment', 'tab', 'step', 'date', 'time', 'datetime', 'range', 'toggle', 'submit', 'submit-query', 'click', 'clear-selector', 'capture-field', 'capture-form-values', 'assert-field-value', 'require-field', 'require-field-value'].includes(step.kind)
        && Boolean(
          ('formSelector' in step ? step.formSelector : defaults.formSelector)
          || contextQuery
          || defaults.contextQuery
          || frameQuery
          || defaults.frameQuery
        );
      const resolvedContext = lockedContext ?? (shouldResolveContext
        ? await this.resolveBrowserExtensionFormContext(sessionId, {
            frameSelectors,
            formSelector: 'formSelector' in step ? step.formSelector : defaults.formSelector,
            contextQuery: contextQuery ?? defaults.contextQuery,
            frameQuery: frameQuery ?? defaults.frameQuery,
            exact,
            timeoutMs: defaults.timeoutMs
          })
        : undefined);
      const preferredFormSelector = resolvedContext?.preferredFormSelector;
      const effectiveFrameSelectors = frameSelectors ?? resolvedContext?.selectedContext?.frameSelectors;

      let result: Record<string, unknown> | undefined;
      const extractedFormStepResult = await executeBrowserExtensionWorkflowFormStep({
        inspect: (selector, timeoutMs) => this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(
          sessionId,
          selector,
          timeoutMs ?? defaults.timeoutMs
        )).catch(() => undefined) as Promise<Record<string, unknown> | undefined>,
        authLogin: (options) => this.authLoginBrowserExtensionSession(sessionId, options as {
          email?: string;
          username?: string;
          password: string;
          frameSelectors?: string[];
          selector?: string;
          humanLike?: boolean;
          delayMs?: number;
          jitterMs?: number;
          skipSubmit?: boolean;
          waitUrlIncludes?: string;
          waitText?: string;
          waitSelector?: string;
          waitNoSelector?: string;
          timeoutMs?: number;
          intervalMs?: number;
        }) as Promise<Record<string, unknown>>,
        formSubmitAndWait: (options) => this.formSubmitAndWaitBrowserExtensionSession(sessionId, options as {
          selector?: string;
          frameSelectors?: string[];
          waitUrlIncludes?: string;
          waitText?: string;
          waitSelector?: string;
          waitNoSelector?: string;
          timeoutMs?: number;
          intervalMs?: number;
        }) as Promise<Record<string, unknown>>,
        settle: (mode, options) => this.settleBrowserExtensionWorkflow(sessionId, mode, options ?? {}) as Promise<Record<string, unknown>>,
        waitFieldValidation: (selector, options) => this.waitForBrowserExtensionFieldValidation(sessionId, selector, options),
        matchesValidation: (validation, expected) => this.matchesBrowserExtensionValidationState(validation, expected),
        browserExtensionService: this.runtime.browserExtensionService
      }, {
        sessionId,
        step: step as Record<string, unknown> & { kind: string },
        defaults: defaults as Record<string, unknown>,
        exact,
        preferredFormSelector,
        effectiveFrameSelectors,
        resolvedSubmitSelector: resolvedContext?.selectedContext?.submitSelectors?.[0]
      });
      if (extractedFormStepResult !== undefined) {
        result = extractedFormStepResult;
        if (step.kind === 'wait-field-validation' && result.matched !== true && !step.optional) {
          throw new Error(`Field validation for "${step.selector}" did not reach the expected state`);
        }
      } else {
        const extractedOutputStepResult = await executeBrowserExtensionWorkflowOutputStep({
          inspect: (selector, timeoutMs) => this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(
            sessionId,
            selector,
            timeoutMs ?? defaults.timeoutMs
          )) as Promise<Record<string, unknown>>,
          snapshot: (timeoutMs) => this.withBrowserExtensionTransientRetry(() => this.snapshotBrowserExtensionSession(
            sessionId,
            timeoutMs ?? defaults.timeoutMs
          )) as Promise<Record<string, unknown>>,
          findField: (query) => this.runtime.browserExtensionService.findFormField(
            sessionId,
            query,
            effectiveFrameSelectors,
            exact === true,
            defaults.timeoutMs,
            preferredFormSelector
          ) as Promise<Record<string, unknown>>,
          listFormValues: () => this.listFormValuesBrowserExtensionSession(sessionId, {
            frameSelectors: effectiveFrameSelectors,
            formSelector: preferredFormSelector,
            contextQuery: contextQuery ?? defaults.contextQuery,
            frameQuery: frameQuery ?? defaults.frameQuery,
            exact,
            limit: step.kind === 'capture-form-values' ? ((typeof step.limit === 'number' ? step.limit : 100)) : 100,
            timeoutMs: defaults.timeoutMs
          }) as Promise<Record<string, unknown>>,
          suggestNextActions: () => this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.suggestNextActions(sessionId, {
            frameSelectors: effectiveFrameSelectors,
            limit: 20,
            timeoutMs: defaults.timeoutMs
          })) as Promise<Record<string, unknown>>,
          pageState: (timeoutMs) => this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, {
            timeoutMs: timeoutMs ?? defaults.timeoutMs
          })) as Promise<Record<string, unknown>>,
          diffPageStates: (baseline, current) => this.diffBrowserExtensionPageStates(baseline, current),
          matchesQuery: (value, query, matchExact) => this.matchesBrowserextQuery(value, query, matchExact)
        }, {
          sessionId,
          step: step as Record<string, unknown> & { kind: string },
          defaults: defaults as Record<string, unknown>,
          exact,
          runtimeState
        });
        if (extractedOutputStepResult !== undefined) {
          result = extractedOutputStepResult;
        } else {
        const extractedDiscoveryStepResult = await executeBrowserExtensionWorkflowDiscoveryStep({
          withTransientRetry: (fn) => this.withBrowserExtensionTransientRetry(fn),
          browserExtensionService: this.runtime.browserExtensionService,
          markdown: (selector, timeoutMs, frameSelectors) => this.browserExtensionMarkdown(sessionId, selector as string | undefined, timeoutMs, frameSelectors),
          readability: (selector, timeoutMs, frameSelectors) => this.browserExtensionReadability(sessionId, selector as string | undefined, timeoutMs, frameSelectors),
          metadata: (timeoutMs) => this.browserExtensionMetadata(sessionId, timeoutMs),
          urlParts: (timeoutMs) => this.browserExtensionUrlParts(sessionId, timeoutMs),
          listStorage: (options) => this.browserExtensionListStorage(sessionId, options),
          getStorage: (key, options) => this.browserExtensionGetStorageEntry(sessionId, key, options),
          setStorage: (key, value, options) => this.browserExtensionSetStorageEntry(sessionId, key, value as string, options),
          removeStorage: (key, options) => this.browserExtensionRemoveStorageEntry(sessionId, key, options),
          cookies: (targetUrl, timeoutMs) => this.browserExtensionCookies(sessionId, targetUrl as string | undefined, timeoutMs),
          getCookie: (name, options) => this.browserExtensionGetCookie(sessionId, name, options),
          setCookie: (name, value, options) => this.browserExtensionSetCookie(sessionId, name, value as string, options),
          removeCookie: (name, options) => this.browserExtensionRemoveCookie(sessionId, name, options),
          downloads: (options) => this.browserExtensionDownloads(sessionId, options),
          pageBlockers: (options) => this.readBrowserExtensionPageBlockers(sessionId, options),
          pageOutcomes: (options) => this.readBrowserExtensionPageOutcomes(sessionId, options),
          pageReady: (options) => this.ensureBrowserExtensionPageReady(sessionId, options),
          pageRecover: (options) => this.recoverBrowserExtensionPage(sessionId, options),
          contextState: (options) => this.browserExtensionContextState(sessionId, options),
          listActiveCollectionFilters: (options) => this.listBrowserExtensionActiveCollectionFilters(sessionId, options),
          listCollectionFilterTokens: (options) => this.listBrowserExtensionCollectionFilterTokens(sessionId, options),
          listCollectionSortState: (options) => this.listBrowserExtensionCollectionSortState(sessionId, options),
          findCollectionRows: (options) => this.findBrowserExtensionCollectionRows(sessionId, options),
          getCollectionValues: (options) => this.getBrowserExtensionCollectionValues(sessionId, options),
          diffCollectionValues: (options) => this.diffBrowserExtensionCollectionValues(sessionId, options),
          getCollectionStats: (options) => this.getBrowserExtensionCollectionStats(sessionId, options),
          diffCollectionStats: (options) => this.diffBrowserExtensionCollectionStats(sessionId, options),
          getCollectionRow: (options) => this.getBrowserExtensionCollectionRow(sessionId, options),
          getCollectionCell: (options) => this.getBrowserExtensionCollectionCell(sessionId, options),
          waitCollectionRow: (options) => this.waitForBrowserExtensionCollectionRow(sessionId, options),
          waitCollectionCount: (options) => this.waitForBrowserExtensionCollectionCount(sessionId, options),
          bulkCollectionAction: (options) => this.bulkClickBrowserExtensionCollectionRows(sessionId, options),
          exportCollection: (options) => this.exportBrowserExtensionCollection(sessionId, options),
          diffCollection: (options) => this.diffBrowserExtensionCollection(sessionId, options),
          waitCollectionDiff: (options) => this.waitForBrowserExtensionCollectionDiff(sessionId, options),
          matchCollectionDiff: (result, expected, matchExact) => this.browserExtensionCollectionDiffMatches(result, expected, matchExact),
          harvestCollection: (options) => this.harvestBrowserExtensionCollection(sessionId, options),
          matchesQuery: (value, query, matchExact) => this.matchesBrowserextQuery(value, query, matchExact),
          extractComparable: (value) => this.extractBrowserExtensionOutputComparable(value)
        }, {
          sessionId,
          step: step as Record<string, unknown> & { kind: string },
          defaults: defaults as Record<string, unknown>,
          exact,
          effectiveFrameSelectors,
          preferredFormSelector,
          contextQuery,
          frameQuery,
          runtimeState
        });
        if (extractedDiscoveryStepResult !== undefined) {
          result = extractedDiscoveryStepResult;
        } else {
        switch (step.kind) {
        case 'navigate': {
          result = await this.runtime.browserExtensionService.navigate(sessionId, step.url, defaults.timeoutMs);
          break;
        }
        case 'back': {
          result = await this.browserExtensionBack(sessionId, defaults.timeoutMs) as Record<string, unknown>;
          break;
        }
        case 'forward': {
          result = await this.browserExtensionForward(sessionId, defaults.timeoutMs) as Record<string, unknown>;
          break;
        }
        case 'reload': {
          result = await this.browserExtensionReload(sessionId, defaults.timeoutMs) as Record<string, unknown>;
          break;
        }
        case 'snapshot': {
          result = await this.withBrowserExtensionTransientRetry(() => this.snapshotBrowserExtensionSession(
            sessionId,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          if (runtimeState) {
            runtimeState.lastPageState = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, {
              timeoutMs: defaults.timeoutMs
            })).catch(() => runtimeState.lastPageState) as Record<string, unknown> | undefined;
          }
          break;
        }
        case 'dom-tree': {
          result = await this.withBrowserExtensionTransientRetry(() => this.domTreeBrowserExtensionSession(
            sessionId,
            step.selector,
            effectiveFrameSelectors,
            step.maxDepth,
            step.maxChildren,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'inspect': {
          result = await this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(
            sessionId,
            step.selector,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'inspect-all': {
          result = await this.withBrowserExtensionTransientRetry(() => this.inspectAllBrowserExtensionSession(
            sessionId,
            step.selector,
            step.limit ?? 20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'links': {
          result = await this.withBrowserExtensionTransientRetry(() => this.browserExtensionLinks(
            sessionId,
            step.limit ?? 20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'frames': {
          result = await this.withBrowserExtensionTransientRetry(() => this.listBrowserExtensionFrames(
            sessionId,
            effectiveFrameSelectors,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'form-contexts': {
          result = await this.withBrowserExtensionTransientRetry(() => this.listFormContextsBrowserExtensionSession(
            sessionId,
            effectiveFrameSelectors,
            step.limit ?? 20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'actionables': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listActionables(sessionId, {
            selector: step.selector,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'banners': {
          result = await this.listBrowserExtensionBanners(sessionId, effectiveFrameSelectors, step.limit ?? 20, defaults.timeoutMs) as Record<string, unknown>;
          break;
        }
        case 'banner-dismiss': {
          result = await this.dismissBrowserExtensionBanner(sessionId, step.query, {
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'wait-banner': {
          result = await this.waitForBrowserExtensionBanner(sessionId, {
            text: step.text,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true) {
            throw new Error(`Required banner "${step.text}" did not appear`);
          }
          break;
        }
        case 'wait-no-banner': {
          result = await this.waitForNoBrowserExtensionBanner(sessionId, {
            text: step.text,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true) {
            throw new Error(step.text ? `Banner "${step.text}" is still visible` : 'Banners are still visible');
          }
          break;
        }
        case 'loading-states': {
          result = await this.listBrowserExtensionLoadingStates(sessionId, effectiveFrameSelectors, step.limit ?? 20, defaults.timeoutMs) as Record<string, unknown>;
          break;
        }
        case 'empty-states': {
          result = await this.listBrowserExtensionEmptyStates(sessionId, effectiveFrameSelectors, step.limit ?? 20, defaults.timeoutMs) as Record<string, unknown>;
          break;
        }
        case 'dialogs': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(
            sessionId,
            effectiveFrameSelectors,
            step.limit ?? 20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'dialog-actions': {
          result = await this.listBrowserExtensionDialogActions(sessionId, step.query, {
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'dialog-close': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.closeDialog(sessionId, step.query, {
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'dialog-action': {
          result = await this.clickBrowserExtensionDialogAction(sessionId, step.action, {
            dialogQuery: step.dialog,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'menus': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(
            sessionId,
            effectiveFrameSelectors,
            step.limit ?? 20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'menu-select': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.selectMenuOption(sessionId, step.option, {
            menuQuery: step.menu,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'disclosures': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDisclosures(
            sessionId,
            effectiveFrameSelectors,
            step.limit ?? 20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'disclosure-toggle': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.toggleDisclosure(sessionId, step.query, {
            desiredState: step.desiredState,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'collections': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollections(
            sessionId,
            effectiveFrameSelectors,
            step.limit ?? 20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'collection-active-filters': {
          result = await this.listBrowserExtensionActiveCollectionFilters(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-filter-tokens': {
          result = await this.listBrowserExtensionCollectionFilterTokens(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-sort-state': {
          result = await this.listBrowserExtensionCollectionSortState(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-rows': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'collection-find': {
          result = await this.findBrowserExtensionCollectionRows(sessionId, {
            query: step.query,
            cellQuery: step.cell,
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-values': {
          result = await this.getBrowserExtensionCollectionValues(sessionId, {
            cellQuery: step.cell,
            rowQuery: step.row,
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-values-diff': {
          result = await this.diffBrowserExtensionCollectionValues(sessionId, {
            cellQuery: step.cell,
            rowQuery: step.row,
            collectionQuery: step.collection,
            againstFile: step.againstFile,
            againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-stats': {
          result = await this.getBrowserExtensionCollectionStats(sessionId, {
            cellQuery: step.cell,
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-stats-diff': {
          result = await this.diffBrowserExtensionCollectionStats(sessionId, {
            cellQuery: step.cell,
            collectionQuery: step.collection,
            againstFile: step.againstFile,
            againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-row': {
          result = await this.getBrowserExtensionCollectionRow(sessionId, {
            rowQuery: step.row,
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          if (result.found !== true) {
            throw new Error(`No collection row matched query: ${step.row}`);
          }
          break;
        }
        case 'collection-cell': {
          result = await this.getBrowserExtensionCollectionCell(sessionId, {
            rowQuery: step.row,
            cellQuery: step.cell,
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          if (result.found !== true) {
            throw new Error(`No collection cell matched query: ${step.cell}`);
          }
          break;
        }
        case 'wait-collection-row': {
          result = await this.waitForBrowserExtensionCollectionRow(sessionId, {
            rowQuery: step.row,
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true) {
            throw new Error(`Timed out waiting for collection row: ${step.row}`);
          }
          break;
        }
        case 'wait-collection-count': {
          result = await this.waitForBrowserExtensionCollectionCount(sessionId, {
            count: step.count,
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true) {
            throw new Error(`Timed out waiting for collection count: ${step.count}`);
          }
          break;
        }
        case 'collection-row-actions': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRowActions(sessionId, {
            collectionQuery: step.collection,
            rowQuery: step.row,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'collection-selection-state': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionSelectionState(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'collection-click': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.clickCollectionItem(sessionId, step.item, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'collection-row-click': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.clickCollectionRowAction(sessionId, {
            collectionQuery: step.collection,
            rowQuery: step.row,
            actionQuery: step.action,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'collection-row-select': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.selectCollectionRow(sessionId, {
            collectionQuery: step.collection,
            rowQuery: step.row,
            desiredState: step.desiredState,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'collection-select-all': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.selectAllCollectionRows(sessionId, {
            collectionQuery: step.collection,
            desiredState: step.desiredState,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'collection-row-details': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionRowDetails(sessionId, {
            collectionQuery: step.collection,
            rowQuery: step.row,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'collection-row-expand': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.expandCollectionRow(sessionId, {
            collectionQuery: step.collection,
            rowQuery: step.row,
            desiredState: step.desiredState,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'assert-collection-cell': {
          result = await this.getBrowserExtensionCollectionCell(sessionId, {
            rowQuery: step.row,
            cellQuery: step.cell,
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: 200,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          if (step.exists === true && result.found !== true) {
            throw new Error(`Collection cell "${step.cell}" was not found in row "${step.row}"`);
          }
          if (step.exists === false && result.found === true) {
            throw new Error(`Collection cell "${step.cell}" unexpectedly exists in row "${step.row}"`);
          }
          const comparable = this.extractBrowserExtensionOutputComparable((result.cell as { value?: unknown } | undefined)?.value);
          if (step.equals !== undefined && comparable !== step.equals) {
            throw new Error(`Collection cell "${step.cell}" did not equal "${step.equals}"`);
          }
          if (step.includes !== undefined && !comparable.includes(step.includes)) {
            throw new Error(`Collection cell "${step.cell}" did not include "${step.includes}"`);
          }
          break;
        }
        case 'assert-collection-selection': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionSelectionState(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          const selectedCount = typeof result.selectedCount === 'number' ? result.selectedCount : 0;
          if (typeof step.atLeast === 'number' && selectedCount < step.atLeast) {
            throw new Error(`Collection selection count ${selectedCount} is below required minimum ${step.atLeast}`);
          }
          if (typeof step.atMost === 'number' && selectedCount > step.atMost) {
            throw new Error(`Collection selection count ${selectedCount} exceeds maximum ${step.atMost}`);
          }
          break;
        }
        case 'assert-collection-detail': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.getCollectionRowDetails(sessionId, {
            collectionQuery: step.collection,
            rowQuery: step.row,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          if (typeof step.expanded === 'boolean' && Boolean(result.expanded) !== step.expanded) {
            throw new Error(`Collection detail expanded state ${String(result.expanded)} did not match ${String(step.expanded)}`);
          }
          if (step.includes && !String(result.detailText ?? '').includes(step.includes)) {
            throw new Error(`Collection detail text did not include required text: ${step.includes}`);
          }
          break;
        }
        case 'assert-collection-values-diff': {
          result = await this.diffBrowserExtensionCollectionValues(sessionId, {
            cellQuery: step.cell,
            rowQuery: step.row,
            collectionQuery: step.collection,
            againstFile: step.againstFile,
            againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          if (typeof result.countDelta === 'number' && typeof step.countDeltaAtLeast === 'number' && result.countDelta < step.countDeltaAtLeast) {
            throw new Error(`Collection value count delta ${result.countDelta} is below required minimum ${step.countDeltaAtLeast}`);
          }
          if (typeof result.uniqueCountDelta === 'number' && typeof step.uniqueCountDeltaAtLeast === 'number' && result.uniqueCountDelta < step.uniqueCountDeltaAtLeast) {
            throw new Error(`Collection unique value delta ${result.uniqueCountDelta} is below required minimum ${step.uniqueCountDeltaAtLeast}`);
          }
          if (step.addedValue && !(Array.isArray(result.addedValues) && result.addedValues.some((value) => this.matchesBrowserextQuery(String(value), step.addedValue!, exact)))) {
            throw new Error(`Collection values diff did not add required value: ${step.addedValue}`);
          }
          if (step.removedValue && !(Array.isArray(result.removedValues) && result.removedValues.some((value) => this.matchesBrowserextQuery(String(value), step.removedValue!, exact)))) {
            throw new Error(`Collection values diff did not remove required value: ${step.removedValue}`);
          }
          break;
        }
        case 'assert-collection-stats-diff': {
          result = await this.diffBrowserExtensionCollectionStats(sessionId, {
            cellQuery: step.cell,
            collectionQuery: step.collection,
            againstFile: step.againstFile,
            againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          if (typeof result.countDelta === 'number' && typeof step.countDeltaAtLeast === 'number' && result.countDelta < step.countDeltaAtLeast) {
            throw new Error(`Collection row-count delta ${result.countDelta} is below required minimum ${step.countDeltaAtLeast}`);
          }
          if (typeof result.selectedCountDelta === 'number' && typeof step.selectedDeltaAtLeast === 'number' && result.selectedCountDelta < step.selectedDeltaAtLeast) {
            throw new Error(`Collection selected-count delta ${result.selectedCountDelta} is below required minimum ${step.selectedDeltaAtLeast}`);
          }
          if (typeof result.expandedCountDelta === 'number' && typeof step.expandedDeltaAtLeast === 'number' && result.expandedCountDelta < step.expandedDeltaAtLeast) {
            throw new Error(`Collection expanded-count delta ${result.expandedCountDelta} is below required minimum ${step.expandedDeltaAtLeast}`);
          }
          if (typeof result.detailCountDelta === 'number' && typeof step.detailDeltaAtLeast === 'number' && result.detailCountDelta < step.detailDeltaAtLeast) {
            throw new Error(`Collection detail-count delta ${result.detailCountDelta} is below required minimum ${step.detailDeltaAtLeast}`);
          }
          if (typeof result.rowActionCountDelta === 'number' && typeof step.rowActionDeltaAtLeast === 'number' && result.rowActionCountDelta < step.rowActionDeltaAtLeast) {
            throw new Error(`Collection row-action delta ${result.rowActionCountDelta} is below required minimum ${step.rowActionDeltaAtLeast}`);
          }
          break;
        }
        case 'collection-bulk-action': {
          result = await this.bulkClickBrowserExtensionCollectionRows(sessionId, {
            rowQueries: step.rows,
            actionQuery: step.action,
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            continueOnError: step.continueOnError,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-clear-all-filters': {
          result = await this.clearAllBrowserExtensionCollectionFilters(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            continueOnError: step.continueOnError,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-export': {
          result = await this.exportBrowserExtensionCollection(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            includeSelection: step.includeSelection,
            includeDetails: step.includeDetails,
            format: step.format,
            filePath: step.file,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'collection-diff': {
          result = await this.diffBrowserExtensionCollection(sessionId, {
            collectionQuery: step.collection,
            againstFile: step.againstFile,
            againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
            frameSelectors: effectiveFrameSelectors,
            exact,
            dedupeBy: step.dedupeBy,
            includeSelection: step.includeSelection,
            includeDetails: step.includeDetails,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'wait-collection-diff': {
          result = await this.waitForBrowserExtensionCollectionDiff(sessionId, {
            collectionQuery: step.collection,
            againstFile: step.againstFile,
            againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
            frameSelectors: effectiveFrameSelectors,
            exact,
            dedupeBy: step.dedupeBy,
            includeSelection: step.includeSelection,
            includeDetails: step.includeDetails,
            addedAtLeast: step.addedAtLeast,
            removedAtLeast: step.removedAtLeast,
            changedAtLeast: step.changedAtLeast,
            unchangedAtLeast: step.unchangedAtLeast,
            rowAdded: step.rowAdded,
            rowRemoved: step.rowRemoved,
            rowChanged: step.rowChanged,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true) {
            throw new Error('Timed out waiting for collection diff conditions');
          }
          break;
        }
        case 'assert-collection-diff': {
          result = await this.diffBrowserExtensionCollection(sessionId, {
            collectionQuery: step.collection,
            againstFile: step.againstFile,
            againstOutput: step.againstOutput ? this.getBrowserExtensionWorkflowOutput(runtimeState, step.againstOutput) as Record<string, unknown> | undefined : undefined,
            frameSelectors: effectiveFrameSelectors,
            exact,
            dedupeBy: step.dedupeBy,
            includeSelection: step.includeSelection,
            includeDetails: step.includeDetails,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          if (!this.browserExtensionCollectionDiffMatches(result, {
            addedAtLeast: step.addedAtLeast,
            removedAtLeast: step.removedAtLeast,
            changedAtLeast: step.changedAtLeast,
            unchangedAtLeast: step.unchangedAtLeast,
            rowAdded: step.rowAdded,
            rowRemoved: step.rowRemoved,
            rowChanged: step.rowChanged
          }, exact)) {
            throw new Error('Collection diff did not match expected mutation conditions');
          }
          break;
        }
        case 'collection-harvest': {
          result = await this.harvestBrowserExtensionCollection(sessionId, {
            collectionQuery: step.collection,
            strategy: step.strategy,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            maxIterations: step.maxIterations,
            stableIterations: step.stableIterations,
            settleQuietMs: step.settleQuietMs ?? defaults.settleQuietMs,
            dedupeBy: step.dedupeBy,
            scrollAmount: step.scrollAmount,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'paginations': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listPaginations(
            sessionId,
            effectiveFrameSelectors,
            step.limit ?? 20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          break;
        }
        case 'pagination-click': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.clickPagination(sessionId, step.query, {
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'load-more': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.clickLoadMore(sessionId, {
            query: step.query,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'markdown': {
          result = await this.withBrowserExtensionTransientRetry(() => this.browserExtensionMarkdown(
            sessionId,
            step.selector,
            defaults.timeoutMs,
            effectiveFrameSelectors
          )) as Record<string, unknown>;
          break;
        }
        case 'readability': {
          result = await this.withBrowserExtensionTransientRetry(() => this.browserExtensionReadability(
            sessionId,
            step.selector,
            defaults.timeoutMs,
            effectiveFrameSelectors
          )) as Record<string, unknown>;
          break;
        }
        case 'page-state': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, {
            selector: step.selector,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            maxDepth: step.maxDepth,
            maxChildren: step.maxChildren,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          if (runtimeState) {
            runtimeState.lastPageState = result;
          }
          break;
        }
        case 'metadata': {
          result = await this.browserExtensionMetadata(sessionId, defaults.timeoutMs) as Record<string, unknown>;
          break;
        }
        case 'url-parts': {
          result = await this.browserExtensionUrlParts(sessionId, defaults.timeoutMs) as Record<string, unknown>;
          break;
        }
        case 'storage-list': {
          result = await this.browserExtensionListStorage(sessionId, {
            scope: step.scope,
            limit: step.limit,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'storage-get': {
          result = await this.browserExtensionGetStorageEntry(sessionId, step.key, {
            scope: step.scope,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'storage-set': {
          result = await this.browserExtensionSetStorageEntry(sessionId, step.key, step.value, {
            scope: step.scope,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'storage-remove': {
          result = await this.browserExtensionRemoveStorageEntry(sessionId, step.key, {
            scope: step.scope,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'cookies': {
          result = await this.browserExtensionCookies(sessionId, step.targetUrl, defaults.timeoutMs) as Record<string, unknown>;
          break;
        }
        case 'cookie-get': {
          result = await this.browserExtensionGetCookie(sessionId, step.name, {
            targetUrl: step.targetUrl,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'cookie-set': {
          result = await this.browserExtensionSetCookie(sessionId, step.name, step.value, {
            targetUrl: step.targetUrl,
            domain: step.domain,
            path: step.path,
            secure: step.secure,
            httpOnly: step.httpOnly,
            sameSite: step.sameSite,
            expirationDate: step.expirationDate,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'cookie-remove': {
          result = await this.browserExtensionRemoveCookie(sessionId, step.name, {
            targetUrl: step.targetUrl,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'downloads': {
          result = await this.browserExtensionDownloads(sessionId, {
            query: step.query,
            state: step.state,
            limit: step.limit ?? 20,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'page-blockers': {
          result = await this.readBrowserExtensionPageBlockers(sessionId, {
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'page-outcomes': {
          result = await this.readBrowserExtensionPageOutcomes(sessionId, {
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'page-recover': {
          result = await this.recoverBrowserExtensionPage(sessionId, {
            frameSelectors: effectiveFrameSelectors,
            collectionQuery: step.collection,
            exact,
            limit: step.limit ?? 20,
            timeoutMs: defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs,
            continueOnError: step.continueOnError
          }) as Record<string, unknown>;
          break;
        }
        case 'next-actions': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.suggestNextActions(sessionId, {
            selector: step.selector,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit ?? 20,
            maxDepth: step.maxDepth,
            maxChildren: step.maxChildren,
            timeoutMs: defaults.timeoutMs
          })) as Record<string, unknown>;
          break;
        }
        case 'context-state': {
          result = await this.browserExtensionContextState(sessionId, {
            frameSelectors: effectiveFrameSelectors,
            formSelector: preferredFormSelector,
            contextQuery: contextQuery ?? defaults.contextQuery,
            frameQuery: frameQuery ?? defaults.frameQuery,
            exact,
            limit: step.limit ?? 20,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'fill': {
          result = await this.runtime.browserExtensionService.fillFormFieldByQuery(sessionId, step.query, step.value, {
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs,
            preferredFormSelector
          });
          break;
        }
        case 'fill-selector': {
          result = await this.runtime.browserExtensionService.formFillHuman(sessionId, step.selector, step.value, {
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: defaults.timeoutMs,
            delayMs: defaults.delayMs ?? 35,
            jitterMs: 20
          });
          if (!(result as { filled?: boolean }).filled) {
            const inspected = await this.withBrowserExtensionTransientRetry(() => this.inspectBrowserExtensionSession(
              sessionId,
              step.selector,
              defaults.timeoutMs
            )).catch(() => undefined) as { value?: unknown; text?: unknown } | undefined;
            const comparableValue = typeof inspected?.value === 'string'
              ? inspected.value
              : typeof inspected?.text === 'string'
                ? inspected.text
                : undefined;
            if (comparableValue === step.value) {
              result = {
                ...(result as Record<string, unknown>),
                filled: true,
                field: {
                  ...((result as { field?: Record<string, unknown> }).field ?? {}),
                  ...(inspected as Record<string, unknown> | undefined),
                  filled: true,
                  humanLike: true
                }
              };
            }
          }
          break;
        }
        case 'clear-selector': {
          result = await this.runtime.browserExtensionService.formClear(sessionId, step.selector, {
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: defaults.timeoutMs
          });
          break;
        }
        case 'field-validation': {
          result = await this.runtime.browserExtensionService.formValidation(sessionId, step.selector, {
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          break;
        }
        case 'auth-login': {
          result = await this.authLoginBrowserExtensionSession(sessionId, {
            email: step.email,
            username: step.username,
            password: step.password,
            frameSelectors: effectiveFrameSelectors,
            selector: step.selector,
            humanLike: step.humanLike,
            delayMs: step.delayMs,
            jitterMs: step.jitterMs,
            skipSubmit: step.skipSubmit,
            waitUrlIncludes: step.waitUrlIncludes,
            waitText: step.waitText,
            waitSelector: step.waitSelector,
            waitNoSelector: step.waitNoSelector,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          break;
        }
        case 'click': {
          result = await this.runtime.browserExtensionService.clickByQuery(sessionId, step.query, {
            by: 'text',
            selector: preferredFormSelector,
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: defaults.timeoutMs
          });
          break;
        }
        case 'click-selector': {
          result = await this.runtime.browserExtensionService.click(sessionId, step.selector, defaults.timeoutMs);
          break;
        }
        case 'click-human-selector': {
          result = await this.runtime.browserExtensionService.clickHuman(sessionId, step.selector, {
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: defaults.timeoutMs
          });
          break;
        }
        case 'focus-selector': {
          result = await this.runtime.browserExtensionService.focusElement(sessionId, step.selector, {
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: defaults.timeoutMs
          });
          break;
        }
        case 'blur-selector': {
          result = await this.runtime.browserExtensionService.blurElement(sessionId, step.selector, {
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: defaults.timeoutMs
          });
          break;
        }
        case 'commit-selector': {
          result = await this.runtime.browserExtensionService.formCommit(sessionId, {
            selector: step.selector,
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: defaults.timeoutMs
          });
          break;
        }
        case 'radio': {
          result = await this.runtime.browserExtensionService.selectRadioOption(sessionId, step.query, step.value, {
            frameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs,
            preferredFormSelector
          });
          break;
        }
        case 'segment': {
          result = await this.runtime.browserExtensionService.selectSegmentedOption(sessionId, step.query, step.value, {
            frameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs,
            preferredFormSelector
          });
          break;
        }
        case 'tab': {
          result = await this.runtime.browserExtensionService.selectTablistOption(sessionId, step.query, step.value, {
            frameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs,
            preferredFormSelector
          });
          break;
        }
        case 'step': {
          result = await this.runtime.browserExtensionService.moveStepper(sessionId, step.direction ?? 'next', {
            query: step.query,
            frameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs,
            preferredFormSelector
          });
          break;
        }
        case 'date': {
          result = await this.runtime.browserExtensionService.setTypedFieldByQuery(sessionId, 'form_date_set', step.query, step.value, {
            frameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs,
            preferredFormSelector
          });
          break;
        }
        case 'time': {
          result = await this.runtime.browserExtensionService.setTypedFieldByQuery(sessionId, 'form_time_set', step.query, step.value, {
            frameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs,
            preferredFormSelector
          });
          break;
        }
        case 'datetime': {
          result = await this.runtime.browserExtensionService.setTypedFieldByQuery(sessionId, 'form_datetime_set', step.query, step.value, {
            frameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs,
            preferredFormSelector
          });
          break;
        }
        case 'range': {
          result = await this.runtime.browserExtensionService.setRangeByQuery(sessionId, step.query, step.value, {
            frameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs,
            preferredFormSelector
          });
          break;
        }
        case 'toggle': {
          result = await this.runtime.browserExtensionService.toggleControl(sessionId, step.query, {
            desiredState: step.desiredState,
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs,
            preferredFormSelector
          });
          break;
        }
        case 'submit': {
          result = await this.formSubmitAndWaitBrowserExtensionSession(sessionId, {
            selector: step.selector ?? resolvedContext?.selectedContext?.submitSelectors?.[0],
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: defaults.timeoutMs,
            intervalMs: defaults.intervalMs
          });
          result = {
            ...(result as Record<string, unknown>),
            ...classifyBrowserExtensionSubmitOutcome(result as Record<string, unknown> | undefined)
          };
          break;
        }
        case 'submit-query': {
          const located = await this.runtime.browserExtensionService.locateInPage(sessionId, step.query, {
            by: 'text',
            selector: preferredFormSelector,
            frameSelectors: effectiveFrameSelectors,
            limit: 1,
            timeoutMs: defaults.timeoutMs
          }).catch(() => undefined);
          const selector = Array.isArray((located as { matches?: Array<{ selector?: string }> } | undefined)?.matches)
            ? (located as { matches?: Array<{ selector?: string }> }).matches?.[0]?.selector
            : undefined;
          if (selector) {
            const clickResult = await this.runtime.browserExtensionService.clickHuman(sessionId, selector, {
              frameSelectors: effectiveFrameSelectors,
              timeoutMs: defaults.timeoutMs
            });
            const settleResult = await this.settleBrowserExtensionWorkflow(sessionId, 'page', {
              quietMs: defaults.settleQuietMs,
              timeoutMs: defaults.timeoutMs,
              intervalMs: defaults.intervalMs,
              stableReads: defaults.stableReads
            });
            result = {
              ...clickResult,
              ...classifyBrowserExtensionSubmitOutcome(settleResult as Record<string, unknown> | undefined),
              settle: settleResult
            };
          } else {
            result = await this.runtime.browserExtensionService.clickByQuery(sessionId, step.query, {
              by: 'text',
              selector: preferredFormSelector,
              frameSelectors: effectiveFrameSelectors,
              timeoutMs: defaults.timeoutMs
            });
          }
          break;
        }
        case 'wait-text': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.waitForText(sessionId, step.text, {
            timeoutMs: defaults.timeoutMs,
            intervalMs: defaults.intervalMs
          }));
          if (!result.matched && !step.optional) {
            throw new Error(`Required text "${step.text}" did not appear`);
          }
          break;
        }
        case 'wait-no-loading-state': {
          result = await this.waitForBrowserExtensionNoLoadingState(sessionId, {
            query: step.query,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error(step.query ? `Loading state "${step.query}" did not clear in time` : 'Loading state did not clear in time');
          }
          break;
        }
        case 'wait-dialog': {
          result = await this.waitForBrowserExtensionDialog(sessionId, {
            query: step.query,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error(step.query ? `Dialog "${step.query}" did not appear in time` : 'Dialog did not appear in time');
          }
          break;
        }
        case 'wait-no-dialog': {
          result = await this.waitForNoBrowserExtensionDialog(sessionId, {
            query: step.query,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error(step.query ? `Dialog "${step.query}" is still visible` : 'Dialogs are still visible');
          }
          break;
        }
        case 'wait-menu': {
          result = await this.waitForBrowserExtensionMenu(sessionId, {
            query: step.query,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error(step.query ? `Menu "${step.query}" did not appear in time` : 'Menu did not appear in time');
          }
          break;
        }
        case 'wait-no-menu': {
          result = await this.waitForNoBrowserExtensionMenu(sessionId, {
            query: step.query,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error(step.query ? `Menu "${step.query}" is still visible` : 'Menus are still visible');
          }
          break;
        }
        case 'wait-disclosure': {
          result = await this.waitForBrowserExtensionDisclosureState(sessionId, {
            query: step.query,
            expanded: step.state === 'open' ? true : step.state === 'closed' ? false : undefined,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error(`Disclosure "${step.query}" did not reach the requested state in time`);
          }
          break;
        }
        case 'wait-page-outcome': {
          result = await this.waitForBrowserExtensionPageOutcome(sessionId, {
            status: step.status,
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error(`Page outcome "${step.status}" did not appear in time`);
          }
          break;
        }
        case 'wait-download': {
          result = await this.waitForBrowserExtensionDownload(sessionId, {
            query: step.query,
            state: step.state,
            limit: step.limit,
            exact,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error(step.query ? `Download "${step.query}" did not appear in time` : 'Download did not appear in time');
          }
          break;
        }
        case 'wait-cookie': {
          result = await this.waitForBrowserExtensionCookie(sessionId, {
            name: step.name,
            targetUrl: step.targetUrl,
            equals: step.equals,
            includes: step.includes,
            exists: step.exists,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error(`Cookie "${step.name}" did not reach the requested state in time`);
          }
          break;
        }
        case 'wait-no-blockers': {
          result = await this.waitForBrowserExtensionNoBlockers(sessionId, {
            frameSelectors: effectiveFrameSelectors,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error('Page blockers did not clear in time');
          }
          break;
        }
        case 'page-ready': {
          result = await this.ensureBrowserExtensionPageReady(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs,
            continueOnError: step.continueOnError
          }) as Record<string, unknown>;
          if (result.ready !== true && !step.optional) {
            throw new Error('Page did not become ready');
          }
          break;
        }
        case 'download-cancel': {
          result = await this.browserExtensionCancelDownload(sessionId, step.query, {
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          if (result.cancelled !== true && !step.optional) {
            throw new Error(step.query ? `Download "${step.query}" could not be cancelled` : 'No matching in-progress download could be cancelled');
          }
          break;
        }
        case 'download-erase': {
          result = await this.browserExtensionEraseDownload(sessionId, step.query, {
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          if (result.erased !== true && !step.optional) {
            throw new Error(step.query ? `Download "${step.query}" could not be erased` : 'No matching download could be erased');
          }
          break;
        }
        case 'wait-no-collection-filters': {
          result = await this.waitForNoActiveBrowserExtensionCollectionFilters(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: step.limit,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.timedOut === true && !step.optional) {
            throw new Error('Collection filters did not clear in time');
          }
          break;
        }
        case 'wait-selector': {
          result = await this.runtime.browserExtensionService.waitForSelector(sessionId, step.selector, {
            timeoutMs: defaults.timeoutMs,
            intervalMs: defaults.intervalMs
          });
          if (!result.matched && !step.optional) {
            throw new Error(`Required selector "${step.selector}" did not appear`);
          }
          break;
        }
        case 'wait-field-validation': {
          result = await this.waitForBrowserExtensionFieldValidation(sessionId, step.selector, {
            state: step.state,
            messageIncludes: step.messageIncludes,
            messageEquals: step.messageEquals,
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: step.timeoutMs ?? defaults.timeoutMs,
            intervalMs: step.intervalMs ?? defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.matched !== true && !step.optional) {
            throw new Error(`Field validation for "${step.selector}" did not reach the expected state`);
          }
          break;
        }
        case 'wait-no-selector': {
          result = await this.runtime.browserExtensionService.waitForNoSelector(sessionId, step.selector, {
            timeoutMs: defaults.timeoutMs,
            intervalMs: defaults.intervalMs
          });
          if (!result.missing && !step.optional) {
            throw new Error(`Forbidden selector "${step.selector}" is present`);
          }
          break;
        }
        case 'wait-url': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.waitForUrl(sessionId, step.text, {
            timeoutMs: defaults.timeoutMs,
            intervalMs: defaults.intervalMs
          }));
          if (!result.matched && !step.optional) {
            throw new Error(`Required URL text "${step.text}" did not appear`);
          }
          break;
        }
        case 'require-field': {
          const found = await this.runtime.browserExtensionService.findFormField(
            sessionId,
            step.query,
            effectiveFrameSelectors,
            exact === true,
            defaults.timeoutMs,
            preferredFormSelector
          );
          if (!found.field?.selector) {
            throw new Error(`Required form field "${step.query}" did not appear`);
          }
          result = found;
          break;
        }
        case 'require-field-value': {
          const values = await this.listFormValuesBrowserExtensionSession(sessionId, {
            frameSelectors: effectiveFrameSelectors,
            formSelector: preferredFormSelector,
            contextQuery: contextQuery ?? defaults.contextQuery,
            frameQuery: frameQuery ?? defaults.frameQuery,
            exact,
            limit: 100,
            timeoutMs: defaults.timeoutMs
          });
          const entry = values.entries.find((field) =>
            this.matchesBrowserextQuery(field.name, step.query, exact === true)
            || this.matchesBrowserextQuery(field.selector, step.query, exact === true)
            || (field.labels ?? []).some((label) => this.matchesBrowserextQuery(label, step.query, exact === true))
          );
          const comparable = this.extractBrowserExtensionOutputComparable(entry?.type === 'checkbox' || entry?.type === 'radio' ? Boolean(entry?.checked) : entry?.value);
          if (!entry) {
            throw new Error(`Required field value "${step.query}" did not appear`);
          }
          if (step.equals !== undefined && comparable !== step.equals) {
            throw new Error(`Field "${step.query}" did not equal "${step.equals}"`);
          }
          if (step.includes !== undefined && !comparable.includes(step.includes)) {
            throw new Error(`Field "${step.query}" did not include "${step.includes}"`);
          }
          result = { sessionId, query: step.query, entry, comparable, equals: step.equals, includes: step.includes, exists: step.exists, values };
          break;
        }
        case 'require-next-action': {
          const suggestions = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.suggestNextActions(sessionId, {
            frameSelectors: effectiveFrameSelectors,
            limit: 20,
            timeoutMs: defaults.timeoutMs
          }));
          const matched = suggestions.suggestions.find((entry) =>
            this.matchesBrowserextQuery(entry.query, step.query, exact === true)
          );
          if (!matched) {
            throw new Error(`Required next action "${step.query}" did not appear`);
          }
          result = {
            sessionId,
            query: step.query,
            matched,
            suggestions: suggestions.suggestions
          };
          break;
        }
        case 'require-text': {
          const matched = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.waitForText(sessionId, step.text, {
            timeoutMs: defaults.timeoutMs,
            intervalMs: defaults.intervalMs
          }));
          if (!matched.matched) {
            throw new Error(`Required text "${step.text}" did not appear`);
          }
          result = matched;
          break;
        }
        case 'require-no-text': {
          const pageState = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, { timeoutMs: defaults.timeoutMs }));
          const present = (pageState.pageState?.snapshot?.text ?? '').includes(step.text);
          if (present) {
            throw new Error(`Forbidden text "${step.text}" is present`);
          }
          result = { present: false };
          break;
        }
        case 'require-selector': {
          const matched = await this.runtime.browserExtensionService.waitForSelector(sessionId, step.selector, {
            timeoutMs: defaults.timeoutMs,
            intervalMs: defaults.intervalMs
          });
          if (!matched.matched) {
            throw new Error(`Required selector "${step.selector}" did not appear`);
          }
          result = matched;
          break;
        }
        case 'require-no-selector': {
          const missing = await this.runtime.browserExtensionService.waitForNoSelector(sessionId, step.selector, {
            timeoutMs: defaults.timeoutMs,
            intervalMs: defaults.intervalMs
          });
          if (!missing.missing) {
            throw new Error(`Forbidden selector "${step.selector}" is present`);
          }
          result = missing;
          break;
        }
        case 'assert-field-validation': {
          const validationResult = await this.runtime.browserExtensionService.formValidation(sessionId, step.selector, {
            frameSelectors: effectiveFrameSelectors,
            timeoutMs: defaults.timeoutMs
          });
          const validation = validationResult.validation as Record<string, unknown> | undefined;
          if (!this.matchesBrowserExtensionValidationState(validation, {
            state: step.state,
            messageIncludes: step.messageIncludes,
            messageEquals: step.messageEquals
          })) {
            throw new Error(`Field validation for "${step.selector}" did not match the expected state`);
          }
          result = validationResult as Record<string, unknown>;
          break;
        }
        case 'assert-banner': {
          result = await this.listBrowserExtensionBanners(sessionId, effectiveFrameSelectors, 20, defaults.timeoutMs) as Record<string, unknown>;
          const banners = Array.isArray(result.banners) ? result.banners as Array<Record<string, unknown>> : [];
          const matched = banners.find((entry) =>
            (!step.text
              || this.matchesBrowserextQuery(String(entry.text ?? ''), step.text, exact)
              || this.matchesBrowserextQuery(String(entry.label ?? ''), step.text, exact)
              || this.matchesBrowserextQuery(String(entry.selector ?? ''), step.text, exact))
            && (!step.variant || entry.variant === step.variant)
          );
          if (step.exists === false && matched) {
            throw new Error('Banner unexpectedly exists');
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error('Required banner did not appear');
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-empty-state': {
          result = await this.listBrowserExtensionEmptyStates(sessionId, effectiveFrameSelectors, 20, defaults.timeoutMs) as Record<string, unknown>;
          const emptyStates = Array.isArray(result.emptyStates) ? result.emptyStates as Array<Record<string, unknown>> : [];
          const matched = emptyStates.find((entry) =>
            (!step.text
              || this.matchesBrowserextQuery(String(entry.text ?? ''), step.text, exact)
              || this.matchesBrowserextQuery(String(entry.label ?? ''), step.text, exact)
              || this.matchesBrowserextQuery(String(entry.selector ?? ''), step.text, exact))
            && (!step.kindMatch || entry.kind === step.kindMatch)
          );
          if (step.exists === false && matched) {
            throw new Error('Empty state unexpectedly exists');
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error('Required empty state did not appear');
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-page-ready': {
          result = await this.ensureBrowserExtensionPageReady(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            exact,
            limit: 20,
            timeoutMs: defaults.timeoutMs,
            intervalMs: defaults.intervalMs
          }) as Record<string, unknown>;
          if (result.ready !== true) {
            throw new Error('Page is not ready');
          }
          break;
        }
        case 'assert-metadata': {
          result = await this.browserExtensionMetadata(sessionId, defaults.timeoutMs) as Record<string, unknown>;
          const value = this.readBrowserExtensionMetadataValue(result, step.key);
          const comparable = this.extractBrowserExtensionOutputComparable(value);
          const exists = value !== undefined && value !== null && comparable.length > 0;
          if (step.exists === false && exists) {
            throw new Error(`Metadata "${step.key}" unexpectedly exists`);
          }
          if ((step.exists ?? true) && !exists) {
            throw new Error(`Required metadata "${step.key}" did not appear`);
          }
          if (step.equals !== undefined && comparable !== step.equals) {
            throw new Error(`Metadata "${step.key}" did not equal the expected value`);
          }
          if (step.includes !== undefined && !comparable.includes(step.includes)) {
            throw new Error(`Metadata "${step.key}" did not include the expected text`);
          }
          result = { ...result, key: step.key, value, comparable };
          break;
        }
        case 'assert-url-part': {
          result = await this.browserExtensionUrlParts(sessionId, defaults.timeoutMs) as Record<string, unknown>;
          const value = this.readBrowserExtensionUrlPartValue(result, step.part);
          const comparable = this.extractBrowserExtensionOutputComparable(value);
          const exists = value !== undefined && value !== null && comparable.length > 0;
          if (step.exists === false && exists) {
            throw new Error(`URL part "${step.part}" unexpectedly exists`);
          }
          if ((step.exists ?? true) && !exists) {
            throw new Error(`Required URL part "${step.part}" did not appear`);
          }
          if (step.equals !== undefined && comparable !== step.equals) {
            throw new Error(`URL part "${step.part}" did not equal the expected value`);
          }
          if (step.includes !== undefined && !comparable.includes(step.includes)) {
            throw new Error(`URL part "${step.part}" did not include the expected text`);
          }
          result = { ...result, part: step.part, value, comparable };
          break;
        }
        case 'assert-storage': {
          result = await this.browserExtensionGetStorageEntry(sessionId, step.key, {
            scope: step.scope,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          const matched = result.entry as Record<string, unknown> | undefined;
          const comparable = this.extractBrowserExtensionOutputComparable(matched?.value);
          if (step.exists === false && matched) {
            throw new Error(`Storage key "${step.key}" unexpectedly exists`);
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error(`Required storage key "${step.key}" did not appear`);
          }
          if (step.equals !== undefined && comparable !== step.equals) {
            throw new Error(`Storage key "${step.key}" did not equal the expected value`);
          }
          if (step.includes !== undefined && !comparable.includes(step.includes)) {
            throw new Error(`Storage key "${step.key}" did not include the expected text`);
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-cookie': {
          result = await this.browserExtensionGetCookie(sessionId, step.name, {
            targetUrl: step.targetUrl,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          const matched = result.cookie as Record<string, unknown> | undefined;
          const comparable = this.extractBrowserExtensionOutputComparable(matched?.value);
          if (step.exists === false && matched) {
            throw new Error(`Cookie "${step.name}" unexpectedly exists`);
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error(`Required cookie "${step.name}" did not appear`);
          }
          if (step.equals !== undefined && comparable !== step.equals) {
            throw new Error(`Cookie "${step.name}" did not equal the expected value`);
          }
          if (step.includes !== undefined && !comparable.includes(step.includes)) {
            throw new Error(`Cookie "${step.name}" did not include the expected text`);
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-download': {
          result = await this.browserExtensionDownloads(sessionId, {
            query: step.query,
            state: step.state,
            limit: 20,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          const downloads = Array.isArray(result.downloads) ? result.downloads as Array<Record<string, unknown>> : [];
          const matched = downloads[0];
          if (step.exists === false && matched) {
            throw new Error('Download unexpectedly exists');
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error('Required download did not appear');
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-dialog': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(
            sessionId,
            effectiveFrameSelectors,
            20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          const dialogs = Array.isArray(result.dialogs) ? result.dialogs as Array<Record<string, unknown>> : [];
          const matched = dialogs.find((entry) =>
            !step.query
            || this.matchesBrowserextQuery(String(entry.label ?? ''), step.query, exact)
            || this.matchesBrowserextQuery(String(entry.selector ?? ''), step.query, exact)
          );
          if (step.exists === false && matched) {
            throw new Error('Dialog unexpectedly exists');
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error('Required dialog did not appear');
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-dialog-action': {
          result = await this.listBrowserExtensionDialogActions(sessionId, step.dialog, {
            frameSelectors: effectiveFrameSelectors,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          const actions = Array.isArray(result.actions) ? result.actions as Array<Record<string, unknown>> : [];
          const matched = actions.find((entry) =>
            this.matchesBrowserextQuery(String(entry.label ?? ''), step.action, exact)
            || this.matchesBrowserextQuery(String(entry.selector ?? ''), step.action, exact)
          );
          if (step.exists === false && matched) {
            throw new Error(`Dialog action "${step.action}" unexpectedly exists`);
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error(`Required dialog action "${step.action}" did not appear`);
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-menu': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(
            sessionId,
            effectiveFrameSelectors,
            20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          const menus = Array.isArray(result.menus) ? result.menus as Array<Record<string, unknown>> : [];
          const matched = menus.find((entry) =>
            !step.query
            || this.matchesBrowserextQuery(String(entry.label ?? ''), step.query, exact)
            || this.matchesBrowserextQuery(String(entry.selector ?? ''), step.query, exact)
            || (Array.isArray(entry.options) && entry.options.some((option) =>
              this.matchesBrowserextQuery(String((option as Record<string, unknown>).label ?? ''), step.query!, exact)
              || this.matchesBrowserextQuery(String((option as Record<string, unknown>).value ?? ''), step.query!, exact)))
          );
          if (step.exists === false && matched) {
            throw new Error('Menu unexpectedly exists');
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error('Required menu did not appear');
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-menu-option': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(
            sessionId,
            effectiveFrameSelectors,
            20,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          const menus = Array.isArray(result.menus) ? result.menus as Array<Record<string, unknown>> : [];
          const matchedMenu = menus.find((entry) =>
            !step.menu
            || this.matchesBrowserextQuery(String(entry.label ?? ''), step.menu, exact)
            || this.matchesBrowserextQuery(String(entry.selector ?? ''), step.menu, exact)
          );
          const options = Array.isArray(matchedMenu?.options) ? matchedMenu.options as Array<Record<string, unknown>> : [];
          const matched = options.find((entry) =>
            this.matchesBrowserextQuery(String(entry.label ?? ''), step.option, exact)
            || this.matchesBrowserextQuery(String(entry.value ?? ''), step.option, exact)
          );
          if (step.exists === false && matched) {
            throw new Error(`Menu option "${step.option}" unexpectedly exists`);
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error(`Required menu option "${step.option}" did not appear`);
          }
          result = { ...result, matchedMenu, matched };
          break;
        }
        case 'assert-disclosure-state': {
          result = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDisclosures(
            sessionId,
            effectiveFrameSelectors,
            50,
            defaults.timeoutMs
          )) as Record<string, unknown>;
          const disclosures = Array.isArray(result.disclosures) ? result.disclosures as Array<Record<string, unknown>> : [];
          const matched = disclosures.find((entry) =>
            this.matchesBrowserextQuery(String(entry.label ?? ''), step.query, exact)
            || this.matchesBrowserextQuery(String(entry.selector ?? ''), step.query, exact)
          );
          if (step.exists === false && matched) {
            throw new Error(`Disclosure "${step.query}" unexpectedly exists`);
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error(`Required disclosure "${step.query}" did not appear`);
          }
          if (matched && Boolean(matched.expanded) !== (step.state === 'open')) {
            throw new Error(`Disclosure "${step.query}" did not match requested state "${step.state}"`);
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-no-blockers': {
          result = await this.readBrowserExtensionPageBlockers(sessionId, {
            frameSelectors: effectiveFrameSelectors,
            limit: 20,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          if (result.hasBlockers === true) {
            throw new Error('Page blockers are still present');
          }
          break;
        }
        case 'assert-no-collection-filters': {
          const [controls, tokens] = await Promise.all([
            this.listBrowserExtensionActiveCollectionFilters(sessionId, {
              collectionQuery: step.collection,
              frameSelectors: effectiveFrameSelectors,
              exact,
              limit: 50,
              timeoutMs: defaults.timeoutMs
            }),
            this.listBrowserExtensionCollectionFilterTokens(sessionId, {
              collectionQuery: step.collection,
              frameSelectors: effectiveFrameSelectors,
              exact,
              limit: 50,
              timeoutMs: defaults.timeoutMs
            })
          ]);
          result = {
            ...controls,
            tokenCount: tokens.count,
            tokens: tokens.tokens
          };
          if ((controls.count ?? 0) > 0 || (tokens.count ?? 0) > 0) {
            throw new Error('Collection filters are still active');
          }
          break;
        }
        case 'assert-collection-filter': {
          result = await this.listBrowserExtensionActiveCollectionFilters(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            limit: 50,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          const controls = Array.isArray(result.controls) ? result.controls as Array<Record<string, unknown>> : [];
          const matched = controls.find((entry) =>
            this.matchesBrowserextQuery(String(entry.label ?? ''), step.query, exact)
            || this.matchesBrowserextQuery(String(entry.selector ?? ''), step.query, exact)
            || this.matchesBrowserextQuery(String(entry.value ?? ''), step.query, exact)
          );
          if (step.exists === false && matched) {
            throw new Error('Collection filter unexpectedly exists');
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error('Required collection filter state did not appear');
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-collection-filter-token': {
          result = await this.listBrowserExtensionCollectionFilterTokens(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            limit: 50,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          const tokens = Array.isArray(result.tokens) ? result.tokens as Array<Record<string, unknown>> : [];
          const matched = tokens.find((entry) =>
            this.matchesBrowserextQuery(String(entry.label ?? ''), step.query, exact)
            || this.matchesBrowserextQuery(String(entry.selector ?? ''), step.query, exact)
            || this.matchesBrowserextQuery(String(entry.value ?? ''), step.query, exact)
          );
          if (step.exists === false && matched) {
            throw new Error('Collection filter token unexpectedly exists');
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error('Required collection filter token did not appear');
          }
          result = { ...result, matched };
          break;
        }
        case 'assert-collection-sort': {
          result = await this.listBrowserExtensionCollectionSortState(sessionId, {
            collectionQuery: step.collection,
            frameSelectors: effectiveFrameSelectors,
            limit: 50,
            exact,
            timeoutMs: defaults.timeoutMs
          }) as Record<string, unknown>;
          const controls = Array.isArray(result.controls) ? result.controls as Array<Record<string, unknown>> : [];
          const matched = controls.find((entry) =>
            this.matchesBrowserextQuery(String(entry.label ?? ''), step.query, exact)
            || this.matchesBrowserextQuery(String(entry.selector ?? ''), step.query, exact)
            || this.matchesBrowserextQuery(String(entry.value ?? ''), step.query, exact)
            || this.matchesBrowserextQuery(String(entry.sortDirection ?? ''), step.query, exact)
          );
          if (step.exists === false && matched) {
            throw new Error('Collection sort unexpectedly exists');
          }
          if ((step.exists ?? true) && !matched) {
            throw new Error('Required collection sort state did not appear');
          }
          result = { ...result, matched };
          break;
        }
        case 'settle': {
          const settle = resolveBrowserExtensionWorkflowSettleConfig({
            kind: step.kind,
            settleAfter: step.mode ?? defaults.settleAfterEach,
            settleQuietMs: step.quietMs ?? defaults.settleQuietMs,
            settleIntervalMs: defaults.intervalMs,
            stableReads: step.stableReads ?? defaults.stableReads,
          }, defaults);
          result = (await this.settleBrowserExtensionWorkflow(sessionId, settle?.mode, {
            quietMs: settle?.quietMs,
            timeoutMs: defaults.timeoutMs,
            intervalMs: settle?.intervalMs,
            stableReads: settle?.stableReads
          })) as Record<string, unknown>;
          break;
        }
        case 'branch': {
          const matched = await this.evaluateBrowserExtensionScenarioCondition(sessionId, step.condition, {
            timeoutMs: defaults.timeoutMs,
            intervalMs: defaults.intervalMs
          }, runtimeState);
          const branchSteps = matched ? step.then ?? [] : step.else ?? [];
          const branchResults = await this.executeBrowserExtensionScenarioSteps(sessionId, branchSteps, defaults, workflowMetadata, runtimeState);
          return {
            kind: 'branch',
            name: step.name,
            matched,
            condition: step.condition,
            branch: matched ? 'then' : 'else',
            steps: branchResults,
            attempts: attempt + 1
          };
        }
        case 'repeat-until': {
          const maxAttempts = Math.max(1, step.maxAttempts ?? 3);
          const attemptsLog: Array<Record<string, unknown>> = [];
          for (let iteration = 1; iteration <= maxAttempts; iteration += 1) {
            const matchedBefore = await this.evaluateBrowserExtensionScenarioCondition(sessionId, step.condition, {
              timeoutMs: defaults.timeoutMs,
              intervalMs: defaults.intervalMs
            }, runtimeState);
            if (matchedBefore) {
              return {
                kind: 'repeat-until',
                name: step.name,
                condition: step.condition,
                matched: true,
                satisfiedBeforeIteration: true,
                iterations: iteration - 1,
                attemptsLog,
                attempts: attempt + 1
              };
            }
            const nestedResults = await this.executeBrowserExtensionScenarioSteps(sessionId, step.steps ?? [], defaults, workflowMetadata, runtimeState);
            const matchedAfter = await this.evaluateBrowserExtensionScenarioCondition(sessionId, step.condition, {
              timeoutMs: defaults.timeoutMs,
              intervalMs: defaults.intervalMs
            }, runtimeState);
            attemptsLog.push({
              iteration,
              matchedAfter,
              steps: nestedResults
            });
            if (matchedAfter) {
              return {
                kind: 'repeat-until',
                name: step.name,
                condition: step.condition,
                matched: true,
                iterations: iteration,
                attemptsLog,
                attempts: attempt + 1
              };
            }
            await this.delayBrowserExtensionWorkflow(step.delayMs ?? defaults.delayMs ?? 0);
          }
          throw new Error(`repeat-until condition was not satisfied within ${Math.max(1, step.maxAttempts ?? 3)} attempts`);
        }
        }
      }
      }
      }

      if (!result) {
        throw new Error(`Unhandled browserext workflow step: ${step.kind}`);
      }
      if ((defaults.delayMs ?? 0) > 0 && !['wait-text', 'wait-selector', 'wait-no-selector', 'wait-url', 'settle', 'branch'].includes(step.kind)) {
        await this.delayBrowserExtensionWorkflow(defaults.delayMs);
      }
      const settle = shouldAutoSettleBrowserExtensionWorkflowStep(step.kind)
        ? resolveBrowserExtensionWorkflowSettleConfig(step, defaults)
        : undefined;
      const settled = settle?.skip
        ? { mode: settle.mode, skipped: true }
        : await this.settleBrowserExtensionWorkflow(sessionId, settle?.mode, {
            quietMs: settle?.quietMs,
            timeoutMs: defaults.timeoutMs,
            intervalMs: settle?.intervalMs,
            stableReads: settle?.stableReads
          });
      if (step.saveAs && !['capture-url', 'capture-text', 'capture-field', 'capture-form-values', 'capture-next-action', 'extract-output', 'state-diff'].includes(step.kind)) {
        this.setBrowserExtensionWorkflowOutput(runtimeState, step.saveAs, result);
      }
      return {
        kind: step.kind,
        name: step.name,
        saveAs: step.saveAs,
        preferredFormSelector,
        selectedContext: resolvedContext?.selectedContext,
        result,
        settled,
        attempts: attempt + 1
      };
    });
  }

  private async executeBrowserExtensionScenarioSteps(
    sessionId: string,
    steps: BrowserExtensionScenarioStep[],
    defaults: Omit<BrowserExtensionScenarioDocument, 'steps'>,
    workflowMetadata: BrowserExtensionNormalizedWorkflowMetadata,
    runtimeState?: BrowserExtensionScenarioRuntimeState
  ) {
    const results: Array<Record<string, unknown>> = [];
    for (const step of steps) {
      const interpolatedStep = this.interpolateBrowserExtensionScenarioStep(step, runtimeState);
      results.push(await this.executeBrowserExtensionScenarioStep(sessionId, interpolatedStep, defaults, workflowMetadata, runtimeState));
    }
    return results;
  }

  waitForDomQuietBrowserExtensionSession(
    sessionId: string,
    quietMs?: number,
    timeoutMs?: number,
    intervalMs?: number,
    mutationType?: 'childList' | 'attributes' | 'characterData',
    textIncludes?: string
  ) {
    return this.runtime.browserExtensionService.waitForDomQuiet(sessionId, {
      quietMs,
      timeoutMs,
      intervalMs,
      mutationType,
      textIncludes
    });
  }

  waitForNetworkIdleBrowserExtensionSession(
    sessionId: string,
    quietMs?: number,
    timeoutMs?: number,
    intervalMs?: number,
    urlIncludes?: string,
    stage?: 'request' | 'response' | 'error',
    method?: string
  ) {
    return this.runtime.browserExtensionService.waitForNetworkIdle(sessionId, {
      quietMs,
      timeoutMs,
      intervalMs,
      urlIncludes,
      stage,
      method
    });
  }

  waitForPageStableBrowserExtensionSession(
    sessionId: string,
    quietMs?: number,
    timeoutMs?: number,
    intervalMs?: number,
    stableReads?: number
  ) {
    return this.runtime.browserExtensionService.waitForPageStable(sessionId, {
      quietMs,
      timeoutMs,
      intervalMs,
      stableReads
    });
  }

  waitForBrowserExtensionUrl(sessionId: string, needle: string, timeoutMs?: number, intervalMs?: number) {
    return this.runtime.browserExtensionService.waitForUrl(sessionId, needle, { timeoutMs, intervalMs });
  }

  waitForBrowserExtensionSelector(sessionId: string, selector: string, timeoutMs?: number, intervalMs?: number) {
    return this.runtime.browserExtensionService.waitForSelector(sessionId, selector, { timeoutMs, intervalMs });
  }

  waitForBrowserExtensionNoSelector(sessionId: string, selector: string, timeoutMs?: number, intervalMs?: number) {
    return this.runtime.browserExtensionService.waitForNoSelector(sessionId, selector, { timeoutMs, intervalMs });
  }

  evaluateBrowserExtensionSession(sessionId: string, expression: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.evaluate(sessionId, expression, timeoutMs);
  }

  clickBrowserExtensionSession(sessionId: string, selector: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.click(sessionId, selector, timeoutMs);
  }

  clickBrowserExtensionQuery(
    sessionId: string,
    query: string,
    options?: {
      by?: 'text' | 'selector' | 'role' | 'id' | 'name' | 'placeholder' | 'tag';
      selector?: string;
      frameSelectors?: string[];
      maxDepth?: number;
      maxChildren?: number;
      timeoutMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.clickByQuery(sessionId, query, options);
  }

  typeBrowserExtensionSession(sessionId: string, selector: string, text: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.type(sessionId, selector, text, timeoutMs);
  }

  pressBrowserExtensionSession(sessionId: string, key: string, selector?: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.press(sessionId, selector, key, timeoutMs);
  }

  editorReadBrowserExtensionSession(sessionId: string, selector: string, timeoutMs?: number, frameSelectors?: string[]) {
    return this.runtime.browserExtensionService.editorRead(sessionId, selector, frameSelectors, timeoutMs);
  }

  editorFillBrowserExtensionSession(sessionId: string, selector: string, value: string, timeoutMs?: number, frameSelectors?: string[]) {
    return this.runtime.browserExtensionService.editorFill(sessionId, selector, value, frameSelectors, timeoutMs);
  }

  formFillBrowserExtensionSession(sessionId: string, selector: string, value: string, timeoutMs?: number, frameSelectors?: string[]) {
    return this.runtime.browserExtensionService.formFillInFrames(sessionId, selector, value, frameSelectors, timeoutMs);
  }

  formFillHumanBrowserExtensionSession(
    sessionId: string,
    selector: string,
    value: string,
    options?: { timeoutMs?: number; frameSelectors?: string[]; delayMs?: number; jitterMs?: number }
  ) {
    return this.runtime.browserExtensionService.formFillHuman(sessionId, selector, value, options);
  }

  formFillManyBrowserExtensionSession(
    sessionId: string,
    fields: Array<{ selector: string; value: string }>,
    timeoutMs?: number,
    frameSelectors?: string[]
  ) {
    return this.runtime.browserExtensionService.formFillMany(sessionId, fields, frameSelectors, timeoutMs);
  }

  listFormFieldsBrowserExtensionSession(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listFormFields(sessionId, frameSelectors, limit, timeoutMs);
  }

  async listFormValuesBrowserExtensionSession(
    sessionId: string,
    options?: {
      frameSelectors?: string[];
      formSelector?: string;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    await this.ensureBrowserExtensionSessionUsable(sessionId, options?.timeoutMs);
    const resolved = await this.resolveBrowserExtensionFormContext(sessionId, options);
    const effectiveFrameSelectors = options?.frameSelectors ?? resolved.selectedContext?.frameSelectors;
    const effectiveFormSelector = options?.formSelector ?? resolved.preferredFormSelector;
    const fields = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listFormFields(
      sessionId,
      effectiveFrameSelectors,
      options?.limit ?? 100,
      options?.timeoutMs
    ));
    const entries = fields.fields
      .filter((field) => !effectiveFormSelector || field.formSelector === effectiveFormSelector)
      .map((field) => ({
        selector: field.selector,
        name: field.name,
        type: field.type,
        value: field.value ?? '',
        checked: field.checked ?? false,
        labels: field.labels ?? [],
        placeholder: field.placeholder,
        required: field.required ?? false,
        formSelector: field.formSelector,
        frameSelectors: field.frameSelectors
      }));
    const values = entries.reduce<Record<string, unknown>>((acc, entry) => {
      const key = entry.name || entry.selector;
      acc[key] = entry.type === 'checkbox' || entry.type === 'radio'
        ? Boolean(entry.checked)
        : entry.value;
      return acc;
    }, {});
    return {
      sessionId,
      frameSelectors: effectiveFrameSelectors,
      formSelector: effectiveFormSelector,
      contextQuery: options?.contextQuery,
      frameQuery: options?.frameQuery,
      exact: options?.exact ?? false,
      count: entries.length,
      entries,
      values
    };
  }

  listFormContextsBrowserExtensionSession(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listFormContexts(sessionId, frameSelectors, limit, timeoutMs);
  }

  contextPlanBrowserExtensionSession(
    sessionId: string,
    options?: {
      frameSelectors?: string[];
      formSelector?: string;
      contextIndex?: number;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    return this.planBrowserExtensionContexts(sessionId, options);
  }

  async browserExtensionContextState(
    sessionId: string,
    options?: {
      frameSelectors?: string[];
      formSelector?: string;
      contextIndex?: number;
      contextQuery?: string;
      frameQuery?: string;
      exact?: boolean;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    await this.ensureBrowserExtensionSessionUsable(sessionId, options?.timeoutMs);
    const resolved = await this.resolveBrowserExtensionFormContext(sessionId, options);
    const effectiveFrameSelectors = options?.frameSelectors ?? resolved.selectedContext?.frameSelectors;
    const limit = Math.max(1, options?.limit ?? 20);
    const [pageState, fieldValues, fields, dialogs, menus, disclosures, collections, collectionRows, paginations, radios, segmenteds, tablists, steppers, actionables, nextActions] = await Promise.all([
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.pageState(sessionId, {
        frameSelectors: effectiveFrameSelectors,
        limit,
        timeoutMs: options?.timeoutMs
      })).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, pageState: undefined })),
      this.listFormValuesBrowserExtensionSession(sessionId, {
        frameSelectors: effectiveFrameSelectors,
        formSelector: resolved.preferredFormSelector,
        contextQuery: options?.contextQuery,
        frameQuery: options?.frameQuery,
        exact: options?.exact,
        limit,
        timeoutMs: options?.timeoutMs
      }).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, formSelector: resolved.preferredFormSelector, count: 0, entries: [], values: {} })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listFormFields(
        sessionId,
        effectiveFrameSelectors,
        limit,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, fields: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDialogs(
        sessionId,
        effectiveFrameSelectors,
        limit,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, dialogs: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listMenus(
        sessionId,
        effectiveFrameSelectors,
        limit,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, menus: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listDisclosures(
        sessionId,
        effectiveFrameSelectors,
        limit,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, disclosures: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollections(
        sessionId,
        effectiveFrameSelectors,
        limit,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, collections: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listCollectionRows(sessionId, {
        frameSelectors: effectiveFrameSelectors,
        limit,
        timeoutMs: options?.timeoutMs
      })).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, rows: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listPaginations(
        sessionId,
        effectiveFrameSelectors,
        limit,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, paginations: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listRadioGroups(
        sessionId,
        effectiveFrameSelectors,
        limit,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, groups: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listSegmentedGroups(
        sessionId,
        effectiveFrameSelectors,
        limit,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, groups: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listTablists(
        sessionId,
        effectiveFrameSelectors,
        limit,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, groups: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listSteppers(
        sessionId,
        effectiveFrameSelectors,
        limit,
        options?.timeoutMs
      )).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, steppers: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.listActionables(sessionId, {
        frameSelectors: effectiveFrameSelectors,
        limit,
        timeoutMs: options?.timeoutMs
      })).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, actionables: [] })),
      this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.suggestNextActions(sessionId, {
        frameSelectors: effectiveFrameSelectors,
        limit,
        timeoutMs: options?.timeoutMs
      })).catch(() => ({ sessionId, frameSelectors: effectiveFrameSelectors, count: 0, suggestions: [] }))
    ]);
    return {
      sessionId,
      frameSelectors: options?.frameSelectors,
      formSelector: options?.formSelector,
      contextIndex: options?.contextIndex,
      contextQuery: options?.contextQuery,
      frameQuery: options?.frameQuery,
      exact: options?.exact ?? false,
      selectedContext: resolved.selectedContext,
      preferredFormSelector: resolved.preferredFormSelector,
      candidates: resolved.candidates,
      frames: resolved.frames.frames,
      contexts: resolved.contexts.contexts,
      pageState: pageState.pageState,
      formValues: fieldValues.values,
      formValueEntries: fieldValues.entries,
      fields: fields.fields,
      dialogs: dialogs.dialogs,
      menus: menus.menus,
      disclosures: disclosures.disclosures,
      collections: collections.collections,
      collectionSelectionStates: collections.collections.map((collection) => ({
        selector: collection.selector,
        label: collection.label,
        collectionType: collection.collectionType,
        itemCount: collection.itemCount,
        selectedCount: collection.selectedCount ?? collection.items.filter((item) => item.selected).length,
        selectedRows: collection.items.filter((item) => item.selected).map((item) => ({
          selector: item.selector,
          label: item.label,
          text: item.text,
          rowIndex: item.rowIndex
        }))
      })),
      collectionDetailStates: collections.collections.map((collection) => ({
        selector: collection.selector,
        label: collection.label,
        expandedCount: collection.expandedCount ?? collection.items.filter((item) => item.expanded).length,
        detailCount: collection.detailCount ?? collection.items.filter((item) => Boolean(item.detailText)).length,
        expandedRows: collection.items.filter((item) => item.expanded || item.detailText).map((item) => ({
          selector: item.selector,
          label: item.label,
          text: item.text,
          expanded: item.expanded ?? false,
          detailText: item.detailText,
          rowIndex: item.rowIndex
        }))
      })),
      collectionRows: collectionRows.rows,
      paginations: paginations.paginations,
      radios: radios.groups,
      segmenteds: segmenteds.groups,
      tablists: tablists.groups,
      steppers: steppers.steppers,
      actionables: actionables.actionables,
      nextActions: nextActions.suggestions
    };
  }

  listRadioGroupsBrowserExtensionSession(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listRadioGroups(sessionId, frameSelectors, limit, timeoutMs);
  }

  listSegmentedGroupsBrowserExtensionSession(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listSegmentedGroups(sessionId, frameSelectors, limit, timeoutMs);
  }

  listTablistsBrowserExtensionSession(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listTablists(sessionId, frameSelectors, limit, timeoutMs);
  }

  selectTablistBrowserExtensionSession(
    sessionId: string,
    query: string,
    value: string,
    options?: { frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.selectTablistOption(sessionId, query, value, {
      frameSelectors: options?.frameSelectors,
      preferredFormSelector: options?.formSelector,
      exact: options?.exact,
      timeoutMs: options?.timeoutMs
    });
  }

  listSteppersBrowserExtensionSession(sessionId: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listSteppers(sessionId, frameSelectors, limit, timeoutMs);
  }

  async bulkClickBrowserExtensionCollectionRows(
    sessionId: string,
    options: {
      rowQueries: string[];
      actionQuery?: string;
      collectionQuery?: string;
      frameSelectors?: string[];
      exact?: boolean;
      continueOnError?: boolean;
      timeoutMs?: number;
    }
  ) {
    const results: Array<Record<string, unknown>> = [];
    const errors: Array<Record<string, unknown>> = [];
    for (const rowQuery of options.rowQueries) {
      try {
        const result = await this.runtime.browserExtensionService.clickCollectionRowAction(sessionId, {
          rowQuery,
          actionQuery: options.actionQuery,
          collectionQuery: options.collectionQuery,
          frameSelectors: options.frameSelectors,
          exact: options.exact,
          timeoutMs: options.timeoutMs
        });
        results.push(result as Record<string, unknown>);
      } catch (error) {
        errors.push({
          rowQuery,
          error: error instanceof Error ? error.message : String(error)
        });
        if (!options.continueOnError) {
          break;
        }
      }
    }
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      actionQuery: options.actionQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      continueOnError: options.continueOnError ?? false,
      requestedCount: options.rowQueries.length,
      succeededCount: results.length,
      failedCount: errors.length,
      results,
      errors
    };
  }

  async exportBrowserExtensionCollection(
    sessionId: string,
    options?: {
      collectionQuery?: string;
      frameSelectors?: string[];
      exact?: boolean;
      includeSelection?: boolean;
      includeDetails?: boolean;
      format?: 'json' | 'markdown';
      filePath?: string;
      timeoutMs?: number;
    }
  ) {
    const rowsResult = await this.runtime.browserExtensionService.listCollectionRows(sessionId, {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact,
      limit: 500,
      timeoutMs: options?.timeoutMs
    });
    let rows = rowsResult.rows.map((row) => ({ ...row }));
    if (options?.includeSelection) {
      const selection = await this.runtime.browserExtensionService.getCollectionSelectionState(sessionId, {
        collectionQuery: options?.collectionQuery,
        frameSelectors: options?.frameSelectors,
        exact: options?.exact,
        timeoutMs: options?.timeoutMs
      }).catch(() => undefined);
      if (selection) {
        const selectedSelectors = new Set(selection.selectedRows.map((row) => row.selector));
        rows = rows.map((row) => ({
          ...row,
          selected: row.selected ?? selectedSelectors.has(row.selector)
        }));
      }
    }
    if (options?.includeDetails) {
      rows = await Promise.all(rows.map(async (row) => {
        try {
          const detail = await this.runtime.browserExtensionService.getCollectionRowDetails(sessionId, {
            rowQuery: row.label ?? row.text ?? row.selector,
            collectionQuery: options?.collectionQuery,
            frameSelectors: options?.frameSelectors,
            exact: row.label ? true : options?.exact,
            timeoutMs: options?.timeoutMs
          });
          return {
            ...row,
            expanded: detail.expanded ?? row.expanded,
            detailText: detail.detailText ?? row.detailText
          };
        } catch {
          return row;
        }
      }));
    }
    const collection = rowsResult.collection
      ? {
          ...rowsResult.collection,
          selectedCount: rows.filter((row) => row.selected).length,
          expandedCount: rows.filter((row) => row.expanded).length,
          detailCount: rows.filter((row) => Boolean(row.detailText)).length
        }
      : undefined;
    const payload = {
      sessionId,
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      includeSelection: options?.includeSelection ?? false,
      includeDetails: options?.includeDetails ?? false,
      format: options?.format ?? 'json',
      exportedAt: new Date().toISOString(),
      collection,
      count: rows.length,
      rows
    };
    const content = (options?.format ?? 'json') === 'markdown'
      ? this.renderBrowserExtensionCollectionExportMarkdown({ collection, rows })
      : JSON.stringify(payload, null, 2);
    let resolvedFilePath: string | undefined;
    if (options?.filePath) {
      resolvedFilePath = resolvePath(options.filePath);
      mkdirSync(dirname(resolvedFilePath), { recursive: true });
      writeFileSync(resolvedFilePath, content, 'utf8');
    }
    return {
      ...payload,
      filePath: resolvedFilePath,
      content
    };
  }

  moveStepperBrowserExtensionSession(
    sessionId: string,
    direction: 'next' | 'previous',
    options?: { query?: string; frameSelectors?: string[]; formSelector?: string; exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.moveStepper(sessionId, direction, {
      query: options?.query,
      frameSelectors: options?.frameSelectors,
      preferredFormSelector: options?.formSelector,
      exact: options?.exact,
      timeoutMs: options?.timeoutMs
    });
  }

  setTypedFieldBrowserExtensionSession(
    sessionId: string,
    kind: 'form_date_set' | 'form_time_set' | 'form_datetime_set',
    query: string,
    value: string,
    frameSelectors?: string[],
    exact?: boolean,
    timeoutMs?: number,
    formSelector?: string
  ) {
    return this.runtime.browserExtensionService.setTypedFieldByQuery(sessionId, kind, query, value, {
      frameSelectors,
      exact,
      timeoutMs,
      preferredFormSelector: formSelector
    });
  }

  findFormFieldBrowserExtensionSession(sessionId: string, query: string, frameSelectors?: string[], exact?: boolean, timeoutMs?: number) {
    return this.runtime.browserExtensionService.findFormField(sessionId, query, frameSelectors, exact, timeoutMs);
  }

  listFormOptionsBrowserExtensionSession(sessionId: string, selector: string, frameSelectors?: string[], limit?: number, timeoutMs?: number) {
    return this.runtime.browserExtensionService.listFormOptions(sessionId, selector, frameSelectors, limit, timeoutMs);
  }

  fillFormFieldByLabelBrowserExtensionSession(
    sessionId: string,
    query: string,
    value: string,
    frameSelectors?: string[],
    exact?: boolean,
    timeoutMs?: number
  ) {
    return this.runtime.browserExtensionService.fillFormFieldByLabel(sessionId, query, value, frameSelectors, exact, timeoutMs);
  }

  fillFormFieldByQueryBrowserExtensionSession(
    sessionId: string,
    query: string,
    value: string,
    frameSelectors?: string[],
    exact?: boolean,
    timeoutMs?: number,
    formSelector?: string
  ) {
    return this.runtime.browserExtensionService.fillFormFieldByQuery(sessionId, query, value, {
      frameSelectors,
      exact,
      timeoutMs,
      preferredFormSelector: formSelector
    });
  }

  selectFormOptionBrowserExtensionSession(
    sessionId: string,
    selector: string,
    value: string,
    by?: 'text' | 'value' | 'label',
    timeoutMs?: number,
    frameSelectors?: string[]
  ) {
    return this.runtime.browserExtensionService.selectFormOption(sessionId, selector, value, by, frameSelectors, timeoutMs);
  }

  selectRadioOptionBrowserExtensionSession(
    sessionId: string,
    query: string,
    value: string,
    frameSelectors?: string[],
    exact?: boolean,
    timeoutMs?: number,
    formSelector?: string
  ) {
    return this.runtime.browserExtensionService.selectRadioOption(sessionId, query, value, {
      frameSelectors,
      exact,
      timeoutMs,
      preferredFormSelector: formSelector
    });
  }

  toggleBrowserExtensionControl(
    sessionId: string,
    query: string,
    options?: {
      desiredState?: 'on' | 'off' | 'toggle';
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
      formSelector?: string;
    }
  ) {
    return this.runtime.browserExtensionService.toggleControl(sessionId, query, {
      desiredState: options?.desiredState,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact,
      timeoutMs: options?.timeoutMs,
      preferredFormSelector: options?.formSelector
    });
  }

  selectSegmentedOptionBrowserExtensionSession(
    sessionId: string,
    query: string,
    value: string,
    frameSelectors?: string[],
    exact?: boolean,
    timeoutMs?: number,
    formSelector?: string
  ) {
    return this.runtime.browserExtensionService.selectSegmentedOption(sessionId, query, value, {
      frameSelectors,
      exact,
      timeoutMs,
      preferredFormSelector: formSelector
    });
  }

  setRangeBrowserExtensionControl(
    sessionId: string,
    query: string,
    value: string,
    frameSelectors?: string[],
    exact?: boolean,
    timeoutMs?: number,
    formSelector?: string
  ) {
    return this.runtime.browserExtensionService.setRangeByQuery(sessionId, query, value, {
      frameSelectors,
      exact,
      timeoutMs,
      preferredFormSelector: formSelector
    });
  }

  uploadFormFileBrowserExtensionSession(
    sessionId: string,
    selector: string,
    filepath: string,
    options?: {
      fileName?: string;
      mimeType?: string;
      timeoutMs?: number;
      frameSelectors?: string[];
    }
  ) {
    return this.runtime.browserExtensionService.uploadFormFile(sessionId, selector, filepath, {
      filename: options?.fileName,
      mimeType: options?.mimeType,
      timeoutMs: options?.timeoutMs,
      frameSelectors: options?.frameSelectors
    });
  }

  listFormComboboxOptionsBrowserExtensionSession(
    sessionId: string,
    selector: string,
    frameSelectors?: string[],
    limit?: number,
    timeoutMs?: number
  ) {
    return this.runtime.browserExtensionService.listFormComboboxOptions(sessionId, selector, { frameSelectors, limit, timeoutMs });
  }

  selectFormComboboxOptionBrowserExtensionSession(
    sessionId: string,
    selector: string,
    value: string,
    match?: 'exact' | 'includes',
    timeoutMs?: number,
    frameSelectors?: string[]
  ) {
    return this.runtime.browserExtensionService.selectFormComboboxOption(sessionId, selector, value, { match, timeoutMs, frameSelectors });
  }

  formSubmitBrowserExtensionSession(sessionId: string, selector?: string, timeoutMs?: number, frameSelectors?: string[]) {
    return this.runtime.browserExtensionService.formSubmit(sessionId, selector, timeoutMs, frameSelectors);
  }

  formSubmitAndWaitBrowserExtensionSession(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.formSubmitAndWait(sessionId, options);
  }

  async runBrowserExtensionFormWorkflow(
    sessionId: string,
    options: {
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
    }
  ) {
    await this.ensureBrowserExtensionSessionUsable(sessionId, options.timeoutMs);
    if (options.fields.length === 0) {
      throw new Error('browserext form-workflow requires at least one --field "<query>=<value>"');
    }
    const { selectedContext, preferredFormSelector } = await this.resolveBrowserExtensionFormContext(sessionId, {
      frameSelectors: options.frameSelectors,
      formSelector: options.formSelector,
      contextIndex: options.contextIndex,
      contextQuery: options.contextQuery,
      frameQuery: options.frameQuery,
      exact: options.exact,
      timeoutMs: options.timeoutMs
    });
    const filledFields: Array<{
      query: string;
      value: string;
      selector?: string;
      filled: boolean;
      matchedBy?: string;
    }> = [];
    for (const field of options.fields) {
      const found = await this.runtime.browserExtensionService.findFormField(
        sessionId,
        field.query,
        options.frameSelectors,
        options.exact === true,
        options.timeoutMs,
        preferredFormSelector
      );
      if (!found.field?.selector) {
        throw new Error(`No form field matched query "${field.query}"${preferredFormSelector ? ` within ${preferredFormSelector}` : ''}`);
      }
      const filled = await this.runtime.browserExtensionService.formFillInFrames(
        sessionId,
        found.field.selector,
        field.value,
        options.frameSelectors,
        options.timeoutMs
      );
      filledFields.push({
        query: field.query,
        value: field.value,
        selector: found.field.selector,
        filled: filled.filled,
        matchedBy: found.field.matchedBy
      });
      if ((options.delayMs ?? 0) > 0) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
    }

    let submission:
      | Awaited<ReturnType<OperatorService['formSubmitAndWaitBrowserExtensionSession']>>
      | undefined;
    if (options.submit) {
      submission = await this.formSubmitAndWaitBrowserExtensionSession(sessionId, {
        selector: options.submitSelector ?? selectedContext?.submitSelectors?.[0],
        frameSelectors: options.frameSelectors,
        waitUrlIncludes: options.waitUrlIncludes,
        waitText: options.waitText,
        waitSelector: options.waitSelector,
        waitNoSelector: options.waitNoSelector,
        timeoutMs: options.timeoutMs,
        intervalMs: options.intervalMs
      });
    }

    return {
      sessionId,
      frameSelectors: options.frameSelectors,
      selectedContext,
      contextQuery: options.contextQuery,
      frameQuery: options.frameQuery,
      preferredFormSelector,
      fieldCount: filledFields.length,
      fields: filledFields,
      submitted: submission?.submitted ?? false,
      submission,
      summary: {
        totalSteps: filledFields.length + (submission ? 1 : 0),
        executedSteps: filledFields.length + (submission ? 1 : 0),
        skippedSteps: 0,
        optionalSkippedSteps: 0,
        branchSteps: 0,
        retrySteps: 0,
        totalRetries: 0,
        branchPaths: [],
        stepNames: []
      }
    };
  }

  async runBrowserExtensionQueryWorkflow(
    sessionId: string,
    options: {
      fills: Array<{ query: string; value: string }>;
      clicks?: string[];
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
    }
  ) {
    await this.ensureBrowserExtensionSessionUsable(sessionId, options.timeoutMs);
    if ((options.fills?.length ?? 0) === 0 && (options.clicks?.length ?? 0) === 0 && (options.radios?.length ?? 0) === 0 && (options.segmenteds?.length ?? 0) === 0 && (options.tabs?.length ?? 0) === 0 && (options.steppers?.length ?? 0) === 0 && (options.dates?.length ?? 0) === 0 && (options.times?.length ?? 0) === 0 && (options.datetimes?.length ?? 0) === 0 && (options.ranges?.length ?? 0) === 0 && (options.toggles?.length ?? 0) === 0 && !options.submit && !options.submitQuery) {
      throw new Error('browserext query-workflow requires at least one --fill, --radio, --segment, --tab, --step-next, --step-prev, --date, --time, --datetime, --range, --toggle, --click, --submit, or --submit-query action');
    }

    const defaults: Omit<BrowserExtensionScenarioDocument, 'steps'> = {
      frameSelectors: options.frameSelectors,
      formSelector: options.formSelector,
      contextQuery: options.contextQuery,
      frameQuery: options.frameQuery,
      exact: options.exact,
      delayMs: options.delayMs,
      timeoutMs: options.timeoutMs,
      intervalMs: options.intervalMs,
      settleAfterEach: options.settleAfterEach,
      settleQuietMs: options.settleQuietMs,
      stableReads: options.stableReads,
      retryCount: undefined,
      retryDelayMs: undefined
    };
    const scenarioSteps: BrowserExtensionScenarioStep[] = [
      ...(options.fills ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'fill', query: entry.query, value: entry.value })),
      ...((options.radios ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'radio', query: entry.query, value: entry.value }))),
      ...((options.segmenteds ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'segment', query: entry.query, value: entry.value }))),
      ...((options.tabs ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'tab', query: entry.query, value: entry.value }))),
      ...((options.steppers ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'step', query: entry.query, direction: entry.direction }))),
      ...((options.dates ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'date', query: entry.query, value: entry.value }))),
      ...((options.times ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'time', query: entry.query, value: entry.value }))),
      ...((options.datetimes ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'datetime', query: entry.query, value: entry.value }))),
      ...((options.ranges ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'range', query: entry.query, value: entry.value }))),
      ...((options.toggles ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'toggle', query: entry.query, desiredState: entry.desiredState }))),
      ...((options.clicks ?? []).map((query): BrowserExtensionScenarioStep => ({ kind: 'click', query })))
    ];
    if (options.submitQuery) {
      scenarioSteps.push({ kind: 'submit-query', query: options.submitQuery });
    } else if (options.submit || options.submitSelector) {
      scenarioSteps.push({ kind: 'submit', selector: options.submitSelector });
    }

    const steps: Array<Record<string, unknown>> = [];
    steps.push(...await this.enforceBrowserExtensionWorkflowGuards(sessionId, 'before', {
      requireTexts: options.requireTexts,
      requireNoTexts: options.requireNoTexts,
      requireSelectors: options.requireSelectors,
      requireNoSelectors: options.requireNoSelectors,
      timeoutMs: options.timeoutMs,
      intervalMs: options.intervalMs
    }));
    steps.push(...await this.executeBrowserExtensionScenarioSteps(sessionId, scenarioSteps, defaults, {
      format: 'legacy-scenario'
    }));
    steps.push(...await this.enforceBrowserExtensionWorkflowGuards(sessionId, 'after', {
      requireTexts: options.requireTexts,
      requireNoTexts: options.requireNoTexts,
      requireSelectors: options.requireSelectors,
      requireNoSelectors: options.requireNoSelectors,
      timeoutMs: options.timeoutMs,
      intervalMs: options.intervalMs
    }));

    let waitResult: Record<string, unknown> | undefined;
    if (!options.submit && !options.submitSelector && !options.submitQuery) {
      if (options.waitUrlIncludes) {
        const needle = options.waitUrlIncludes;
        waitResult = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.waitForUrl(sessionId, needle, {
          timeoutMs: options.timeoutMs,
          intervalMs: options.intervalMs
        }));
      } else if (options.waitText) {
        const needle = options.waitText;
        waitResult = await this.withBrowserExtensionTransientRetry(() => this.runtime.browserExtensionService.waitForText(sessionId, needle, {
          timeoutMs: options.timeoutMs,
          intervalMs: options.intervalMs
        }));
      } else if (options.waitSelector) {
        waitResult = await this.runtime.browserExtensionService.waitForSelector(sessionId, options.waitSelector, {
          timeoutMs: options.timeoutMs,
          intervalMs: options.intervalMs
        });
      } else if (options.waitNoSelector) {
        waitResult = await this.runtime.browserExtensionService.waitForNoSelector(sessionId, options.waitNoSelector, {
          timeoutMs: options.timeoutMs,
          intervalMs: options.intervalMs
        });
      }
    }

    const summary = this.summarizeBrowserExtensionWorkflowSteps(steps);
    return {
      sessionId,
      fills: options.fills,
      clicks: options.clicks ?? [],
      radios: options.radios ?? [],
      segmenteds: options.segmenteds ?? [],
      tabs: options.tabs ?? [],
      steppers: options.steppers ?? [],
      dates: options.dates ?? [],
      times: options.times ?? [],
      datetimes: options.datetimes ?? [],
      ranges: options.ranges ?? [],
      toggles: options.toggles ?? [],
      frameSelectors: options.frameSelectors,
      formSelector: options.formSelector,
      contextQuery: options.contextQuery,
      frameQuery: options.frameQuery,
      exact: options.exact ?? false,
      submit: options.submit ?? false,
      submitSelector: options.submitSelector,
      submitQuery: options.submitQuery,
      steps,
      waitResult,
      summary
    };
  }

  async planBrowserExtensionQueryWorkflow(
    sessionId: string,
    options: {
      fills: Array<{ query: string; value: string }>;
      clicks?: string[];
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
    }
  ) {
    await this.ensureBrowserExtensionSessionUsable(sessionId);
    const { selectedContext, preferredFormSelector } = await this.resolveBrowserExtensionFormContext(sessionId, {
      frameSelectors: options.frameSelectors,
      formSelector: options.formSelector,
      contextQuery: options.contextQuery,
      frameQuery: options.frameQuery,
      exact: options.exact,
      timeoutMs: undefined
    });
    const steps: Array<Record<string, unknown>> = [];
    const scenarioSteps: BrowserExtensionScenarioStep[] = [
      ...(options.fills ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'fill', query: entry.query, value: entry.value })),
      ...((options.radios ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'radio', query: entry.query, value: entry.value }))),
      ...((options.segmenteds ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'segment', query: entry.query, value: entry.value }))),
      ...((options.tabs ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'tab', query: entry.query, value: entry.value }))),
      ...((options.steppers ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'step', query: entry.query, direction: entry.direction }))),
      ...((options.dates ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'date', query: entry.query, value: entry.value }))),
      ...((options.times ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'time', query: entry.query, value: entry.value }))),
      ...((options.datetimes ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'datetime', query: entry.query, value: entry.value }))),
      ...((options.ranges ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'range', query: entry.query, value: entry.value }))),
      ...((options.toggles ?? []).map((entry): BrowserExtensionScenarioStep => ({ kind: 'toggle', query: entry.query, desiredState: entry.desiredState }))),
      ...((options.clicks ?? []).map((query): BrowserExtensionScenarioStep => ({ kind: 'click', query })))
    ];
    if (options.submitQuery) {
      scenarioSteps.push({ kind: 'submit-query', query: options.submitQuery });
    } else if (options.submit || options.submitSelector) {
      scenarioSteps.push({ kind: 'submit', selector: options.submitSelector });
    }
    for (const step of scenarioSteps) {
      steps.push(await this.planBrowserExtensionScenarioStep(sessionId, step, {
        frameSelectors: options.frameSelectors,
        formSelector: preferredFormSelector,
        contextQuery: options.contextQuery,
        frameQuery: options.frameQuery,
        exact: options.exact,
        delayMs: undefined,
        timeoutMs: undefined,
        intervalMs: undefined,
        settleAfterEach: undefined,
        settleQuietMs: undefined,
        stableReads: undefined,
        retryCount: undefined,
        retryDelayMs: undefined
      }));
    }

    const resolvedCount = steps.filter((step) => {
      const entry = step as Record<string, unknown>;
      const result = entry.result as Record<string, unknown> | undefined;
      return Boolean(
        result?.field
        || entry.option
        || entry.group
        || result?.matches
        || entry.submitSelectors
        || entry.selector
      );
    }).length;
    return {
      sessionId,
      frameSelectors: options.frameSelectors,
      formSelector: preferredFormSelector,
      selectedContext,
      contextQuery: options.contextQuery,
      frameQuery: options.frameQuery,
      exact: options.exact ?? false,
      stepCount: steps.length,
      resolvedCount,
      unresolvedCount: steps.length - resolvedCount,
      steps
    };
  }

  async planBrowserExtensionWorkflowFile(sessionId: string | undefined, filePath: string, variables?: Record<string, string>) {
    const workflow = this.loadBrowserExtensionScenario(filePath);
    const resolvedSession = await this.resolveBrowserExtensionWorkflowSession(workflow.metadata, sessionId, {
      navigateToTarget: false,
      timeoutMs: (workflow.document.timeoutMs as number | undefined) ?? 45_000
    });
    const document = workflow.document as BrowserExtensionScenarioDocument;
    const { defaults, runtimeState } = await prepareBrowserExtensionWorkflowRuntime({
      metadata: workflow.metadata,
      document,
      sessionId: resolvedSession.sessionId,
      acquisition: resolvedSession.acquisition,
      variables,
      captureOwnership: (resolvedWorkflowSessionId, timeoutMs) => this.captureBrowserExtensionWorkflowOwnership(
        resolvedWorkflowSessionId,
        workflow.metadata,
        timeoutMs
      ),
      resolveLockedContext: (resolvedWorkflowSessionId, workflowDocument) => this.resolveBrowserExtensionFormContext(resolvedWorkflowSessionId, {
        frameSelectors: workflowDocument.frameSelectors,
        formSelector: workflowDocument.formSelector,
        contextQuery: workflowDocument.contextQuery,
        frameQuery: workflowDocument.frameQuery,
        exact: workflowDocument.exact,
        timeoutMs: workflowDocument.timeoutMs
      })
    }) as {
      defaults: Omit<BrowserExtensionScenarioDocument, 'steps'>;
      runtimeState: BrowserExtensionScenarioRuntimeState;
    };
    const steps = await Promise.all(document.steps.map((step) => this.planBrowserExtensionScenarioStep(resolvedSession.sessionId, step, defaults, runtimeState)));
    return {
      sessionId: resolvedSession.sessionId,
      requestedSessionId: sessionId,
      filePath: workflow.filePath,
      workflow: workflow.metadata,
      variableOverrides: variables,
      sessionAcquisition: resolvedSession.acquisition,
      sessionOwnership: runtimeState.sessionOwnership,
      sessionIsolation: runtimeState.sessionIsolation,
      defaults,
      lockContext: document.lockContext ?? false,
      lockedContext: runtimeState.lockedContext?.selectedContext,
      outputs: runtimeState.outputs,
      stepCount: steps.length,
      resolvedCount: steps.filter((step) => {
        const entry = step as Record<string, unknown>;
        return Boolean(entry.result || entry.group || entry.option || entry.submitSelectors || entry.selector);
      }).length,
      steps
    };
  }

  async diagnoseBrowserExtensionWorkflowFile(sessionId: string | undefined, filePath: string, variables?: Record<string, string>) {
    const workflow = this.loadBrowserExtensionScenario(filePath);
    const resolvedSession = await this.resolveBrowserExtensionWorkflowSession(workflow.metadata, sessionId, {
      navigateToTarget: false,
      timeoutMs: (workflow.document.timeoutMs as number | undefined) ?? 45_000
    });
    const document = workflow.document as BrowserExtensionScenarioDocument;
    const { defaults, runtimeState } = await prepareBrowserExtensionWorkflowRuntime({
      metadata: workflow.metadata,
      document,
      sessionId: resolvedSession.sessionId,
      acquisition: resolvedSession.acquisition,
      variables,
      captureOwnership: (resolvedWorkflowSessionId, timeoutMs) => this.captureBrowserExtensionWorkflowOwnership(
        resolvedWorkflowSessionId,
        workflow.metadata,
        timeoutMs
      ),
      resolveLockedContext: (resolvedWorkflowSessionId, workflowDocument) => this.resolveBrowserExtensionFormContext(resolvedWorkflowSessionId, {
        frameSelectors: workflowDocument.frameSelectors,
        formSelector: workflowDocument.formSelector,
        contextQuery: workflowDocument.contextQuery,
        frameQuery: workflowDocument.frameQuery,
        exact: workflowDocument.exact,
        timeoutMs: workflowDocument.timeoutMs
      })
    }) as {
      defaults: Omit<BrowserExtensionScenarioDocument, 'steps'>;
      runtimeState: BrowserExtensionScenarioRuntimeState;
    };
    const [steps, contextState] = await Promise.all([
      Promise.all(document.steps.map((step) => this.planBrowserExtensionScenarioStep(resolvedSession.sessionId, step, defaults, runtimeState))),
      this.browserExtensionContextState(resolvedSession.sessionId, {
        frameSelectors: document.frameSelectors,
        formSelector: document.formSelector,
        contextQuery: document.contextQuery,
        frameQuery: document.frameQuery,
        exact: document.exact,
        limit: 20,
        timeoutMs: document.timeoutMs
      }).catch(() => undefined)
    ]);
    const resolvedCount = steps.filter((step) => {
      const entry = step as Record<string, unknown>;
      return Boolean(entry.result || entry.group || entry.option || entry.submitSelectors || entry.selector);
    }).length;
    return {
      sessionId: resolvedSession.sessionId,
      requestedSessionId: sessionId,
      filePath: workflow.filePath,
      workflow: workflow.metadata,
      variableOverrides: variables,
      sessionAcquisition: resolvedSession.acquisition,
      sessionOwnership: runtimeState.sessionOwnership,
      sessionIsolation: runtimeState.sessionIsolation,
      defaults,
      lockContext: document.lockContext ?? false,
      lockedContext: runtimeState.lockedContext?.selectedContext,
      outputs: runtimeState.outputs,
      stepCount: steps.length,
      resolvedCount,
      unresolvedCount: steps.length - resolvedCount,
      summary: this.summarizeBrowserExtensionWorkflowSteps(steps),
      contextState,
      steps
    };
  }

  async runBrowserExtensionWorkflowFile(sessionId: string | undefined, filePath: string, variables?: Record<string, string>) {
    const workflow = this.loadBrowserExtensionScenario(filePath);
    const resolvedSession = await this.resolveBrowserExtensionWorkflowSession(workflow.metadata, sessionId, {
      navigateToTarget: workflow.metadata.navigateOnStart ?? true,
      timeoutMs: (workflow.document.timeoutMs as number | undefined) ?? 45_000
    });
    const document = workflow.document as BrowserExtensionScenarioDocument;
    const { defaults, runtimeState } = await prepareBrowserExtensionWorkflowRuntime({
      metadata: workflow.metadata,
      document,
      sessionId: resolvedSession.sessionId,
      acquisition: resolvedSession.acquisition,
      variables,
      captureOwnership: (resolvedWorkflowSessionId, timeoutMs) => this.captureBrowserExtensionWorkflowOwnership(
        resolvedWorkflowSessionId,
        workflow.metadata,
        timeoutMs
      ),
      resolveLockedContext: (resolvedWorkflowSessionId, workflowDocument) => this.resolveBrowserExtensionFormContext(resolvedWorkflowSessionId, {
        frameSelectors: workflowDocument.frameSelectors,
        formSelector: workflowDocument.formSelector,
        contextQuery: workflowDocument.contextQuery,
        frameQuery: workflowDocument.frameQuery,
        exact: workflowDocument.exact,
        timeoutMs: workflowDocument.timeoutMs
      })
    }) as {
      defaults: Omit<BrowserExtensionScenarioDocument, 'steps'>;
      runtimeState: BrowserExtensionScenarioRuntimeState;
    };
    const steps = await this.executeBrowserExtensionScenarioSteps(resolvedSession.sessionId, document.steps, defaults, workflow.metadata, runtimeState);
    const summary = this.summarizeBrowserExtensionWorkflowSteps(steps);
    return {
      sessionId: resolvedSession.sessionId,
      requestedSessionId: sessionId,
      filePath: workflow.filePath,
      workflow: workflow.metadata,
      variableOverrides: variables,
      sessionAcquisition: resolvedSession.acquisition,
      sessionOwnership: runtimeState.sessionOwnership,
      sessionIsolation: runtimeState.sessionIsolation,
      defaults,
      lockContext: document.lockContext ?? false,
      lockedContext: runtimeState.lockedContext?.selectedContext,
      stepCount: steps.length,
      steps,
      summary,
      outputs: runtimeState.outputs
    };
  }

  authLoginBrowserExtensionSession(
    sessionId: string,
    options: {
      email?: string;
      username?: string;
      password: string;
      frameSelectors?: string[];
      selector?: string;
      humanLike?: boolean;
      delayMs?: number;
      jitterMs?: number;
      skipSubmit?: boolean;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.authLogin(sessionId, {
      ...options,
      submitSelector: options.selector
    });
  }

  authSignupBrowserExtensionSession(
    sessionId: string,
    options: {
      fullName?: string;
      username?: string;
      email?: string;
      password: string;
      confirmPassword?: string;
      frameSelectors?: string[];
      selector?: string;
      humanLike?: boolean;
      delayMs?: number;
      jitterMs?: number;
      skipSubmit?: boolean;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.authSignup(sessionId, {
      ...options,
      submitSelector: options.selector
    });
  }

  browserExtensionCookies(sessionId: string, targetUrl?: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.cookies(sessionId, targetUrl, timeoutMs);
  }

  browserExtensionMetadata(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.pageMetadata(sessionId, timeoutMs);
  }

  async browserExtensionUrlParts(sessionId: string, timeoutMs?: number) {
    const metadata = await this.browserExtensionMetadata(sessionId, timeoutMs);
    const rawUrl = typeof metadata.url === 'string' ? metadata.url : '';
    let parsed: URL | undefined;
    try {
      parsed = rawUrl ? new URL(rawUrl) : undefined;
    } catch {
      parsed = undefined;
    }
    const queryEntries = parsed ? Array.from(parsed.searchParams.entries()) : [];
    const query: Record<string, string[]> = {};
    for (const [key, value] of queryEntries) {
      if (!query[key]) {
        query[key] = [];
      }
      query[key].push(value);
    }
    return {
      sessionId,
      url: rawUrl || undefined,
      protocol: parsed?.protocol,
      host: parsed?.host,
      hostname: parsed?.hostname,
      port: parsed?.port,
      pathname: parsed?.pathname,
      search: parsed?.search,
      hash: parsed?.hash,
      origin: parsed?.origin,
      query,
      queryEntries
    };
  }

  browserExtensionListStorage(
    sessionId: string,
    options?: { scope?: 'local' | 'session'; limit?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.listStorage(sessionId, options);
  }

  browserExtensionGetStorageEntry(
    sessionId: string,
    key: string,
    options?: { scope?: 'local' | 'session'; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.getStorageEntry(sessionId, key, options);
  }

  browserExtensionSetStorageEntry(
    sessionId: string,
    key: string,
    value: string,
    options?: { scope?: 'local' | 'session'; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.setStorageEntry(sessionId, key, value, options);
  }

  browserExtensionRemoveStorageEntry(
    sessionId: string,
    key: string,
    options?: { scope?: 'local' | 'session'; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.removeStorageEntry(sessionId, key, options);
  }

  browserExtensionGetCookie(
    sessionId: string,
    name: string,
    options?: { targetUrl?: string; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.getCookie(sessionId, name, options);
  }

  browserExtensionSetCookie(
    sessionId: string,
    name: string,
    value: string,
    options?: {
      targetUrl?: string;
      domain?: string;
      path?: string;
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: 'no_restriction' | 'lax' | 'strict' | 'unspecified';
      expirationDate?: number;
      timeoutMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.setCookie(sessionId, name, value, options);
  }

  browserExtensionRemoveCookie(
    sessionId: string,
    name: string,
    options?: { targetUrl?: string; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.removeCookie(sessionId, name, options);
  }

  async waitForBrowserExtensionCookie(
    sessionId: string,
    options: {
      name: string;
      targetUrl?: string;
      equals?: string;
      includes?: string;
      exists?: boolean;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options.timeoutMs ?? 30_000;
    const intervalMs = options.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastResult: Awaited<ReturnType<OperatorService['browserExtensionGetCookie']>> | undefined;
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.browserExtensionGetCookie(sessionId, options.name, {
        targetUrl: options.targetUrl,
        timeoutMs
      }).catch(() => undefined);
      if (result) {
        lastResult = result;
        const comparable = this.extractBrowserExtensionOutputComparable(result.cookie?.value);
        const expectedExists = options.exists ?? true;
        const existsMatched = expectedExists ? result.found === true : result.found !== true;
        const equalsMatched = options.equals === undefined || comparable === options.equals;
        const includesMatched = options.includes === undefined || comparable.includes(options.includes);
        if (existsMatched && equalsMatched && includesMatched) {
          return {
            ...result,
            timedOut: false,
            waitedMs: Date.now() - startedAt
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      name: options.name,
      url: lastResult?.url ?? options.targetUrl,
      found: lastResult?.found === true,
      cookie: lastResult?.cookie,
      timedOut: true,
      waitedMs: Date.now() - startedAt
    };
  }

  browserExtensionBack(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.goBack(sessionId, timeoutMs);
  }

  browserExtensionForward(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.goForward(sessionId, timeoutMs);
  }

  browserExtensionReload(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.reload(sessionId, timeoutMs);
  }

  browserExtensionDownloads(
    sessionId: string,
    options?: {
      query?: string;
      state?: 'in_progress' | 'interrupted' | 'complete';
      limit?: number;
      exact?: boolean;
      timeoutMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.listDownloads(sessionId, options);
  }

  browserExtensionCancelDownload(
    sessionId: string,
    query?: string,
    options?: { exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.cancelDownload(sessionId, query, options);
  }

  browserExtensionEraseDownload(
    sessionId: string,
    query?: string,
    options?: { exact?: boolean; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.eraseDownload(sessionId, query, options);
  }

  async waitForBrowserExtensionDownload(
    sessionId: string,
    options?: {
      query?: string;
      state?: 'in_progress' | 'interrupted' | 'complete';
      limit?: number;
      exact?: boolean;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = options?.intervalMs ?? 1_000;
    const startedAt = Date.now();
    let lastResult: Awaited<ReturnType<OperatorService['browserExtensionDownloads']>> | undefined;
    while (Date.now() - startedAt <= timeoutMs) {
      const result = await this.browserExtensionDownloads(sessionId, {
        query: options?.query,
        state: options?.state,
        limit: options?.limit ?? 20,
        exact: options?.exact,
        timeoutMs
      }).catch(() => undefined);
      if (result) {
        lastResult = result;
        if ((result.count ?? 0) > 0) {
          return {
            ...result,
            timedOut: false,
            waitedMs: Date.now() - startedAt
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return {
      sessionId,
      query: options?.query,
      state: options?.state,
      exact: options?.exact ?? false,
      timedOut: true,
      waitedMs: Date.now() - startedAt,
      count: lastResult?.count ?? 0,
      downloads: lastResult?.downloads ?? []
    };
  }

  private getDefaultBrowserExtensionSiteUrl(site: 'x.com' | 'chatgpt.com' | 'deepseek.com') {
    switch (site) {
      case 'x.com':
        return 'https://x.com/home';
      case 'chatgpt.com':
        return 'https://chatgpt.com/';
      case 'deepseek.com':
        return 'https://chat.deepseek.com/';
    }
  }

  private async ensureBrowserExtensionSiteSession(sessionId: string | undefined, site: 'x.com' | 'chatgpt.com' | 'deepseek.com') {
    await ensureServerRunning();
    const provider = await this.runtime.browserExtensionService.waitForProviderConnected({ timeoutMs: 10_000, intervalMs: 500 });
    if (!provider.connected) {
      throw new Error(
        `No live Sidofun browser-extension provider is connected for ${site}. ` +
        `Ensure Chrome has the Sidofun extension loaded, then run "sidofun browserext status --json" and "sidofun browserext wait-provider --timeout-ms 30000 --json".`
      );
    }

    const sessions = this.runtime.browserExtensionService.listSessions();
    const useAuto = !sessionId || sessionId === AUTO_BROWSER_EXTENSION_SESSION_ID;
    if (!useAuto) {
      const existing = sessions.find((session) => session.id === sessionId);
      if (existing) {
        return existing.id;
      }
    }

    const candidate = sessions
      .filter((session) => session.site === site)
      .sort((left, right) => {
        const leftScore = (left.ready ? 4 : 0) + (left.connected ? 2 : 0) + (!left.stale ? 1 : 0);
        const rightScore = (right.ready ? 4 : 0) + (right.connected ? 2 : 0) + (!right.stale ? 1 : 0);
        if (leftScore !== rightScore) {
          return rightScore - leftScore;
        }
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      })[0];

    if (candidate) {
      this.runtime.browserExtensionService.refreshSession(candidate.id);
      if (candidate.stale) {
        await this.runtime.browserExtensionService.reconnectSession(candidate.id, { timeoutMs: 30_000, intervalMs: 1000 });
      }
      const ready = await this.runtime.browserExtensionService.waitForSessionReady(candidate.id, { timeoutMs: useAuto ? 20_000 : 10_000, intervalMs: 1000 });
      const refreshed = this.runtime.browserExtensionService.getSession(candidate.id);
      if (ready.ready && refreshed?.connected && typeof refreshed.activeTabId === 'number' && (refreshed.tabs?.length ?? 0) > 0) {
        return candidate.id;
      }
    }

    if (useAuto) {
      this.runtime.browserExtensionService.supersedeQueuedCommandsForSite(
        site,
        ['x_search', 'x_timeline', 'x_bookmarks', 'x_notifications', 'x_messages', 'x_open_message_thread', 'x_send_message', 'x_read_thread', 'x_post', 'x_open_post', 'x_profile', 'x_follow', 'x_reply', 'x_like', 'x_repost'],
        `Superseded by a newer auto-created ${site} session`
      );
    }

    const created = this.runtime.browserExtensionService.createSession({
      site,
      targetUrl: this.getDefaultBrowserExtensionSiteUrl(site),
      name: useAuto
        ? `auto-${site.replace(/\W+/g, '-')}-${Date.now()}`
        : `auto-${site.replace(/\W+/g, '-')}`
    });
    const ready = await this.runtime.browserExtensionService.waitForSessionReady(created.id, { timeoutMs: 45_000, intervalMs: 1000 });
    if (!ready.ready) {
      const recoveredCandidate = this.runtime.browserExtensionService.listSessions()
        .filter((session) => session.site === site)
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
        .find((session) => session.connected && typeof session.activeTabId === 'number' && (session.tabs?.length ?? 0) > 0);
      if (recoveredCandidate) {
        return recoveredCandidate.id;
      }
      throw new Error(`Auto-created browser-extension session ${created.id} for ${site} did not become ready within 45000ms.`);
    }
    return created.id;
  }

  private withBrowserExtensionSiteSession<T>(
    sessionId: string | undefined,
    site: 'x.com' | 'chatgpt.com' | 'deepseek.com',
    run: (resolvedSessionId: string) => Promise<T> | T
  ) {
    return this.ensureBrowserExtensionSiteSession(sessionId, site).then((resolvedSessionId) => run(resolvedSessionId));
  }

  browserExtensionXSearch(
    sessionId: string,
    query: string,
    options?: {
      mode?: 'top' | 'latest' | 'live' | 'people' | 'media';
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xSearch(resolvedSessionId, query, options)
    );
  }

  browserExtensionXTimeline(
    sessionId: string,
    options?: {
      timelineType?: 'for-you' | 'following';
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xTimeline(resolvedSessionId, options)
    );
  }

  browserExtensionXBookmarks(
    sessionId: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xBookmarks(resolvedSessionId, options)
    );
  }

  browserExtensionXNotifications(
    sessionId: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xNotifications(resolvedSessionId, options)
    );
  }

  browserExtensionXMessages(
    sessionId: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xMessages(resolvedSessionId, options)
    );
  }

  browserExtensionXOpenMessageThread(
    sessionId: string,
    thread: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xOpenMessageThread(resolvedSessionId, thread, options)
    );
  }

  browserExtensionXSendMessage(
    sessionId: string,
    text: string,
    options?: {
      thread?: string;
      timeoutMs?: number;
    }
  ) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xSendMessage(resolvedSessionId, text, options)
    );
  }

  browserExtensionXReadThread(
    sessionId: string,
    postUrl: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xReadThread(resolvedSessionId, postUrl, options)
    );
  }

  browserExtensionXPost(sessionId: string, text: string, timeoutMs?: number) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xPost(resolvedSessionId, text, timeoutMs)
    );
  }

  browserExtensionXOpenPost(sessionId: string, postUrl: string, timeoutMs?: number) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xOpenPost(resolvedSessionId, postUrl, timeoutMs)
    );
  }

  browserExtensionXProfile(sessionId: string, handleOrUrl: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xProfile(resolvedSessionId, handleOrUrl, options)
    );
  }

  browserExtensionXFollow(sessionId: string, handleOrUrl: string, options?: { timeoutMs?: number }) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xFollow(resolvedSessionId, handleOrUrl, options)
    );
  }

  browserExtensionXReply(sessionId: string, text: string, options?: { postUrl?: string; timeoutMs?: number }) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xReply(resolvedSessionId, text, options)
    );
  }

  browserExtensionXLike(sessionId: string, options?: { postUrl?: string; timeoutMs?: number }) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xLike(resolvedSessionId, options)
    );
  }

  browserExtensionXRepost(sessionId: string, options?: { postUrl?: string; timeoutMs?: number }) {
    return this.withBrowserExtensionSiteSession(sessionId, 'x.com', (resolvedSessionId) =>
      this.runtime.browserExtensionService.xRepost(resolvedSessionId, options)
    );
  }

  browserExtensionChatGptReadLatest(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptReadLatest(sessionId, timeoutMs);
  }

  browserExtensionChatGptNewChat(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptNewChat(sessionId, timeoutMs);
  }

  browserExtensionChatGptSidebarState(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptSidebarState(sessionId, timeoutMs);
  }

  browserExtensionChatGptToggleSidebar(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptToggleSidebar(sessionId, timeoutMs);
  }

  browserExtensionChatGptModels(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptModels(sessionId, timeoutMs);
  }

  browserExtensionChatGptSelectModel(sessionId: string, query: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptSelectModel(sessionId, query, timeoutMs);
  }

  browserExtensionChatGptInfo(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.chatGptInfo(sessionId, options);
  }

  browserExtensionChatGptListConversations(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.chatGptListConversations(sessionId, options);
  }

  browserExtensionChatGptOpenConversation(
    sessionId: string,
    options: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptOpenConversation(sessionId, options);
  }

  browserExtensionChatGptConversationActions(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptConversationActions(sessionId, options);
  }

  browserExtensionChatGptConversationAction(
    sessionId: string,
    actionQuery: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptConversationAction(sessionId, actionQuery, options);
  }

  browserExtensionChatGptRenameConversation(
    sessionId: string,
    title: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptRenameConversation(sessionId, title, options);
  }

  browserExtensionChatGptStop(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptStop(sessionId, timeoutMs);
  }

  browserExtensionChatGptContinue(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptContinue(sessionId, timeoutMs);
  }

  browserExtensionChatGptResponseControls(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.chatGptResponseControls(sessionId, options);
  }

  browserExtensionChatGptPreviousResponse(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.chatGptPreviousResponse(sessionId, options);
  }

  browserExtensionChatGptNextResponse(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.chatGptNextResponse(sessionId, options);
  }

  browserExtensionChatGptListResponseVersions(sessionId: string, options?: { limit?: number; maxVersions?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.chatGptListResponseVersions(sessionId, options);
  }

  browserExtensionChatGptSelectResponseVersion(
    sessionId: string,
    index: number,
    options?: { limit?: number; maxVersions?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptSelectResponseVersion(sessionId, index, options);
  }

  browserExtensionChatGptRegenerate(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptRegenerate(sessionId, timeoutMs);
  }

  browserExtensionChatGptEditMessage(
    sessionId: string,
    text: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptEditMessage(sessionId, text, options);
  }

  browserExtensionChatGptReadThread(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.chatGptReadThread(sessionId, options);
  }

  browserExtensionChatGptReadMessage(
    sessionId: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptReadMessage(sessionId, options);
  }

  browserExtensionChatGptCurrentConversation(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.chatGptCurrentConversation(sessionId, options);
  }

  browserExtensionChatGptExportThread(sessionId: string, options?: { limit?: number; timeoutMs?: number; format?: 'json' | 'markdown' }) {
    return this.runtime.browserExtensionService.chatGptExportThread(sessionId, options);
  }

  browserExtensionChatGptSend(sessionId: string, text: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptSend(sessionId, text, timeoutMs);
  }

  browserExtensionChatGptAsk(sessionId: string, text: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.chatGptAsk(sessionId, text, timeoutMs);
  }

  browserExtensionChatGptAskThread(sessionId: string, text: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.chatGptAskThread(sessionId, text, options);
  }

  browserExtensionChatGptRewriteThread(
    sessionId: string,
    text: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptRewriteThread(sessionId, text, options);
  }

  browserExtensionChatGptWaitIdle(sessionId: string, timeoutMs?: number, intervalMs?: number) {
    return this.runtime.browserExtensionService.chatGptWaitIdle(sessionId, { timeoutMs, intervalMs });
  }

  browserExtensionChatGptWaitResponse(
    sessionId: string,
    options?: { baselineText?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptWaitResponse(sessionId, options);
  }

  browserExtensionChatGptWaitMessage(
    sessionId: string,
    options?: { text?: string; role?: 'user' | 'assistant' | 'system'; timeoutMs?: number; intervalMs?: number; stableReads?: number; limit?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptWaitMessage(sessionId, options);
  }

  browserExtensionChatGptWaitSidebar(
    sessionId: string,
    options?: { open?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptWaitSidebar(sessionId, options);
  }

  browserExtensionChatGptWaitModel(
    sessionId: string,
    options?: { query?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptWaitModel(sessionId, options);
  }

  browserExtensionChatGptWaitConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; active?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptWaitConversation(sessionId, options);
  }

  browserExtensionChatGptPrepare(
    sessionId: string,
    options?: { ensureSidebarOpen?: boolean; model?: string; newChat?: boolean; titleQuery?: string; url?: string; index?: number; limit?: number; timeoutMs?: number; intervalMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptPrepare(sessionId, options);
  }

  browserExtensionChatGptDeleteConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptDeleteConversation(sessionId, options);
  }

  browserExtensionChatGptArchiveConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.chatGptArchiveConversation(sessionId, options);
  }

  browserExtensionDeepSeekReadLatest(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekReadLatest(sessionId, timeoutMs);
  }

  browserExtensionDeepSeekNewChat(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekNewChat(sessionId, timeoutMs);
  }

  browserExtensionDeepSeekSidebarState(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekSidebarState(sessionId, timeoutMs);
  }

  browserExtensionDeepSeekToggleSidebar(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekToggleSidebar(sessionId, timeoutMs);
  }

  browserExtensionDeepSeekModels(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekModels(sessionId, timeoutMs);
  }

  browserExtensionDeepSeekSelectModel(sessionId: string, query: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekSelectModel(sessionId, query, timeoutMs);
  }

  browserExtensionDeepSeekInfo(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.deepSeekInfo(sessionId, options);
  }

  browserExtensionDeepSeekListConversations(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.deepSeekListConversations(sessionId, options);
  }

  browserExtensionDeepSeekOpenConversation(
    sessionId: string,
    options: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekOpenConversation(sessionId, options);
  }

  browserExtensionDeepSeekConversationActions(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekConversationActions(sessionId, options);
  }

  browserExtensionDeepSeekConversationAction(
    sessionId: string,
    actionQuery: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekConversationAction(sessionId, actionQuery, options);
  }

  browserExtensionDeepSeekRenameConversation(
    sessionId: string,
    title: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekRenameConversation(sessionId, title, options);
  }

  browserExtensionDeepSeekStop(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekStop(sessionId, timeoutMs);
  }

  browserExtensionDeepSeekContinue(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekContinue(sessionId, timeoutMs);
  }

  browserExtensionDeepSeekResponseControls(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.deepSeekResponseControls(sessionId, options);
  }

  browserExtensionDeepSeekPreviousResponse(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.deepSeekPreviousResponse(sessionId, options);
  }

  browserExtensionDeepSeekNextResponse(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.deepSeekNextResponse(sessionId, options);
  }

  browserExtensionDeepSeekListResponseVersions(sessionId: string, options?: { limit?: number; maxVersions?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.deepSeekListResponseVersions(sessionId, options);
  }

  browserExtensionDeepSeekSelectResponseVersion(
    sessionId: string,
    index: number,
    options?: { limit?: number; maxVersions?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekSelectResponseVersion(sessionId, index, options);
  }

  browserExtensionDeepSeekRegenerate(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekRegenerate(sessionId, timeoutMs);
  }

  browserExtensionDeepSeekEditMessage(
    sessionId: string,
    text: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekEditMessage(sessionId, text, options);
  }

  browserExtensionDeepSeekReadThread(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.deepSeekReadThread(sessionId, options);
  }

  browserExtensionDeepSeekReadMessage(
    sessionId: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekReadMessage(sessionId, options);
  }

  browserExtensionDeepSeekCurrentConversation(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.deepSeekCurrentConversation(sessionId, options);
  }

  browserExtensionDeepSeekExportThread(sessionId: string, options?: { limit?: number; timeoutMs?: number; format?: 'json' | 'markdown' }) {
    return this.runtime.browserExtensionService.deepSeekExportThread(sessionId, options);
  }

  browserExtensionDeepSeekSend(sessionId: string, text: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekSend(sessionId, text, timeoutMs);
  }

  browserExtensionDeepSeekAsk(sessionId: string, text: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.deepSeekAsk(sessionId, text, timeoutMs);
  }

  browserExtensionDeepSeekAskThread(sessionId: string, text: string, options?: { limit?: number; timeoutMs?: number }) {
    return this.runtime.browserExtensionService.deepSeekAskThread(sessionId, text, options);
  }

  browserExtensionDeepSeekRewriteThread(
    sessionId: string,
    text: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekRewriteThread(sessionId, text, options);
  }

  browserExtensionDeepSeekWaitIdle(sessionId: string, timeoutMs?: number, intervalMs?: number) {
    return this.runtime.browserExtensionService.deepSeekWaitIdle(sessionId, { timeoutMs, intervalMs });
  }

  browserExtensionDeepSeekWaitResponse(
    sessionId: string,
    options?: { baselineText?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekWaitResponse(sessionId, options);
  }

  browserExtensionDeepSeekWaitMessage(
    sessionId: string,
    options?: { text?: string; role?: 'user' | 'assistant' | 'system'; timeoutMs?: number; intervalMs?: number; stableReads?: number; limit?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekWaitMessage(sessionId, options);
  }

  browserExtensionDeepSeekWaitSidebar(
    sessionId: string,
    options?: { open?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekWaitSidebar(sessionId, options);
  }

  browserExtensionDeepSeekWaitModel(
    sessionId: string,
    options?: { query?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekWaitModel(sessionId, options);
  }

  browserExtensionDeepSeekWaitConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; active?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekWaitConversation(sessionId, options);
  }

  browserExtensionDeepSeekPrepare(
    sessionId: string,
    options?: { ensureSidebarOpen?: boolean; model?: string; newChat?: boolean; titleQuery?: string; url?: string; index?: number; limit?: number; timeoutMs?: number; intervalMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekPrepare(sessionId, options);
  }

  browserExtensionDeepSeekDeleteConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekDeleteConversation(sessionId, options);
  }

  browserExtensionDeepSeekArchiveConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.runtime.browserExtensionService.deepSeekArchiveConversation(sessionId, options);
  }

  browserExtensionNetworkEvents(
    sessionId: string,
    options?: {
      limit?: number;
      urlIncludes?: string;
      stage?: 'request' | 'response' | 'error';
      method?: string;
    }
  ) {
    return this.runtime.browserExtensionService.listNetworkEvents(sessionId, options);
  }

  browserExtensionDomEvents(
    sessionId: string,
    options?: {
      limit?: number;
      mutationType?: 'childList' | 'attributes' | 'characterData';
      textIncludes?: string;
      timeoutMs?: number;
    }
  ) {
    return this.runtime.browserExtensionService.listDomEvents(sessionId, options);
  }

  clearBrowserExtensionNetworkEvents(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.clearNetworkEvents(sessionId, timeoutMs);
  }

  clearBrowserExtensionDomEvents(sessionId: string, timeoutMs?: number) {
    return this.runtime.browserExtensionService.clearDomEvents(sessionId, timeoutMs);
  }

  browserExtensionSessionEvents(sessionId: string, options?: { limit?: number; kind?: string; ok?: boolean }) {
    return this.runtime.browserExtensionService.listSessionEvents(sessionId, options);
  }

  clearBrowserExtensionSessionEvents(sessionId: string) {
    return this.runtime.browserExtensionService.clearSessionEvents(sessionId);
  }

  browserExtensionWaitText(sessionId: string, text: string, timeoutMs?: number, intervalMs?: number) {
    return this.runtime.browserExtensionService.waitForText(sessionId, text, { timeoutMs, intervalMs });
  }

  openCliDoctor(cwd?: string, workspace?: string, ownerSessionId?: string, timeoutMs?: number) {
    return this.runtime.openCliService.doctor({ cwd, workspace, ownerSessionId, timeoutMs });
  }

  listOpenCliSites() {
    return this.runtime.openCliService.listSites();
  }

  listOpenCliCommands(site: string) {
    return this.runtime.openCliService.listCommands(site);
  }

  async runOpenCli(
    site: string,
    command: string,
    args: string[] = [],
    cwd?: string,
    timeoutMs?: number,
    workspace?: string,
    ownerSessionId?: string,
    keepBrowserOpen?: boolean,
    waitAfterMs?: number,
    maximizeBrowser?: boolean
  ) {
    const result = await this.runtime.openCliService.run({
      site,
      command,
      args,
      cwd,
      workspace,
      ownerSessionId,
      timeoutMs,
      keepBrowserOpen,
      waitAfterMs,
      maximizeBrowser,
      format: 'json'
    });
    if (maximizeBrowser && result.success) {
      await this.maximizeOpenCliBrowserWindow().catch(() => undefined);
    }
    return result;
  }

  listOpenCliWorkspaces() {
    return this.runtime.openCliService.listWorkspaces();
  }

  getOpenCliWorkspace(name: string) {
    return this.runtime.openCliService.getWorkspace(name);
  }

  setOpenCliWorkspace(name: string, workspacePath: string) {
    return this.runtime.openCliService.setWorkspace(name, workspacePath);
  }

  clearOpenCliWorkspace(name: string) {
    return this.runtime.openCliService.clearWorkspace(name);
  }

  bindOpenCliWorkspaceSession(sessionId: string, workspace: string) {
    return this.runtime.openCliService.bindSessionWorkspace(sessionId, workspace);
  }

  unbindOpenCliWorkspaceSession(sessionId: string) {
    return this.runtime.openCliService.unbindSessionWorkspace(sessionId);
  }

  getOpenCliWorkspaceSession(sessionId: string) {
    return this.runtime.openCliService.getSessionWorkspace(sessionId);
  }

  async twitterSearch(
    query: string,
    mode?: 'top' | 'latest' | 'live' | 'people' | 'media',
    limit?: number,
    cwd?: string,
    timeoutMs?: number,
    workspace?: string,
    ownerSessionId?: string,
    keepBrowserOpen?: boolean,
    waitAfterMs?: number,
    maximizeBrowser?: boolean
  ) {
    const result = await this.runtime.openCliService.twitterSearch({ query, mode, limit, cwd, workspace, ownerSessionId, timeoutMs, keepBrowserOpen, waitAfterMs, maximizeBrowser });
    if (maximizeBrowser && result.success) {
      await this.maximizeOpenCliBrowserWindow().catch(() => undefined);
    }
    return result;
  }

  async twitterTimeline(
    type?: 'for-you' | 'following',
    limit?: number,
    cwd?: string,
    timeoutMs?: number,
    workspace?: string,
    ownerSessionId?: string,
    keepBrowserOpen?: boolean,
    waitAfterMs?: number,
    maximizeBrowser?: boolean
  ) {
    const result = await this.runtime.openCliService.twitterTimeline({ type, limit, cwd, workspace, ownerSessionId, timeoutMs, keepBrowserOpen, waitAfterMs, maximizeBrowser });
    if (maximizeBrowser && result.success) {
      await this.maximizeOpenCliBrowserWindow().catch(() => undefined);
    }
    return result;
  }

  async twitterBookmarks(
    limit?: number,
    cwd?: string,
    timeoutMs?: number,
    workspace?: string,
    ownerSessionId?: string,
    keepBrowserOpen?: boolean,
    waitAfterMs?: number,
    maximizeBrowser?: boolean
  ) {
    const result = await this.runtime.openCliService.twitterBookmarks({ limit, cwd, workspace, ownerSessionId, timeoutMs, keepBrowserOpen, waitAfterMs, maximizeBrowser });
    if (maximizeBrowser && result.success) {
      await this.maximizeOpenCliBrowserWindow().catch(() => undefined);
    }
    return result;
  }

  async twitterPost(
    text: string,
    cwd?: string,
    timeoutMs?: number,
    workspace?: string,
    ownerSessionId?: string,
    keepBrowserOpen?: boolean,
    waitAfterMs?: number,
    maximizeBrowser?: boolean
  ) {
    const result = await this.runtime.openCliService.twitterPost({ text, cwd, workspace, ownerSessionId, timeoutMs, keepBrowserOpen, waitAfterMs, maximizeBrowser });
    if (maximizeBrowser && result.success) {
      await this.maximizeOpenCliBrowserWindow().catch(() => undefined);
    }
    return result;
  }

  private async maximizeOpenCliBrowserWindow() {
    const activeWindow = await this.runtime.platform.executeDesktopAction({ type: 'get_active_window' }) as {
      handle?: number;
      processName?: string;
      title?: string;
    };
    const activeProcess = activeWindow.processName?.toLowerCase();
    const activeTitle = activeWindow.title ?? '';
    const matchesTwitterWindow = /x\.com|twitter|search\s*\/\s*x/i.test(activeTitle);
    if (activeWindow.handle && activeProcess?.includes('chrome') && matchesTwitterWindow) {
      await this.runtime.processWindowService.maximize(activeWindow.handle);
      return activeWindow.handle;
    }

    const windows = await this.runtime.processWindowService.listWindows();
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
    await this.runtime.processWindowService.maximize(browserWindow.handle);
    return browserWindow.handle;
  }

  readClipboard() {
    return this.runtime.clipboardService.read();
  }

  writeClipboard(text: string) {
    return this.runtime.clipboardService.write(text);
  }

  clearClipboard() {
    return this.runtime.clipboardService.clear();
  }

  getClipboardStatus() {
    return this.runtime.clipboardService.status();
  }

  createClientSession(options?: { clientKind?: 'operator' | 'python' | 'mcp' | 'http' | 'websocket' | 'internal'; name?: string }) {
    return this.runtime.sessionManagerService.createSession(options);
  }

  listClientSessions() {
    return this.runtime.sessionManagerService.listSessions();
  }

  getClientSession(sessionId: string) {
    return this.runtime.sessionManagerService.getSession(sessionId);
  }

  closeClientSession(sessionId: string, cleanupOwnedResources = true) {
    return this.runtime.sessionManagerService.closeSession(sessionId, { cleanupOwnedResources });
  }

  listIdleClientSessions(maxIdleMs: number, clientKind?: 'operator' | 'python' | 'mcp' | 'http' | 'websocket' | 'internal') {
    return this.runtime.sessionManagerService.listIdleSessions(maxIdleMs, { clientKind });
  }

  reapIdleClientSessions(maxIdleMs: number, options?: { clientKind?: 'operator' | 'python' | 'mcp' | 'http' | 'websocket' | 'internal'; cleanupOwnedResources?: boolean }) {
    return this.runtime.sessionManagerService.reapIdleSessions(maxIdleMs, options);
  }

  startTrace(name?: string, metadata?: Record<string, unknown>, ownerSessionId?: string) {
    const result = this.runtime.telemetryService.startTrace({ name, metadata });
    if (!ownerSessionId) {
      return result;
    }
    return Promise.resolve(result).then((trace) => {
      this.runtime.sessionManagerService.ownResource(ownerSessionId, {
        type: 'trace',
        id: trace.id
      });
      return trace;
    });
  }

  listTraces() {
    return this.runtime.telemetryService.listTraces();
  }

  getTrace(traceId: string) {
    return this.runtime.telemetryService.getTrace(traceId);
  }

  exportTrace(traceId: string, outputPath?: string) {
    return this.runtime.telemetryService.exportTrace(traceId, outputPath);
  }

  stopTrace(traceId: string) {
    return this.runtime.telemetryService.stopTrace(traceId);
  }

  startTrajectory(name?: string, metadata?: Record<string, unknown>, ownerSessionId?: string) {
    const result = this.runtime.telemetryService.startTrajectory({ name, metadata });
    if (!ownerSessionId) {
      return result;
    }
    return Promise.resolve(result).then((trajectory) => {
      this.runtime.sessionManagerService.ownResource(ownerSessionId, {
        type: 'trajectory',
        id: trajectory.id
      });
      return trajectory;
    });
  }

  listTrajectories() {
    return this.runtime.telemetryService.listTrajectories();
  }

  getTrajectory(trajectoryId: string) {
    return this.runtime.telemetryService.getTrajectory(trajectoryId);
  }

  exportTrajectory(trajectoryId: string, outputPath?: string) {
    return this.runtime.telemetryService.exportTrajectory(trajectoryId, outputPath);
  }

  appendTrajectoryTurn(trajectoryId: string, turn: {
    turnId: string;
    role?: string;
    prompt?: unknown;
    response?: unknown;
    actions?: unknown[];
    screenshots?: unknown[];
    metadata?: Record<string, unknown>;
  }) {
    return this.runtime.telemetryService.appendTurn(trajectoryId, turn);
  }

  stopTrajectory(trajectoryId: string) {
    return this.runtime.telemetryService.stopTrajectory(trajectoryId);
  }

  createDesktopScope(options: {
    windowHandles?: number[];
    processIds?: number[];
    titleQuery?: string;
    name?: string;
    ownerSessionId?: string;
  }) {
    const result = this.runtime.desktopScopeService.create(options);
    if (!options.ownerSessionId) {
      return result;
    }
    return Promise.resolve(result).then((scope) => {
      this.runtime.sessionManagerService.ownResource(options.ownerSessionId!, {
        type: 'desktop_scope',
        id: scope.id
      });
      return scope;
    });
  }

  listDesktopScopes() {
    return this.runtime.desktopScopeService.list();
  }

  getDesktopScope(scopeId: string) {
    return this.runtime.desktopScopeService.getInfo(scopeId);
  }

  focusDesktopScope(scopeId: string) {
    return this.runtime.desktopScopeService.focus(scopeId);
  }

  screenshotDesktopScope(scopeId: string, options?: { filename?: string; returnBase64?: boolean; format?: 'png' | 'jpg' }) {
    return this.runtime.desktopScopeService.screenshot(scopeId, options);
  }

  clickDesktopScope(scopeId: string, x: number, y: number, button: 'left' | 'right' | 'middle' = 'left') {
    return this.runtime.desktopScopeService.click(scopeId, { x, y }, button);
  }

  typeDesktopScope(scopeId: string, text: string) {
    return this.runtime.desktopScopeService.type(scopeId, text);
  }

  closeDesktopScope(scopeId: string) {
    return this.runtime.desktopScopeService.close(scopeId);
  }

  runShell(command: string, options?: { shell?: ShellKind; cwd?: string; timeoutMs?: number; env?: Record<string, string> }) {
    return this.runtime.shellService.run({
      command,
      shell: options?.shell,
      cwd: options?.cwd,
      timeoutMs: options?.timeoutMs,
      env: options?.env
    });
  }

  spawnTerminal(kind: TerminalKind, title?: string, ownerSessionId?: string, cwd?: string) {
    const result = this.runtime.terminalService.spawn({ kind, title, cwd });
    if (!ownerSessionId) {
      return result;
    }
    return Promise.resolve(result).then((spawned) => {
      this.runtime.sessionManagerService.ownResource(ownerSessionId, {
        type: 'terminal',
        id: spawned.sessionId,
        metadata: { kind: spawned.kind }
      });
      return spawned;
    });
  }

  listTerminals(kind?: TerminalKind) {
    return this.runtime.terminalService.list(kind);
  }

  terminalStatus(kind: TerminalKind, sessionId: string) {
    return this.runtime.terminalService.status({ kind, sessionId });
  }

  focusTerminal(kind: TerminalKind, sessionId: string) {
    return this.runtime.terminalService.focus({ kind, sessionId });
  }

  typeTerminal(kind: TerminalKind, sessionId: string, text: string) {
    return this.runtime.terminalService.type({ kind, sessionId }, text);
  }

  execTerminal(kind: TerminalKind, sessionId: string, command: string, wait = false, timeout?: number) {
    return this.runtime.terminalService.exec({ kind, sessionId }, command, { wait, timeout });
  }

  closeTerminal(kind: TerminalKind, sessionId: string) {
    return this.runtime.terminalService.close({ kind, sessionId });
  }

  async spawnCMD(title?: string, cwd?: string) {
    return this.runtime.cmdTerminalCore.spawn(title, cwd);
  }

  listCMDSessions(): SessionInfo[] {
    return this.runtime.cmdService.listSessions().map((session) => this.runtime.cmdService.getSessionInfo(session.id));
  }

  async typeCMD(sessionIdOrIndex: string, text: string) {
    return this.runtime.cmdTerminalCore.typeEscaped(sessionIdOrIndex, text);
  }

  async getCMDStatus(sessionIdOrIndex: string): Promise<SessionInfo> {
    return this.runtime.cmdTerminalCore.getSessionInfo(sessionIdOrIndex);
  }

  async screenshotCMD(sessionIdOrIndex: string, filename?: string, returnBase64?: boolean) {
    return this.runtime.cmdTerminalCore.screenshot(sessionIdOrIndex, {
      filename,
      returnBase64
    });
  }

  async screenshotTrackedCMD(session: SessionInfo, filename?: string, returnBase64?: boolean) {
    const registered: CMDSession = {
      id: session.id,
      handle: session.handle,
      title: session.title,
      currentDirectory: session.currentDirectory,
      commandHistory: [],
      createdAt: new Date(Date.now() - session.age),
      lastActivity: new Date(session.lastActivity)
    };
    this.runtime.cmdService.registerSession(registered);
    return this.runtime.cmdService.screenshot(session.id, {
      filename,
      returnBase64
    });
  }

  async execCMD(sessionIdOrIndex: string, command: string) {
    return this.runtime.cmdTerminalCore.exec(sessionIdOrIndex, command);
  }

  async closeCMD(sessionIdOrIndex: string) {
    return this.runtime.cmdTerminalCore.close(sessionIdOrIndex);
  }

  async focusCMD(sessionIdOrIndex: string) {
    return this.runtime.cmdTerminalCore.focus(sessionIdOrIndex);
  }

  async activateCMDByTitle(titleQuery: string) {
    return this.runtime.cmdTerminalCore.activateSessionByTitle(titleQuery);
  }

  listPowerShellSessions(): SessionInfo[] {
    return this.runtime.psService.listSessions().map((session) => this.runtime.psService.getSessionInfo(session.id));
  }

  async spawnPowerShell(title?: string, cwd?: string) {
    const sessionId = await this.runtime.psService.spawn(title, 'Bypass', true, cwd);
    return {
      sessionId,
      message: `PowerShell session created: ${sessionId}`
    };
  }

  async typePowerShell(sessionIdOrIndex: string, text: string) {
    const sessionId = this.resolvePowerShellSessionId(sessionIdOrIndex);
    const segments = parseEscapeSequences(text);
    for (const seg of segments) {
      if (seg.type === 'text') {
        const value = seg.value;
        if (value.includes('\n')) {
          const lines = value.split('\n');
          for (let i = 0; i < lines.length; i += 1) {
            if (lines[i]) {
              await this.runtime.psService.type(sessionId, lines[i]);
            }
            if (i < lines.length - 1 || lines[i] === '') {
              await this.runtime.psService.press(sessionId, 'enter');
            }
          }
        } else if (value) {
          await this.runtime.psService.type(sessionId, value);
        }
      } else if (seg.type === 'delay') {
        await new Promise((resolve) => setTimeout(resolve, seg.value));
      } else {
        switch (seg.value) {
          case 'maximize':
            await this.runtime.psService.maximize(sessionId);
            break;
          case 'minimize':
            await this.runtime.psService.minimize(sessionId);
            break;
          case 'restore':
            await this.runtime.psService.restore(sessionId);
            break;
          case 'focus':
            await this.runtime.psService.focus(sessionId);
            break;
        }
      }
    }
    return {
      sessionId,
      message: `Typed text into session: ${sessionId}`
    };
  }

  getPowerShellStatus(sessionIdOrIndex: string): SessionInfo {
    return this.runtime.psService.getSessionInfo(this.resolvePowerShellSessionId(sessionIdOrIndex));
  }

  async screenshotPowerShell(sessionIdOrIndex: string, filename?: string, returnBase64?: boolean) {
    const sessionId = this.resolvePowerShellSessionId(sessionIdOrIndex);
    return this.runtime.psService.screenshot(sessionId, filename, returnBase64);
  }

  async screenshotTrackedPowerShell(session: SessionInfo, filename?: string, returnBase64?: boolean) {
    const registered: PowerShellSession = {
      id: session.id,
      handle: session.handle,
      title: session.title,
      currentDirectory: session.currentDirectory,
      commandHistory: [],
      createdAt: new Date(Date.now() - session.age),
      lastActivity: new Date(session.lastActivity)
    };
    this.runtime.psService.registerSession(registered);
    return this.runtime.psService.screenshot(session.id, filename, returnBase64);
  }

  async execPowerShell(sessionIdOrIndex: string, command: string) {
    const sessionId = this.resolvePowerShellSessionId(sessionIdOrIndex);
    return this.runtime.psService.exec(sessionId, command);
  }

  async closePowerShell(sessionIdOrIndex: string) {
    const sessionId = this.resolvePowerShellSessionId(sessionIdOrIndex);
    await this.runtime.psService.close(sessionId);
    return {
      sessionId,
      message: 'Session closed'
    };
  }

  async focusPowerShell(sessionIdOrIndex: string) {
    const sessionId = this.resolvePowerShellSessionId(sessionIdOrIndex);
    await this.runtime.psService.focus(sessionId);
    return {
      session: this.runtime.psService.getSessionInfo(sessionId),
      message: `Focused session: ${sessionId}`
    };
  }

  async activatePowerShellByTitle(titleQuery: string) {
    const query = titleQuery.toLowerCase();
    const sessions = this.listPowerShellSessions();
    const matchedSession =
      sessions.find((session) =>
        session.title.toLowerCase() === query ||
        session.tabTitle.toLowerCase() === query
      ) ||
      sessions.find((session) =>
        session.title.toLowerCase().includes(query) ||
        session.tabTitle.toLowerCase().includes(query)
      );

    if (!matchedSession) {
      throw new Error(`No tracked PowerShell session matched title query: ${titleQuery}`);
    }

    await this.runtime.psService.focus(matchedSession.id);
    return {
      session: this.runtime.psService.getSessionInfo(matchedSession.id),
      message: `Activated session by title: ${matchedSession.id}`
    };
  }

  captureSnapshot(): OperatorSnapshot {
    return {
      browsers: this.listBrowsers(),
      cmdSessions: this.listCMDSessions(),
      pwshSessions: this.listPowerShellSessions(),
      capturedAt: new Date().toISOString()
    };
  }

  shutdown(options?: { preserveManagedBrowserRuntimes?: boolean }): void {
    if (!options?.preserveManagedBrowserRuntimes) {
      this.runtime.browserAutomationService.shutdown();
      void this.runtime.browserPlaywrightService.shutdown();
    }
  }

  private resolvePowerShellSessionId(sessionIdOrIndex: string): string {
    const index = Number.parseInt(sessionIdOrIndex, 10);
    if (!Number.isNaN(index)) {
      const sessions = this.runtime.psService.listSessions();
      const targetIndex = index - 1;
      if (targetIndex >= 0 && targetIndex < sessions.length) {
        return sessions[targetIndex].id;
      }
      throw new Error(`Session index ${index} out of range (1-${sessions.length})`);
    }

    return sessionIdOrIndex;
  }
}
