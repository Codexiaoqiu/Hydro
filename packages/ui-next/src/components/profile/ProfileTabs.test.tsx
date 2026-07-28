/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileTabs } from './ProfileTabs';

vi.mock('../link', () => ({
  Link: ({ children, ...rest }: any) => <a {...rest}>{children}</a>,
}));

function renderTabs(props: any) {
  return render(<ProfileTabs {...props} />);
}

describe('ProfileTabs', () => {
  it('renders the bio tab by default with the bio source', () => {
    renderTabs({ bio: 'hello world' });
    expect(screen.getByRole('tab', { name: '简介' })).toBeInTheDocument();
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('shows the empty state when bio is missing', () => {
    renderTabs({});
    expect(screen.getByText(/该用户很懒/)).toBeInTheDocument();
  });

  it('hides the accepted problems tab when pdocs is empty', () => {
    renderTabs({ bio: 'x', acceptedProblems: [] });
    expect(screen.queryByRole('tab', { name: /通过的题目/ })).toBeNull();
  });

  it('renders accepted problems when the accepted tab is present', () => {
    renderTabs({
      bio: 'x',
      acceptedProblems: [{ docId: 1001, title: 'A+B', pid: '1001' }],
    });
    expect(screen.getByRole('tab', { name: /通过的题目/ })).toBeInTheDocument();
  });

  it('renders additional plugin tabs after the accepted tab', () => {
    const pluginTabs = [
      { key: 'submissions', label: '提交记录', render: () => <div>plugin-content</div> },
    ];
    renderTabs({ bio: 'x', pluginTabs });
    const pluginTab = screen.getByRole('tab', { name: '提交记录' });
    expect(pluginTab).toBeInTheDocument();
    fireEvent.click(pluginTab);
    expect(screen.getByText('plugin-content')).toBeInTheDocument();
  });

  it('renders multiple plugin tabs in the order provided', () => {
    const pluginTabs = [
      { key: 'first', label: '第一', render: () => <span>first-body</span> },
      { key: 'second', label: '第二', render: () => <span>second-body</span> },
    ];
    renderTabs({ bio: 'x', pluginTabs });
    const labels = screen.getAllByRole('tab').map((el) => el.textContent);
    expect(labels).toEqual(['简介', '第一', '第二']);
    fireEvent.click(screen.getByRole('tab', { name: '第二' }));
    expect(screen.getByText('second-body')).toBeInTheDocument();
  });
});
