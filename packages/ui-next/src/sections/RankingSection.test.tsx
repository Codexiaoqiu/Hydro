/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankingSection } from './RankingSection';

describe('RankingSection', () => {
  it('renders a row per uid with rank + RP', () => {
    const udict = {
      1: { _id: 1, uname: 'alice', avatar: 'github:alice', bio: 'cpp', perm: 'BigInt::0', rp: 2400 },
      2: { _id: 2, uname: 'bob', avatar: undefined, bio: 'py', perm: 'BigInt::0', rp: 1800 },
    };
    render(<RankingSection name="ranking" payload={[1, 2]} udict={udict} domain={{ _id: 'system' }} />);
    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.getByText('bob')).toBeTruthy();
    expect(screen.getByText('2400')).toBeTruthy();
    expect(screen.getByText('1800')).toBeTruthy();
    expect(screen.getByText('cpp')).toBeTruthy();
    expect(screen.getByText('py')).toBeTruthy();
  });
  it('renders null when payload is empty', () => {
    const { container } = render(
      <RankingSection name="ranking" payload={[]} udict={{}} domain={{ _id: 'system' }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
