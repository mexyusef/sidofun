# Contributing

Sidofun is currently Windows-only. Keep changes aligned with that scope unless
the repository explicitly expands platform support later.

## Development Setup

Requirements:
- Bun
- Python 3.9+
- Windows

Install dependencies:

```powershell
bun install
cd python
python -m pip install -e .[dev]
cd ..
```

Build the IPC backend when needed:

```powershell
bun run build:ipc
```

## Verification

Run the maintained TypeScript test suite:

```powershell
bun run test
```

Run Python tests:

```powershell
bun run test:python
```

Do not rely on raw `bun test` at repo root. The maintained test command is
`bun run test`, which targets the active Sidofun test suite and excludes
legacy code.

## Change Guidelines

- Prefer small, focused pull requests.
- Keep public APIs stable for agent/LLM consumers where possible.
- Update docs when behavior changes.
- Add or update tests for new commands, wrappers, or transport behavior.
- Do not commit local scratch files, screenshots, caches, or generated
  artifacts unless the change is explicitly about those assets.
