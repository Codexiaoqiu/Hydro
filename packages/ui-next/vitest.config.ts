import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    root: __dirname,
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    define: {
        // registry/store.ts and globals.ts use `import.meta.hot?.data?.x` guards
        // but fall through to `if (import.meta.hot) import.meta.hot.data.x = y`
        // when no Vite HMR is loaded. Vitest's runner evaluates those modules
        // before our setup file runs, and `import.meta.hot.data` is undefined,
        // so we replace `import.meta.hot` with `undefined` so the short-circuit
        // takes effect. The define is a string (esbuild constant-fold) so the
        // truthy guards fold away cleanly.
        'import.meta.hot': 'undefined',
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: ['node_modules', 'dist', '.cache', 'e2e'],
        css: {
            modules: { classNameStrategy: 'non-scoped' },
        },
    },
});
