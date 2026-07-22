import { useState } from 'react';
import { Button } from '../primitives/Button';
import { Checkbox } from '../primitives/Checkbox';
import { Modal } from '../primitives/Modal';
import { UserSelectAutoComplete } from '../primitives/UserSelectAutoComplete';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import styles from './ContestUserAddDialog.module.css';

export interface ContestUserAddDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  domainId?: string;
}

export function ContestUserAddDialog({ open, onClose, onAdded, domainId }: ContestUserAddDialogProps) {
  const [uids, setUids] = useState<number[]>([]);
  const [unrank, setUnrank] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const t = useTranslate();

  const add = async () => {
    if (uids.length === 0) return;
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'add_user');
      fd.set('uids', uids.join(','));
      if (unrank) fd.set('unrank', 'on');
      await request.post(window.location.pathname, fd);
      toast.success(t('ContestUser.Added', { count: uids.length }));
      setUids([]);
      onAdded();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('ContestUser.AddAttendees')} footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t('ContestUser.Cancel')}</Button>
        <Button variant="primary" onClick={add} disabled={uids.length === 0 || busy}>
          {busy ? t('ContestUser.Adding') : t('ContestUser.Add')}
        </Button>
      </>
    }>
      <div className={styles.body}>
        <label className={styles.label}>{t('ContestUser.Users')}</label>
        <UserSelectAutoComplete value={uids} onChange={setUids} domainId={domainId} />
        <Checkbox
          label={t('ContestUser.AddAsUnranked')}
          checked={unrank}
          onChange={(e) => setUnrank(e.currentTarget.checked)}
        />
      </div>
    </Modal>
  );
}
