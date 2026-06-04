import { useState } from 'react';
import styles from './Avatar.module.css';

interface Props {
  src?: string | null;
  name?: string | null;
  size?: number;
}

const COLORS = [
  '#f97316', '#34c759', '#ff3b30', '#ff9500',
  '#af52de', '#5856d6', '#00c7be', '#ff2d55',
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

export default function Avatar({ src, name, size = 50 }: Props) {
  const [imgError, setImgError] = useState(false);
  const displayName = name || '?';

  if (src && !imgError) {
    return (
      <img
        className={styles.avatar}
        src={src}
        alt={displayName}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={styles.fallback}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: colorFor(displayName),
      }}
    >
      {initials(displayName)}
    </div>
  );
}
