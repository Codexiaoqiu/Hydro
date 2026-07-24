/* @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { pickPreferredLang, readContentText } from './problem_detail';
import ProblemDetailPage from './problem_detail';
import { type PageData, PageDataProvider } from '../context/page-data';
import { ToastProvider } from '../components/primitives';

Object.defineProperty(window, 'location', {
  value: new URL('http://localhost/p/1?mode=scratchpad'),
  writable: true,
});

vi.mock('../context/router', () => ({
  RouterProvider: ({ children }: any) => children,
  useNavigate: () => () => {},
}));

vi.mock('../lib/perms', async () => {
  const actual = await vi.importActual('../lib/perms');
  return {
    ...actual,
    isLoggedIn: () => true,
    canSubmitProblem: () => true,
  };
});

vi.mock('../components/scratchpad/ScratchpadPanel', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    ScratchpadPanel: (props: any) =>
      React.createElement('div', { role: 'complementary', 'aria-label': 'Problem statement' },
        React.createElement('div', { role: 'toolbar' },
          React.createElement('button', {
            type: 'button',
            onClick: () => {
              if (window.confirm('Unsaved changes. Continue?') !== false) {
                props.onExit();
              }
            }
          }, 'Exit')
        )
      ),
  };
});

const SAMPLE_MD_ZH = '**这是一道交互题。**\n\n## 题目描述\n\n小 Y 的银行有 $N$ 个客户。';
const SAMPLE_MD_EN = '**This is an interactive problem.**\n\n## Description\n\nBank of Xiao Y has $N$ customers.';

describe('readContentText', () => {
  it('returns empty string for undefined / empty input', () => {
    expect(readContentText(undefined, 'zh')).toBe('');
    expect(readContentText('', 'zh')).toBe('');
  });

  it('parses the server-side JSON-string form and picks the requested locale', () => {
    const json = JSON.stringify({ zh: SAMPLE_MD_ZH, en: SAMPLE_MD_EN });
    expect(readContentText(json, 'zh')).toBe(SAMPLE_MD_ZH);
    expect(readContentText(json, 'en')).toBe(SAMPLE_MD_EN);
  });

  it('strips the JSON wrapper characters (no leakage into markdown body)', () => {
    const json = JSON.stringify({ zh: SAMPLE_MD_ZH });
    const out = readContentText(json, 'zh');
    expect(out).not.toMatch(/^\{/);
    expect(out).not.toMatch(/[\\"{}]/);
    expect(out.startsWith('**这是一道交互题。**')).toBe(true);
  });

  it('falls back to the first available locale when the requested one is missing', () => {
    const json = JSON.stringify({ zh: SAMPLE_MD_ZH });
    expect(readContentText(json, 'en')).toBe(SAMPLE_MD_ZH);
  });

  it('falls back from zh_CN to zh when the content is keyed { en, zh }', () => {
    const json = JSON.stringify({ en: SAMPLE_MD_EN, zh: SAMPLE_MD_ZH });
    expect(readContentText(json, 'zh_CN')).toBe(SAMPLE_MD_ZH);
  });

  it('matches regional siblings (zh_TW, zh_HK) when asked for zh_CN', () => {
    const json = JSON.stringify({ en: SAMPLE_MD_EN, zh_TW: SAMPLE_MD_ZH });
    expect(readContentText(json, 'zh_CN')).toBe(SAMPLE_MD_ZH);
  });

  it('still supports the already-parsed object form (Record<string, string>)', () => {
    expect(readContentText({ zh: SAMPLE_MD_ZH, en: SAMPLE_MD_EN }, 'zh')).toBe(SAMPLE_MD_ZH);
    expect(readContentText({ zh: SAMPLE_MD_ZH }, 'fr')).toBe(SAMPLE_MD_ZH);
  });

  it('returns raw markdown as-is when the string is not JSON-shaped', () => {
    const raw = '## Hello\n\nworld';
    expect(readContentText(raw, 'zh')).toBe(raw);
  });

  it('handles a string whose leading content looks like JSON but is malformed', () => {
    const broken = '{not really json';
    expect(readContentText(broken, 'zh')).toBe(broken);
  });

  it('handles a JSON string whose root is an array (defensive: treat as raw)', () => {
    const arr = '["a","b"]';
    expect(readContentText(arr, 'zh')).toBe(arr);
  });

  it('tolerates surrounding whitespace before the JSON object', () => {
    const padded = `   ${JSON.stringify({ zh: SAMPLE_MD_ZH })}`;
    expect(readContentText(padded, 'zh')).toBe(SAMPLE_MD_ZH);
  });
});

describe('pickPreferredLang', () => {
  it('lets ?lang= override everything when the key exists in contentLangs', () => {
    expect(pickPreferredLang(['en', 'zh'], { fromQuery: 'en', navigatorLanguage: 'zh-CN' }))
      .toBe('en');
    expect(pickPreferredLang(['en', 'zh'], { fromQuery: 'fr', navigatorLanguage: 'zh-CN' }))
      .toBe('zh');
  });

  it('honors userLang (UserContext.viewLang) over the browser locale', () => {
    expect(pickPreferredLang(['en', 'zh'], { userLang: 'en', navigatorLanguage: 'zh-CN' }))
      .toBe('en');
    expect(pickPreferredLang(['en', 'zh_CN'], { userLang: 'zh_CN', navigatorLanguage: 'en-US' }))
      .toBe('zh_CN');
  });

  it('picks zh when the viewer is in a Chinese browser and content is { en, zh }', () => {
    expect(pickPreferredLang(['en', 'zh'], { navigatorLanguage: 'zh-CN' })).toBe('zh');
  });

  it('matches the base locale against zh_CN / zh_TW variants', () => {
    expect(pickPreferredLang(['en', 'zh_CN'], { navigatorLanguage: 'zh-CN' })).toBe('zh_CN');
    expect(pickPreferredLang(['en', 'zh_TW'], { navigatorLanguage: 'zh-TW' })).toBe('zh_TW');
  });

  it('prefers the server-injected locale over navigator.language', () => {
    expect(pickPreferredLang(['en', 'zh_CN'], {
      injectedLocale: 'zh_CN',
      navigatorLanguage: 'en-US',
    })).toBe('zh_CN');
  });

  it('falls back to contentLangs[0] when no base locale is available', () => {
    expect(pickPreferredLang(['en', 'zh'], {})).toBe('en');
  });

  it('defaults to zh_CN when only zh-base is detected but contentLangs is empty', () => {
    expect(pickPreferredLang([], { navigatorLanguage: 'zh-CN' })).toBe('zh_CN');
    expect(pickPreferredLang([], {})).toBe('en');
  });

  it('ignores userLang when it is not present in contentLangs', () => {
    expect(pickPreferredLang(['en', 'zh'], { userLang: 'de', navigatorLanguage: 'zh-CN' }))
      .toBe('zh');
  });
});

function buildPageData(args: any = {}) {
  const userCtx = args.UserContext ?? {
    _id: 1,
    hasPerm: () => true,
    own: () => false,
    viewLang: 'en',
    codeLang: 'cpp',
    codeTemplate: '',
    canViewRecord: true,
  };
  return {
    name: 'problem_detail',
    template: 'problem_detail.html',
    url: '/p/1',
    args: { UserContext: userCtx, UiContext: {}, ...args },
  } as PageData;
}

function renderProblemDetail(args: any) {
  return render(
    <PageDataProvider initial={buildPageData(args)}>
      <ToastProvider>
        <ProblemDetailPage />
      </ToastProvider>
    </PageDataProvider>,
  );
}

const defaultArgs = {
  pdoc: {
    docId: 1,
    pid: '1',
    title: 'Test Problem',
    nSubmit: 10,
    nAccept: 5,
    content: { en: 'Problem statement body' },
    config: { type: 'default', langs: ['cpp'], timeMin: 1000, timeMax: 2000, memoryMin: 256, memoryMax: 512 },
  },
  rdoc: undefined,
  psdoc: undefined,
  tsdoc: undefined,
  tdocs: [],
  ctdocs: [],
  htdocs: [],
  discussionCount: 0,
  solutionCount: 0,
};

describe('problem_detail scratchpad mode', () => {
  it('mounts ScratchpadPanel when ?mode=scratchpad is in the URL', () => {
    renderProblemDetail({ ...defaultArgs });
    expect(screen.getByRole('complementary', { name: /problem statement/i })).toBeInTheDocument();
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('removes mode=scratchpad when exit button is clicked and confirm is accepted', () => {
    window.confirm = vi.fn(() => true);
    // Override history.pushState to update our custom window.location
    const origPushState = window.history.pushState.bind(window.history);
    window.history.pushState = (_state: any, _title: string, url: string) => {
      const newUrl = url.startsWith('http') ? url : `http://localhost${url}`;
      Object.defineProperty(window, 'location', {
        value: new URL(newUrl),
        writable: true,
      });
    };
    renderProblemDetail({ ...defaultArgs });
    // Directly call handleExit via the onExit prop by clicking
    const exitBtn = screen.getByRole('button', { name: /exit/i });
    // Spy on window.history.pushState to verify it's called
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    fireEvent.click(exitBtn);
    // confirm should have been called
    expect(window.confirm).toHaveBeenCalled();
    // pushState should have been called with URL without mode=scratchpad
    expect(pushStateSpy).toHaveBeenCalled();
    const calledUrl = pushStateSpy.mock.calls[0][2] as string;
    expect(new URL(calledUrl).searchParams.has('mode')).toBe(false);
    window.history.pushState = origPushState;
  });
});

describe('problem_detail normal mode', () => {
  // Override the scratchpad-mode URL set at the top of this file so the page
  // actually renders the normal-mode branch (which is where ProblemOpenGraph
  // is mounted).
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/p/1'),
      writable: true,
    });
  });

  it('mounts ProblemOpenGraph meta tags when rendered in normal mode', () => {
    renderProblemDetail({
      ...defaultArgs,
      pdoc: { ...defaultArgs.pdoc, title: 'OG Test Problem' },
    });
    // ProblemOpenGraph injects og:title / og:description / og:type meta tags.
    const ogTitle = document.head.querySelector('meta[property="og:title"]');
    expect(ogTitle).not.toBeNull();
    expect(ogTitle?.getAttribute('content')).toContain('OG Test Problem');
  });
});
