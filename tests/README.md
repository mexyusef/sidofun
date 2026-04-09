# Tests

This directory contains non-production verification assets for `desktop-win`.

## Layout

- `*.test.ts`: automated Bun test suite for shared core, transports, and adapters
- `manual/`: ad hoc smoke scripts, demos, and operator-driven checks

These scripts are useful during development, but they are not part of an
automated CI test suite.

For real-machine verification of the current backend surfaces, see
[`docs/smoke-tests.md`](../docs/smoke-tests.md).
