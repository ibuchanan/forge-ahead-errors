import { inspect } from "node:util";
import type { Result } from "../errors";

export function formatUnexpectedResult(
  expected: "Ok" | "Err",
  actual: unknown,
): string {
  return `Expected ${expected} result, but received ${expected === "Ok" ? "Err" : "Ok"}: ${inspect(actual, { breakLength: Number.POSITIVE_INFINITY })}`;
}

export function unwrapOk<T, E>(result: Result<T, E>): T {
  if (result.isOk()) {
    return result.value;
  }

  throw new Error(formatUnexpectedResult("Ok", result.error));
}

export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (result.isErr()) {
    return result.error;
  }

  throw new Error(formatUnexpectedResult("Err", result.value));
}
