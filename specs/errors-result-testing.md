# Mini-Spec: `@forge-ahead/errors` — Result test helpers

## Context

`@forge-ahead/errors` is a thin, stable facade over `neverthrow`. Projects that
adopt it end up with `Result<T, E>` values in almost every unit test, but the
package today does not provide any test assertion helpers.

In the Supplychain Graph project, every `.test.ts` file redefines the same
small helper:

```typescript
function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);

  if (result.isErr()) {
    expect.unreachable(
      `Expected success, received ${JSON.stringify(result.error)}`,
    );
  }

  return result.value;
}
```

This is a clear, low-risk upstream candidate that multiple Forge Ahead
projects can reuse.

## Problem

- Test authors copy/paste `expectOk` (and often a similar `expectErr`) into
  every test file.
- Slight inconsistencies appear between files (different error messages,
  missing `expectErr`, etc.).
- The helper relies on Vitest-specific `expect.unreachable`, which is not
  portable to other test runners.

## Goal

Add a small, optional, test-runner-agnostic assertion helper for `Result` that:

1. Works with Vitest out of the box.
2. Does not require `expect.unreachable` or other Vitest-only APIs.
3. Can be extended later for Jest/Mocha/etc. without breaking the API.
4. Keeps the public surface tiny.

## Proposed API

### Subpath export

```typescript
import { expectOk, expectErr } from "@forge-ahead/errors/testing";
```

### Helpers

```typescript
import type { Result } from "@forge-ahead/errors";

export function expectOk<T, E>(result: Result<T, E>): T;

export function expectErr<T, E>(result: Result<T, E>): E;
```

### Behavior

- `expectOk(result)`
  - Asserts `result.isOk() === true`.
  - If the result is an error, fails the test with a message that includes
    `JSON.stringify(result.error)`.
  - Returns `result.value` narrowed to `T`.

- `expectErr(result)`
  - Asserts `result.isErr() === true`.
  - If the result is a success, fails the test with a message that includes
    `JSON.stringify(result.value)`.
  - Returns `result.error` narrowed to `E`.

### Implementation sketch

Use standard `expect(...).toBe(true)` for the assertion, then cast. The
compiler's narrowing is enough once the assertion has failed on the opposite
branch.

```typescript
export function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);
  return result.value as T;
}

export function expectErr<T, E>(result: Result<T, E>): E {
  expect(result.isErr()).toBe(true);
  return result.error as E;
}
```

The cast is safe because the `expect(...).toBe(true)` assertion will throw
before the cast is evaluated on a mismatch.

## Acceptance criteria

- [ ] A new `src/testing.ts` file is added to `@forge-ahead/errors`.
- [ ] `package.json` exports the subpath `@forge-ahead/errors/testing` for both
      `import` and `require` consumers.
- [ ] `expectOk` and `expectErr` are exported and typed correctly.
- [ ] Unit tests cover:
      - successful `expectOk` returns the value;
      - failed `expectOk` produces a readable failure message containing the
        error;
      - successful `expectErr` returns the error;
      - failed `expectErr` produces a readable failure message containing the
        value.
- [ ] `npm run check` passes (format, lint, typecheck, tests, build).
- [ ] The new export is included in the package's `files` list.

## Usage example

```typescript
import { describe, expect, it } from "vitest";
import { expectOk } from "@forge-ahead/errors/testing";

import { applyPublicationCommand } from "../src/publication/apply-command";

describe("applyPublicationCommand", () => {
  it("queues a candidate", () => {
    const result = expectOk(
      applyPublicationCommand(state, command),
    );

    expect(result.decision.state).toBe("queued");
  });
});
```

## Non-goals

- Do not add matchers (e.g. `expect(result).toBeOk()`). They are more powerful
  but require test-runner-specific plugins.
- Do not add async variants. Callers can `await` the `Promise<Result<T, E>>`
  first and then call `expectOk(expectErr(result))`.
- Do not attempt to support non-Vitest runners in this increment.

## Dependencies

- Uses the existing `Result<T, E>` type from `@forge-ahead/errors`.
- Peer-depends on the consuming project's test runner (Vitest in our repos).

## Risks / open questions

- Should the failure message be a plain `Error` thrown by the helper, or rely on
  `expect(...).toBe(true)`? Relying on `expect` is consistent with the project's
  test style and gives the best Vitest output.
- Should the helpers be named `expectOk` / `expectErr` or `unwrapOk` /
  `unwrapErr`? `expectOk` / `expectErr` is more idiomatic for test assertions.
