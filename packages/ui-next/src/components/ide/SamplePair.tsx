import type { ReactNode } from 'react';
import { IDEFrame } from './IDEFrame';
import styles from './SamplePair.module.css';

interface FrameSpec { filename: string, lineNo: number, value: ReactNode, actions?: ReactNode[] }

interface Props {
  num: number;
  input: FrameSpec;
  output: FrameSpec;
}

export function SamplePair({ num, input, output }: Props) {
  return (
    <div className={styles.samples}>
      <div className={styles.col}>
        <h4 className={styles.h}><span className={styles.num}>{num}</span>输入数据</h4>
        <IDEFrame filename={input.filename} lineNo={input.lineNo} actions={input.actions}>{input.value}</IDEFrame>
      </div>
      <div className={styles.arrow}>→</div>
      <div className={styles.col}>
        <h4 className={styles.h}><span className={styles.num}>{num}</span>输出数据</h4>
        <IDEFrame filename={output.filename} lineNo={output.lineNo} actions={output.actions}>{output.value}</IDEFrame>
      </div>
    </div>
  );
}
