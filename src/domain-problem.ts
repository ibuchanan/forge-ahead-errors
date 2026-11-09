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
