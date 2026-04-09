export const OPERATOR_HELP_INTRO = `
Sidofun Operator CLI
Windows operator console for the maintained Sidofun runtime.

General:
  sidofun help
  sidofun doctor [--json]
  sidofun config get [key] [--json]
  sidofun config set <key> <value> [--json]
  sidofun daemon start [--json]
  sidofun daemon status [--json]
  sidofun daemon stop [--json]
  sidofun tui

Clipboard:
  sidofun clipboard read [--json]
  sidofun clipboard write <text> [--json]
  sidofun clipboard clear [--json]
  sidofun clipboard status [--json]

Client Sessions:
  sidofun session create [--client-kind <operator|python|mcp|http|websocket|internal>] [--name <name>] [--json]
  sidofun session list [--json]
  sidofun session resources [--type <type>] [--session <id>] [--json]
  sidofun session owners <terminal|browser_runtime|browser_page|desktop_scope|trace|trajectory> <resource-id> [--json]
  sidofun session claim <session-id> <terminal|browser_runtime|browser_page|desktop_scope|trace|trajectory> <resource-id> [--takeover] [--json]
  sidofun session list-idle --max-idle-ms <ms> [--client-kind <kind>] [--json]
  sidofun session reap-idle --max-idle-ms <ms> [--client-kind <kind>] [--no-cleanup] [--json]
  sidofun session info <session-id> [--json]
  sidofun session close <session-id> [--no-cleanup] [--json]

Tracing:
  sidofun trace start [--name <name>] [--owner-session <id>] [--json]
  sidofun trace list [--json]
  sidofun trace info <trace-id> [--json]
  sidofun trace export <trace-id> [--file <path>] [--json]
  sidofun trace stop <trace-id> [--json]

Trajectories:
  sidofun trajectory start [--name <name>] [--owner-session <id>] [--json]
  sidofun trajectory list [--json]
  sidofun trajectory info <trajectory-id> [--json]
  sidofun trajectory export <trajectory-id> [--file <path>] [--json]
  sidofun trajectory append-turn <trajectory-id> --turn-id <id> [--role <role>] [--prompt <text>] [--response <text>] [--json]
  sidofun trajectory stop <trajectory-id> [--json]

Desktop Scopes:
  sidofun scope create [--window <handle>]... [--pid <pid>]... [--title-query <text>] [--name <name>] [--owner-session <id>] [--json]
  sidofun scope list [--json]
  sidofun scope info <scope-id> [--json]
  sidofun scope focus <scope-id> [--json]
  sidofun scope screenshot <scope-id> [--file <path>] [--json]
  sidofun scope click <scope-id> <x> <y> [--button <left|right|middle>] [--json]
  sidofun scope type <scope-id> <text> [--json]
  sidofun scope close <scope-id> [--json]

Shell:
  sidofun shell run <command> [--pwsh|--cmd] [--cwd <path>] [--timeout-ms <n>] [--json]

Generic Terminals:
  sidofun terminal spawn <cmd|pwsh> [title] [--dir <path>] [--text <text>] [--delay-ms <n>] [--owner-session <id>] [--json]
  sidofun terminal list [--kind <cmd|pwsh>] [--json]
  sidofun terminal status <cmd|pwsh> <session-id|index> [--json]
  sidofun terminal focus <cmd|pwsh> <session-id|index> [--json]
  sidofun terminal type <cmd|pwsh> <session-id|index> <text> [--json]
  sidofun terminal exec <cmd|pwsh> <session-id|index> <command> [--json]
  sidofun terminal close <cmd|pwsh> <session-id|index> [--json]

Browsers:
  sidofun browsers list [--json]
  sidofun browser profiles <chrome|firefox> [--json]
  sidofun browser launch <chrome|firefox> [--profile <name>] [--url <url>] [--private] [--headless] [--json]
  sidofun browser runtime <browser> create [--profile <name>] [--url <url>] [--automation-mode <debuggable|persistent-debuggable>] [--debug-port <n>] [--owner-session <id>] [--private] [--headless] [--json]
  sidofun browser runtime list [--json]
  sidofun browser runtime info <runtime-id> [--json]
  sidofun browser runtime close <runtime-id> [--json]

Browser Extension Provider:
  sidofun bex [status] [--json]
  sidofun bex sessions [--json]
  sidofun bex nuke-stale [--site <domain>] [--queue <keep|matching|all>] [--json]
  sidofun bex clear-queue [--session <session-id>] [--site <domain>] [--status <pending|in_progress|completed|failed>] [--json]
  sidofun bex clear-in-progress [--session <session-id>] [--site <domain>] [--json]
  sidofun browserext status [--json]
  sidofun browserext capabilities [--json]
  sidofun browserext sites [--json]
  sidofun browserext wait-provider [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext workspace list [--json]
  sidofun browserext workspace get <name> [--json]
  sidofun browserext workspace set <name> <path> [--site <domain>]... [--json]
  sidofun browserext workspace clear <name> [--json]
  sidofun browserext session create [--workspace <name>] [--site <domain>] [--url <url>] [--name <name>] [--private] [--json]
  sidofun browserext session list [--json]
  sidofun browserext session info <session-id> [--json]
  sidofun browserext session refresh <session-id> [--json]
  sidofun browserext session reconnect <session-id> [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext session wait-ready <session-id> [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext session close <session-id> [--json]
  sidofun browserext session nuke [--site <domain>] [--stale] [--connected] [--disconnected] [--queue <keep|matching|all>] [--json]
  sidofun browserext queue clear [--session <session-id>] [--site <domain>] [--status <pending|in_progress|completed|failed>] [--json]
  sidofun browserext tabs <session-id> [--json]
  sidofun browserext frames <session-id> [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext navigate <session-id> <url> [--timeout-ms <n>] [--json]
  sidofun browserext back <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext forward <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext reload <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext metadata <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext url-parts <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext storage-list <session-id> [--scope <local|session>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext storage-get <session-id> <key> [--scope <local|session>] [--timeout-ms <n>] [--json]
  sidofun browserext storage-set <session-id> <key> <value> [--scope <local|session>] [--timeout-ms <n>] [--json]
  sidofun browserext storage-remove <session-id> <key> [--scope <local|session>] [--timeout-ms <n>] [--json]
  sidofun browserext focus-tab <session-id> <tab-id> [--timeout-ms <n>] [--json]
  sidofun browserext snapshot <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext scroll-page <session-id> [--direction <down|up>] [--amount <n>] [--timeout-ms <n>] [--json]
  sidofun browserext dom-tree <session-id> [--selector <selector>] [--frame <iframe-selector>]... [--max-depth <n>] [--max-children <n>] [--timeout-ms <n>] [--json]
  sidofun browserext screenshot <session-id> [--file <path>] [--timeout-ms <n>] [--json]
  sidofun browserext inspect <session-id> <selector> [--timeout-ms <n>] [--json]
  sidofun browserext inspect-all <session-id> <selector> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext locate <session-id> <query> [--by <text|selector|role|id|name|placeholder|tag>] [--selector <root-selector>] [--frame <iframe-selector>]... [--max-depth <n>] [--max-children <n>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext click-query <session-id> <query> [--by <text|selector|role|id|name|placeholder|tag>] [--selector <root-selector>] [--frame <iframe-selector>]... [--max-depth <n>] [--max-children <n>] [--timeout-ms <n>] [--json]
  sidofun browserext links <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext actionables <session-id> [--selector <root-selector>] [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext page-state <session-id> [--selector <root-selector>] [--frame <iframe-selector>]... [--limit <n>] [--max-depth <n>] [--max-children <n>] [--timeout-ms <n>] [--json]
  sidofun browserext page-diff <session-id> --against-file <path> [--selector <root-selector>] [--frame <iframe-selector>]... [--limit <n>] [--max-depth <n>] [--max-children <n>] [--timeout-ms <n>] [--json]
  sidofun browserext page-blockers <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext page-outcomes <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext page-recover <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--limit <n>] [--continue-on-error] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext page-ready <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--limit <n>] [--continue-on-error] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext markdown <session-id> [--selector <selector>] [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext readability <session-id> [--selector <selector>] [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext dialogs <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext dialog-actions <session-id> [query] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext banners <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext banner-dismiss <session-id> [query] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext loading-states <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext empty-states <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext dialog-close <session-id> [query] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext dialog-action <session-id> [action-query] [--dialog <query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext menus <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext menu-select <session-id> <option-query> [--menu <menu-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext disclosures <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext disclosure-toggle <session-id> <query> [--state <open|closed|toggle>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext wait-dialog <session-id> [query] [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-no-dialog <session-id> [query] [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-menu <session-id> [query] [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-no-menu <session-id> [query] [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-disclosure <session-id> <query> [--state <open|closed>] [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-page-diff <session-id> --against-file <path> [--selector <root-selector>] [--frame <iframe-selector>]... [--url-changed] [--title-changed] [--text-changed] [--text-length-delta-at-least <n>] [--added-actionable <query>] [--removed-actionable <query>] [--limit <n>] [--max-depth <n>] [--max-children <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext collections <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext collection-controls <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-active-filters <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-sort-state <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-filter-tokens <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-rows <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-find <session-id> <query> [--cell <cell-query>] [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-values <session-id> <cell-query> [--row <row-query>] [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-values-diff <session-id> <cell-query> --against-file <path> [--row <row-query>] [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-stats <session-id> [--cell <cell-query>] [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-stats-diff <session-id> --against-file <path> [--cell <cell-query>] [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-row <session-id> <row-query> [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-cell <session-id> <row-query> <cell-query> [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext wait-collection-row <session-id> <row-query> [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-collection-count <session-id> <count> [--collection <collection-query>] [--frame <iframe-selector>]... [--limit <n>] [--exact] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext collection-row-actions <session-id> <row-query> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-selection-state <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-sort <session-id> <value-query> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-filter <session-id> <query> <value> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-filter-clear <session-id> <query> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-filter-token-clear <session-id> <query> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-clear-all-filters <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--continue-on-error] [--timeout-ms <n>] [--json]
  sidofun browserext collection-click <session-id> <item-query> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-row-click <session-id> <row-query> [--action <action-query>] [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-row-select <session-id> <row-query> [--state <on|off|toggle>] [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-select-all <session-id> [--state <on|off|toggle>] [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-row-details <session-id> <row-query> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-row-expand <session-id> <row-query> [--state <open|closed|toggle>] [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-bulk-action <session-id> --row <row-query> [--row <row-query>]... [--action <action-query>] [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--continue-on-error] [--timeout-ms <n>] [--json]
  sidofun browserext collection-export <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--include-selection] [--include-details] [--format <json|markdown>] [--file <path>] [--timeout-ms <n>] [--json]
  sidofun browserext collection-diff <session-id> --against-file <path> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--dedupe-by <auto|selector|text|cells>] [--include-selection] [--include-details] [--timeout-ms <n>] [--json]
  sidofun browserext wait-collection-diff <session-id> --against-file <path> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--dedupe-by <auto|selector|text|cells>] [--include-selection] [--include-details] [--added-at-least <n>] [--removed-at-least <n>] [--changed-at-least <n>] [--unchanged-at-least <n>] [--row-added <query>] [--row-removed <query>] [--row-changed <query>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext paginations <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext pagination-click <session-id> <query> [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext load-more <session-id> [query] [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext collection-harvest <session-id> [--collection <collection-query>] [--strategy <auto|load_more|scroll>] [--frame <iframe-selector>]... [--exact] [--limit <n>] [--max-iterations <n>] [--stable-iterations <n>] [--settle-quiet-ms <n>] [--dedupe-by <auto|selector|text|cells>] [--scroll-amount <n>] [--timeout-ms <n>] [--json]
  sidofun browserext eval <session-id> <expression> [--timeout-ms <n>] [--json]
  sidofun browserext click <session-id> <selector> [--timeout-ms <n>] [--json]
  sidofun browserext type <session-id> <selector> <text> [--timeout-ms <n>] [--json]
  sidofun browserext press <session-id> <key> [--selector <selector>] [--timeout-ms <n>] [--json]
  sidofun browserext editor-read <session-id> <selector> [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext editor-fill <session-id> <selector> <value> [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext form-fill <session-id> <selector> <value> [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext form-fill-human <session-id> <selector> <value> [--delay-ms <n>] [--jitter-ms <n>] [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext form-fill-many <session-id> --field "<selector>=<value>" [--field "<selector>=<value>"]... [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext form-workflow <session-id> --field "<query>=<value>" [--field "<query>=<value>"]... [--form <selector> | --context-index <n> | --context-query <text>] [--frame-query <text>] [--frame <iframe-selector>]... [--submit] [--submit-selector <selector>] [--delay-ms <n>] [--wait-url-includes <text>] [--wait-text <text>] [--wait-selector <selector>] [--wait-no-selector <selector>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext context-plan <session-id> [--form <selector> | --context-index <n> | --context-query <text>] [--frame-query <text>] [--frame <iframe-selector>]... [--exact] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext context-state <session-id> [--form <selector> | --context-index <n> | --context-query <text>] [--frame-query <text>] [--frame <iframe-selector>]... [--exact] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext query-plan <session-id> [--fill "<query>=<value>"]... [--radio "<group>=<option>"]... [--segment "<group>=<option>"]... [--tab "<group>=<option>"]... [--step-next "<query>"]... [--step-prev "<query>"]... [--date "<query>=<YYYY-MM-DD>"]... [--time "<query>=<HH:MM>"]... [--datetime "<query>=<YYYY-MM-DDTHH:MM>"]... [--range "<query>=<value>"]... [--toggle "<query>[=<on|off|toggle>]"]... [--click "<query>"]... [--form <selector> | --context-query <text>] [--frame-query <text>] [--frame <iframe-selector>]... [--exact] [--submit] [--submit-selector <selector>] [--submit-query <query>] [--json]
  sidofun browserext query-workflow <session-id> [--fill "<query>=<value>"]... [--radio "<group>=<option>"]... [--segment "<group>=<option>"]... [--tab "<group>=<option>"]... [--step-next "<query>"]... [--step-prev "<query>"]... [--date "<query>=<YYYY-MM-DD>"]... [--time "<query>=<HH:MM>"]... [--datetime "<query>=<YYYY-MM-DDTHH:MM>"]... [--range "<query>=<value>"]... [--toggle "<query>[=<on|off|toggle>]"]... [--click "<query>"]... [--form <selector> | --context-query <text>] [--frame-query <text>] [--frame <iframe-selector>]... [--exact] [--submit] [--submit-selector <selector>] [--submit-query <query>] [--delay-ms <n>] [--require-text <text>]... [--require-no-text <text>]... [--require-selector <selector>]... [--require-no-selector <selector>]... [--settle-after-each <dom|network|page>] [--settle-quiet-ms <n>] [--stable-reads <n>] [--wait-url-includes <text>] [--wait-text <text>] [--wait-selector <selector>] [--wait-no-selector <selector>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext workflow-validate --file <path> [--json]
  sidofun browserext workflow-plan [session-id] --file <path> [--session <id>] [--var "<name>=<value>"]... [--json]
  sidofun browserext workflow-diagnose [session-id] --file <path> [--session <id>] [--var "<name>=<value>"]... [--json]
  sidofun browserext workflow-run [session-id] --file <path> [--session <id>] [--var "<name>=<value>"]... [--json]
  sidofun browserext next-actions <session-id> [--selector <selector>] [--frame <iframe-selector>]... [--limit <n>] [--max-depth <n>] [--max-children <n>] [--timeout-ms <n>] [--json]
  sidofun browserext form-fields <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext form-values <session-id> [--form <selector> | --context-query <text>] [--frame-query <text>] [--frame <iframe-selector>]... [--exact] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext form-contexts <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext form-radio-groups <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext form-find-field <session-id> <query> [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-radio-select <session-id> <group-query> <option> [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-segmented-options <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext form-segmented-select <session-id> <group-query> <option> [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-tablist-options <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext form-tablist-select <session-id> <group-query> <option> [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-stepper <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext form-step-next <session-id> [query] [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-step-prev <session-id> [query] [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-date-set <session-id> <query> <YYYY-MM-DD> [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-time-set <session-id> <query> <HH:MM> [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-datetime-set <session-id> <query> <YYYY-MM-DDTHH:MM> [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-toggle <session-id> <query> [--state <on|off|toggle>] [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-range-set <session-id> <query> <value> [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-options <session-id> <selector> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext form-fill-label <session-id> <query> <value> [--frame <iframe-selector>]... [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-fill-query <session-id> <query> <value> [--frame <iframe-selector>]... [--form <selector>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext form-select <session-id> <selector> <option> [--by <text|value|label>] [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext form-upload <session-id> <selector> <file-path> [--name <filename>] [--mime <type>] [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext form-combobox-options <session-id> <selector> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext form-combobox-select <session-id> <selector> <option> [--match <exact|includes>] [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext form-submit <session-id> [--selector <submit-selector>] [--frame <iframe-selector>]... [--timeout-ms <n>] [--json]
  sidofun browserext form-submit-wait <session-id> [--selector <submit-selector>] [--frame <iframe-selector>]... [--wait-url-includes <text>] [--wait-text <text>] [--wait-selector <selector>] [--wait-no-selector <selector>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext auth-login <session-id> (--email <value> | --username <value>) --password <value> [--submit-selector <selector>] [--skip-submit] [--delay-ms <n>] [--jitter-ms <n>] [--plain-fill] [--frame <iframe-selector>]... [--wait-url-includes <text>] [--wait-text <text>] [--wait-selector <selector>] [--wait-no-selector <selector>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext auth-signup <session-id> --password <value> [--full-name <value>] [--username <value>] [--email <value>] [--confirm-password <value>] [--submit-selector <selector>] [--skip-submit] [--delay-ms <n>] [--jitter-ms <n>] [--plain-fill] [--frame <iframe-selector>]... [--wait-url-includes <text>] [--wait-text <text>] [--wait-selector <selector>] [--wait-no-selector <selector>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext cookies <session-id> [--url <url>] [--timeout-ms <n>] [--json]
  sidofun browserext cookie-get <session-id> <name> [--url <url>] [--timeout-ms <n>] [--json]
  sidofun browserext cookie-set <session-id> <name> <value> [--url <url>] [--domain <domain>] [--path <path>] [--secure] [--http-only] [--same-site <no_restriction|lax|strict|unspecified>] [--expiration <unix-seconds>] [--timeout-ms <n>] [--json]
  sidofun browserext cookie-remove <session-id> <name> [--url <url>] [--timeout-ms <n>] [--json]
  sidofun browserext wait-cookie <session-id> <name> [--url <url>] [--equals <value>] [--includes <text>] [--exists <true|false>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext downloads <session-id> [query] [--state <in_progress|interrupted|complete>] [--limit <n>] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext download-cancel <session-id> [query] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext download-erase <session-id> [query] [--exact] [--timeout-ms <n>] [--json]
  sidofun browserext wait-download <session-id> [query] [--state <in_progress|interrupted|complete>] [--limit <n>] [--exact] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext chatgpt read-latest <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt new-chat <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt sidebar-state <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt toggle-sidebar <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt models <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt select-model <session-id> <query> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt info <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt conversations <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt open-conversation <session-id> [--title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt conversation-actions <session-id> [--title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt conversation-action <session-id> <action-query> [--title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt rename-conversation <session-id> <new-title> [--match-title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt stop <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt continue <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt response-controls <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt previous-response <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt next-response <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt list-response-versions <session-id> [--limit <n>] [--max-versions <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt select-response-version <session-id> <index> [--limit <n>] [--max-versions <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt list-response-versions <session-id> [--limit <n>] [--max-versions <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt select-response-version <session-id> <index> [--limit <n>] [--max-versions <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt regenerate <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt edit-message <session-id> <text> [--index <n>|--role <user|assistant|system>] [--offset <n>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt read-thread <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt read-message <session-id> [--index <n>|--role <user|assistant|system>] [--offset <n>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt current-conversation <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt export-thread <session-id> [--format <json|markdown>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt send <session-id> <text> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt ask <session-id> <prompt> [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt ask-thread <session-id> <prompt> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt rewrite-thread <session-id> <text> [--index <n>|--role <user|assistant|system>] [--offset <n>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt wait-idle <session-id> [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext chatgpt wait-response <session-id> [--baseline <text>] [--timeout-ms <n>] [--interval-ms <n>] [--stable-reads <n>] [--json]
  sidofun browserext chatgpt wait-message <session-id> [--text <needle>] [--role <user|assistant|system>] [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--stable-reads <n>] [--json]
  sidofun browserext chatgpt wait-sidebar <session-id> [--open true|false] [--timeout-ms <n>] [--interval-ms <n>] [--stable-reads <n>] [--json]
  sidofun browserext chatgpt wait-model <session-id> [--query <text>] [--timeout-ms <n>] [--interval-ms <n>] [--stable-reads <n>] [--json]
  sidofun browserext chatgpt wait-conversation <session-id> [--title <text>|--url <url>] [--active true|false] [--timeout-ms <n>] [--interval-ms <n>] [--stable-reads <n>] [--json]
  sidofun browserext chatgpt prepare <session-id> [--sidebar-open] [--model <text>] [--new-chat|--title <text>|--url <url>|--index <n>] [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext chatgpt delete-conversation <session-id> [--title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext chatgpt archive-conversation <session-id> [--title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek read-latest <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek new-chat <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek sidebar-state <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek toggle-sidebar <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek models <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek select-model <session-id> <query> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek info <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek conversations <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek open-conversation <session-id> [--title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek conversation-actions <session-id> [--title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek conversation-action <session-id> <action-query> [--title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek rename-conversation <session-id> <new-title> [--match-title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek stop <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek continue <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek response-controls <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek previous-response <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek next-response <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek list-response-versions <session-id> [--limit <n>] [--max-versions <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek select-response-version <session-id> <index> [--limit <n>] [--max-versions <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek list-response-versions <session-id> [--limit <n>] [--max-versions <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek select-response-version <session-id> <index> [--limit <n>] [--max-versions <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek regenerate <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek edit-message <session-id> <text> [--index <n>|--role <user|assistant|system>] [--offset <n>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek read-thread <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek read-message <session-id> [--index <n>|--role <user|assistant|system>] [--offset <n>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek current-conversation <session-id> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek export-thread <session-id> [--format <json|markdown>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek send <session-id> <text> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek ask <session-id> <prompt> [--timeout-ms <n>] [--json]
  sidofun browserext deepseek ask-thread <session-id> <prompt> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek rewrite-thread <session-id> <text> [--index <n>|--role <user|assistant|system>] [--offset <n>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek wait-idle <session-id> [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext deepseek wait-response <session-id> [--baseline <text>] [--timeout-ms <n>] [--interval-ms <n>] [--stable-reads <n>] [--json]
  sidofun browserext deepseek wait-message <session-id> [--text <needle>] [--role <user|assistant|system>] [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--stable-reads <n>] [--json]
  sidofun browserext deepseek wait-sidebar <session-id> [--open true|false] [--timeout-ms <n>] [--interval-ms <n>] [--stable-reads <n>] [--json]
  sidofun browserext deepseek wait-model <session-id> [--query <text>] [--timeout-ms <n>] [--interval-ms <n>] [--stable-reads <n>] [--json]
  sidofun browserext deepseek wait-conversation <session-id> [--title <text>|--url <url>] [--active true|false] [--timeout-ms <n>] [--interval-ms <n>] [--stable-reads <n>] [--json]
  sidofun browserext deepseek prepare <session-id> [--sidebar-open] [--model <text>] [--new-chat|--title <text>|--url <url>|--index <n>] [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext deepseek delete-conversation <session-id> [--title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext deepseek archive-conversation <session-id> [--title <text>|--url <url>|--index <n>] [--timeout-ms <n>] [--json]
  sidofun browserext x search [session-id] <query> [--mode <top|latest|live|people|media>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext x timeline [session-id] [--type <for-you|following>] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext x bookmarks [session-id] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext x notifications [session-id] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext x messages [session-id] [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext x open-message-thread [session-id] <thread-url|query> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext x send-message [session-id] <text> [--thread <thread-url|query>] [--timeout-ms <n>] [--json]
  sidofun browserext x read-thread [session-id] <post-url> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext x post [session-id] <text> [--timeout-ms <n>] [--json]
  sidofun browserext x open-post [session-id] <post-url> [--timeout-ms <n>] [--json]
  sidofun browserext x profile [session-id] <handle|url> [--limit <n>] [--timeout-ms <n>] [--json]
  sidofun browserext x follow [session-id] <handle|url> [--timeout-ms <n>] [--json]
  sidofun browserext x reply [session-id] <text> [--post-url <url>] [--timeout-ms <n>] [--json]
  sidofun browserext x like [session-id] [--post-url <url>] [--timeout-ms <n>] [--json]
  sidofun browserext x repost [session-id] [--post-url <url>] [--timeout-ms <n>] [--json]
  sidofun browserext network-events <session-id> [--limit <n>] [--url-includes <text>] [--stage <request|response|error>] [--method <verb>] [--json]
  sidofun browserext dom-events <session-id> [--limit <n>] [--mutation-type <childList|attributes|characterData>] [--text-includes <text>] [--timeout-ms <n>] [--json]
  sidofun browserext session-events <session-id> [--limit <n>] [--kind <name>] [--ok <true|false>] [--json]
  sidofun browserext clear-session-events <session-id> [--json]
  sidofun browserext wait-dom-quiet <session-id> [--quiet-ms <n>] [--mutation-type <childList|attributes|characterData>] [--text-includes <text>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-network-idle <session-id> [--quiet-ms <n>] [--url-includes <text>] [--stage <request|response|error>] [--method <verb>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-page-stable <session-id> [--quiet-ms <n>] [--stable-reads <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-no-blockers <session-id> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-banner <session-id> <text> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-no-banner <session-id> [text] [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-page-outcome <session-id> <loading|blocked|error|warning|success|empty|ready> [--frame <iframe-selector>]... [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-no-collection-filters <session-id> [--collection <collection-query>] [--frame <iframe-selector>]... [--exact] [--limit <n>] [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-url <session-id> <text> [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-selector <session-id> <selector> [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-no-selector <session-id> <selector> [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext wait-text <session-id> <text> [--timeout-ms <n>] [--interval-ms <n>] [--json]
  sidofun browserext clear-network-events <session-id> [--timeout-ms <n>] [--json]
  sidofun browserext clear-dom-events <session-id> [--timeout-ms <n>] [--json]

OpenCLI-RS Provider:
  sidofun opencli status [--json]
  sidofun opencli doctor [--cwd <path>|--workspace <name>] [--owner-session <id>] [--timeout-ms <n>] [--json]
  sidofun opencli sites [--json]
  sidofun opencli commands <site> [--json]
  sidofun opencli run <site> <command> [args...] [--cwd <path>|--workspace <name>] [--owner-session <id>] [--timeout-ms <n>] [--keep-browser-open] [--maximize-browser] [--wait-ms <n>] [--json]
  sidofun opencli workspace list [--json]
  sidofun opencli workspace get <name> [--json]
  sidofun opencli workspace set <name> <path> [--json]
  sidofun opencli workspace clear <name> [--json]
  sidofun opencli workspace bind <session-id> <workspace> [--json]
  sidofun opencli workspace unbind <session-id> [--json]
  sidofun opencli workspace session <session-id> [--json]

HF Papers:
  sidofun hf status [--json]
  sidofun hf doctor [--backend <api|cli|auto>] [--timeout-ms <n>] [--json]
  sidofun hf papers search "<query>" [--limit <n>] [--backend <api|cli|auto>] [--token <token>] [--include-raw] [--timeout-ms <n>] [--json]
  sidofun hf papers info <paper-id> [--backend <api|cli|auto>] [--token <token>] [--include-raw] [--timeout-ms <n>] [--json]
  sidofun hf papers read <paper-id> [--backend <api|cli|auto>] [--token <token>] [--save <path>] [--timeout-ms <n>] [--json]
  sidofun hf papers ls [--date <YYYY-MM-DD|today>] [--week <YYYY-Www>] [--month <YYYY-MM>] [--submitter <user>] [--sort <publishedAt|trending>] [--limit <n>] [--backend <api|cli|auto>] [--token <token>] [--include-raw] [--timeout-ms <n>] [--json]

Twitter via OpenCLI-RS:
  sidofun twitter search <query> [--mode <top|latest|live|people|media>] [--limit <n>] [--cwd <path>|--workspace <name>] [--owner-session <id>] [--timeout-ms <n>] [--keep-browser-open] [--maximize-browser] [--wait-ms <n>] [--json]
  sidofun twitter timeline [--type <for-you|following>] [--limit <n>] [--cwd <path>|--workspace <name>] [--owner-session <id>] [--timeout-ms <n>] [--keep-browser-open] [--maximize-browser] [--wait-ms <n>] [--json]
  sidofun twitter bookmarks [--limit <n>] [--cwd <path>|--workspace <name>] [--owner-session <id>] [--timeout-ms <n>] [--keep-browser-open] [--maximize-browser] [--wait-ms <n>] [--json]
  sidofun twitter post <text> [--cwd <path>|--workspace <name>] [--owner-session <id>] [--timeout-ms <n>] [--keep-browser-open] [--maximize-browser] [--wait-ms <n>] [--json]
  Twitter search modes:
    top     Search / X Top tab
    latest  Chronological search; mapped to Twitter/X \`live\` internally
    live    Explicit Twitter/X live mode
    people  People tab
    media   Media tab
  Twitter behavior:
    - search currently scrapes visible tweet cards from the X search page
    - use \`--keep-browser-open\` if you want the Chrome/OpenCLI page to remain open after the command finishes
    - use \`--maximize-browser\` to maximize the X/Twitter window after success
    - use \`--wait-ms\` only if you intentionally want Sidofun itself to linger before exiting

Local Coders:
  sidofun coder list [--json]
  sidofun coder status <codex|opencode|qwen> [--json]
  sidofun coder open <codex|opencode|qwen> [prompt] [--dir <path>] [--delay-ms <n>] [--json]
  sidofun coder focus <codex|opencode|qwen> [--json]
  sidofun coder close <codex|opencode|qwen> [--json]
  sidofun coder maximize <codex|opencode|qwen> [--json]
  sidofun coder minimize <codex|opencode|qwen> [--json]
  sidofun coder restore <codex|opencode|qwen> [--json]
  sidofun coder move <codex|opencode|qwen> <x> <y> [--json]
  sidofun coder resize <codex|opencode|qwen> <width> <height> [--json]
  sidofun coder run <codex|opencode|qwen> <prompt> [--dir <path>] [--timeout-ms <n>] [--json]

CMD Sessions:
  sidofun cmd spawn [title] [--dir <path>] [--text <text>] [--delay-ms <n>] [--json]
  sidofun cmd list [--json]
  sidofun cmd tabs [--json]
  sidofun cmd type <session-id|index> <text> [--json]
  sidofun cmd exec <session-id|index> <command> [--json]
  sidofun cmd screenshot <session-id|index> [--file <path>] [--json]
  sidofun cmd status <session-id|index> [--json]
  sidofun cmd focus <session-id|index> [--json]
  sidofun cmd activate <title-query> [--json]
  sidofun cmd close <session-id|index> [--json]

PowerShell Sessions:
  sidofun pwsh spawn [title] [--dir <path>] [--text <text>] [--delay-ms <n>] [--json]
  sidofun pwsh list [--json]
  sidofun pwsh tabs [--json]
  sidofun pwsh type <session-id|index> <text> [--json]
  sidofun pwsh exec <session-id|index> <command> [--json]
  sidofun pwsh screenshot <session-id|index> [--file <path>] [--json]
  sidofun pwsh status <session-id|index> [--json]
  sidofun pwsh focus <session-id|index> [--json]
  sidofun pwsh activate <title-query> [--json]
  sidofun pwsh close <session-id|index> [--json]

`;

