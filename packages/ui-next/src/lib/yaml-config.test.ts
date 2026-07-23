import { describe, expect, it } from 'vitest';
import {
  configYamlFormat, dumpProblemConfigYaml, migrateCasesToSubtasks,
  parseProblemConfigYaml, validateProblemConfigYaml,
} from './yaml-config';

const sampleYaml = `
type: default
subtasks:
  - score: 100
    cases:
      - input: 1.in
        output: 1.out
`;

describe('yaml-config', () => {
  it('parses a minimal valid config', () => {
    const cfg = parseProblemConfigYaml(sampleYaml);
    expect(cfg.type).toBe('default');
    expect(cfg.subtasks).toHaveLength(1);
    expect(cfg.subtasks![0].score).toBe(100);
  });

  it('returns empty object for empty string', () => {
    expect(parseProblemConfigYaml('')).toEqual({});
  });

  it('dumps back to YAML', () => {
    const cfg = parseProblemConfigYaml(sampleYaml);
    const out = dumpProblemConfigYaml(cfg);
    expect(out).toContain('type: default');
    expect(out).toContain('score: 100');
  });

  it('validates a known good config', () => {
    const cfg = parseProblemConfigYaml(sampleYaml);
    expect(validateProblemConfigYaml(cfg)).toEqual({ ok: true });
  });

  it('rejects an invalid type', () => {
    const result = validateProblemConfigYaml({ type: 'bogus' });
    expect(result.ok).toBe(false);
  });

  it('rejects multi_pass < 2', () => {
    const result = validateProblemConfigYaml({ type: 'default', multi_pass: 1 });
    expect(result.ok).toBe(false);
  });

  it('rejects multi_pass > 20', () => {
    const result = validateProblemConfigYaml({ type: 'default', multi_pass: 21 });
    expect(result.ok).toBe(false);
  });

  it('accepts multi_pass in 2-20', () => {
    const result = validateProblemConfigYaml({ type: 'default', multi_pass: 10 });
    expect(result.ok).toBe(true);
  });

  it('rejects subtask score > 100', () => {
    const result = validateProblemConfigYaml({ type: 'default', subtasks: [{ score: 200 }] });
    expect(result.ok).toBe(false);
  });

  it('rejects subtask score = 0 (minimum 1)', () => {
    const result = validateProblemConfigYaml({ type: 'default', subtasks: [{ score: 0 }] });
    expect(result.ok).toBe(false);
  });

  it('rejects time with non-numeric characters', () => {
    const result = validateProblemConfigYaml({ type: 'default', time: '99x' });
    expect(result.ok).toBe(false);
  });

  it('rejects multi_pass = 25 (above max 20)', () => {
    const result = validateProblemConfigYaml({ type: 'default', multi_pass: 25 });
    expect(result.ok).toBe(false);
  });

  it('rejects top-level score = 0 (minimum 1)', () => {
    const result = validateProblemConfigYaml({ type: 'default', score: 0 });
    expect(result.ok).toBe(false);
  });

  it('rejects num_processes outside 1-5', () => {
    const r1 = validateProblemConfigYaml({ type: 'communication', num_processes: 0 });
    expect(r1.ok).toBe(false);
    const r2 = validateProblemConfigYaml({ type: 'communication', num_processes: 6 });
    expect(r2.ok).toBe(false);
  });

  it('rejects time in wrong format', () => {
    const result = validateProblemConfigYaml({ type: 'default', time: 'not-a-time' });
    expect(result.ok).toBe(false);
  });

  it('accepts time in 1s / 100ms format', () => {
    const r1 = validateProblemConfigYaml({ type: 'default', time: '1s' });
    expect(r1.ok).toBe(true);
    const r2 = validateProblemConfigYaml({ type: 'default', time: '100ms' });
    expect(r2.ok).toBe(true);
  });

  it('rejects memory in wrong format', () => {
    const result = validateProblemConfigYaml({ type: 'default', memory: 'lots' });
    expect(result.ok).toBe(false);
  });

  it('accepts memory in 256MB / 1GB format', () => {
    const r1 = validateProblemConfigYaml({ type: 'default', memory: '256MB' });
    expect(r1.ok).toBe(true);
    const r2 = validateProblemConfigYaml({ type: 'default', memory: '1GB' });
    expect(r2.ok).toBe(true);
  });

  it('migration: cases+score is converted to a single subtask', () => {
    const result = migrateCasesToSubtasks({
      type: 'default',
      cases: [{ input: '1.in', output: '1.out' }, { input: '2.in', output: '2.out' }],
      score: 50,
    });
    expect(result.subtasks).toHaveLength(1);
    expect(result.subtasks![0].type).toBe('sum');
    expect(result.subtasks![0].cases).toHaveLength(2);
    expect(result.cases).toBeUndefined();
    expect(result.score).toBeUndefined();
  });

  it('migration: leaves existing subtasks untouched', () => {
    const result = migrateCasesToSubtasks({
      type: 'default',
      subtasks: [{ score: 10, cases: [] }],
      cases: [{ input: '1.in', output: '1.out' }],
    });
    expect(result.subtasks).toHaveLength(1);
    expect(result.subtasks![0].score).toBe(10);
  });

  it('configYamlFormat: drops interactor when type !== interactive', () => {
    const out = configYamlFormat({
      type: 'default',
      interactor: 'interactor.cpp',
    } as any);
    expect(out.interactor).toBeUndefined();
  });

  it('configYamlFormat: drops manager when type !== communication', () => {
    const out = configYamlFormat({
      type: 'default',
      manager: 'manager.cpp',
    } as any);
    expect(out.manager).toBeUndefined();
  });

  it('configYamlFormat: drops multi_pass outside 2-20', () => {
    const out = configYamlFormat({
      type: 'default',
      multi_pass: 1,
    } as any);
    expect(out.multi_pass).toBeUndefined();
  });

  it('configYamlFormat: drops __ prefixed fields', () => {
    const out = configYamlFormat({
      type: 'default',
      __foo: 'bar',
      filename: 'a',
    } as any);
    expect((out as any).__foo).toBeUndefined();
    expect(out.filename).toBe('a');
  });

  it('configYamlFormat: keeps only type + answers for objective', () => {
    const out = configYamlFormat({
      type: 'objective',
      filename: 'a',
      time: '1s',
      answers: { '1': [['A'], 1] },
    } as any);
    expect(out.type).toBe('objective');
    expect(out.answers).toBeDefined();
    expect(out.filename).toBeUndefined();
    expect(out.time).toBeUndefined();
  });
});
