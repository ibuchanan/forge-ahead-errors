import { describe, expect, it } from "vitest";
import { err, ok } from "../src/errors";
import { expectErr, expectOk } from "../src/testing";
import {
  formatUnexpectedResult,
  unwrapErr,
  unwrapOk,
} from "../src/testing/internal";

describe("expectOk", () => {
  it("returns the value from an Ok result", () => {
    const result = ok("success");

    expect(expectOk(result)).toBe("success");
  });

  it("fails with a readable message when the result is an Err", () => {
    const error = { message: "something went wrong" };
    const result = err(error);

    expect(() => expectOk(result)).toThrow("Expected Ok result");
    expect(() => expectOk(result)).toThrow("something went wrong");
  });
});

describe("expectErr", () => {
  it("returns the error from an Err result", () => {
    const error = new Error("failure");
    const result = err(error);

    expect(expectErr(result)).toBe(error);
  });

  it("fails with a readable message when the result is an Ok", () => {
    const result = ok({ value: 42 });

    expect(() => expectErr(result)).toThrow("Expected Err result");
    expect(() => expectErr(result)).toThrow("42");
  });
});

describe("unwrapOk", () => {
  it("returns the value from an Ok result", () => {
    const result = ok("success");

    expect(unwrapOk(result)).toBe("success");
  });

  it("throws a readable message when the result is an Err", () => {
    const error = { message: "something went wrong" };
    const result = err(error);

    expect(() => unwrapOk(result)).toThrow("Expected Ok result");
    expect(() => unwrapOk(result)).toThrow("something went wrong");
  });
});

describe("unwrapErr", () => {
  it("returns the error from an Err result", () => {
    const error = new Error("failure");
    const result = err(error);

    expect(unwrapErr(result)).toBe(error);
  });

  it("throws a readable message when the result is an Ok", () => {
    const result = ok({ value: 42 });

    expect(() => unwrapErr(result)).toThrow("Expected Err result");
    expect(() => unwrapErr(result)).toThrow("42");
  });
});

describe("formatUnexpectedResult", () => {
  it("handles circular references safely", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    const message = formatUnexpectedResult("Ok", circular);

    expect(message).toContain("Expected Ok result");
    expect(message).toContain("Circular");
  });
});
