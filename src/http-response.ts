/**
 * HTTP response validation and adaptation to Problem Details.
 *
 * Converts fetch-like HTTP responses into neverthrow ResultAsync values,
 * bounded by configurable error-body limits.
 */

import { errAsync, fromPromise, okAsync, type ResultAsync } from "neverthrow";
import type { ProblemDetails } from "./problem-details";
import { StandardError, toProblemDetails } from "./problem-details";

interface HttpLikeBodyReader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
  cancel(reason?: unknown): Promise<void>;
}

/**
 * Minimal shape shared by the Web Fetch API `Response` and other
 * fetch-like response types (e.g. platform-specific `fetch` wrappers),
 * covering the methods needed to validate and read an HTTP response.
 */
export interface HttpLikeResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body?: { getReader(): HttpLikeBodyReader } | null;
  text(): Promise<string>;
}

/**
 * Controls how much upstream error-body content can be included in a
 * generated Problem Details response.
 */
export interface ValidateHttpResponseOptions {
  /** Maximum UTF-8 bytes retained from an upstream error body. Defaults to 8 KiB. */
  maxErrorBodyBytes?: number;
}

const DEFAULT_MAX_ERROR_BODY_BYTES = 8 * 1024;
const TRUNCATED_ERROR_BODY_SUFFIX = "… [truncated]";

function truncateErrorBody(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  let truncated = "";
  let bytes = 0;

  for (const character of text) {
    const characterBytes = encoder.encode(character).byteLength;
    if (bytes + characterBytes > maxBytes) {
      return `${truncated}${TRUNCATED_ERROR_BODY_SUFFIX}`;
    }
    truncated += character;
    bytes += characterBytes;
  }

  return truncated;
}

async function cancelReader(reader: HttpLikeBodyReader): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    // A failed cancellation must not replace the original upstream response.
  }
}

async function readBoundedErrorBody(
  response: HttpLikeResponse,
  maxBytes: number,
): Promise<string> {
  if (!response.body) {
    return truncateErrorBody(await response.text(), maxBytes);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytesRead = 0;

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      return body + decoder.decode();
    }

    const value = chunk.value;
    if (!value || value.byteLength === 0) {
      continue;
    }

    const remainingBytes = maxBytes - bytesRead;
    if (value.byteLength > remainingBytes) {
      body += decoder.decode(value.subarray(0, remainingBytes), {
        stream: true,
      });
      await cancelReader(reader);
      return `${body}${TRUNCATED_ERROR_BODY_SUFFIX}`;
    }

    body += decoder.decode(value, { stream: true });
    bytesRead += value.byteLength;

    if (bytesRead === maxBytes) {
      const nextChunk = await reader.read();
      if (nextChunk.done) {
        return body + decoder.decode();
      }

      await cancelReader(reader);
      return `${body}${TRUNCATED_ERROR_BODY_SUFFIX}`;
    }
  }
}

function getMaxErrorBodyBytes(options: ValidateHttpResponseOptions): number {
  const maxBytes = options.maxErrorBodyBytes ?? DEFAULT_MAX_ERROR_BODY_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError("maxErrorBodyBytes must be a positive safe integer");
  }
  return maxBytes;
}

/**
 * Validate an HTTP response and convert a non-ok response into a
 * `ResultAsync` error, using `Result` instead of throwing.
 *
 * A readable body is consumed only up to `maxErrorBodyBytes` and then cancelled.
 * Text-only response wrappers cannot be read incrementally, so their emitted error
 * detail is capped after reading completes.
 *
 * @param response - Any fetch-like response object
 * @param context - Short description of the operation for the error message
 * @param status - Status code to use if reading the error body itself fails (default: 502)
 * @param options - Error-body retention options
 * @returns `ResultAsync` resolving to `ok(response)` if `response.ok`, or `err(ProblemDetails)` otherwise
 */
export function validateHttpResponse<T extends HttpLikeResponse>(
  response: T,
  context: string,
  status = 502,
  options: ValidateHttpResponseOptions = {},
): ResultAsync<T, ProblemDetails> {
  if (response.ok) {
    return okAsync(response);
  }

  const maxErrorBodyBytes = getMaxErrorBodyBytes(options);
  return fromPromise(readBoundedErrorBody(response, maxErrorBodyBytes), (e) =>
    toProblemDetails(e, status),
  ).andThen((errorText) =>
    errAsync(
      new StandardError(response.status, response.statusText)
        .error(
          `Failed to ${context}: ${response.status} ${response.statusText} - ${errorText}`,
        )
        ._unsafeUnwrapErr(),
    ),
  );
}
