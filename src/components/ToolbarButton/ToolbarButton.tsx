import type React from 'react';
import styles from './ToolbarButton.module.css';

interface Props {
  icon: React.ReactNode;
  onClick: () => void;
}

export default function ToolbarButton({ icon, onClick }: Props) {
  return (
    <span className={styles.toolbarButton} onClick={onClick}>
      {icon}
    </span>
  );
}
