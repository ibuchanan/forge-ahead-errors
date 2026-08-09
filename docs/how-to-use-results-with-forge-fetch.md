# How to use Results with Forge internal and external fetches

Use this pattern when a [Forge function](https://developer.atlassian.com/platform/forge/runtime-reference/fetch-api/) must call an [Atlassian product REST API](https://developer.atlassian.com/platform/forge/apis-reference/product-rest-api-reference/) and a third-party API while exposing the same typed success-or-failure contract to the rest of the application.

Internal Atlassian requests use Forge product API methods such as `requestJira`; third-party requests use [Forge fetch](https://developer.atlassian.com/platform/forge/runtime-reference/fetch-api-basic/) and require a [backend egress declaration](https://developer.atlassian.com/platform/forge/runtime-egress-permissions/). Both return fetch-compatible responses, so `validateHttpResponse` can normalize their non-success responses consistently.

## Add the required Forge permissions

Declare the product scope required by the internal REST operation and the external domain used by the third-party API:

```yaml
permissions:
  scopes:
    - read:jira-work
  external:
    fetch:
      backend:
        - https://api.example.com
```

`read:jira-work` supports the Jira issue-read example below. Check the REST operation’s **OAuth scopes required** field and use the exact scopes for the product APIs that the app calls; [Forge scopes](https://developer.atlassian.com/platform/forge/manifest-reference/scopes-forge/) describes that permission model.

The external backend declaration permits Forge functions, including [Custom UI resolvers](https://developer.atlassian.com/platform/forge/runtime-reference/forge-resolver/), to contact that domain. Forge rejects calls to undeclared external domains. [Runtime egress permissions](https://developer.atlassian.com/platform/forge/runtime-egress-permissions/) documents the internal-redirect exception.

## Build one JSON-fetch adapter

Wrap both transport exceptions and non-OK HTTP responses in `ProblemDetails`:

```ts
import {
  ResultAsync,
  toProblemDetails,
  validateHttpResponse,
  type HttpLikeResponse,
  type ProblemDetails,
} from "@forge-ahead/errors";

function fetchJson<T>(
  request: () => Promise<HttpLikeResponse>,
  context: string,
): ResultAsync<T, ProblemDetails> {
  return ResultAsync.fromPromise(
    request(),
    (error) => toProblemDetails(error, 502, context),
  )
    .andThen((response) => validateHttpResponse(response, context))
    .andThen((response) =>
      ResultAsync.fromPromise(
        response.text().then((body) => JSON.parse(body) as T),
        (error) => toProblemDetails(error, 502, `decode ${context}`),
      ),
    );
}
```

A rejected request becomes a 502 Problem Details value with the supplied context. A completed request with a non-OK HTTP response instead retains the response’s status and status text; diagnostic body detail is bounded to 8 KiB by default.

## Call a Jira REST API with `requestJira`

Use [`api.asApp().requestJira`](https://developer.atlassian.com/platform/forge/apis-reference/product-rest-api-reference/) for work performed with the app identity:

```ts
import api, { route } from "@forge/api";

type JiraIssue = {
  id: string;
  key: string;
  fields: {
    summary: string;
  };
};

export function getIssue(
  issueKey: string,
): ResultAsync<JiraIssue, ProblemDetails> {
  return fetchJson(
    () =>
      api
        .asApp()
        .requestJira(
          route`/rest/api/3/issue/${issueKey}?fields=summary`,
        ),
    `read Jira issue ${issueKey}`,
  );
}
```

Use [`api.asUser().requestJira`](https://developer.atlassian.com/platform/forge/apis-reference/product-rest-api-reference/) when the operation must run with the current user’s identity and that operation supports user authentication. Unsupported `asUser()` operations return HTTP 401; the adapter preserves that response as Problem Details.

## Call a third-party API with Forge fetch

Use Forge’s `fetch` export for an HTTPS endpoint listed in `permissions.external.fetch.backend`:

```ts
import { fetch } from "@forge/api";

type ExchangeRate = {
  base: string;
  quote: string;
  rate: number;
};

export function getExchangeRate(): ResultAsync<
  ExchangeRate,
  ProblemDetails
> {
  return fetchJson(
    () => fetch("https://api.example.com/v1/rates/USD/EUR"),
    "read exchange rate",
  );
}
```

For an OAuth 2.0-protected third-party API, obtain the authenticated request through [Forge external authentication](https://developer.atlassian.com/platform/forge/runtime-reference/external-fetch-api/) before passing it to the same adapter. The `Result` contract remains unchanged.

## Consume either request at a Forge boundary

Return an explicit success-or-problem value from a [Forge resolver](https://developer.atlassian.com/platform/forge/runtime-reference/forge-resolver/) or another boundary function:

```ts
export async function getIssueForUi(issueKey: string) {
  const result = await getIssue(issueKey);

  return result.match(
    (issue) => ({ ok: true, issue }),
    (problem) => ({ ok: false, problem }),
  );
}
```

This distinguishes a usable response from an expected operational failure without relying on a thrown exception or a missing return value.

## Use the correct Forge reference

- [Atlassian app REST APIs](https://developer.atlassian.com/platform/forge/apis-reference/product-rest-api-reference/) covers `requestJira`, `requestConfluence`, `requestBitbucket`, and `requestGraph`.
- [Forge scopes](https://developer.atlassian.com/platform/forge/manifest-reference/scopes-forge/) identifies the scope model; individual REST operations list their required scopes.
- [Runtime egress permissions](https://developer.atlassian.com/platform/forge/runtime-egress-permissions/) and the [manifest permissions reference](https://developer.atlassian.com/platform/forge/manifest-reference/permissions/) cover external backend declarations.
