# How to return Problem Details from a Forge web trigger

Use this pattern
when a [Forge web trigger](https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger/)
must return a valid HTTP response
for expected validation or domain failures.

Forge web-trigger handlers must return a response object containing `statusCode`;
an incompatible handler result is converted by Forge into a 500 response.
The response body is a string and header values are arrays of strings.
See the [Forge web-trigger event reference](https://developer.atlassian.com/platform/forge/events-reference/web-trigger/).

## Build a Problem Details response adapter

```ts
import {
  toProblemDetails,
  validateHttpResponse,
  type ProblemDetails,
} from "@forge-ahead/errors";

type WebTriggerResponse = {
  statusCode: number;
  statusText: string;
  headers: Record<string, string[]>;
  body: string;
};

function problemResponse(problem: ProblemDetails): WebTriggerResponse {
  return {
    statusCode: problem.status ?? 500,
    statusText: problem.title ?? "Internal Server Error",
    headers: {
      "Content-Type": ["application/problem+json"],
    },
    body: JSON.stringify(problem),
  };
}
```

## Map expected failures to a response

Convert malformed input into a 400 Problem Details response at the handler boundary:

```ts
export async function trigger(request: {
  body?: string;
  method: string;
}): Promise<WebTriggerResponse> {
  if (request.method !== "POST") {
    return problemResponse(toProblemDetails("Only POST is supported", 405));
  }

  try {
    const input = JSON.parse(request.body ?? "{}");
    const widget = await createWidget(input);

    return {
      statusCode: 201,
      statusText: "Created",
      headers: { "Content-Type": ["application/json"] },
      body: JSON.stringify(widget),
    };
  } catch (error) {
    return problemResponse(toProblemDetails(error, 400, "create widget"));
  }
}
```

`toProblemDetails` leaves a value that is already shaped like Problem Details unchanged.
Other thrown values become a package-generated value using the supplied fallback status and context.

## Preserve an upstream HTTP failure

When the web trigger calls an upstream HTTP service,
use `validateHttpResponse` before decoding its body:

```ts
const response = await fetch("https://example.test/widgets");
const result = await validateHttpResponse(response, "create widget");

return result.match(
  async (upstreamResponse) => ({
    statusCode: 201,
    statusText: "Created",
    headers: { "Content-Type": ["application/json"] },
    body: JSON.stringify(await upstreamResponse.json()),
  }),
  problemResponse,
);
```

This preserves the upstream status and status text in the emitted Problem Details.
By default, diagnostic body detail is capped at 8 KiB;
pass `{ maxErrorBodyBytes }`
when a different positive safe-integer limit is needed.

## Keep authentication separate

Forge does not authenticate web-trigger URLs.
Authenticate incoming requests according to the calling system’s scheme
before performing protected work.
The [Forge web-trigger documentation](https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger/)
describes this platform behavior.
