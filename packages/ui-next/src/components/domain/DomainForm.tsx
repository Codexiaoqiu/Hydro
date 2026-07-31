import { Input } from '../primitives/Input';

export interface DomainFields {
  name: string;
  displayName: string;
  gravatar: string;
}

export interface DomainFormProps {
  domain: Partial<DomainFields>;
  mode: 'create' | 'edit';
}

export function DomainForm({ domain, mode }: DomainFormProps) {
  return (
    <form>
      <Input label="Name" name="name" value={domain.name ?? ''} disabled={mode === 'edit'} />
      <Input label="Display Name" name="displayName" value={domain.displayName ?? ''} />
      <Input label="Gravatar" name="gravatar" value={domain.gravatar ?? ''} />
      <button type="submit">{mode === 'create' ? 'Create' : 'Save'}</button>
    </form>
  );
}
