import type { ScratchpadAction, ScratchpadState } from './types';

export function initialScratchpadState(initialLang: string, initialCode: string): ScratchpadState {
  return {
    code: initialCode,
    lang: initialLang,
    pretest: { running: false, input: '', output: [] },
    submitting: false,
    records: [],
    showPretestPanel: true,
    showRecordsPanel: false,
    wsStatus: 'idle',
  };
}

export function scratchpadReducer(state: ScratchpadState, action: ScratchpadAction): ScratchpadState {
  switch (action.type) {
    case 'SET_CODE':
      return { ...state, code: action.payload };
    case 'SET_LANG':
      return { ...state, lang: action.payload };
    case 'SET_INPUT':
      return { ...state, pretest: { ...state.pretest, input: action.payload } };
    case 'START_PRETEST':
      return {
        ...state,
        pretest: { running: true, input: state.pretest.input, output: [], error: undefined },
      };
    case 'CLEAR_OUTPUT':
      return {
        ...state,
        pretest: { ...state.pretest, output: [], error: undefined },
      };
    case 'PUSH_PRETEST_LINE':
      return {
        ...state,
        pretest: { ...state.pretest, output: [...state.pretest.output, action.payload] },
      };
    case 'END_PRETEST':
      return { ...state, pretest: { ...state.pretest, running: false } };
    case 'PRETEST_ERROR':
      return {
        ...state,
        pretest: { ...state.pretest, running: false, error: action.payload },
      };
    case 'SUBMIT_START':
      return { ...state, submitting: true };
    case 'SUBMIT_END':
      return { ...state, submitting: false };
    case 'TOGGLE_PANEL':
      return action.payload === 'pretest'
        ? { ...state, showPretestPanel: !state.showPretestPanel }
        : { ...state, showRecordsPanel: !state.showRecordsPanel };
    case 'LOAD_RECORDS':
      return { ...state, records: action.payload };
    case 'WS_STATUS':
      return { ...state, wsStatus: action.payload };
    default:
      return state;
  }
}
