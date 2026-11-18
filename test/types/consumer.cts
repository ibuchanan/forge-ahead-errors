import { err, ok } from "@forge-ahead/errors";
import { expectErr, expectOk } from "@forge-ahead/errors/testing";

export const value: { id: number } = expectOk(ok({ id: 42 }));
export const error: { code: "FAIL" } = expectErr(
  err({ code: "FAIL" as const }),
);
// @ts-expect-error The unwrapped value must retain its inferred type.
export const wrongValue: string = expectOk(ok(42));
// @ts-expect-error The unwrapped error must retain its inferred type.
export const wrongError: number = expectErr(err("failure"));
