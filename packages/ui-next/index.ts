import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';
import c2k from 'koa2-connect/ts';
import { createServer, type Plugin } from 'vite';
import { serializer } from '@hydrooj/framework';
import {
    Context, Handler, Logger,
    NotFoundError, param, size, Types,
} from 'hydrooj';
import { THEME_INIT_SCRIPT } from './src/theme/theme-init';
import { NEXT_TEMPLATES } from './src/pages/manifest';

const logger = new Logger('ui-next');

const PENDING_HTML = `<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hydro</title>
    <script>
(function () {
    var KEY = '__hydroPendingReload';
    var MAX = 5;
    try {
        var n = parseInt(sessionStorage.getItem(KEY) || '0', 10);
        n = isNaN(n) ? 1 : n + 1;
        sessionStorage.setItem(KEY, String(n));
        if (n > MAX) {
            document.addEventListener('DOMContentLoaded', function () {
                document.body.innerHTML = '<p>Hydro UI build did not finish after ' + MAX + ' reloads.</p>'
                    + '<p>If this persists, the production bundle may be stuck. Please contact the site administrator.</p>'
                    + '<p><a href="." onclick="sessionStorage.removeItem(\\'' + KEY + '\\'); location.reload(); return false;">Try again</a></p>';
            });
            // Stop the meta refresh from firing when the build really is stuck.
            var meta = document.querySelector('meta[http-equiv="refresh"]');
            if (meta) meta.parentNode.removeChild(meta);
        }
    } catch (e) { /* ignore — private mode etc. */ }
})();
    </script>
    <meta http-equiv="refresh" content="3">
</head>
<body>
    <p>Hydro UI is building, please wait and refresh...</p>
</body>
</html>`;

const INJECT_MARKER = '<!-- __HYDRO_INJECTION__DO_NOT_REMOVE_THIS__ -->';
// Escape `<` to its unicode escape so JSON emitted inside a <script> tag cannot
// terminate the surrounding element via an injected `</script>`. This matches
// the Next.js / Remix convention. `>` does not need escaping — only `</` is
// load-bearing.
const escapeForScript = (data: string) => data.replace(/</g, '\\u003c');
const buildInject = (data: string) => `<script id="__HYDRO_INJECTION__" type="application/json">${escapeForScript(data)}</script>`;

// Parse an Accept-Language header into the highest-priority tag, ignoring q=
// values for simplicity (we only need a single best-match hint to feed into
// resolveLocale). Returns null when the header is absent or empty.
function parseAcceptLanguage(header: string | undefined | null): string | null {
    if (!header) return null;
    // Each entry: "tag[;q=...]". Pick the first tag and normalise separators.
    const first = header.split(',')[0];
    if (!first) return null;
    const tag = first.split(';')[0].trim();
    return tag || null;
}

/**
 * Minimal structural type for what we read off `context.handler` inside the
 * renderer. Defined locally to avoid pulling the whole `Handler` class (and
 * its decorator-generated statics) into the type graph — `Handler` lives in
 * `hydrooj` and the framework also decorates subclasses, so a structural
 * duck-type is both safer and lighter than `import type { Handler }`.
 */
interface RenderHandler {
    context: {
        _matchedRouteName: string;
        req: { url: string };
        request?: { headers?: Record<string, string | string[] | undefined> };
        UserContext?: { viewLang?: string };
    };
    response: { template?: string };
    UiContext?: { locale?: string };
}

/**
 * Serialize the `__HYDRO_INJECTION__` payload shared by both the DEV (Vite) and
 * PROD (static) renderers. Centralising this avoids field drift between the two
 * arms of `apply()` — every new injected field is added in exactly one place.
 *
 * @param handler           The framework Handler instance (`context.handler`).
 * @param routeMap          `ctx.server.routeMap` resolved at call time.
 * @param endpoint          `ctx.setting.get('server.url')`, possibly undefined.
 * @param handlerArgs       Merged args the renderer wants to expose to the
 *                          client (`UserContext` + `UiContext` + handler body).
 * @param extras            Caller-specific fields (e.g. `plugins_url`) that
 *                          only make sense in one of the two paths.
 */
