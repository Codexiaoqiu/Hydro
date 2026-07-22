import { useState } from 'react';
import { Button } from '../primitives/Button';
import { Checkbox } from '../primitives/Checkbox';
import { Modal } from '../primitives/Modal';
import { UserSelectAutoComplete } from '../primitives/UserSelectAutoComplete';
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

  const add = async () => {
    if (uids.length === 0) return;
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'add_user');
      fd.set('uids', uids.join(','));
      if (unrank) fd.set('unrank', 'on');
      await request.post(window.location.pathname, fd);
      toast.success(`Added ${uids.length} user(s)`);
      setUids([]);
      onAdded();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Attendees" footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" onClick={add} disabled={uids.length === 0 || busy}>{busy ? 'Adding…' : 'Add'}</Button>
      </>
    }>
      <div className={styles.body}>
        <label className={styles.label}>Users</label>
        <UserSelectAutoComplete value={uids} onChange={setUids} domainId={domainId} />
        <Checkbox label="Add as unranked" checked={unrank} onChange={(e) => setUnrank(e.currentTarget.checked)} />
      </div>
    </Modal>
  );
}
