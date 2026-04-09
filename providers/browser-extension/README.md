# Sidofun Browser Extension

This is the first-party Chrome provider scaffold for Sidofun.

Current scope:

- thin browser provider, not workflow UI
- dedicated browser primitives
- site modules built on top later
- `x.com`, `chatgpt.com`, and `deepseek.com` are the first targets

The extension is intentionally thin. Sidofun core remains responsible for:

- sessions and ownership
- telemetry
- transport surfaces
- persistence
- provider routing

The extension is responsible for:

- tab/window/browser APIs
- DOM access
- browser-native execution
- site content-bridge primitives

Current live bridge milestone:

- registers with the Sidofun localhost server
- sends heartbeats
- pushes network and DOM event batches back into Sidofun between heartbeats
- pushes browserext session/lifecycle events back into Sidofun between heartbeats
- feeds browserext session/network/DOM WebSocket streams through push-backed in-process events instead of only polling stored histories
- polls queued commands
- can long-poll for queued commands during idle periods
- drains queued commands in short bursts when work is available
- schedules fast follow-up sync/poll cycles after tab, DOM, network, and command-result changes
- supports provider/session readiness waits from Sidofun core
- supports session refresh/reconnect lifecycle recovery from Sidofun core
- executes first primitives:
  - open session window
  - list tabs
  - navigate
  - focus tracked tab
  - capture active-tab DOM/text snapshot
  - capture active browser-window screenshots
  - evaluate JS in the active tab
  - inspect one or many CSS-selected elements
  - collect visible links from the active tab
  - click a CSS selector
  - type into an input/textarea/contenteditable selector
  - press a key on a selector or active element
  - list cookies for a target URL
  - record bounded DOM mutation events from the active tab content script
  - run native `chatgpt.com` info/new-chat/conversation-list/conversation-open/read-latest/read-thread/read-message/edit-message/current-conversation/export-thread/stop/continue/response-controls/previous-response/next-response/list-response-versions/select-response-version/regenerate/send/ask/ask-thread/rewrite-thread/wait-idle/wait-response/wait-message helpers
  - run native `deepseek.com` info/new-chat/conversation-list/conversation-open/read-latest/read-thread/read-message/edit-message/current-conversation/export-thread/stop/continue/response-controls/previous-response/next-response/list-response-versions/select-response-version/regenerate/send/ask/ask-thread/rewrite-thread/wait-idle/wait-response/wait-message helpers
  - run native `x.com` search and extract visible tweet cards
  - run native `x.com` timeline, bookmarks, notifications, direct-message inbox/thread reads, and thread extraction
  - run native `x.com` compose/post
  - run native `x.com` open-post, profile read/follow, direct-message send, reply, like, and repost flows
  - record bounded per-session network request/response/error history
  - record bounded per-session DOM mutation history
  - record bounded per-session command/session event history
  - support generic wait-url/wait-selector/wait-no-selector/wait-text polling via repeated snapshots and inspection
  - expose live websocket streams for tab-state changes, snapshot changes, screenshot frames, bounded session events, bounded network events, and bounded DOM mutation events
  - push live session/tab/snapshot state back to Sidofun between heartbeats to reduce stale browserext session metadata

Build:

```bash
bun run build:browserext
```

Load in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked:
   `<sidofun-folder>\providers\browser-extension`

Current limitation:

- this provider is still intentionally thin
- network observation is bounded history, not a true streaming event API yet
- DOM mutation observation is also bounded history, not a push-native event bus yet
- only focused `x.com`, `chatgpt.com`, and `deepseek.com` site-module slices exist so far
