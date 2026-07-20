import { useContestTimer } from '../../lib/contest-timer';
import { useTranslate } from '../../lib/i18n';
import type { SerializedContestStatusDoc, SerializedTdoc } from '../../sections/types';
import styles from './ContestTimer.module.css';

export interface ContestTimerProps {
  tdoc: SerializedTdoc;
  tsdoc: SerializedContestStatusDoc | null;
}

function toMs(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : undefined;
}

export function ContestTimer({ tdoc, tsdoc }: ContestTimerProps) {
  const t = useTranslate();
  const state = useContestTimer({
    beginAt: toMs(tdoc.beginAt) ?? 0,
    duration: tdoc.duration ? Number(tdoc.duration) * 3600_000 : undefined,
    tsdocStartAt: toMs(tsdoc?.startAt),
    tsdocEndAt: toMs(tsdoc?.endAt),
  });

  const label = (() => {
    if (state.status === 'pre') return t('ContestDetail.TimerStarts');
    if (state.status === 'running') return t('ContestDetail.TimerEnds');
    return t('ContestDetail.TimerEnded');
  })();

  return (
    <div className={styles.wrap} data-testid="contest-timer">
      <span className={styles.label}>{label}</span>
      <span className={styles.value} data-testid="contest-countdown">
        {state.display}
      </span>
      <div
        className={styles.progress}
        data-testid="contest-progress"
        style={{ transform: `scaleX(${state.progress})` }}
      />
    </div>
  );
}
