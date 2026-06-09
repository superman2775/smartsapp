import Avatar from '../Avatar/Avatar';
import type { Notification } from '../../contexts/NotificationContext';
import styles from './Toast.module.css';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  toasts: Notification[];
  dismissingIds: Set<string>;
  onClick: (notification: Notification) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Toast({
  toasts,
  dismissingIds,
  onClick,
}: Props) {
  if (toasts.length === 0) return null;

  function handleClick(notification: Notification) {
    onClick(notification);
  }

  return (
    <div className={styles.overlay}>
      {toasts.map((notification) => {
        const req = notification.data;
        const isDismissing = dismissingIds.has(notification.id);

        return (
          <div
            key={notification.id}
            className={`${styles.toast}${isDismissing ? ' ' + styles.toastDismissing : ''}`}
            onClick={() => handleClick(notification)}
          >
            <Avatar
              src={req.fromPhoto || undefined}
              name={req.fromName}
              size={36}
            />
            <div className={styles.toastInfo}>
              <p className={styles.toastName}>{req.fromName}</p>
              <p className={styles.toastMsg}>
                {req.message
                  ? `"${req.message}"`
                  : 'Sent you a friend request'}
              </p>
            </div>
            <span className={styles.toastDot} />
          </div>
        );
      })}
    </div>
  );
}
