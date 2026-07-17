import { Card } from '../components/primitives/Card';
import styles from './ErrorSection.module.css';
import type { SectionProps } from './types';

export function ErrorSection({ name, payload }: SectionProps): JSX.Element {
  const message = typeof payload === 'string' ? payload : `Section "${name}" is not implemented`;
  return (
    <Card variant="default" header={<h3 className={styles.title}>⚠ {message}</h3>}>
      <p className={styles.body}>
        The homepage config asked for section <code>{name}</code>, which ui-next does not implement.
        Add a component registered under <code>homepage:section:{name}</code> or remove this entry from
        the <code>hydrooj.homepage</code> setting.
      </p>
    </Card>
  );
}
