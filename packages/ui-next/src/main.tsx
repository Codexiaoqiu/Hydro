import './styles/tokens.css';
import './styles/reset.css';
import './styles/globals.css';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

import './pages';
// Side-effect imports: register layout/auth slot defaults with the registry on startup.
import './components/auth/auth-layout';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as api from './api';
import App from './app';
import { SignInDialog } from './components/auth/SignInDialog';
import { PageDataProvider } from './context/page-data';
import { SignInDialogProvider } from './hooks/use-sign-in-dialog';
import { RouterProvider } from './context/router';
import { initialPage, pluginsUrl } from './globals';
import { installPlugin } from './registry';
import { ThemeProvider } from './theme/ThemeProvider';

declare global {
  interface Window {
    __hydroExports: typeof api;
    __hydroPlugins?: api.PluginDefinition[];
  }
}

window.__hydroExports = api;

async function loadPlugins() {
  let plugins: api.PluginDefinition[] = [];
  if (import.meta.env.DEV) {
    const mod = await import('virtual:hydro-plugins');
    plugins = mod.default || [];
  } else {
    try {
      await import(/* @vite-ignore */ pluginsUrl || '/plugins.js');
      plugins = window.__hydroPlugins || [];
    } catch (e) {
      console.warn('[Hydro] Failed to load plugins:', e);
    }
  }

  for (const plugin of plugins) {
    console.log(`[Hydro] Installing plugin: ${plugin.name}`);
    try {
      installPlugin(plugin);
    } catch (e) {
      console.error(`[Hydro] Failed to install plugin ${plugin.name}:`, e);
    }
  }
}

// eslint-disable-next-line antfu/no-top-level-await
await loadPlugins();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SignInDialogProvider>
        <PageDataProvider initial={initialPage}>
          <RouterProvider>
            <App />
            <SignInDialog />
          </RouterProvider>
        </PageDataProvider>
      </SignInDialogProvider>
    </ThemeProvider>
  </StrictMode>,
);
