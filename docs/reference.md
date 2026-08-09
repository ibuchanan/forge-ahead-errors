# API reference

`@forge-ahead/errors` is a Node.js 22+ TypeScript package that exposes ESM and CommonJS entrypoints.

## Result exports

The package re-exports these `neverthrow` symbols:

| Export | Description |
| --- | --- |
| `ok`, `err` | Create synchronous `Result` values. |
| `okAsync`, `errAsync` | Create `ResultAsync` values. |
| `Result`, `ResultAsync` | Synchronous and asynchronous result types. |
| `fromThrowable`, `fromAsyncThrowable` | Convert throwing functions to result-producing functions. |
| `fromPromise`, `fromSafePromise` | Convert promises to result values. |
| `safeTry` | Compose result-returning generators. |

## Problem Details types

### `ProblemDetails`

RFC 9457-compatible problem document shape.

| Property | Type | Required |
| --- | --- | --- |
| `type` | `string` | No |
| `title` | `string` | No |
| `status` | `number` | No |
| `detail` | `string` | No |
| `instance` | `string` | No |
| `timestamp` | `string` | No |
| extension member | `unknown` | No |

### `StandardProblemDetails`

Package-generated Problem Details. `type`, `title`, `status`, `detail`, and `timestamp` are required.

### `ValidationError`

A field-level error.

| Property | Type |
| --- | --- |
| `field` | `string` |
| `reason` | `string` |
| `message` | `string` |

### `ValidationProblemDetails`

A `ProblemDetails` value with a required `errors: ValidationError[]` member.

## `StandardError`

`StandardError` associates an HTTP status with a title and produces `Result<never, StandardProblemDetails>` values.

| Member | Signature | Behavior |
| --- | --- | --- |
| constructor | `new StandardError(status, title)` | Creates an immutable status/title pair. |
| `status` | `number` | HTTP status associated with the instance. |
| `title` | `string` | Human-readable title associated with the instance. |
| `type` | `string` getter | `https://httpstatuses.io/{status}`. |
| `error` | `(message, timestamp?, instance?) => Result<never, StandardProblemDetails>` | Produces an error result with a current ISO-8601 timestamp when none is supplied. |
| `add` | `(status, title) => void` | Registers or replaces a status/title pair. |
| `getOrDefault` | `(statusCode) => StandardError` | Returns a registered entry or the 500 entry. |
| `types` | `ReadonlyMap<number, StandardError>` getter | Returns an isolated snapshot of the registry. |
| `toExitCode` | `(statusCode) => number` | Returns `1` for every input. |

The registry contains the package’s supported IANA 4xx and 5xx statuses. Status 418 is not pre-registered. `getOrDefault(418)` returns the 500 entry, while a directly constructed `new StandardError(418, "I'm a teapot")` retains 418.

## Conversion helpers

| Export | Signature | Behavior |
| --- | --- | --- |
| `isProblemDetails` | `(error: unknown) => error is ProblemDetails` | Returns true when at least one standard member is present and all present standard members have valid primitive types. |
| `toErrorMessage` | `(error: unknown) => string` | Selects Problem Details detail/title, `Error.message`, a non-empty string, or a safe fallback. |
| `toProblemDetails` | `(error: unknown, status?: number, context?: string) => ProblemDetails` | Passes through Problem Details; otherwise creates a standard problem using fallback status 500 and optional context. |
| `problemResult` | `<T = never>(error: unknown, status?: number, context?: string) => Result<T, ProblemDetails>` | Wraps `toProblemDetails` in an error result. |
| `problemDetails` | `(status: number, message: string, timestamp?: string, instance?: string) => StandardProblemDetails` | Produces an unwrapped package-generated problem document. |

## HTTP response validation

### `HttpLikeResponse`

Fetch-compatible response contract accepted by `validateHttpResponse`.

| Member | Type |
| --- | --- |
| `ok` | `boolean` |
| `status` | `number` |
| `statusText` | `string` |
| `body` | Optional readable body with `getReader()` |
| `text` | `() => Promise<string>` |

### `ValidateHttpResponseOptions`

| Property | Type | Default | Constraint |
| --- | --- | --- | --- |
| `maxErrorBodyBytes` | `number` | `8192` | Positive safe integer. |

### `validateHttpResponse`

```ts
function validateHttpResponse<T extends HttpLikeResponse>(
  response: T,
  context: string,
  status?: number,
  options?: ValidateHttpResponseOptions,
): ResultAsync<T, ProblemDetails>;
```

An `ok` response produces `Ok<T>`. A non-OK response produces a Problem Details error using the response’s actual status and status text. A readable error body is consumed up to the configured byte limit and cancelled when additional data remains. Errors while reading an error body use fallback status 502 unless `status` is supplied.

## `ShellExitCodes`

`ShellExitCodes` is a `Map<number, string>` documenting common shell exit-code meanings. It is descriptive data; it does not perform process termination.
