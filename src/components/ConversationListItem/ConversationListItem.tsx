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
  const { photo, name, text, timestamp, isOnline, unreadCount } = data;

  const timeDisplay = timestamp
    ? formatDistanceToNow(timestamp.toDate ? timestamp.toDate() : new Date(timestamp as unknown as string), { addSuffix: true })
    : '';

  // Only show unread state when conversation is NOT active —
  // prevents bold-title flicker when a new message arrives
  // while the conversation is already being viewed.
  const hasUnread = (unreadCount ?? 0) > 0 && !isActive;

  return (
    <div
      className={`${styles.item} ${isActive ? styles.active : ''} ${hasUnread ? styles.unread : ''}`}
      onClick={onClick}
    >
      <div className={styles.photoWrapper}>
        <Avatar src={photo || undefined} name={name} size={50} />
        {isOnline && <span className={styles.onlineDot} />}
      </div>
      <div className={styles.info}>
        <div className={styles.topRow}>
          <h1 className={`${styles.title} ${hasUnread ? styles.titleBold : ''}`}>{name}</h1>
          <div className={styles.rightMeta}>
            {timeDisplay && <span className={styles.time}>{timeDisplay}</span>}
            {hasUnread && !isActive && (
              <span className={styles.badge}>{unreadCount! > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
        </div>
        <p className={`${styles.snippet} ${hasUnread ? styles.snippetBold : ''}`}>{text || 'Start chatting!'}</p>
      </div>
    </div>
  );
}
