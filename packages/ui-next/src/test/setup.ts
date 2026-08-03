import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// @monaco-editor/react loads its WASM worker pool from a remote CDN; happy-dom
// forbids remote scripts and the resulting unhandled DOMException fails the
// enclosing test file. Stub the React component so the loader never runs.
vi.mock('@monaco-editor/react', () => ({
  default: () => null,
  Editor: () => null,
  loader: { init: () => Promise.resolve({}) },
  useMonaco: () => ({ /* stub monaco namespace */ }),
  loadMonacoEditor: () => Promise.resolve({}),
}));

// @monaco-editor/loader fetches Monaco from a CDN at runtime; happy-dom blocks
// the request and produces an ECONNREFUSED that propagates into the test.
// Stub the loader so @monaco-editor/react never attempts a network fetch.
vi.mock('@monaco-editor/loader', () => {
  const monaco = {
    editor: {
      create: () => ({
        getValue: () => '',
        getModel: () => ({ setValue: () => {} }),
        onDidChangeModelContent: () => ({ dispose: () => {} }),
      }),
    },
    KeyMod: { CtrlCmd: 1 },
    KeyCode: { Enter: 1 },
  };
  type Cancelable<T> = Promise<T> & { cancel: () => void };
  let monacoInstance: typeof monaco | null = null;

  const config = vi.fn((params?: { monaco?: typeof monaco }) => {
    if (params?.monaco) monacoInstance = params.monaco;
  });
  const init = vi.fn(() => {
    const value = monacoInstance ?? monaco;
    let canceled = false;
    const promise = new Promise<typeof monaco>((resolve, reject) => {
      Promise.resolve(value).then((instance) => {
        if (canceled) {
          reject(Object.assign(new Error('operation is manually canceled'), {
            type: 'cancelation',
            msg: 'operation is manually canceled',
          }));
        } else {
          monacoInstance = instance;
          resolve(instance);
        }
      });
    }) as Cancelable<typeof monaco>;
    promise.cancel = () => { canceled = true; };
    return promise;
  });
  const __getMonacoInstance = vi.fn(() => monacoInstance);
  const namedExports = { init, config, __getMonacoInstance };

  return { default: { ...namedExports }, ...namedExports };
});

// Ensure each test starts with a clean DOM.
afterEach(() => {
  cleanup();
});

// Pin locale for deterministic i18n assertions in tests.
// detectLocale() falls back to navigator.language; CI hosts (en-US) would
// otherwise flip every Chinese-literal assertion to English.
(window as unknown as { __hydro_locale?: string }).__hydro_locale = 'zh_CN';

// jsdom/happy-dom do not implement matchMedia; stub it for ThemeProvider.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Provide a localStorage stub if missing (happy-dom already provides one, but keep it defensive).
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
    },
  });
}

// idb-keyval uses the real `indexedDB` global; happy-dom does not implement
// it. Provide an in-memory shim that lets the persisted-draft hooks run.
if (typeof globalThis !== 'undefined' && !(globalThis as { indexedDB?: unknown }).indexedDB) {
  const idbStore = new Map<string, IDBDatabaseLike>();
  (globalThis as { indexedDB?: unknown }).indexedDB = {
    open(name: string) {
      let db = idbStore.get(name);
      if (!db) {
        const stores = new Map<string, Map<string, string>>();
        db = {
          objectStoreNames: { contains: (n: string) => stores.has(n) },
          createObjectStore: (n: string) => {
            const m = new Map<string, string>();
            stores.set(n, m);
            return { createIndex: () => ({}), ...{} };
          },
          transaction: () => {
            const tx = {
              objectStore: () => ({
                get: (k: string) => ({ result: stores.get('hydro')?.get(k) }),
                put: (v: { id: string, value: string }) => {
                  const m = stores.get('hydro') ?? new Map<string, string>();
                  m.set(v.id, v.value);
                  stores.set('hydro', m);
                  return {};
                },
                delete: (k: string) => {
                  stores.get('hydro')?.delete(k);
                  return {};
                },
              }),
            };
            return tx;
          },
        };
        idbStore.set(name, db);
      }
      return {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        result: db,
      };
    },
  };
}

interface IDBDatabaseLike {
  objectStoreNames: { contains: (n: string) => boolean };
  createObjectStore: (n: string) => unknown;
  transaction: () => unknown;
}
