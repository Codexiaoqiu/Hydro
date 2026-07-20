export type TimerOptions = {
  beginAt: number;
  duration?: number;
  tsdocStartAt?: number;
  tsdocEndAt?: number;
};

export type TimerState = {
  status: 'pre' | 'running' | 'ended';
  msLeft: number;
  progress: number;
  display: string;
};

export function computeTimerState(now: number, opts: TimerOptions): TimerState {
  const start = opts.tsdocStartAt ?? opts.beginAt;
  const end =
    opts.tsdocEndAt ??
    (typeof opts.duration === 'number' ? opts.beginAt + opts.duration : Number.NEGATIVE_INFINITY);

  if (now < start) {
    const msLeft = start - now;
    return { status: 'pre', msLeft, progress: 0, display: formatDuration(msLeft) };
  }
  if (now >= end) {
    return { status: 'ended', msLeft: 0, progress: 1, display: '00:00' };
  }
  const msLeft = end - now;
  const total = end - start;
  const progress = total > 0 ? (now - start) / total : 0;
  return { status: 'running', msLeft, progress, display: formatDuration(msLeft) };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h === 0) return `${pad2(m)}:${pad2(s)}`;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
