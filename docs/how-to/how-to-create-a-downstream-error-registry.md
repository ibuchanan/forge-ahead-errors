# How to create a downstream error registry

Create an app-owned problem catalog when a CLI, JSON-RPC server, or other consumer needs stable errors without changing the package's shared HTTP registry. Keep the definitions in your application and project them into each transport at its boundary.

## Register application errors

Choose a base URI and distinct integer codes for the errors your application exposes. For JSON-RPC application errors, use codes outside the protocol's predefined and reserved ranges; the negative codes below are examples of an application-owned range.

```ts
// problems.ts
import { createProblemCatalog } from "@forge-ahead/errors";

export const problems = createProblemCatalog("https://example.com/problems", {
  "invalid-input": { title: "Invalid input", code: -33001 },
  "resource-missing": { title: "Resource missing", code: -33002 },
});
```

Keep these definitions separate from `StandardError.add()`, which changes the package's shared HTTP status registry. The catalog rejects duplicate codes and resolved type URIs when it is created.

## Produce a problem from a registered definition

Look up an entry by its name, check the lookup, and create a problem with a per-occurrence detail:

```ts
// operation.ts
import {
  err,
  ok,
  type DomainProblemDetails,
  type Result,
} from "@forge-ahead/errors";
import { problems } from "./problems";

const missing = problems.get("resource-missing");
if (!missing) throw new Error("Missing resource-missing definition");

export function findResource(id: string): Result<string, DomainProblemDetails> {
  return id === "known"
    ? ok("Resource")
    : err(missing.create(`No resource with id ${id}`));
}
```

The resulting problem carries the registered `type`, `title`, and `code` along with the occurrence's `detail` and `timestamp`. Add `status` to a catalog entry only if the application needs an HTTP status.

## Map the problem to a CLI exit code

At the CLI boundary, decide which exit statuses your command uses. Do not pass a negative application code to `process.exitCode`; exit statuses and problem codes are separate values.

```ts
// cli.ts
import { findResource } from "./operation";

const result = findResource(process.argv[2] ?? "");
result.match(
  (resource) => console.log(resource),
  (problem) => {
    console.error(problem.detail);
    process.exitCode = problem.code === -33002 ? 3 : 1;
  },
);
```

Adjust the mapping to your CLI's documented exit-status policy. `StandardError.toExitCode()` always returns `1`; it does not map application codes.

## Map the problem to a JSON-RPC error

At the JSON-RPC boundary, put the registered integer in `error.code` and the human-readable title in `error.message`. Keep the problem details in `error.data` if clients need them:

```ts
// json-rpc.ts
import {
  isProblemDetailsWithCode,
  type DomainProblemDetails,
} from "@forge-ahead/errors";
import { findResource } from "./operation";

export function toJsonRpcError(
  problem: DomainProblemDetails,
  id: string | number | null,
) {
  if (!isProblemDetailsWithCode(problem)) {
    throw new Error("JSON-RPC error requires a safe integer code");
  }

  return {
    jsonrpc: "2.0" as const,
    id,
    error: {
      code: problem.code,
      message: problem.title,
      data: { type: problem.type, detail: problem.detail },
    },
  };
}

const result = findResource("unknown");
if (result.isErr()) {
  const response = toJsonRpcError(result.error, 7);
  // Send response through your JSON-RPC transport.
}
```

This response has `error.code: -33002` and `id: 7`. Pass the request's ID through at the boundary; handle protocol-level parse and invalid-request errors separately from this application catalog.

For a domain-layer `Result` example, see [How to define domain problems and codes](how-to-define-domain-problems.md).