export const OPERATOR_HELP_FLAGS = `
Flags:
  --json       Output machine-readable JSON
  --cmd        Use CMD shell for \`shell run\`
  --pwsh       Use PowerShell shell for \`shell run\`
  --client-kind Client session kind for \`session create\`
  --type       Resource type filter for \`session resources\`
  --owner-session Owner client session id for supported resources
  --turn-id    Turn id for \`trajectory append-turn\`
  --max-idle-ms Idle timeout threshold for session GC commands
  --cwd        Working directory for shell/coder/OpenCLI operations
  --dir        Spawn directory for terminal and coder open commands
  --workspace  Named OpenCLI workspace alias for opencli/twitter commands
  --keep-browser-open Preserve the OpenCLI automation page/window after browser-backed commands finish
  --maximize-browser Maximize the active OpenCLI browser window after a successful browser-backed command
  --wait-ms    Extra client-side delay after OpenCLI commands finish before Sidofun exits
  --text       Initial typed text for terminal spawn commands
  --selector   Optional CSS selector for browserext press
  --url-includes Substring filter for browserext network-events
  --stage      Stage filter for browserext network-events
  --method     HTTP method filter for browserext network-events
  --dedupe-by  Row de-duplication strategy for browserext collection-harvest
  --scroll-amount Page scroll amount for browserext scroll-page and collection-harvest
  --mutation-type Mutation type filter for browserext dom-events
  --text-includes Substring filter for browserext dom-events
  --kind       Event kind filter for browserext session-events
  --ok         Success filter for browserext session-events
  --baseline   Baseline assistant text for browserext AI wait-response commands
  --stable-reads Consecutive idle confirmations required for browserext AI wait-response commands
  --interval-ms Poll interval for browserext generic waits and AI wait-response/wait-message/wait-idle commands
  --delay-ms   Extra settle delay before initial terminal typing (PowerShell spawn typing enforces a higher minimum settle delay)
  --timeout-ms Timeout for shell/coder operations
  --profile    Browser profile name for profile-first browsers
  --url        URL to open during browser launch
  --automation-mode Runtime automation mode for browser runtime create
  --debug-port Explicit remote debugging port for browser runtime create
  --private    Launch browser in private/incognito mode when supported
  --headless   Launch browser headless when supported
  --limit      Result limit for supported Twitter/OpenCLI commands

`;

