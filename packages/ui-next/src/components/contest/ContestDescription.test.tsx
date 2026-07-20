/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContestDescription } from './ContestDescription';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: { value?: string }) => <textarea data-testid="monaco-mock" value={props.value} readOnly />,
  loader: { config: vi.fn() },
}));

vi.mock('../article/Article', () => ({
  Article: ({ content }: { content: string }) => (
    <div data-testid="article-mock">{content}</div>
  ),
}));

describe('contestDescription', () => {
  it('renders plain markdown content', () => {
    render(<ContestDescription content="Hello **world**" docId="60a000000000000000000001" />);
    const node = screen.getByTestId('article-mock');
    expect(node.textContent).toContain('Hello **world**');
  });

  it('rewrites (file://... to (docId/file/public/...', () => {
    render(<ContestDescription content="See [pic](file://a.png)" docId="60a000000000000000000001" />);
    const node = screen.getByTestId('article-mock');
    expect(node.textContent).toContain('(60a000000000000000000001/file/public/a.png)');
    expect(node.textContent).not.toContain('file://');
  });

  it('rewrites ="file://... to ="docId/file/public/...', () => {
    render(<ContestDescription content='<img src="file://b.png" />' docId="60a000000000000000000001" />);
    const node = screen.getByTestId('article-mock');
    expect(node.textContent).toContain('"60a000000000000000000001/file/public/b.png"');
  });

  it('handles empty content', () => {
    render(<ContestDescription content="" docId="60a000000000000000000001" />);
    expect(screen.getByTestId('article-mock')).toBeInTheDocument();
  });
});
