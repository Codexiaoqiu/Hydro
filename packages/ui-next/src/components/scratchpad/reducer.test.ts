import { describe, expect, it } from 'vitest';
import { initialScratchpadState, scratchpadReducer } from './reducer';

describe('scratchpadReducer', () => {
  it('initialScratchpadState has expected defaults', () => {
    const s = initialScratchpadState('cpp', '// template');
    expect(s.lang).toBe('cpp');
    expect(s.code).toBe('// template');
    expect(s.pretest.running).toBe(false);
    expect(s.pretest.output).toEqual([]);
    expect(s.submitting).toBe(false);
    expect(s.records).toEqual([]);
    expect(s.showPretestPanel).toBe(true);
    expect(s.showRecordsPanel).toBe(false);
    expect(s.wsStatus).toBe('idle');
  });

  it('SET_CODE updates code', () => {
    const s = scratchpadReducer(initialScratchpadState('cpp', ''), {
      type: 'SET_CODE',
      payload: 'int main(){}',
    });
    expect(s.code).toBe('int main(){}');
  });

  it('SET_LANG updates lang', () => {
    const s = scratchpadReducer(initialScratchpadState('cpp', ''), {
      type: 'SET_LANG',
      payload: 'py',
    });
    expect(s.lang).toBe('py');
  });

  it('START_PRETEST marks running=true and clears output', () => {
    const prev = {
      ...initialScratchpadState('cpp', ''),
      pretest: { running: false, input: '1\n', output: ['old'], error: undefined },
    };
    const s = scratchpadReducer(prev, { type: 'START_PRETEST' });
    expect(s.pretest.running).toBe(true);
    expect(s.pretest.output).toEqual([]);
    expect(s.pretest.error).toBeUndefined();
  });

  it('PUSH_PRETEST_LINE appends one line', () => {
    const prev = { ...initialScratchpadState('cpp', ''), pretest: { running: true, input: '', output: ['a'], error: undefined } };
    const s = scratchpadReducer(prev, { type: 'PUSH_PRETEST_LINE', payload: 'b' });
    expect(s.pretest.output).toEqual(['a', 'b']);
  });

  it('END_PRETEST marks running=false', () => {
    const prev = { ...initialScratchpadState('cpp', ''), pretest: { running: true, input: '', output: ['x'], error: undefined } };
    const s = scratchpadReducer(prev, { type: 'END_PRETEST' });
    expect(s.pretest.running).toBe(false);
  });

  it('PRETEST_ERROR sets error and ends pretest', () => {
    const prev = { ...initialScratchpadState('cpp', ''), pretest: { running: true, input: '', output: [], error: undefined } };
    const s = scratchpadReducer(prev, { type: 'PRETEST_ERROR', payload: 'compile fail' });
    expect(s.pretest.running).toBe(false);
    expect(s.pretest.error).toBe('compile fail');
  });

  it('SUBMIT_START / SUBMIT_END toggles submitting', () => {
    let s = scratchpadReducer(initialScratchpadState('cpp', ''), { type: 'SUBMIT_START' });
    expect(s.submitting).toBe(true);
    s = scratchpadReducer(s, { type: 'SUBMIT_END' });
    expect(s.submitting).toBe(false);
  });

  it('TOGGLE_PANEL flips the named panel visibility', () => {
    let s = scratchpadReducer(initialScratchpadState('cpp', ''), { type: 'TOGGLE_PANEL', payload: 'pretest' });
    expect(s.showPretestPanel).toBe(false);
    s = scratchpadReducer(s, { type: 'TOGGLE_PANEL', payload: 'records' });
    expect(s.showRecordsPanel).toBe(true);
  });

  it('LOAD_RECORDS replaces records array', () => {
    const records = [{ _id: 'r1', status: 1, lang: 'cpp', time: 1 }];
    const s = scratchpadReducer(initialScratchpadState('cpp', ''), { type: 'LOAD_RECORDS', payload: records });
    expect(s.records).toEqual(records);
  });

  it('WS_STATUS updates wsStatus', () => {
    const s = scratchpadReducer(initialScratchpadState('cpp', ''), { type: 'WS_STATUS', payload: 'open' });
    expect(s.wsStatus).toBe('open');
  });
});
