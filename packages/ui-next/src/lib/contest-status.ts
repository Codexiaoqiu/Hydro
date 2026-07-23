import type { SerializedTdoc } from '../sections/types';

const DAY_MS = 86_400_000;

export function isOngoing(
  t: Pick<SerializedTdoc, 'beginAt' | 'endAt'>,
  now = Date.now(),
): boolean {
  const begin = new Date(t.beginAt).getTime();
  const end = new Date(t.endAt).getTime();
  return begin <= now && now < end;
}

export function isUpcoming(t: SerializedTdoc, days = 7, now = Date.now()): boolean {
  const begin = new Date(t.beginAt).getTime();
  return now < begin && now >= begin - days * DAY_MS;
}

export function isDone(t: SerializedTdoc, now = Date.now()): boolean {
  return now >= new Date(t.endAt).getTime();
}

export function isExtended(t: SerializedTdoc, now = Date.now()): boolean {
  if (!t.penaltySince) return false;
  return now > new Date(t.penaltySince).getTime() && now < new Date(t.endAt).getTime();
}

export function renderDuration(t: SerializedTdoc): string {
  if (t.duration) return Number(t.duration).toFixed(1);
  if (!t.beginAt || !t.endAt) return '?';
  const hours = (new Date(t.endAt).getTime() - new Date(t.beginAt).getTime()) / 3_600_000;
  return hours.toFixed(1);
}

interface TrainingStatus {
  attend?: number;
  enroll?: number;
  done?: boolean;
  donePids?: string[];
  totalPids?: number;
}

export function statusText(t: SerializedTdoc, status?: TrainingStatus, now = Date.now()): string {
  if (status?.enroll && status?.done) return '已完成';
  if (isDone(t, now)) return '已结束';
  if (isOngoing(t, now)) return '进行中';
  if (isUpcoming(t, 7, now)) return '未开始';
  if (status?.enroll) return '进行中';
  return '未开始';
}
