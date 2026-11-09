import type { ProblemDetails } from "./problem-details";

/** A generated domain problem; unlike StandardProblemDetails, status is optional. */
export interface DomainProblemDetails extends ProblemDetails {
  type: string;
  title: string;
  detail: string;
  timestamp: string;
}

/** Stable, transport-neutral metadata for a domain failure. */
export interface ProblemDefinition {
  readonly type: string;
  readonly title: string;
  readonly status?: number;
  readonly code?: number;
  create(
    detail: string,
    options?: { instance?: string; timestamp?: string },
  ): DomainProblemDetails;
}

/** An app-owned set of problem definitions, addressable by name or type URI. */
export interface ProblemCatalog {
  get(nameOrType: string): ProblemDefinition | undefined;
}

/** Metadata for a named catalog entry; type defaults to the entry name. */
export type CatalogProblemDefinition = {
  readonly type?: string;
  readonly title: string;
  readonly status?: number;
  readonly code?: number;
};

/** Group definitions under a base URI without sharing a registry. */
export function createProblemCatalog(
  baseUri: string,
  definitions: Record<string, CatalogProblemDefinition>,
): ProblemCatalog {
  const byName = new Map<string, ProblemDefinition>();
  const byType = new Map<string, ProblemDefinition>();
  const codes = new Set<number>();
  for (const [name, definition] of Object.entries(definitions)) {
    const reference = definition.type ?? name;
    const type = /^[a-z][a-z\d+.-]*:/i.test(reference)
      ? reference
      : `${baseUri.replace(/\/+$/, "")}/${reference.replace(/^\/+/, "")}`;
    if (byType.has(type)) {
      throw new Error(`Duplicate problem type: ${type}`);
    }
    if (definition.code !== undefined) {
      if (codes.has(definition.code)) {
        throw new Error(`Duplicate problem code: ${definition.code}`);
      }
      codes.add(definition.code);
    }
    const resolved = defineProblem({
      type,
      title: definition.title,
      ...(definition.status !== undefined && { status: definition.status }),
      ...(definition.code !== undefined && { code: definition.code }),
    });
    byName.set(name, resolved);
    byType.set(type, resolved);
  }
  return Object.freeze({
    get(nameOrType: string) {
      return byName.get(nameOrType) ?? byType.get(nameOrType);
    },
  });
}

/** Define a reusable problem without consulting the shared HTTP registry. */
export function defineProblem(definition: {
  type: string;
  title: string;
  status?: number;
  code?: number;
}): ProblemDefinition {
  const { type, title, status, code } = definition;
  return Object.freeze({
    type,
    title,
    ...(status !== undefined && { status }),
    ...(code !== undefined && { code }),
    create(
      detail: string,
      options?: { instance?: string; timestamp?: string },
    ): DomainProblemDetails {
      return {
        type,
        title,
        detail,
        timestamp: options?.timestamp ?? new Date().toISOString(),
        ...(status !== undefined && { status }),
        ...(code !== undefined && { code }),
        ...(options?.instance !== undefined && { instance: options.instance }),
      };
    },
  });
}
