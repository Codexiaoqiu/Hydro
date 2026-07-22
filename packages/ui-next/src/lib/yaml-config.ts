import { ProblemType, type ProblemConfigFile } from '@hydrooj/common';
import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';

// Re-export the canonical `type` field so consumers can read it as a plain
// string (the upstream enum still narrows correctly when used directly).
export type ProblemConfigYaml = ProblemConfigFile & { type?: string };

// AJV schema mirrors the canonical shape from @hydrooj/common. Unknown fields
// (forward-compat) are allowed via `additionalProperties: true`.
const PROBLEM_TYPE_VALUES = [
  ProblemType.Default,
  ProblemType.SubmitAnswer,
  ProblemType.Interactive,
  ProblemType.Communication,
  ProblemType.Objective,
] as const;

const SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    type: { type: 'string', enum: PROBLEM_TYPE_VALUES as unknown as string[] },
    subType: { type: 'string' },
    target: { type: 'string' },
    score: { type: 'number' },
    time: { type: 'string' },
    memory: { type: 'string' },
    filename: { type: 'string' },
    checker_type: { type: 'string' },
    num_processes: { type: 'integer', minimum: 0 },
    user_extra_files: { type: 'array', items: { type: 'string' } },
    judge_extra_files: { type: 'array', items: { type: 'string' } },
    detail: { type: ['string', 'boolean'] },
    answers: { type: 'object' },
    redirect: { type: 'string' },
    cases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          input: { type: 'string' },
          output: { type: 'string' },
          time: { type: 'string' },
          memory: { type: 'string' },
          score: { type: 'number' },
        },
      },
    },
    subtasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          time: { type: 'string' },
          memory: { type: 'string' },
          score: { type: 'number' },
          if: { type: 'array' },
          id: { type: 'integer' },
          type: { type: 'string' },
          cases: { type: 'array' },
        },
      },
    },
    langs: { type: 'array', items: { type: 'string' } },
    multi_pass: { type: 'integer', minimum: 0 },
    time_limit_rate: { type: 'object' },
    memory_limit_rate: { type: 'object' },
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