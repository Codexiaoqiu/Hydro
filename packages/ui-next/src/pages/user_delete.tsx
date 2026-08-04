import { useState } from 'react';
import { Button, Card, ConfirmDialog, Input } from '../components/primitives';
import { usePageData } from '../context/page-data';
import { apiClient } from '../lib/api-client';

export interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
}

export default function UserDeletePage() {
  const { url } = usePageData();
  const [password, setPassword] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await apiClient.post(url, { password });
      window.location.href = '/';
    } catch (e) {
      setSubmitting(false);
      setOpen(false);
      // TODO: replace with a proper toast component
      window.alert(`Delete failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="user-delete">
      <Card
        variant="default"
        header={<h1 className="user-delete__title">Delete Account</h1>}
      >
        <p className="user-delete__warning">
          This action is irreversible. All your submissions, problems, and domain memberships
          will be removed.
        </p>
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button variant="danger" onClick={() => setOpen(true)} disabled={submitting}>
          Confirm Delete
        </Button>
      </Card>
      <ConfirmDialog
        open={open}
        title="Are you absolutely sure?"
        message="Your account and associated data will be permanently deleted."
        confirmLabel={submitting ? 'Deleting…' : 'Delete forever'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