function serializeInjection(
    handler: RenderHandler,
    routeMap: Record<string, string>,
    endpoint: string | undefined,
    handlerArgs: Record<string, unknown>,
    extras: Record<string, unknown> = {},
): string {
    const handlerContext = handler.context;
    return JSON.stringify({
        HYDRO_INJECTED: true,
        name: handlerContext._matchedRouteName,
        template: handler.response.template || '',
        args: handlerArgs,
        url: handlerContext.req.url,
        route_map: routeMap,
        endpoint,
        locale: handlerContext.UserContext?.viewLang
            || handler.UiContext?.locale
            || parseAcceptLanguage(handlerContext.request?.headers?.['accept-language'] as string | undefined)
            || undefined,
        ...extras,
    }, serializer(false, handler as never));
}

function getAddonEntries(): Record<string, string> {
    const entries: Record<string, string> = {};
    for (const [name, addon] of Object.entries(global.addons)) {
        const uiEntry = ['ui/index.ts', 'ui/index.tsx', 'ui/index.js', 'ui/index.jsx']
            .map((f) => path.resolve(addon as string, f))
            .find((f) => fs.existsSync(f));
        if (uiEntry) {
            logger.info('UI entry for addon %s: %s', name, uiEntry);
            entries[name] = uiEntry;
        }
    }
    return entries;
}

function hydroPlugins(): Plugin {
    const virtualModuleId = 'virtual:hydro-plugins';
    const resolvedVirtualModuleId = `\0${virtualModuleId}`;

    return {
        name: 'hydro-plugins',
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId;
            }
            return undefined;
        },
        load(id) {
            if (id === resolvedVirtualModuleId) {
                const entries = getAddonEntries();
                if (!Object.keys(entries).length) return 'export default [];';
                const imports = Object.entries(entries).map(([_, e], i) => `import * as plugin${i} from '${e}';`).join('\n');
                const exports = `export default [${Object.entries(entries).map(([addon, _], i) => {
                    return `{ name: '${addon}', ...plugin${i} }`;
                }).join(', ')}];`;
                return `${imports}\n${exports}`;
            }
            return undefined;
        },
    };
}

const federationPlugin: esbuild.Plugin = {
    name: 'federation',
    setup(b) {
        const mappings: Record<string, string> = {
            react: 'React',
            'react-dom/client': 'ReactDOM',
            'react/jsx-runtime': 'jsxRuntime',
        };

        b.onResolve({ filter: /^@hydrooj\/ui-next/ }, () => ({
            path: 'ui-next',
            namespace: 'hydro-federation',
        }));
        for (const mod of Object.keys(mappings)) {
            b.onResolve({ filter: new RegExp(`^${mod.replaceAll('\\', '\\\\').replaceAll('/', '\\/')}$`) }, () => ({
                path: mod,
                namespace: 'hydro-federation',
            }));
        }
        b.onLoad({ filter: /.*/, namespace: 'hydro-federation' }, (args) => {
            if (args.path === 'ui-next') {
                return { contents: 'module.exports = window.__hydroExports;', loader: 'js' };
            }
            const key = mappings[args.path];
            return { contents: `module.exports = window.__hydroExports['${key}'];`, loader: 'js' };
        });
    },
};

const vfs: Record<string, string> = {};
const hashes: Record<string, string> = {};

class UiNextConstantHandler extends Handler {
    noCheckPermView = true;

    @param('name', Types.Filename)
    async all(domainId: string, name: string) {
        if (!vfs[name]) throw new NotFoundError(name);
        this.response.type = 'application/javascript';
        this.response.body = vfs[name];
        this.response.addHeader('ETag', hashes[name]);
        this.response.addHeader('Cache-Control', 'public, max-age=86400');
    }
}

export async function buildPlugins() {
    const start = Date.now();
    let totalSize = 0;
    const entries = getAddonEntries();

    if (!Object.keys(entries).length) {
        vfs['plugins.js'] = 'window.__hydroPlugins = [];';
        hashes['plugins.js'] = '00000000';
        logger.info('No plugins to build');
        return;
    }

    try {
        const result = await esbuild.build({
            stdin: {
                contents: [
                    ...Object.entries(entries).map(([_, e], i) => `import * as plugin${i} from '${e}';`),
                    `window.__hydroPlugins = [${Object.entries(entries).map(([n], i) => `{ name: '${n}', ...plugin${i} }`).join(', ')}];`,
                ].join('\n'),
                resolveDir: process.cwd(),
                loader: 'ts',
            },
            bundle: true,
            format: 'iife',
            write: false,
            target: ['chrome90'],
            plugins: [federationPlugin],
            minify: true,
            jsx: 'automatic',
            jsxImportSource: 'react',
        });
        if (result.errors.length) logger.error('Plugin build errors: %o', result.errors);
        const content = result.outputFiles?.[0]?.text || 'window.__hydroPlugins = [];';
        vfs['plugins.js'] = content;
        hashes['plugins.js'] = crypto.createHash('sha1').update(content).digest('hex').substring(0, 8);
        totalSize += content.length;
        logger.success('Plugins built in %dms (%d entries, %s)', Date.now() - start, entries.length, size(totalSize));
    } catch (e) {
        logger.error('Plugin build failed: %o', e);
    }
}

