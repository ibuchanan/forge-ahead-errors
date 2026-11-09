# @forge-ahead/errors

<!-- cspell:words neverthrow -->

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

Typed TypeScript error helpers for Forge Ahead packages. Combine [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) with [`neverthrow`](https://github.com/supermacro/neverthrow) `Result` values to return structured failures explicitly instead of relying on exceptions.

Use this library for expected domain failures or HTTP boundary errors in Forge functions, CLIs, and other Node.js consumers. It is not an exception-handling framework or a Forge app. It targets Node.js 22 or newer and ships ESM and CommonJS entrypoints. **This package is private:** it is not available from the public npm registry.

## Get started

In a checkout with Node.js 22 and npm, install dependencies and run the verification suite:

```sh
npm ci
npm run check
```

`npm ci` builds the package through its `prepare` script. `npm run check` runs formatting, lint, typechecking, tests, a build, and an npm package dry run. To consume the package from another project, make this checkout available as a local or workspace dependency that resolves `@forge-ahead/errors`; `npm install @forge-ahead/errors` will not fetch it from the public registry.

## Use a typed failure

Once your project resolves the package, create an expected error and handle both outcomes:

```ts
import {
  ok,
  StandardError,
  type ProblemDetails,
  type Result,
} from "@forge-ahead/errors";

function requireManifestPath(path?: string): Result<string, ProblemDetails> {
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

`StandardError` provides conventional HTTP errors. For your own stable problem types and codes (including CLI or JSON-RPC errors), create a separate application catalog rather than changing the shared HTTP registry. See [How to create a downstream error registry](docs/how-to/how-to-create-a-downstream-error-registry.md).

## Choose your next step

- **Learn by doing:** [validate an upstream response in a Forge function](docs/tutorial/tutorial-validate-upstream-responses.md).
- **Solve a task:** [return Problem Details from a web trigger](docs/how-to/how-to-return-problem-details-from-a-web-trigger.md), [define domain problems and codes](docs/how-to/how-to-define-domain-problems.md), or [use Results with Forge fetches](docs/how-to/how-to-use-results-with-forge-fetch.md).
- **Look up the API:** [API reference](docs/reference/reference.md), including `validateHttpResponse`, `StandardError`, Problem Details types, and the `@forge-ahead/errors/testing` helpers.
- **Understand the design:** [typed errors at Forge boundaries](docs/explanation/explanation-typed-errors-at-forge-boundaries.md).

## Develop and contribute

See [DEVELOPMENT.md](DEVELOPMENT.md) for the local development loop, code layout, builds, tests, and releases. Contributions and issue reports are welcome through this repository; see [CONTRIBUTING.md](CONTRIBUTING.md) for pull request guidance and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations.

## License

Apache-2.0. See [LICENSE](LICENSE).
