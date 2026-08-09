/**
 * HTTP response validation tests
 *
 * These tests specify the behavior of validateHttpResponse for adapting
 * fetch-like responses into Result values using Problem Details errors.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc9457|RFC 9457 Problem Details for HTTP APIs}
 */

import { describe, expect, it, vi } from "vitest";
import { validateHttpResponse } from "../src/errors";

// Matches the branching consumers are expected to use (see README `.match()`
// example): the ok branch throws because every case here is expected to fail.
function expectErr(): () => never {
  return () => {
    throw new Error("expected an Err result");
  };
}

describe("validateHttpResponse", () => {
  it("should resolve to ok(response) without calling text() when response.ok is true", async () => {
    const text = vi.fn().mockResolvedValue("should not be read");
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      text,
    };

    const result = await validateHttpResponse(response, "fetch schema");

    expect(result.isOk()).toBe(true);
    result.match(
      (value) => expect(value).toBe(response),
      () => {
        throw new Error("expected an Ok result");
      },
    );
    expect(text).not.toHaveBeenCalled();
  });

  it("should resolve to err(ProblemDetails) using response.status when response.ok is false", async () => {
    const response = {
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: vi.fn().mockResolvedValue("workspace missing"),
    };

    const result = await validateHttpResponse(response, "fetch schema");

    expect(result.isErr()).toBe(true);
    result.match(expectErr(), (pd) => {
      expect(pd.status).toBe(404);
      expect(pd.detail).toContain("fetch schema");
      expect(pd.detail).toContain("404");
      expect(pd.detail).toContain("Not Found");
      expect(pd.detail).toContain("workspace missing");
    });
  });

  it("should preserve an unregistered upstream response status", async () => {
    const response = {
      ok: false,
      status: 418,
      statusText: "I'm a teapot",
      text: vi.fn().mockResolvedValue("short and stout"),
    };

    const result = await validateHttpResponse(response, "brew tea");

    result.match(expectErr(), (pd) => {
      expect(pd.status).toBe(418);
      expect(pd.title).toBe("I'm a teapot");
      expect(pd.type).toBe("https://httpstatuses.io/418");
      expect(pd.detail).toContain("short and stout");
    });
  });

  it("should truncate error detail from text-only responses", async () => {
    const response = {
      ok: false,
      status: 413,
      statusText: "Payload Too Large",
      text: vi.fn().mockResolvedValue("0123456789abcdef"),
    };

    const result = await validateHttpResponse(response, "upload data", 502, {
      maxErrorBodyBytes: 10,
    });

    result.match(expectErr(), (pd) => {
      expect(pd.detail).toContain("0123456789… [truncated]");
      expect(pd.detail).not.toContain("abcdef");
    });
  });

  it("should truncate text-only UTF-8 text at a complete character boundary", async () => {
    const response = {
      ok: false,
      status: 413,
      statusText: "Payload Too Large",
      text: vi.fn().mockResolvedValue("A🙂Z"),
    };

    const result = await validateHttpResponse(response, "upload data", 502, {
      maxErrorBodyBytes: 2,
    });

    result.match(expectErr(), (pd) => {
      expect(pd.detail).toContain("A… [truncated]");
      expect(pd.detail).not.toContain("�");
    });
  });

  it("should stream a bounded error body without calling text()", async () => {
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode("123456"),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode("789012"),
        }),
      cancel: vi.fn().mockResolvedValue(undefined),
    };
    const text = vi
      .fn()
      .mockRejectedValue(new Error("text() must not be called"));
    const response = {
      ok: false,
      status: 413,
      statusText: "Payload Too Large",
      body: { getReader: () => reader },
      text,
    };

    const result = await validateHttpResponse(response, "upload data", 502, {
      maxErrorBodyBytes: 10,
    });

    result.match(expectErr(), (pd) => {
      expect(pd.detail).toContain("1234567890… [truncated]");
    });
    expect(text).not.toHaveBeenCalled();
    expect(reader.cancel).toHaveBeenCalledOnce();
  });

  it("should not truncate a streamed body exactly at the limit", async () => {
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode("1234567890"),
        })
        .mockResolvedValueOnce({ done: true }),
      cancel: vi.fn().mockResolvedValue(undefined),
    };
    const text = vi
      .fn()
      .mockRejectedValue(new Error("text() must not be called"));
    const response = {
      ok: false,
      status: 413,
      statusText: "Payload Too Large",
      body: { getReader: () => reader },
      text,
    };

    const result = await validateHttpResponse(response, "upload data", 502, {
      maxErrorBodyBytes: 10,
    });

    result.match(expectErr(), (pd) => {
      expect(pd.detail).toContain("1234567890");
      expect(pd.detail).not.toContain("[truncated]");
    });
    expect(text).not.toHaveBeenCalled();
    expect(reader.cancel).not.toHaveBeenCalled();
  });

  it("should truncate streamed UTF-8 text at a complete character boundary", async () => {
    const reader = {
      read: vi.fn().mockResolvedValueOnce({
        done: false,
        value: new TextEncoder().encode("A🙂Z"),
      }),
      cancel: vi.fn().mockResolvedValue(undefined),
    };
    const response = {
      ok: false,
      status: 413,
      statusText: "Payload Too Large",
      body: { getReader: () => reader },
      text: vi.fn(),
    };

    const result = await validateHttpResponse(response, "upload data", 502, {
      maxErrorBodyBytes: 2,
    });

    result.match(expectErr(), (pd) => {
      expect(pd.detail).toContain("A… [truncated]");
      expect(pd.detail).not.toContain("�");
    });
    expect(reader.cancel).toHaveBeenCalledOnce();
  });

  it("should use the status parameter's default (502) when reading the body fails", async () => {
    const response = {
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: vi.fn().mockRejectedValue(new Error("stream errored")),
    };

    const result = await validateHttpResponse(response, "fetch schema");

    expect(result.isErr()).toBe(true);
    result.match(expectErr(), (pd) => {
      expect(pd.status).toBe(502);
    });
  });

  it("should use an overridden status parameter when reading the body fails", async () => {
    const response = {
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: vi.fn().mockRejectedValue(new Error("stream errored")),
    };

    const result = await validateHttpResponse(response, "fetch schema", 400);

    expect(result.isErr()).toBe(true);
    result.match(expectErr(), (pd) => {
      expect(pd.status).toBe(400);
    });
  });

  it("should accept a plain object literal without requiring instanceof Response", async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    };

    const result = await validateHttpResponse(response, "submit mapping");
    expect(result.isOk()).toBe(true);
  });
});