export async function apply(ctx: Context) {
    if (process.env.HYDRO_CLI) return;
    // Whether the 'next' renderer is currently allowed to serve any templates.
    // Mutable so a `system/setting` listener can hot-toggle ui-next on/off.
    let enabled = true;

    if (process.env.DEV) {
        const vite = await createServer({
            root: __dirname,
            clearScreen: false,
            resolve: {
                alias: {
                    '@': path.resolve(__dirname, 'src'),
                },
            },
            optimizeDeps: {
                include: ['react', 'react-dom', 'react-dom/client', 'react-markdown', 'remark-gfm'],
            },
            server: {
                middlewareMode: true,
                hmr: {
                    port: 3010,
                },
                headers: {
                    'Cross-Origin-Opener-Policy': 'same-origin',
                    'Cross-Origin-Embedder-Policy': 'require-corp',
                },
            },
            appType: 'custom',
            plugins: [hydroPlugins()],
        });
        const middleware = c2k(vite.middlewares);
        const capture = ['/@vite/', '/src/', '/node_modules/', '/@react-refresh', '/@fs', '/@id/'];
        for (const route of capture) {
            ctx.server.addCaptureRoute(route, middleware);
        }
        const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
        ctx.server.registerRenderer('next', {
            name: 'next',
            get accept() { return enabled ? NEXT_TEMPLATES : []; },
            output: 'html',
            asFallback: false,
            priority: 100,
            async render(_name, args, context) {
                const handler = context.handler;
                const serialized = serializeInjection(
                    handler,
                    ctx.server.routeMap,
                    ctx.setting.get('server.url') || undefined,
                    {
                        UserContext: context.UserContext,
                        UiContext: handler.UiContext,
                        ...args,
                    },
                );
                const htmlToRender = html.replace(INJECT_MARKER, buildInject(serialized)).replace('</head>', `<script>${THEME_INIT_SCRIPT}</script></head>`);
                return await vite.transformIndexHtml(context.handler.context.req.url!, htmlToRender);
            },
        });

        // eslint-disable-next-line consistent-return
        return async () => {
            await vite.close().catch((e) => console.error(e));
        };
    } else {
        ctx.Route('ui_next_constants', '/plugins/:version/:name', UiNextConstantHandler);
        ctx.server.registerRenderer('next', {
            name: 'next',
            get accept() { return enabled ? NEXT_TEMPLATES : []; },
            output: 'html',
            asFallback: false,
            priority: 100,
            async render(_name, args, context) {
                const indexHtml = path.join(__dirname, 'public', 'index.html');
                if (!fs.existsSync(indexHtml)) return PENDING_HTML;
                const handler = context.handler;
                const html = fs.readFileSync(indexHtml, 'utf-8').replace('</head>', `<script>${THEME_INIT_SCRIPT}</script></head>`);
                const serialized = serializeInjection(
                    handler,
                    ctx.server.routeMap,
                    ctx.setting.get('server.url') || undefined,
                    {
                        UserContext: context.UserContext,
                        UiContext: handler.UiContext,
                        ...args,
                    },
                    { plugins_url: `/plugins/${hashes['plugins.js'] || '00000000'}/plugins.js` },
                );
                return html.replace(INJECT_MARKER, buildInject(serialized));
            },
        });
        ctx.on('app/started', buildPlugins);
        const debouncedBuild = ctx.debounce(buildPlugins, 2000);
        const triggerHotUpdate = (filePath?: string) => {
            if (filePath && !filePath.includes('/ui/')) return;
            debouncedBuild();
        };
        ctx.on('app/watch/change', triggerHotUpdate);
        ctx.on('app/watch/unlink', triggerHotUpdate);
        ctx.on('system/setting', () => debouncedBuild());
    }
}