export const OPERATOR_HELP_TYPING = `
Typing Language:
  Use quoted Sidofun escape strings with terminal type commands.
  
 = Enter, \t = Tab, \d500 = 500ms delay, \M = maximize, \m = minimize, \r = restore, \f = focus

`;

export const OPERATOR_HELP_EXAMPLES = `
Examples:
  sidofun doctor
  sidofun config get
  sidofun config get OPENCLI_RS_PATH
  sidofun config set OPENCLI_RS_PATH C:\github-sido\kerjaan\sidofun-v2\opencli-rs
  sidofun clipboard status
  sidofun session create --client-kind operator --name demo-agent
  sidofun session resources --type terminal
  sidofun session owners terminal cmd_123
  sidofun session claim client_session_1 terminal cmd_123 --takeover
  sidofun session reap-idle --max-idle-ms 900000 --client-kind mcp
  sidofun trace start --name desktop-debug
  sidofun trajectory start --name agent-run
  sidofun scope create --title-query "Windows Terminal" --name terminal
  sidofun scope screenshot desktop_scope_1 --file terminal-scope.png
  sidofun scope click desktop_scope_1 30 40
  sidofun clipboard write "hello from sidofun"
  sidofun shell run "Get-Location" --pwsh
  sidofun shell run "dir" --cmd --cwd C:\hapus
  sidofun terminal spawn cmd MyTerminal --dir C:\hapus --text "echo hello
"
  sidofun terminal exec pwsh 1 "Get-Location"
  sidofun daemon start
  sidofun daemon status --json
  sidofun browsers list --json
  sidofun browser profiles chrome
  sidofun browser profiles firefox
  sidofun browser launch firefox --profile default-release --url https://gmail.com
  sidofun browser launch chrome --profile Default --url https://gmail.com --private
  sidofun browser runtime chrome create --url https://example.com --owner-session client_session_1
  sidofun browser runtime list --json
  bun run build:browserext
  sidofun browserext status --json
  bun run smoke:browserext
  sidofun browserext wait-provider --timeout-ms 30000 --json
  sidofun browserext workspace set socials C:\hapus --site x.com --site chatgpt.com --json
  sidofun browserext session create --workspace socials --site x.com --url https://x.com/home --name socials-home --private --json
  sidofun browserext session list --json
  sidofun bex sessions --json
  sidofun bex nuke-stale --queue matching --json
  sidofun bex clear-in-progress --json
  sidofun browserext session create --site x.com --url https://x.com/home --name demo-x --json
  sidofun browserext session create --site chatgpt.com --url https://chatgpt.com/ --name demo-chatgpt --json
  sidofun browserext session create --site deepseek.com --url https://chat.deepseek.com/ --name demo-deepseek --json
  sidofun browserext session wait-ready <session-id-from-session-create> --timeout-ms 30000 --json
  sidofun browserext session refresh <session-id-from-session-create> --json
  sidofun browserext session reconnect <session-id-from-session-create> --timeout-ms 30000 --interval-ms 1000 --json
  sidofun browserext tabs <session-id-from-session-create> --json
  sidofun browserext navigate <session-id-from-session-create> https://x.com/explore --json
  sidofun browserext focus-tab <session-id-from-session-create> <tab-id-from-browserext-tabs> --json
  sidofun browserext snapshot <session-id-from-session-create> --json
  sidofun browserext screenshot <session-id-from-session-create> --file browserext-shot.png --json
  sidofun browserext metadata <session-id-from-session-create> --json
  sidofun browserext url-parts <session-id-from-session-create> --json
  sidofun browserext storage-set <session-id-from-session-create> auth_token secret --scope local --json
  sidofun browserext storage-get <session-id-from-session-create> auth_token --scope local --json
  sidofun browserext inspect <session-id-from-session-create> "textarea, [contenteditable=true]" --json
  sidofun browserext inspect-all <session-id-from-session-create> "a[href]" --limit 10 --json
  sidofun browserext links <session-id-from-session-create> --limit 20 --json
  sidofun browserext actionables <session-id-from-session-create> --selector main --limit 20 --json
  sidofun browserext page-state <session-id-from-session-create> --selector main --limit 20 --max-depth 3 --json
  sidofun browserext form-radio-groups <session-id-from-session-create> --limit 20 --json
  sidofun browserext form-radio-select <session-id-from-session-create> "Plan" "Pro" --json
  sidofun browserext form-segmented-options <session-id-from-session-create> --limit 20 --json
  sidofun browserext form-segmented-select <session-id-from-session-create> "Theme" "Dark" --json
  sidofun browserext form-toggle <session-id-from-session-create> "Remember me" --state on --json
  sidofun browserext form-range-set <session-id-from-session-create> "Priority slider" 8 --json
  sidofun browserext eval <session-id-from-session-create> "document.title" --json
  sidofun browserext click <session-id-from-session-create> "a[aria-label='Explore']" --json
  sidofun browserext type <session-id-from-session-create> "textarea" "hello from sidofun" --json
  sidofun browserext press <session-id-from-session-create> Enter --selector "textarea" --json
  sidofun browserext cookies <session-id-from-session-create> --json
  sidofun browserext cookie-set <session-id-from-session-create> sid demo --url https://example.com --json
  sidofun browserext wait-cookie <session-id-from-session-create> sid --url https://example.com --exists true --json
  sidofun browserext chatgpt read-latest <session-id-from-session-create> --json
  sidofun browserext chatgpt new-chat <session-id-from-session-create> --json
  sidofun browserext chatgpt sidebar-state <session-id-from-session-create> --json
  sidofun browserext chatgpt models <session-id-from-session-create> --json
  sidofun browserext chatgpt info <session-id-from-session-create> --limit 10 --json
  sidofun browserext chatgpt conversations <session-id-from-session-create> --limit 20 --json
  sidofun browserext chatgpt open-conversation <session-id-from-session-create> --title "Project plan" --json
  sidofun browserext chatgpt conversation-actions <session-id-from-session-create> --title "Project plan" --json
  sidofun browserext chatgpt rename-conversation <session-id-from-session-create> "Renamed chat" --match-title "Project plan" --json
  sidofun browserext chatgpt read-message <session-id-from-session-create> --role assistant --offset 0 --json
  sidofun browserext chatgpt read-thread <session-id-from-session-create> --limit 10 --json
  sidofun browserext chatgpt current-conversation <session-id-from-session-create> --limit 10 --json
  sidofun browserext chatgpt export-thread <session-id-from-session-create> --format markdown --limit 10 --json
  sidofun browserext chatgpt continue <session-id-from-session-create> --json
  sidofun browserext chatgpt response-controls <session-id-from-session-create> --limit 10 --json
  sidofun browserext chatgpt previous-response <session-id-from-session-create> --limit 10 --json
  sidofun browserext chatgpt next-response <session-id-from-session-create> --limit 10 --json
  sidofun browserext chatgpt list-response-versions <session-id-from-session-create> --limit 10 --max-versions 6 --json
  sidofun browserext chatgpt select-response-version <session-id-from-session-create> 0 --limit 10 --max-versions 6 --json
  sidofun browserext chatgpt edit-message <session-id-from-session-create> "Rewrite this prompt" --role user --offset 0 --json
  sidofun browserext chatgpt stop <session-id-from-session-create> --json
  sidofun browserext chatgpt regenerate <session-id-from-session-create> --json
  sidofun browserext chatgpt send <session-id-from-session-create> "Summarize this page" --json
  sidofun browserext chatgpt ask <session-id-from-session-create> "Summarize this page" --timeout-ms 45000 --json
  sidofun browserext chatgpt ask-thread <session-id-from-session-create> "Summarize this page" --limit 10 --timeout-ms 45000 --json
  sidofun browserext chatgpt rewrite-thread <session-id-from-session-create> "Rewrite the earlier request" --role user --offset 0 --limit 10 --timeout-ms 45000 --json
  sidofun browserext chatgpt wait-idle <session-id-from-session-create> --timeout-ms 45000 --interval-ms 1000 --json
  sidofun browserext chatgpt wait-response <session-id-from-session-create> --timeout-ms 45000 --interval-ms 1000 --stable-reads 2 --json
  sidofun browserext chatgpt wait-message <session-id-from-session-create> --role assistant --text "Final answer" --timeout-ms 45000 --interval-ms 1000 --stable-reads 2 --json
  sidofun browserext chatgpt wait-model <session-id-from-session-create> --query "GPT-4o" --timeout-ms 30000 --interval-ms 1000 --json
  sidofun browserext chatgpt prepare <session-id-from-session-create> --sidebar-open --model "GPT-4o" --new-chat --limit 10 --timeout-ms 45000 --json
  sidofun browserext chatgpt archive-conversation <session-id-from-session-create> --title "Project plan" --json
  sidofun browserext deepseek read-latest <session-id-from-session-create> --json
  sidofun browserext deepseek new-chat <session-id-from-session-create> --json
  sidofun browserext deepseek info <session-id-from-session-create> --limit 10 --json
  sidofun browserext deepseek conversations <session-id-from-session-create> --limit 20 --json
  sidofun browserext deepseek open-conversation <session-id-from-session-create> --title "Research notes" --json
  sidofun browserext deepseek read-message <session-id-from-session-create> --role assistant --offset 0 --json
  sidofun browserext deepseek read-thread <session-id-from-session-create> --limit 10 --json
  sidofun browserext deepseek current-conversation <session-id-from-session-create> --limit 10 --json
  sidofun browserext deepseek export-thread <session-id-from-session-create> --format markdown --limit 10 --json
  sidofun browserext deepseek sidebar-state <session-id-from-session-create> --json
  sidofun browserext deepseek models <session-id-from-session-create> --json
  sidofun browserext deepseek conversation-actions <session-id-from-session-create> --title "Research notes" --json
  sidofun browserext deepseek rename-conversation <session-id-from-session-create> "Renamed thread" --match-title "Research notes" --json
  sidofun browserext deepseek continue <session-id-from-session-create> --json
  sidofun browserext deepseek response-controls <session-id-from-session-create> --limit 10 --json
  sidofun browserext deepseek previous-response <session-id-from-session-create> --limit 10 --json
  sidofun browserext deepseek next-response <session-id-from-session-create> --limit 10 --json
  sidofun browserext deepseek list-response-versions <session-id-from-session-create> --limit 10 --max-versions 6 --json
  sidofun browserext deepseek select-response-version <session-id-from-session-create> 0 --limit 10 --max-versions 6 --json
  sidofun browserext deepseek edit-message <session-id-from-session-create> "Rewrite this prompt" --role user --offset 0 --json
  sidofun browserext deepseek stop <session-id-from-session-create> --json
  sidofun browserext deepseek regenerate <session-id-from-session-create> --json
  sidofun browserext deepseek send <session-id-from-session-create> "Summarize this page" --json
  sidofun browserext deepseek ask <session-id-from-session-create> "Summarize this page" --timeout-ms 45000 --json
  sidofun browserext deepseek ask-thread <session-id-from-session-create> "Summarize this page" --limit 10 --timeout-ms 45000 --json
  sidofun browserext deepseek rewrite-thread <session-id-from-session-create> "Rewrite the earlier request" --role user --offset 0 --limit 10 --timeout-ms 45000 --json
  sidofun browserext deepseek wait-idle <session-id-from-session-create> --timeout-ms 45000 --interval-ms 1000 --json
  sidofun browserext deepseek wait-response <session-id-from-session-create> --timeout-ms 45000 --interval-ms 1000 --stable-reads 2 --json
  sidofun browserext deepseek wait-message <session-id-from-session-create> --role assistant --text "Final answer" --timeout-ms 45000 --interval-ms 1000 --stable-reads 2 --json
  sidofun browserext deepseek wait-model <session-id-from-session-create> --query "DeepSeek R1" --timeout-ms 30000 --interval-ms 1000 --json
  sidofun browserext deepseek prepare <session-id-from-session-create> --sidebar-open --model "DeepSeek R1" --new-chat --limit 10 --timeout-ms 45000 --json
  sidofun browserext deepseek archive-conversation <session-id-from-session-create> --title "Research notes" --json
  sidofun browserext x search "hiring -intern" --mode latest --limit 5 --json
  sidofun browserext x search "software remote" --mode latest --limit 5 --json
  sidofun browserext x timeline --type following --limit 10 --json
  sidofun browserext x notifications --limit 10 --json
  sidofun browserext x messages --limit 20 --json
  sidofun browserext x open-message-thread https://x.com/messages/123 --limit 20 --json
  sidofun browserext x send-message "hello from sidofun" --thread https://x.com/messages/123 --json
  sidofun browserext x read-thread https://x.com/user/status/123 --limit 10 --json
  sidofun browserext x open-post https://x.com/user/status/123 --json
  sidofun browserext x profile @openai --limit 3 --json
  sidofun browserext x follow @openai --json
  sidofun browserext x reply "Interested, sent a DM" --post-url https://x.com/user/status/123 --json
  sidofun browserext x like --post-url https://x.com/user/status/123 --json
  sidofun browserext x repost --post-url https://x.com/user/status/123 --json
  sidofun browserext x bookmarks --limit 10 --json
  sidofun browserext x post "hello from sidofun" --json
  sidofun browserext network-events <session-id-from-session-create> --limit 20 --stage response --json
  sidofun browserext dom-events <session-id-from-session-create> --limit 20 --mutation-type childList --json
  sidofun browserext session-events <session-id-from-session-create> --limit 20 --kind snapshot --json
  sidofun browserext clear-session-events <session-id-from-session-create> --json
  sidofun browserext wait-url <session-id-from-session-create> "chatgpt.com/c/" --timeout-ms 30000 --interval-ms 1000 --json
  sidofun browserext wait-selector <session-id-from-session-create> "textarea" --timeout-ms 30000 --interval-ms 1000 --json
  sidofun browserext wait-no-selector <session-id-from-session-create> "[data-testid=\"stop-button\"]" --timeout-ms 30000 --interval-ms 1000 --json
  sidofun browserext wait-text <session-id-from-session-create> "Hiring" --timeout-ms 30000 --interval-ms 1000 --json
  sidofun browserext clear-network-events <session-id-from-session-create> --json
  sidofun browserext clear-dom-events <session-id-from-session-create> --json
  $env:SIDOFUN_BROWSEREXT_SUITES="provider,generic,forms"; bun run smoke:browserext
  $env:SIDOFUN_BROWSEREXT_SUITES="provider,chatgpt,deepseek"; bun run smoke:browserext
  sidofun opencli status
  sidofun opencli doctor
  sidofun opencli commands twitter
  sidofun opencli workspace set socials C:\hapus
  sidofun opencli workspace bind client_session_1 socials
  sidofun hf status
  sidofun hf doctor
  sidofun hf papers search "llm reasoning" --limit 3 --json
  sidofun hf papers info 2601.15621 --json
  sidofun hf papers read 2601.15621 --save C:\hapus\qwen3-tts.md
  sidofun hf papers ls --sort trending --limit 5 --json
  sidofun opencli run hackernews top --limit 3 --json
  sidofun opencli run twitter search "hiring -intern" --mode latest --limit 3 --keep-browser-open --maximize-browser --json
  sidofun twitter search "rust lang" --limit 3 --workspace socials --json
  sidofun twitter search "hiring -intern" --mode latest --limit 3 --keep-browser-open --maximize-browser --wait-ms 5000 --json
  sidofun twitter search "software remote" --mode latest --limit 3 --keep-browser-open --maximize-browser --wait-ms 5000 --json
  sidofun twitter timeline --type following --limit 10 --json
  sidofun twitter post "hello from sidofun" --json
  sidofun coder list
  sidofun coder open codex
  sidofun coder open qwen "Create hello.js simple hello world node project" --dir C:\hapus\test-qwen-3 --delay-ms 1500
  sidofun coder status opencode --json
  sidofun coder resize qwen 1200 900
  sidofun coder run codex "Create hello.js with console.log('hello');" --dir C:\hapus\test-codex --json
  sidofun cmd spawn MyTerminal --dir C:\hapus --text "echo hello
" --delay-ms 1500
  sidofun cmd list
  sidofun cmd type 1 "echo hello
"
  sidofun cmd screenshot 1 --file cmd-shot.png
  sidofun cmd status 1
  sidofun cmd activate Sidofun_1774696254057
  sidofun pwsh spawn MyPowerShell --dir C:\hapus --text "Get-Location
" --delay-ms 1500
  sidofun pwsh list
  sidofun pwsh type 1 "Get-Location
"
  sidofun pwsh screenshot 1 --file pwsh-shot.png
  sidofun pwsh status pwsh_123
  sidofun tui

`;

