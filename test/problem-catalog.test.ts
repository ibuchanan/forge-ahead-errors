import { describe, expect, it } from "vitest";
import {
  createProblemCatalog,
  defineProblem,
  problemDetails,
  StandardError,
  type ProblemCatalog,
} from "../src/errors";

describe("createProblemCatalog", () => {
  it.each(["https://example.test/problems", "https://example.test/problems/"])(
    "resolves relative types with base %s and looks up by name or full type",
    (base) => {
      const catalog = createProblemCatalog(base, {
        missing: defineProblem({ type: "missing", title: "Missing" }),
      });
      const definition = catalog.get("missing");

      expect(definition?.type).toBe("https://example.test/problems/missing");
      expect(catalog.get("https://example.test/problems/missing")).toBe(
        definition,
      );
      expect(definition?.create("Item 7 is missing")).toMatchObject({
        type: "https://example.test/problems/missing",
        title: "Missing",
        detail: "Item 7 is missing",
      });
    },
  );

  it("derives a relative type from a named definition without an explicit type", () => {
    const catalog = createProblemCatalog("https://example.test/problems/", {
      "quota/exceeded": { title: "Quota exceeded", code: 9 },
    });

    expect(
      catalog.get("quota/exceeded")?.create("Limit reached"),
    ).toMatchObject({
      type: "https://example.test/problems/quota/exceeded",
      title: "Quota exceeded",
      code: 9,
    });
  });

  it("rejects duplicate resolved types and duplicate supplied codes", () => {
    expect(() =>
      createProblemCatalog("https://example.test/problems", {
        first: defineProblem({ type: "same", title: "First" }),
        second: defineProblem({
          type: "https://example.test/problems/same",
          title: "Second",
        }),
      }),
    ).toThrow(/duplicate.*type/i);

    expect(() =>
      createProblemCatalog("https://example.test/problems", {
        first: defineProblem({ type: "first", title: "First", code: 0 }),
        second: defineProblem({ type: "second", title: "Second", code: 0 }),
      }),
    ).toThrow(/duplicate.*code/i);
  });

  it("keeps independent optional code and status when creating problems", () => {
    const catalog = createProblemCatalog("https://example.test/problems", {
      plain: defineProblem({ type: "plain", title: "Plain" }),
      coded: defineProblem({ type: "coded", title: "Coded", code: -32001 }),
      custom: defineProblem({ type: "custom", title: "Custom", status: 599 }),
    });

    expect(catalog.get("plain")?.create("Plain failure")).toMatchObject({
      type: "https://example.test/problems/plain",
      title: "Plain",
      detail: "Plain failure",
      timestamp: expect.any(String),
    });
    expect(catalog.get("plain")?.create("Plain failure")).not.toHaveProperty(
      "status",
    );
    expect(catalog.get("plain")?.create("Plain failure")).not.toHaveProperty(
      "code",
    );
    expect(
      catalog
        .get("coded")
        ?.create("Coded failure", { instance: "/42", timestamp: "now" }),
    ).toEqual({
      type: "https://example.test/problems/coded",
      title: "Coded",
      detail: "Coded failure",
      code: -32001,
      instance: "/42",
      timestamp: "now",
    });
    expect(catalog.get("custom")?.create("Custom failure")).toMatchObject({
      status: 599,
    });
    expect(catalog.get("custom")?.create("Custom failure")).not.toHaveProperty(
      "code",
    );
  });

  it("isolates catalogs and protects contents from public mutation", () => {
    const source = {
      first: defineProblem({ type: "first", title: "First", code: 7 }),
      second: defineProblem({ type: "second", title: "Second" }),
    };
    const httpCount = StandardError.types.size;
    const first: ProblemCatalog = createProblemCatalog(
      "https://one.test",
      source,
    );
    const second = createProblemCatalog("https://two.test", {
      first: defineProblem({ type: "first", title: "Other", code: 7 }),
    });
    source.first = defineProblem({ type: "changed", title: "Changed" });

    expect(first.get("first")?.create("Error")).toMatchObject({
      type: "https://one.test/first",
      title: "First",
      code: 7,
    });
    expect(first.get("second")?.create("Error")).not.toHaveProperty("code");
    expect(second.get("first")?.create("Error")).toMatchObject({
      type: "https://two.test/first",
      title: "Other",
      code: 7,
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.get("first"))).toBe(true);
    expect(() => Object.assign(first, { get: () => undefined })).toThrow();
    const definition = first.get("first");
    if (!definition) throw new Error("Expected catalog definition");
    expect(() => Object.assign(definition, { title: "Changed" })).toThrow();
    expect(first.get("first")?.title).toBe("First");
    expect(StandardError.types.size).toBe(httpCount);
    expect(problemDetails(418, "Teapot")).toMatchObject({
      type: "https://httpstatuses.io/500",
      status: 500,
    });
  });

  it("keeps absolute types and reports unknown lookups as misses", () => {
    const catalog = createProblemCatalog("https://example.test/problems", {
      external: defineProblem({
        type: "urn:example:blocked",
        title: "Blocked",
      }),
    });

    expect(catalog.get("external")?.type).toBe("urn:example:blocked");
    expect(catalog.get("urn:example:blocked")).toBe(catalog.get("external"));
    expect(catalog.get("missing")).toBeUndefined();
    expect(
      catalog.get("https://example.test/problems/missing"),
    ).toBeUndefined();
  });
});
