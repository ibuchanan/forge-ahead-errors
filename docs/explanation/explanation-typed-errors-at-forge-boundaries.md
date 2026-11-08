# Explanation: typed errors at Forge boundaries

Forge applications cross several boundaries
that do not share a single failure convention.
Application code uses TypeScript values,
HTTP services communicate with status codes and bodies,
[resolvers](https://developer.atlassian.com/platform/forge/runtime-reference/forge-resolver/)
return values to a [UI bridge](https://developer.atlassian.com/platform/forge/custom-ui-bridge/invoke/),
[web triggers](https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger/)
produce HTTP responses,
and [asynchronous work](https://developer.atlassian.com/platform/forge/runtime-reference/async-events-api/)
has retry semantics.
`@forge-ahead/errors` supplies one internal vocabulary for those boundaries:
`Result<T, ProblemDetails>`.

## Results make failure part of the contract

A thrown exception has an implicit type-level contract:
any expression might throw any value.
A `Result<T, ProblemDetails>` makes the alternative explicit.
The successful path contains `T`;
the failure path contains a structured document
with an HTTP-oriented status, title, detail, type, optional instance, and extension fields.

This is not an argument against exceptions in every situation.
Runtime failures still occur,
and third-party APIs still throw.
The package’s conversion helpers exist
precisely because application boundaries must normalize those unknown values.
The important design choice is
that the normalized result is visible to the caller
rather than being left as control flow.

## Why Problem Details is the shared error shape

RFC 9457 defines a portable problem-document format for HTTP APIs.
Its standard members support both people and programs:
`title` gives a short summary,
`status` corresponds to the HTTP status,
`detail` gives event-specific context,
`type` identifies the class of problem,
and `instance` can identify a particular occurrence.

Using that shape internally is useful
even before an error becomes an HTTP response.
A resolver can return it to a UI,
a command can log it,
and a web trigger can serialize it as `application/problem+json`.
Extension fields allow application-specific data
without requiring each consumer to adopt a different error class hierarchy.

## Forge makes boundary contracts consequential

Forge resolvers are backend functions invoked through the Forge bridge.
The documented resolver callback signature permits object, string, promise, or `void` results,
and the bridge invocation similarly resolves to an object or `void`.
That flexibility is useful,
but it means an absent value and an unmodeled failure
can be indistinguishable in a broad application contract.
A typed success-or-problem value supplies the distinction deliberately.
See the [Forge resolver](https://developer.atlassian.com/platform/forge/runtime-reference/forge-resolver/)
and [bridge invoke](https://developer.atlassian.com/platform/forge/custom-ui-bridge/invoke/) documentation.

Web triggers sit on a different boundary.
Forge forms the HTTP response from the handler’s return object
and sends a 500 response
when that result is incompatible with the required shape.
A Problem Details adapter is
therefore a deliberate translation
from an application result
into a valid HTTP response;
it is not merely an error-formatting preference.
The [web-trigger event reference](https://developer.atlassian.com/platform/forge/events-reference/web-trigger/)
defines that response contract.

Async events have yet another meaning for failure.
Forge retries failed asynchronous event delivery within a retention window,
and a handler can request a retry by returning `InvocationError`.
An operational upstream failure might therefore need two representations:
Problem Details for diagnostics
and an `InvocationError` for retry control.
The package does not replace Forge retry policy;
it helps preserve the diagnostic information that informs that policy.
The [Async Events API](https://developer.atlassian.com/platform/forge/runtime-reference/async-events-api/)
documents retries and `InvocationError`.

## HTTP normalization protects both context and resources

An upstream non-OK response contains valuable diagnostics,
but blindly copying its body into an error object can be expensive or unsafe.
`validateHttpResponse` preserves the actual upstream status and status text
and retains a limited amount of response-body detail.
For readable bodies,
it stops reading and cancels the stream
when the configured byte limit is reached.
The default is 8 KiB.

That behavior reflects a trade-off.
Enough upstream context usually makes an incident diagnosable,
while a hard limit prevents one error response from becoming unbounded memory or log payload.
The fallback status for body-reading failures is separate
because an inability to read diagnostics is
not necessarily the same failure as the upstream response itself.

## Registry snapshots protect shared behavior

`StandardError` contains a registry of conventional HTTP error titles.
The `types` getter returns a snapshot rather than the mutable internal map.
This keeps inspection convenient
while preventing accidental mutations from changing
how unrelated calls construct errors.
Explicit `add()` calls remain the mechanism for intended registration changes.

The same separation appears throughout the package:
normalize unknown failures at the edge,
retain structured context,
and make the value that crosses the next boundary explicit.
