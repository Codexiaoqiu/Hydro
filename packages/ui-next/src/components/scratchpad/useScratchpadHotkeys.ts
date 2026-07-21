import { useEffect } from 'react';

export interface ScratchpadHotkeys {
  onRunPretest: () => void;
  onSubmit: () => void;
  onExit: () => void;
  onTogglePretest: () => void;
  onToggleRecords: () => void;
  canPretest: boolean;
}

export function useScratchpadHotkeys({ onRunPretest, onSubmit, onExit, onTogglePretest, onToggleRecords, canPretest }: ScratchpadHotkeys) {
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.altKey && (ev.key === 'q' || ev.key === 'Q')) {
        ev.preventDefault();
        onExit();
        return;
      }
      if (ev.altKey && (ev.key === 'p' || ev.key === 'P')) {
        ev.preventDefault();
        onTogglePretest();
        return;
      }
      if (ev.altKey && (ev.key === 'r' || ev.key === 'R')) {
        ev.preventDefault();
        onToggleRecords();
        return;
      }
      if (ev.key === 'F9' && canPretest) {
        ev.preventDefault();
        onRunPretest();
        return;
      }
      if (ev.key === 'F10') {
        ev.preventDefault();
        onSubmit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRunPretest, onSubmit, onExit, onTogglePretest, onToggleRecords, canPretest]);
}
