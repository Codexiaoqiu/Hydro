/* @vitest-environment happy-dom */
import loader, * as loaderModule from '@monaco-editor/loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('@monaco-editor/loader test mock', () => {
  it('supports the default loader import without network requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const named = loaderModule as typeof loaderModule & {
      init: typeof loader.init;
      config: typeof loader.config;
      __getMonacoInstance: typeof loader.__getMonacoInstance;
    };

    expect(loader).toEqual(expect.objectContaining({
      init: expect.any(Function),
      config: expect.any(Function),
      __getMonacoInstance: expect.any(Function),
    }));
    expect(named.init).toBe(loader.init);
    expect(named.config).toBe(loader.config);
    expect(named.__getMonacoInstance).toBe(loader.__getMonacoInstance);

    const pending = loader.init();
    expect(pending.cancel).toEqual(expect.any(Function));

    const monaco = await pending;
    expect(monaco.editor).toBeDefined();
    expect(loader.__getMonacoInstance()).toBe(monaco);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
