export interface ScratchpadRecord {
  _id: string;
  status: number;
  lang: string;
  time: number;
}

export interface PretestState {
  running: boolean;
  input: string;
  output: string[];
  error?: string;
}

export type WsStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export interface ScratchpadState {
  code: string;
  lang: string;
  pretest: PretestState;
  submitting: boolean;
  records: ScratchpadRecord[];
  showPretestPanel: boolean;
  showRecordsPanel: boolean;
  wsStatus: WsStatus;
}

export type ScratchpadAction =
  | { type: 'SET_CODE'; payload: string }
  | { type: 'SET_LANG'; payload: string }
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'START_PRETEST' }
  | { type: 'CLEAR_OUTPUT' }
  | { type: 'PUSH_PRETEST_LINE'; payload: string }
  | { type: 'END_PRETEST' }
  | { type: 'PRETEST_ERROR'; payload: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END' }
  | { type: 'TOGGLE_PANEL'; payload: 'pretest' | 'records' }
  | { type: 'LOAD_RECORDS'; payload: ScratchpadRecord[] }
  | { type: 'WS_STATUS'; payload: WsStatus };

export interface WSMessage {
  type: string;
  payload?: unknown;
}
