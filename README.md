# @forge-ahead/errors

<!-- cspell:words neverthrow -->

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

Typed TypeScript error helpers for Forge Ahead packages. It combines [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) with [`neverthrow`](https://github.com/supermacro/neverthrow) `Result` values, so callers can return structured failures instead of relying on thrown exceptions.

The package targets Node.js 22 or newer and ships both ESM and CommonJS entrypoints. It is currently marked private in `package.json`, so it is not published to the public npm registry.

## When to use it

Use this package when a function should make failure explicit in its return type—for example, a [Forge resolver](https://developer.atlassian.com/platform/forge/runtime-reference/forge-resolver/), [web trigger](https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger/), [scheduled trigger](https://developer.atlassian.com/platform/forge/function-reference/scheduled-trigger/), [async-event handler](https://developer.atlassian.com/platform/forge/runtime-reference/async-events-api/), or HTTP client wrapper.

It provides:

- RFC 9457-compatible `ProblemDetails` types, including extension fields and field-validation errors.
- `StandardError` for consistent HTTP status, title, type, timestamp, and detail values.
- `problemDetails`, `toProblemDetails`, and `problemResult` to normalize unknown failures.
- `validateHttpResponse` to preserve non-success upstream HTTP responses as a `ResultAsync`, while limiting captured response-body detail.
- Re-exports of commonly used `neverthrow` helpers, including `ok`, `err`, `Result`, `ResultAsync`, and `safeTry`.

## Install or use locally

Install the repository dependencies with Node.js 22 and npm:

```sh
npm ci
```

Because the package is private, consume it from a local checkout or workspace that can resolve `@forge-ahead/errors`; do not expect `npm install @forge-ahead/errors` to retrieve it from the public npm registry.

## Usage

Create a typed failure for an expected domain condition and handle it with `Result.match()`:

```ts
import {
  ok,
  StandardError,
  type ProblemDetails,
  type Result,
} from "@forge-ahead/errors";

export function requireManifestPath(
  path?: string,
): Result<string, ProblemDetails> {
  if (!path) {
    return StandardError.getOrDefault(404).error("manifest.yml not found");
  }

  return ok(path);
}

requireManifestPath(undefined).match(
  (path) => console.log(path),
  (problem) => console.error(problem.status, problem.detail),
);
```

For an HTTP response, preserve the upstream status and title while keeping error-body retention bounded to 8 KiB by default:

```ts
import { validateHttpResponse } from "@forge-ahead/errors";

const response = await fetch("https://example.test/config");
const result = await validateHttpResponse(response, "fetch configuration");

result.match(
  (validResponse) => validResponse.json(),
  (problem) => console.error(problem.status, problem.detail),
);
```

Pass `maxErrorBodyBytes` to `validateHttpResponse` when a different maximum is appropriate. The value must be a positive safe integer.

## Verify the checkout

```sh
npm run check
```

This formats-checks, lints, type-checks, tests, and builds the package.

## Documentation

The Diátaxis documentation set is available in [`docs/`](docs/):

- [Tutorial: validate an upstream response in a Forge function](docs/tutorial-validate-upstream-responses.md)
- [How-to: return Problem Details from a Forge web trigger](docs/how-to-return-problem-details-from-a-web-trigger.md)
- [How-to: use Results with Forge internal and external fetches](docs/how-to-use-results-with-forge-fetch.md)
- [API reference](docs/reference.md)
- [Explanation: typed errors at Forge boundaries](docs/explanation-typed-errors-at-forge-boundaries.md)

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for the local development loop, scripts, project layout, hooks, and release workflow.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for contribution guidance.

## License

Apache-2.0. See [LICENSE](LICENSE).
