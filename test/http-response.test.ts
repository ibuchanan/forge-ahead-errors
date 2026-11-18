/**
 * HTTP response validation tests
 *
 * These tests specify the behavior of validateHttpResponse for adapting
 * fetch-like responses into Result values using Problem Details errors.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc9457|RFC 9457 Problem Details for HTTP APIs}
 */

import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { validateHttpResponse } from "../src/errors";
import { expectErr, expectOk } from "../src/testing";

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

    expect(expectOk(result)).toBe(response);
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

    const pd = expectErr(result);
    expect(pd.status).toBe(404);
    expect(pd.detail).toContain("fetch schema");
    expect(pd.detail).toContain("404");
    expect(pd.detail).toContain("Not Found");
    expect(pd.detail).toContain("workspace missing");
  });

  it("should preserve an unregistered upstream response status", async () => {
    const response = {
      ok: false,
      status: 418,
      statusText: "I'm a teapot",
      text: vi.fn().mockResolvedValue("short and stout"),
    };

    const result = await validateHttpResponse(response, "brew tea");

    const pd = expectErr(result);
    expect(pd.status).toBe(418);
    expect(pd.title).toBe("I'm a teapot");
    expect(pd.type).toBe("https://httpstatuses.io/418");
    expect(pd.detail).toContain("short and stout");
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

    const pd = expectErr(result);
    expect(pd.detail).toContain("0123456789… [truncated]");
    expect(pd.detail).not.toContain("abcdef");
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

    const pd = expectErr(result);
    expect(pd.detail).toContain("A… [truncated]");
    expect(pd.detail).not.toContain("\uFFFD");
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

    const pd = expectErr(result);
    expect(pd.detail).toContain("1234567890… [truncated]");
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

    const pd = expectErr(result);
    expect(pd.detail).toContain("1234567890");
    expect(pd.detail).not.toContain("[truncated]");
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

    const pd = expectErr(result);
    expect(pd.detail).toContain("A… [truncated]");
    expect(pd.detail).not.toContain("\uFFFD");
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

    const pd = expectErr(result);
    expect(pd.status).toBe(502);
  });

  it("should use an overridden status parameter when reading the body fails", async () => {
    const response = {
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: vi.fn().mockRejectedValue(new Error("stream errored")),
    };

    const result = await validateHttpResponse(response, "fetch schema", 400);

    const pd = expectErr(result);
    expect(pd.status).toBe(400);
  });

  it("should accept a plain object literal without requiring instanceof Response", async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    };

    const result = await validateHttpResponse(response, "submit mapping");
    expectOk(result);
  });
});

// Valid Unicode scalar values deliberately include 1-, 2-, 3-, and 4-byte UTF-8.
const unicodeBody = fc
  .array(
    fc.oneof(
      fc.constantFrom("A", "é", "中", "🙂", "\u0000", "\uFEFF"),
      fc
        .oneof(
          fc.integer({ min: 0, max: 0xd7ff }),
          fc.integer({ min: 0xe000, max: 0x10ffff }),
        )
        .map((codePoint) => String.fromCodePoint(codePoint)),
    ),
    { maxLength: 32 },
  )
  .map((characters) => characters.join(""));

const boundedBody = unicodeBody.chain((body) => {
  const bytes = new TextEncoder().encode(body);
  return fc.record({
    body: fc.constant(body),
    limit: fc.oneof(
      fc.integer({ min: 1, max: bytes.length + 2 }),
      fc.constant(Math.max(1, bytes.length)),
      fc.constant(Math.max(1, bytes.length - 1)),
    ),
    // Duplicate cuts create empty chunks; byte offsets can split a character.
    cuts: fc.array(fc.integer({ min: 0, max: bytes.length }), {
      maxLength: 12,
    }),
  });
});

function streamResponse(chunks: Uint8Array[]) {
  let index = 0;
  const reader = {
    read: async () =>
      index < chunks.length
        ? { done: false, value: chunks[index++] }
        : { done: true },
    cancel: vi.fn(async () => {}),
  };
  const response = {
    ok: false,
    status: 413,
    statusText: "Payload Too Large",
    body: { getReader: () => reader },
    text: vi.fn(async () => {
      throw new Error("Streaming must not fall back to text()");
    }),
  };
  return { response, reader };
}

// Specification oracle: choose among complete-character prefixes, rather than
// reproducing the reader's incremental decoding and byte-accounting algorithm.
function expectedBody(body: string, limit: number) {
  const characters = Array.from(body);
  const prefixes = Array.from({ length: characters.length + 1 }, (_, length) =>
    characters.slice(0, length).join(""),
  );
  const prefix = prefixes
    .reverse()
    .find((candidate) => new TextEncoder().encode(candidate).length <= limit);
  return prefix === body ? body : `${prefix}… [truncated]`;
}

const detailPrefix = "Failed to upload data: 413 Payload Too Large - ";

describe("bounded error-body properties", () => {
  it("does not truncate at the exact limit when only empty chunks follow", async () => {
    const { response, reader } = streamResponse([
      new TextEncoder().encode("A"),
      new Uint8Array(),
      new Uint8Array(),
    ]);
    const problem = expectErr(
      await validateHttpResponse(response, "upload data", 502, {
        maxErrorBodyBytes: 1,
      }),
    );
    expect(problem.detail).toBe(`${detailPrefix}A`);
    expect(reader.cancel).not.toHaveBeenCalled();
  });

  it("retains exactly the complete-character prefix within the byte budget for text wrappers", async () => {
    await fc.assert(
      fc.asyncProperty(boundedBody, async ({ body, limit }) => {
        const response = {
          ok: false,
          status: 413,
          statusText: "Payload Too Large",
          text: async () => body,
        };
        const problem = expectErr(
          await validateHttpResponse(response, "upload data", 502, {
            maxErrorBodyBytes: limit,
          }),
        );
        expect(problem.detail).toBe(
          `${detailPrefix}${expectedBody(body, limit)}`,
        );
      }),
      { numRuns: 100 },
    );
  });

  it("preserves bounded detail across byte chunking and empty chunks", async () => {
    await fc.assert(
      fc.asyncProperty(boundedBody, async ({ body, limit, cuts }) => {
        const bytes = new TextEncoder().encode(body);
        const offsets = [0, ...[...cuts].sort((a, b) => a - b), bytes.length];
        const partitioned = offsets
          .slice(1)
          .map((end, index) => bytes.slice(offsets[index], end));
        // Always exercise empty chunks, including after the final body byte.
        const chunkings = [
          [bytes],
          [new Uint8Array(), ...partitioned, new Uint8Array()],
        ];
        for (const chunks of chunkings) {
          const { response, reader } = streamResponse(chunks);
          const problem = expectErr(
            await validateHttpResponse(response, "upload data", 502, {
              maxErrorBodyBytes: limit,
            }),
          );
          // TextDecoder consumes an initial UTF-8 BOM, like fetch Response.text().
          // The byte budget still applies to the original bytes, including BOM.
          const decodedPrefix = expectedBody(body, limit).replace(
            /^\uFEFF/,
            "",
          );
          expect(problem.detail).toBe(`${detailPrefix}${decodedPrefix}`);
          expect(response.text).not.toHaveBeenCalled();
          expect(reader.cancel).toHaveBeenCalledTimes(
            bytes.length > limit ? 1 : 0,
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
