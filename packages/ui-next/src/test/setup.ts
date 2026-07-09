import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

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