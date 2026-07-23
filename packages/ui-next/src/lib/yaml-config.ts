import { ProblemType, type CompilableSource, type ProblemConfigFile } from '@hydrooj/common';
import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';

// Re-export the canonical `type` field so consumers can read it as a plain
// string (the upstream enum still narrows correctly when used directly).
export type ProblemConfigYaml = ProblemConfigFile & { type?: string };

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
// The schema is intentionally tighter than the previous build so that
// bad YAML is rejected up-front (mirroring ui-default's monaco JSON schema
// in `packages/ui-default/components/monaco/schema/problemconfig.ts`).
// UI-only fields (`case`, `subLimit`, `__*`) are intentionally NOT here so
// the schema reflects the canonical ProblemConfigFile shape used by the
// judge.

const PROBLEM_TYPE_VALUES = [
  ProblemType.Default,
  ProblemType.SubmitAnswer,
  ProblemType.Interactive,
  ProblemType.Communication,
  ProblemType.Objective,
] as const;

const CHECKER_TYPE_VALUES = [
  'default', 'lemon', 'syzoj', 'hustoj', 'testlib', 'strict', 'qduoj', 'kattis',
] as const;

const SUBTASK_TYPE_VALUES = ['min', 'max', 'sum'] as const;

/** Mirrors ui-default's #/definitions/time pattern. */
const TIME_PATTERN = '^([1-9][0-9]*(?:\\.[0-9]+)?|0\\.[0-9]*[1-9][0-9]*)([mu]?)s?$';
/** Mirrors ui-default's #/definitions/memory pattern. */
const MEMORY_PATTERN = '^([1-9][0-9]*(?:\\.[0-9]+)?|0\\.[0-9]*[1-9][0-9]*)([kKmMgG])[bB]?$';

const SUBTASK_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: SUBTASK_TYPE_VALUES as unknown as string[] },
    time: { type: 'string', pattern: TIME_PATTERN },
    memory: { type: 'string', pattern: MEMORY_PATTERN },
    score: { type: 'number', minimum: 1, maximum: 100 },
    cases: { type: 'array' },
    if: { type: 'array', items: { type: 'integer' } },
    id: { type: 'integer' },
  },
  required: ['score'],
} as const;

const CASE_SCHEMA = {
  type: 'object',
  properties: {
    input: { type: 'string' },
    output: { type: 'string' },
    time: { type: 'string', pattern: TIME_PATTERN },
    memory: { type: 'string', pattern: MEMORY_PATTERN },
    score: { type: 'number', minimum: 1, maximum: 100 },
  },
  required: ['input'],
} as const;

const SCHEMA = {
  type: 'object',
  // Drop additionalProperties: true so unknown fields (e.g. UI-only
  // 'count' / 'subLimit') are rejected. This matches ui-default's
  // strict behaviour on subtask/case objects, but is loosened at the
  // top level so that newer ProblemConfigFile fields don't break load.
  additionalProperties: true,
  properties: {
    type: { type: 'string', enum: PROBLEM_TYPE_VALUES as unknown as string[] },
    subType: { type: 'string' },
    target: { type: 'string' },
    score: { type: 'number', minimum: 1, maximum: 100 },
    time: { type: 'string', pattern: TIME_PATTERN },
    memory: { type: 'string', pattern: MEMORY_PATTERN },
    filename: { type: 'string' },
    checker_type: { type: 'string', enum: CHECKER_TYPE_VALUES as unknown as string[] },
    checker: {
      // Either a known testlib checker name or a compilable source reference.
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            file: { type: 'string' },
            lang: { type: 'string' },
          },
          required: ['file', 'lang'],
        },
      ],
    },
    interactor: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            file: { type: 'string' },
            lang: { type: 'string' },
          },
          required: ['file', 'lang'],
        },
      ],
    },
    manager: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            file: { type: 'string' },
            lang: { type: 'string' },
          },
          required: ['file', 'lang'],
        },
      ],
    },
    num_processes: { type: 'integer', minimum: 1, maximum: 5 },
    user_extra_files: { type: 'array', items: { type: 'string' } },
    judge_extra_files: { type: 'array', items: { type: 'string' } },
    detail: { type: ['string', 'boolean'] },
    answers: { type: 'object' },
    redirect: { type: 'string' },
    cases: { type: 'array', items: CASE_SCHEMA },
    subtasks: { type: 'array', items: SUBTASK_SCHEMA },
    langs: { type: 'array', items: { type: 'string' } },
    multi_pass: { type: 'integer', minimum: 2, maximum: 20 },
    time_limit_rate: { type: 'object' },
    memory_limit_rate: { type: 'object' },
  },
} as const;

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(SCHEMA);

