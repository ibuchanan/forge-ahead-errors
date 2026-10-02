/**
 * Root facade for @forge-ahead/errors
 *
 * Re-exports all public types and utilities without wildcard exports.
 * This is the primary entry point for the package.
 */

// Neverthrow Result utilities
export {
  err,
  errAsync,
  fromAsyncThrowable,
  fromPromise,
  fromSafePromise,
  fromThrowable,
  ok,
  okAsync,
  type Result,
  ResultAsync,
  safeTry,
} from "neverthrow";
// HTTP response validation
export type {
  HttpLikeResponse,
  ValidateHttpResponseOptions,
} from "./http-response";
export { validateHttpResponse } from "./http-response";
// Problem Details types and utilities
export type {
  ProblemDetails,
  StandardProblemDetails,
  ValidationError,
  ValidationProblemDetails,
} from "./problem-details";
export {
  isProblemDetails,
  problemDetails,
  problemResult,
  ShellExitCodes,
  StandardError,
  toErrorMessage,
  toProblemDetails,
} from "./problem-details";
