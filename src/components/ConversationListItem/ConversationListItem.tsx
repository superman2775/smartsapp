import { formatDistanceToNow } from 'date-fns';
import Avatar from '../Avatar/Avatar';
import styles from './ConversationListItem.module.css';
import type { ConversationItemData } from '../../types';

interface Props {
  data: ConversationItemData;
  isActive: boolean;
  onClick: () => void;
}

export default function ConversationListItem({ data, isActive, onClick }: Props) {
  const { photo, name, text, timestamp, isOnline } = data;

  const timeDisplay = timestamp
    ? formatDistanceToNow(timestamp.toDate ? timestamp.toDate() : new Date(timestamp as unknown as string), { addSuffix: true })
    : '';

  return (
    <div
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <div className={styles.photoWrapper}>
        <Avatar src={photo || undefined} name={name} size={50} />
        {isOnline && <span className={styles.onlineDot} />}
      </div>
      <div className={styles.info}>
        <div className={styles.topRow}>
          <h1 className={styles.title}>{name}</h1>
          {timeDisplay && <span className={styles.time}>{timeDisplay}</span>}
        </div>
        <p className={styles.snippet}>{text || 'Start chatting!'}</p>
      </div>
    </div>
  );
}
