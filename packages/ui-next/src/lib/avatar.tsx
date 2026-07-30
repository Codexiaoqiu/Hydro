import type { JSX } from 'react';
import { Avatar as PrimAvatar } from '../components/primitives/Avatar';
import styles from './avatar.module.css';
import { avatarUrl } from './avatar-url';

interface AvatarProps {
  spec?: string;
  name?: string;
  /**
   * Pixels (or any valid CSS length string like `'40px'`, `'1.5rem'`).
   * Number values are passed through as `<img width height>`; strings go to
   * inline `style={{ width, height }}`. For gravatar/github/qq avatars, a
   * numeric size is required to size the remote request; non-numeric inputs
   * fall back to requesting 64px (the third-party then gets downscaled by
   * CSS).
   */
  size?: number | string;
  // Optional accessible label — emitted as both `title` (native tooltip) and
  // `aria-label` so screen readers and sighted users get the same hint.
  title?: string;
}

const DEFAULT_AVATAR_SIZE = 32;

/** Avatar with provider-spec URL resolution; falls back to initials via primitives/Avatar. */
export function Avatar({ spec, name, size = DEFAULT_AVATAR_SIZE, title }: AvatarProps): JSX.Element {
  const url = avatarUrl(spec, typeof size === 'number' ? size : 64);
  if (url) {
    const numericSize = typeof size === 'number' ? size : undefined;
    return (
      <img
        className={styles.img}
        src={url}
        width={numericSize}
        height={numericSize}
        style={typeof size === 'string' ? { width: size, height: size } : undefined}
        alt={name ?? ''}
        title={title}
        aria-label={title}
        loading="lazy"
      />
    );
  }
  return <PrimAvatar name={name} size={size} title={title} />;
}
