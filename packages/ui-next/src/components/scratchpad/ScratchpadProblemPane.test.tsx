import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageDataProvider } from '../../context/page-data';
import { RouterProvider } from '../../context/router';
import { routeMapStore } from '../../globals';
import { ScratchpadProblemPane } from './ScratchpadProblemPane';

const t = vi.fn((key: string) => key);
vi.mock('../../lib/i18n', () => ({ useTranslate: () => t }));

function wrap(ui: React.ReactNode) {
  return render(
    <PageDataProvider initial={{ name: 'problem_detail', template: '', args: { UiContext: { domainId: 'system', domainVersion: 1 } }, url: '/p/1' }}>
      <RouterProvider>{ui}</RouterProvider>
    </PageDataProvider>,
  );
}

beforeEach(() => {
  routeMapStore._routeMap = { problem_detail: '/p/:pid' };
});

describe('ScratchpadProblemPane', () => {
  it('renders title and content', () => {
    wrap(
      <ScratchpadProblemPane
        pdoc={{ docId: 1, title: 'Two Sum' }}
        contentText="Given an array..."
        contentLangs={['en']}
        preferredLang="en"
        mode="normal"
      />,
    );
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('Given an array...')).toBeInTheDocument();
  });

  it('renders language tabs when multiple langs', () => {
    wrap(
      <ScratchpadProblemPane
        pdoc={{ docId: 1, title: 'T', pid: 'p1' }}
        contentText="body"
        contentLangs={['en', 'zh_CN']}
        preferredLang="en"
        mode="normal"
      />,
    );
    expect(screen.getByRole('link', { name: 'en' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'zh_CN' })).toBeInTheDocument();
  });
});
