# Tutorial: validate an upstream response in a Forge function

This tutorial builds a small [Forge function](https://developer.atlassian.com/platform/forge/runtime-reference/fetch-api-basic/) that fetches configuration, converts upstream failures into typed RFC 9457 Problem Details, and handles either outcome without throwing.

## Before you begin

Use Node.js 22 or newer, install this repository's dependencies, and make `@forge-ahead/errors` available to the Forge app that contains the function.

## 1. Define the successful value

Create a `configuration.ts` module in the Forge app:

```ts
import {
  ResultAsync,
  toProblemDetails,
  validateHttpResponse,
  type ProblemDetails,
} from "@forge-ahead/errors";

type Configuration = {
  enabled: boolean;
};
```

`Configuration` is the value the function will produce when the upstream request succeeds.

## 2. Fetch and validate the response

Add a function that returns a `ResultAsync` rather than throwing for an HTTP error:

```ts
export function loadConfiguration(): ResultAsync<
  Configuration,
  ProblemDetails
> {
  return ResultAsync.fromPromise(
    fetch("https://example.test/configuration"),
    (error) => toProblemDetails(error, 502, "request configuration"),
  )
    .andThen((response) =>
      validateHttpResponse(response, "load configuration"),
    )
    .andThen((response) =>
      ResultAsync.fromPromise(
        response.json() as Promise<Configuration>,
        (error) => toProblemDetails(error, 502, "decode configuration"),
      ),
    );
}
```

A non-OK upstream response now becomes `Err<ProblemDetails>`. Its HTTP status and status text are retained, and the captured upstream response body is limited to 8 KiB by default.

## 3. Consume both outcomes at the Forge boundary

Use `match()` in the function that decides the Forge-visible result:

```ts
export async function getConfiguration() {
  const result = await loadConfiguration();

  return result.match(
    (configuration) => ({ ok: true, configuration }),
    (problem) => ({ ok: false, problem }),
  );
}
```

The caller receives an explicit object for either result. It does not need to infer a failure from an exception or an omitted return value.

## 4. Verify the behavior

Temporarily change the URL to an endpoint that returns a non-2xx status. The error branch receives a `ProblemDetails` value with the upstream status, title, and bounded body detail. Restore the valid endpoint and confirm that the success branch receives parsed configuration.

## What you built

The function now has one typed outcome for usable configuration and one typed outcome for an operational failure. This fits Forge functions well because resolver and bridge invocations can return values or `void`; returning an explicit success-or-problem payload keeps the application contract visible. For Forge resolver wiring, see the [Forge resolver documentation](https://developer.atlassian.com/platform/forge/runtime-reference/forge-resolver/).
