import { Chip, Eyebrow } from '../primitives';
import { Ring } from '../charts/Ring';
import styles from './ProblemHero.module.css';

interface PdocLite {
  docId: number;
  pid?: string;
  title: string;
  difficulty?: number;
  nSubmit?: number;
  nAccept?: number;
  tag?: string[];
  config?: {
    type?: string;
    subType?: string;
    timeMin?: number;
    timeMax?: number;
    memoryMin?: number;
    memoryMax?: number;
    [k: string]: unknown;
  } | string;
}

interface Props {
  pdoc: PdocLite;
}

export function ProblemHero({ pdoc }: Props) {
  const cfg = typeof pdoc.config === 'object' && pdoc.config ? pdoc.config : null;
  const nSubmit = pdoc.nSubmit ?? 0;
  const nAccept = pdoc.nAccept ?? 0;
  const passRate = nSubmit > 0 ? Math.round((nAccept / nSubmit) * 100) : 0;
  const typeLabel = cfg?.type ?? 'default';
  const levelLabel = pdoc.difficulty != null ? `Level ${pdoc.difficulty}` : 'Beginner';
  const prefix = `#${pdoc.pid ?? pdoc.docId}`;

  return (
    <section className={styles.hero}>
      <div className={styles.left}>
        <Eyebrow>Problem · {typeLabel} · {levelLabel}</Eyebrow>
        <h1 className={styles.title}>
          <span className={styles.prefix}>{prefix}</span>
          {pdoc.title}
        </h1>
        <div className={styles.chips}>
          <Chip>ID <strong>{pdoc.docId}</strong></Chip>
          {cfg?.timeMin != null && cfg?.timeMax != null && (
            <Chip>
              <strong>{cfg.timeMin === cfg.timeMax ? cfg.timeMin : `${cfg.timeMin}~${cfg.timeMax}`}</strong> ms
            </Chip>
          )}
          {cfg?.memoryMin != null && cfg?.memoryMax != null && (
            <Chip>
              <strong>{cfg.memoryMin === cfg.memoryMax ? cfg.memoryMin : `${cfg.memoryMin}~${cfg.memoryMax}`}</strong> MiB
            </Chip>
          )}
          {pdoc.difficulty != null && (
            <Chip variant="diff">难度 <strong>{pdoc.difficulty} / 10</strong></Chip>
          )}
          {pdoc.tag?.map((t) => (
            <Chip key={t} variant="tag">{t}</Chip>
          ))}
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>通过率</div>
          <div className={styles.ringWrap}>
            <Ring percent={passRate} />
            <div className={styles.detail}>
              <div className={styles.row}><span>提交</span><b>{nSubmit.toLocaleString()}</b></div>
              <div className={styles.row}><span>通过</span><b>{nAccept.toLocaleString()}</b></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
