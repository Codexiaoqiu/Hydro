/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { ProfileHeader } from './ProfileHeader';

vi.mock('../link', () => ({
  Link: ({ children, ...rest }: any) => <a {...rest}>{children}</a>,
}));

const baseUdoc = {
  _id: 7, uname: 'alice', avatar: '', regat: 0, loginat: 0, mail: '', qq: '', wechat: '',
  gender: 0, nSubmit: 0, nAccept: 0, nLiked: 0, rp: 0, rank: 0, bio: '',
};

function renderHeader(props: any) {
  return render(
    <ToastProvider>
      <ProfileHeader {...props} />
    </ToastProvider>,
  );
}

describe('ProfileHeader', () => {
  it('renders username', () => {
    renderHeader({ udoc: baseUdoc, isSelf: false, canViewPrivate: false });
    expect(screen.getByRole('heading', { name: 'alice' })).toBeInTheDocument();
  });

  it('hides Edit Profile link when not self', () => {
    renderHeader({ udoc: baseUdoc, isSelf: false, canViewPrivate: false });
    expect(screen.queryByText(/编辑资料/)).toBeNull();
  });

  it('shows Edit Profile link when self', () => {
    renderHeader({ udoc: baseUdoc, isSelf: true, canViewPrivate: false });
    expect(screen.getByLabelText(/编辑资料/)).toBeInTheDocument();
  });

  it('does not render contact items when contact fields empty', () => {
    renderHeader({ udoc: baseUdoc, isSelf: false, canViewPrivate: false });
    expect(screen.queryByLabelText(/复制邮箱/)).toBeNull();
  });

  it('renders contact items when mail/qq/wechat are present', () => {
    renderHeader({
      udoc: { ...baseUdoc, mail: 'a@b', qq: '123', wechat: 'wx' },
      isSelf: false,
      canViewPrivate: false,
    });
    expect(screen.getByLabelText(/复制邮箱/)).toBeInTheDocument();
    expect(screen.getByLabelText(/QQ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/微信/)).toBeInTheDocument();
  });
});
