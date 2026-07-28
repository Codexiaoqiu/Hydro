import { Suspense, useMemo, useSyncExternalStore } from 'react';
import DefaultLayout from './components/layout';
import { Loading, ToastProvider } from './components/primitives';
import { usePageData } from './context/page-data';
import { useTranslate } from './lib/i18n';
import { defineSlot } from './registry';
import { SlotErrorBoundary } from './registry/error-boundary';
import { store } from './registry/store';

const App = defineSlot('app:root', () => {
  const { name, template, args } = usePageData();
  const t = useTranslate();

  const isError = !!(args as Record<string, unknown>).error;

  const [slotName, entry] = useMemo(() => {
    if (isError) {
      return ['page:error', store.getDefault('page:error')] as const;
    }
    const templateName = typeof template === 'string' ? template.replace(/\.html$/, '') : null;
    if (templateName) {
      const templateSlot = `page:${templateName}` as `page:${string}`;
      const templateEntry = store.getDefault(templateSlot);
      if (templateEntry) {
        if (import.meta.env.DEV) {
          console.log(`[ui-next] using template "${templateName}" for page "${name}"`);
        }
        return [templateSlot, templateEntry] as const;
      }
    }
    const slot = `page:${name}` as `page:${string}`;
    if (import.meta.env.DEV) {
      console.log(`[ui-next] using page slot "${slot}"`);
    }
    return [slot, store.getDefault(slot)] as const;
  }, [name, template, isError]);

  const [subscribe, getSnapshot] = useMemo(() => [
    (cb: () => void) => store.subscribe(slotName, cb),
    () => store.getVersion(slotName),
  ], [slotName]);

  useSyncExternalStore(subscribe, getSnapshot);

  if (!entry) {
    return (
      <DefaultLayout>
        <div style={{ padding: 32 }}>
          <h2>This page does not have a new-UI implementation yet</h2>
          <p>
            The server has decided this route belongs to ui-next,
            but the client has no registered page <code>{name}</code>.
          </p>
          <p>
            This is a manifest drift or stale build artifact. Please return to the{' '}
            <a href="/">homepage</a>.
          </p>
        </div>
      </DefaultLayout>
    );
  }

  const Layout = store.getDefault(`layout:${entry.layout}`) ?? DefaultLayout;
  const { Page } = entry;

  return (
    <SlotErrorBoundary slotName={slotName} label="renderer">
      <Suspense fallback={null}>
        <ToastProvider>
          <Layout>
            <Suspense fallback={<Loading size="block" ariaLabel={t('Common.Loading')} />}>
              <Page />
            </Suspense>
          </Layout>
        </ToastProvider>
      </Suspense>
    </SlotErrorBoundary>
  );
});

export default App;
