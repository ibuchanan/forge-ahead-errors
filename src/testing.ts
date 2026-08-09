import { expect } from "vitest";
import type { Result } from "./errors";
import {
  formatUnexpectedResult,
  unwrapErr,
  unwrapOk,
} from "./testing/internal";

export function expectOk<T, E>(result: Result<T, E>): T {
  if (!result.isOk()) {
    expect(result.isOk(), formatUnexpectedResult("Ok", result.error)).toBe(
      true,
    );
  }
  return unwrapOk(result);
}

export function expectErr<T, E>(result: Result<T, E>): E {
  if (!result.isErr()) {
    expect(result.isErr(), formatUnexpectedResult("Err", result.value)).toBe(
      true,
    );
  }
  return unwrapErr(result);
}
