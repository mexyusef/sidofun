# Browser Page Semantic Primitives

## Goal

Make standalone browser runtime/page automation usable from the CLI without forcing the operator to discover CSS selectors first.

The target UX is:

```bash
sidofun browser runtime list --json
sidofun browser runtime open-tab <runtime-id> https://site.example/login --json
sidofun browser page list --runtime <runtime-id> --json
sidofun browser page form-workflow <page-id> --field "Email=aaa" --field "Password=bbb" --submit-query Submit --json
```

## Design Principles

1. Keep selectors available as the low-level escape hatch.
2. Add semantic query primitives as the maintained operator-facing path.
3. Reuse the browserext mental model where possible: `locate`, `click-query`, `fill-query`, `form-workflow`.
4. Keep the standalone page path runtime/page-oriented and lightweight. Do not copy the whole browserext surface.
5. Prefer in-page candidate scoring over brittle hardcoded site rules.

## Architecture

### Service

Add a dedicated `BrowserPageQueryService` that depends on a narrow page driver:

- `getPage(pageId)`
- `evaluate(pageId, expression)`
- `waitFor(pageId, waitFor, query, timeoutMs)`

The service owns:

- semantic element discovery
- field filling by query
- button/link clicking by query
- form submission heuristics
- text waits
- one-shot form workflows

### Query Model

The semantic locator operates on:

- `field`
- `button`
- `link`
- `any`

It scores candidates using:

- associated label text
- visible text
- placeholder
- `aria-label`
- `title`
- `name`
- `id`
- button `value`

### CLI Surface

Standalone maintained commands:

- `sidofun browser page locate <page-id> <query>`
- `sidofun browser page fill-query <page-id> <query> <value>`
- `sidofun browser page click-query <page-id> <query>`
- `sidofun browser page submit <page-id> [query]`
- `sidofun browser page wait-text <page-id> <text>`
- `sidofun browser page form-workflow <page-id> --field "<query>=<value>"`

### Performance Notes

- Evaluate a bounded semantic locator script in-page instead of doing repeated round trips for every candidate.
- Build a stable selector only for matched candidates, not for the whole DOM.
- Fail fast from Playwright CDP attach and fall back quickly to direct CDP.

## Intended Evolution

This first slice should stay generic and site-agnostic.

Future layers can add:

- `login` and `signup` command macros
- per-site strategies
- saved workflow files
- richer context/form grouping
