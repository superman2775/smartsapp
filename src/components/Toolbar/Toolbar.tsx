import type React from 'react';
import styles from './Toolbar.module.css';

interface Props {
  title: string;
  subtitle?: string | null;
  leftItems?: React.ReactNode[];
  rightItems?: React.ReactNode[];
}

export default function Toolbar({ title, subtitle, leftItems, rightItems }: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.leftItems}>{leftItems}</div>
      <div className={styles.center}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      <div className={styles.rightItems}>{rightItems}</div>
    </div>
  );
}
