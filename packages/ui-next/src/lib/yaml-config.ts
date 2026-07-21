import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';

// ProblemConfig is not exported from @hydrooj/common; use inline fallback
export type ProblemConfigYaml = Record<string, unknown> & {
  type?: string;
  subtasks?: Array<{
    score?: number;
    time_limit?: number;
    memory_limit?: number;
    if?: string | string[];
    cases?: unknown[];
  }>;
};

const SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    type: { type: 'string', enum: ['default', 'interactive', 'objective', 'submit_answer', 'communication'] },
    subLimit: { type: 'integer', minimum: 0 },
    count: { type: 'integer', minimum: 1 },
    subtasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          time_limit: { type: 'integer', minimum: 0 },
          memory_limit: { type: 'integer', minimum: 0 },
          if: { type: ['string', 'array'] },
          cases: { type: 'array' },
        },
      },
    },
  },
} as const;

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(SCHEMA);

export function parseProblemConfigYaml(raw: string): ProblemConfigYaml {
  if (!raw.trim()) return {};
  return (yaml.load(raw) as ProblemConfigYaml) ?? {};
}

export function dumpProblemConfigYaml(cfg: ProblemConfigYaml): string {
  return yaml.dump(cfg, { lineWidth: 120, noRefs: true });
}

export function validateProblemConfigYaml(cfg: unknown):
  | { ok: true } | { ok: false; errors: ErrorObject[] } {
  const ok = validate(cfg);
  return ok ? { ok: true } : { ok: false, errors: validate.errors ?? [] };
}