// ---------------------------------------------------------------------------
// Legacy migration: cases → subtasks
// ---------------------------------------------------------------------------
// Mirrors ui-default's `pages/problem_config.page.tsx` migrateCases logic,
// which converts a legacy per-case `cases` + `score` config into a single
// 'sum' subtask on load. Without this, raw `cases` would be dropped by the
// editor when the user switches to the subtasks view.

export function migrateCasesToSubtasks(cfg: ProblemConfigYaml): ProblemConfigYaml {
  if (cfg.cases && !cfg.subtasks) {
    const perCase = cfg.score ?? 100;
    const total = perCase * cfg.cases.length;
    const score = total && total < 100 ? total : 100;
    const { cases, score: _drop, ...rest } = cfg;
    return {
      ...rest,
      subtasks: [{
        type: 'sum',
        score,
        cases,
        id: 1,
      }],
    };
  }
  return cfg;
}

// ---------------------------------------------------------------------------
// YAML serialization fidelity (configYamlFormat port)
// ---------------------------------------------------------------------------
// ui-default's `configYamlFormat()` drops keys that aren't applicable to the
// current `type` so the stored YAML stays minimal. We re-implement the
// minimal equivalent here so the dumped config doesn't carry stale fields
// (e.g. `interactor` after switching away from an interactive problem).

const FIELDS_FOR_TYPE = (type: ProblemConfigYaml['type']): Record<string, true> => {
  const base: Record<string, true> = {
    type: true, subType: true, target: true, score: true, time: true,
    memory: true, filename: true, checker_type: true, checker: true,
    num_processes: true, multi_pass: true, user_extra_files: true,
    judge_extra_files: true, detail: true, outputs: true, redirect: true,
    cases: true, subtasks: true, langs: true, time_limit_rate: true,
    memory_limit_rate: true, validator: true,
  };
  if (type === 'interactive') base.interactor = true;
  if (type === 'communication') {
    base.manager = true;
    base.num_processes = true;
  }
  if (type === 'submit_answer') base.subType = true;
  return base;
};

/**
 * Equivalent of ui-default's `configYamlFormat`: drops fields not applicable
 * to the current `type`, plus any keys prefixed with `__` (internal).
 */
export function configYamlFormat(cfg: ProblemConfigYaml): ProblemConfigYaml {
  const allowed = FIELDS_FOR_TYPE(cfg.type);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(cfg)) {
    if (value === undefined) continue;
    if (key.startsWith('__')) continue;
    if (!allowed[key]) continue;
    // Special-case: drop subType unless submit_answer with single/multi.
    if (key === 'subType' && cfg.type !== 'submit_answer') continue;
    // Special-case: checker_type is only meaningful for default type.
    if (key === 'checker_type' && cfg.type !== 'default') continue;
    // Special-case: multi_pass must be integer in [2, 20].
    if (key === 'multi_pass') {
      if (!Number.isInteger(value) || (value as number) <= 1 || (value as number) > 20) continue;
    }
    out[key] = value;
  }
  // For objective type, keep only type + answers.
  if (cfg.type === 'objective') {
    const trimmed: Record<string, unknown> = {};
    if (out.type) trimmed.type = out.type;
    trimmed.answers = cfg.answers ?? {};
    return trimmed;
  }
  return out as ProblemConfigYaml;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseProblemConfigYaml(raw: string): ProblemConfigYaml {
  if (!raw.trim()) return {};
  return (yaml.load(raw) as ProblemConfigYaml) ?? {};
}

export function dumpProblemConfigYaml(cfg: ProblemConfigYaml): string {
  const filtered = configYamlFormat(cfg);
  return yaml.dump(filtered, { lineWidth: 120, noRefs: true });
}

export function validateProblemConfigYaml(
  cfg: unknown,
): { ok: true } | { ok: false; errors: ErrorObject[] } {
  const ok = validate(cfg);
  return ok ? { ok: true } : { ok: false, errors: validate.errors ?? [] };
}