export const OPERATOR_HELP_NOTES = `
Notes:
  - \`list\` and \`tabs\` are aliases for tracked Sidofun sessions.
  - Session, scope, and terminal CLI commands use the local Sidofun daemon so tracked resources and owned-session metadata survive separate CLI runs.
  - When \`wt.exe\` is available, Sidofun-created CMD and PowerShell sessions prefer dedicated Windows Terminal windows for restart-safe recovery.
  - Initial \`--text\` typing after PowerShell spawn waits longer internally because Windows Terminal + PowerShell startup is slower than plain CMD.
  - Browser profile workflows are intended for Chrome and Firefox.
  - \`browserext\` commands use the first-party Sidofun Chrome extension bridge and require the extension to be built, loaded, and able to reach the local Sidofun HTTP server.
  - Recommended browserext close-out flow: \`bun run build:browserext\`, reload the unpacked extension from \`providers/browser-extension\`, run \`sidofun browserext status --json\`, confirm \`expectedBuildId\` matches \`activeProviderBuildId\`, then run \`bun run smoke:browserext\` or the suite-scoped variants shown above.
  - Verified browserext smoke suites on the rebuild branch are \`provider\`, \`generic\`, \`forms\`, \`chatgpt\`, and \`deepseek\`; optional \`x\` remains the main unverified browserext sweep.
  - Current live browserext primitives include provider waits, session refresh/reconnect, tabs, navigate, focus-tab, snapshot, screenshot, inspect, inspect-all, links, eval, click, type, press, cookies, native x.com search/timeline/bookmarks/notifications/messages/open-message-thread/send-message/thread-read/post/profile/follow/reply/like/repost helpers, native chatgpt.com info/conversations/open-conversation/new-chat/read-thread/read-message/current-conversation/export-thread/stop/continue/response-controls/previous-response/next-response/list-response-versions/select-response-version/regenerate/edit-message/send/read/ask/rewrite-thread/wait-idle/wait-response/wait-message/prepare helpers, native deepseek.com info/conversations/open-conversation/new-chat/read-thread/read-message/current-conversation/export-thread/stop/continue/response-controls/previous-response/next-response/list-response-versions/select-response-version/regenerate/edit-message/send/read/ask/rewrite-thread/wait-idle/wait-response/wait-message/prepare helpers, bounded network history, session event history, DOM mutation history, websocket browserext tabs/snapshot/session/network/DOM streams, and generic wait-url/wait-selector/wait-no-selector/wait-text polling.
  - OpenCLI-RS integration wraps the nested \`opencli-rs\` provider and prefers a built binary, then falls back to \`cargo run --release\`.
  - HF papers commands are API-first through \`huggingface_hub\` when available, with \`hf\` CLI fallback for parity/diagnostics.
  - Twitter commands are currently implemented through the OpenCLI-RS provider rather than Sidofun browser automation.
  - OpenCLI browser-backed commands close their automation page by default; use \`--keep-browser-open\` to preserve it, \`--maximize-browser\` to maximize the active browser window after success, and \`--wait-ms\` only if you intentionally want the Sidofun process to linger before exiting.
  - Local coder apps currently use explicit executable paths configured in source constants.
  - \`coder open <app> "<prompt>"\` now opens a visible window, waits briefly, then types the prompt and presses Enter.
  - \`coder run\` is the maintained automation path for codex/opencode/qwen because they support non-interactive CLI execution.
  - \`activate\` selects the first tracked session whose title/tab title matches.
  - Session indexes are 1-based.


`;

export const OPERATOR_HELP_TEXT = [
  OPERATOR_HELP_INTRO,
  OPERATOR_HELP_FLAGS,
  OPERATOR_HELP_TYPING,
  OPERATOR_HELP_EXAMPLES,
  OPERATOR_HELP_NOTES
].join('\n\n');
