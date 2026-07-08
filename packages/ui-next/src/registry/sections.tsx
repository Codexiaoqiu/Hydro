import { Suspense, useSyncExternalStore } from 'react';
import { SlotErrorBoundary } from './error-boundary';
import { store } from './store';
import { ErrorSection } from '../sections/ErrorSection';
import type { SectionProps } from '../sections/types';

function slotName(name: string) {
  return `homepage:section:${name}` as const;
}

/**
 * Homepage section dispatcher: looks up the named slot, renders the registered
 * section component, and falls back to <ErrorSection> for unknown names.
 * Addons extend by calling defineSlot('homepage:section:<name>', Comp) themselves.
 */
export function SectionSlot({ name, payload, udict, domain }: SectionProps): JSX.Element {
  const subscribe = (cb: () => void) => store.subscribe(slotName(name), cb);
  const getSnapshot = () => store.getVersion(slotName(name));
  useSyncExternalStore(subscribe, getSnapshot);

  const Section = store.getDefault(slotName(name)) as React.FC<SectionProps> | undefined;
  if (!Section) {
    return <ErrorSection name={name} payload={payload} udict={udict} domain={domain} />;
  }
  return (
    <SlotErrorBoundary slotName={slotName(name)} label="section">
      <Suspense fallback={null}>
        <Section name={name} payload={payload} udict={udict} domain={domain} />
      </Suspense>
    </SlotErrorBoundary>
  );
}
