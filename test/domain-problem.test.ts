import { describe, expect, it } from "vitest";
import {
  defineProblem,
  err,
  problemDetails,
  StandardError,
  type DomainProblemDetails,
  type Result,
  type StandardProblemDetails,
} from "../src/errors";
import { expectErr } from "../src/testing";

describe("defineProblem", () => {
  it("creates a plain domain problem without inventing an HTTP status", () => {
    const definition = defineProblem({
      type: "https://example.test/problems/item-missing",
      title: "Item missing",
    });
    const before = Date.now();
    const problem: DomainProblemDetails =
      definition.create("Item 7 is missing");
    const after = Date.now();

    expect(problem).toEqual({
      type: "https://example.test/problems/item-missing",
      title: "Item missing",
      detail: "Item 7 is missing",
      timestamp: problem.timestamp,
    });
    expect(problem).not.toHaveProperty("status");
    expect(problem).not.toHaveProperty("code");
    expect(problem).not.toHaveProperty("instance");
    expect(problem.timestamp).toBe(new Date(problem.timestamp).toISOString());
    expect(new Date(problem.timestamp).getTime()).toBeGreaterThanOrEqual(
      before,
    );
    expect(new Date(problem.timestamp).getTime()).toBeLessThanOrEqual(after);
  });

  it("preserves a caller-chosen status and code without using the HTTP registry", () => {
    const size = StandardError.types.size;
    const definition = defineProblem({
      type: "urn:example:quota-exceeded",
      title: "Quota exceeded",
      status: 599,
      code: -32042,
    });

    expect(definition.create("Too many items")).toEqual({
      type: "urn:example:quota-exceeded",
      title: "Quota exceeded",
      status: 599,
      code: -32042,
      detail: "Too many items",
      timestamp: expect.any(String),
    });
    expect(StandardError.types.size).toBe(size);
    expect(StandardError.types.has(599)).toBe(false);
  });

  it("preserves supplied instance and timestamp and can be wrapped with err", () => {
    const timestamp = "upstream-clock-unavailable";
    const definition = defineProblem({
      type: "https://example.test/problems/denied",
      title: "Denied",
      code: 0,
    });
    const problem = definition.create("No access", {
      instance: "/commands/42",
      timestamp,
    });
    const result: Result<never, DomainProblemDetails> = err(problem);

    expect(expectErr(result)).toBe(problem);
    expect(problem).toEqual({
      type: "https://example.test/problems/denied",
      title: "Denied",
      detail: "No access",
      code: 0,
      instance: "/commands/42",
      timestamp,
    });
  });

  it("snapshots and freezes a definition without affecting HTTP creation", () => {
    const source = {
      type: "urn:example:missing",
      title: "Missing",
      status: 498,
    };
    const definition = defineProblem(source);
    source.title = "Changed";
    source.status = 499;

    expect(Object.isFrozen(definition)).toBe(true);
    expect(() => Object.assign(definition, { title: "Overwritten" })).toThrow();
    expect(definition.create("Gone")).toMatchObject({
      type: "urn:example:missing",
      title: "Missing",
      status: 498,
    });
    const http: StandardProblemDetails = problemDetails(404, "Gone");
    expect(http).toMatchObject({
      type: "https://httpstatuses.io/404",
      title: "Not Found",
      status: 404,
    });
    expect(problemDetails(418, "Teapot")).toMatchObject({
      type: "https://httpstatuses.io/500",
      status: 500,
    });
  });
});
