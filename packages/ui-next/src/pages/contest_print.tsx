import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestManagementSidebar } from '../components/contest/ContestManagementSidebar';
import { PrintKiosk } from '../components/contest/PrintKiosk';
import { ToastProvider } from '../components/primitives/Toast';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';
import styles from './contest_print.module.css';

export interface ContestPrintPageArgs {
  tdoc?: { docId: number | string, title?: string, allowPrint?: boolean };
  /** Server flags the admin wiring via the template, mirroring ui-default's
   *  `data-is-admin` attribute on `printKioskContainer`. */
  isAdmin?: boolean;
}

export default function ContestPrintPage() {
  const t = useTranslate();
  const { args } = usePageData() as unknown as { args: ContestPrintPageArgs };

  if (!args?.tdoc) {
    return (
      <div className={styles.page} data-page="contest_print">
        <p>{t('Common.Loading')}</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className={styles.page} data-page="contest_print">
        <div className={styles.layout}>
          <main className={styles.main}>
            <ContestBackLink tdoc={args.tdoc} />
            <PrintKiosk tdoc={args.tdoc} isAdmin={!!args.isAdmin} />
          </main>
          <ContestManagementSidebar tdoc={args.tdoc as { docId: number; title?: string }} />
        </div>
      </div>
    </ToastProvider>
  );
}
