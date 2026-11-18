// Declaration-build fallback only; consumers using ./testing still need Vitest.
export declare function expect(
  actual: unknown,
  message?: string,
): { toBe(expected: unknown): void };
