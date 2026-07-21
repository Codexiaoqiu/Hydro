import { describe, expect, it } from 'vitest';
import { dumpProblemConfigYaml, parseProblemConfigYaml, validateProblemConfigYaml } from './yaml-config';

const sampleYaml = `
type: default
subtasks:
  - score: 100
    time_limit: 1000
    memory_limit: 256
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
});
