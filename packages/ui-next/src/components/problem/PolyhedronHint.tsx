import { useState } from 'react';
import { Alert } from '../primitives';
import { useTranslate } from '../../lib/i18n';
import styles from './PolyhedronHint.module.css';

const STORAGE_KEY = 'hydro.polyhedron-hint-dismissed';

export function PolyhedronHint() {
  const t = useTranslate();
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== '1'
  );
  if (!open) return null;
  const dismissOnce = () => setOpen(false);
  const dismissForever = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* SSR / private mode */ }
    setOpen(false);
  };
  return (
    <Alert variant="info" className={styles.hint}>
      <p>{t('Polyhedron_Intro')}</p>
      <p>{t('Polyhedron_Feature')}</p>
      <p>{t('Polyhedron_Import')}</p>
      <div className={styles.actions}>
        <a href="https://polyhedron.hydro.ac/" target="_blank" rel="noreferrer">{t('Common.OpenPolyhedron')}</a>
        <button type="button" onClick={dismissOnce}>{t('Common.Dismiss')}</button>
        <button type="button" onClick={dismissForever}>{t("Common.DontShowAgain")}</button>
      </div>
    </Alert>
  );
}