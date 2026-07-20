import { useState } from 'react';
import { useTranslate } from '../../lib/i18n';
import styles from './SubmitHint.module.css';

const HINT_KEY = 'submit-hint';
const DISMISSED = 'dismiss';

export default function SubmitHint() {
  const t = useTranslate();
  const [visible, setVisible] = useState(() => {
    try {
      return typeof localStorage === 'undefined' || localStorage.getItem(HINT_KEY) !== DISMISSED;
    } catch {
      return true;
    }
  });

  if (!visible) return null;

  const dismissForever = () => {
    setVisible(false);
    try {
      localStorage.setItem(HINT_KEY, DISMISSED);
    } catch {
      // 存储不可用时仍允许关闭当前提示。
    }
  };

  return (
    <aside className={styles.hint} role="note">
      <p>{t('ProblemSubmit.HintBody1')}</p>
      <p>{t('ProblemSubmit.HintBody2')}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => setVisible(false)}>{t('Common.Dismiss')}</button>
        <span aria-hidden="true">/</span>
        <button type="button" onClick={dismissForever}>{t('Common.DontShowAgain')}</button>
      </div>
    </aside>
  );
}
