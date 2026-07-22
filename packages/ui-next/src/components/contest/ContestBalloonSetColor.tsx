import { useState } from 'react';
import { HexColorPicker } from '../primitives/HexColorPicker';
import { Modal } from '../primitives/Modal';
import { Button } from '../primitives/Button';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import * as yaml from 'js-yaml';
import styles from './ContestBalloonSetColor.module.css';

export interface ContestBalloonSetColorProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: string;
}

export function ContestBalloonSetColor({ open, onClose, onSaved, initial = '#fbbd23' }: ContestBalloonSetColorProps) {
  const [color, setColor] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const save = async () => {
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'set_color');
      fd.set('color', yaml.dump({ default: color }));
      await request.post(window.location.pathname, fd);
      toast.success('Color saved');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Set Balloon Color" footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
      </>
    }>
      <div className={styles.body}>
        {/* HexColorPicker does not expose a `disabled` prop; overlay the busy
            state by intercepting the swatch with a pointer-events guard when
            a save is in flight. */}
        <div style={{ pointerEvents: busy ? 'none' : 'auto', opacity: busy ? 0.6 : 1 }}>
          <HexColorPicker value={color} onChange={setColor} />
        </div>
      </div>
    </Modal>
  );
}
