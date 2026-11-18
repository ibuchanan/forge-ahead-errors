import { err, ok } from "@forge-ahead/errors";
import { expectErr, expectOk } from "@forge-ahead/errors/testing";
import { expect, expectTypeOf } from "vitest";

const value = expectOk(ok({ id: 42 }));
const error = expectErr(err({ code: "FAIL" as const }));
expectTypeOf(value).toEqualTypeOf<{ id: number }>();
expectTypeOf(error).toEqualTypeOf<{ code: "FAIL" }>();
expect(value.id).toBe(42);
// @ts-expect-error The inferred result must not become any.
value.missing;
// @ts-expect-error Real Vitest matcher types must remain intact.
expect(value).notARealMatcher();
