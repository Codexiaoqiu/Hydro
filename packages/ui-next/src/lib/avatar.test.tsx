/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, avatarUrl } from './avatar';

describe('avatarUrl', () => {
  it('gravatar hashes lowercase email', () => {
    expect(avatarUrl('gravatar:foo@bar.com', 64)).toBe(
      'https://www.gravatar.com/avatar/f3ada405ce890b6f8204094deb12d8a8?s=64&d=identicon',
    );
  });
  it('github uses {user}.png?size={size}', () => {
    expect(avatarUrl('github:baoshuo', 80)).toBe('https://github.com/baoshuo.png?size=80');
  });
  it('qq uses q1.qlogo.cn', () => {
    expect(avatarUrl('qq:12345', 40)).toBe('https://q1.qlogo.cn/g?b=qq&nk=12345&s=40');
  });
  it('url and file return href unchanged', () => {
    expect(avatarUrl('url:https://example.com/a.png', 32)).toBe('https://example.com/a.png');
    expect(avatarUrl('file:/var/a.png', 32)).toBe('/var/a.png');
  });
  it('empty spec returns null', () => expect(avatarUrl('', 32)).toBeNull());
  it('undefined spec returns null', () => expect(avatarUrl(undefined, 32)).toBeNull());
  it('unknown provider returns null', () => expect(avatarUrl('weird:foo', 32)).toBeNull());
});

describe('avatar component', () => {
  it('renders <img> when spec resolves', () => {
    render(<Avatar spec="github:baoshuo" name="B" size={64} />);
    const img = screen.getByRole('img', { name: 'B' }) as HTMLImageElement;
    expect(img.src).toBe('https://github.com/baoshuo.png?size=64');
    expect(img.getAttribute('width')).toBe('64');
    expect(img.getAttribute('height')).toBe('64');
  });
  it('falls back to primitives/Avatar (initials) when spec missing', () => {
    const { container } = render(<Avatar name="B" />);
    expect(container.textContent).toContain('B');
    expect(screen.queryByRole('img')).toBeNull();
  });
});
