import { useState, useRef } from 'react';
import { Users } from 'lucide-react';
import Avatar from '../Avatar/Avatar';
import type { FriendRequest, UserData } from '../../types';
import styles from './FriendRequests.module.css';

interface Props {
  user: UserData;
  requests: FriendRequest[];
  onAccept: (request: FriendRequest) => void;
  onReject: (requestId: string) => void;
  onCancel: (requestId: string) => void;
}

export default function FriendRequests({
  user,
  requests,
  onAccept,
  onReject,
  onCancel,
}: Props) {
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [fadingId, setFadingId] = useState<string | null>(null);
  const fadingRequestRef = useRef<FriendRequest | null>(null);

  const incoming = requests.filter(
    (r) => r.status === 'pending' && r.to === user.uid
  );

  const outgoing = requests.filter((r) => r.from === user.uid);

  // Keep the fading request visible during its exit animation even after
  // Firestore removes it from the array.
  const displayIncoming = fadingId && fadingRequestRef.current
    ? incoming.some((r) => r.id === fadingId)
      ? incoming
      : [...incoming, fadingRequestRef.current]
    : incoming;

  const displayOutgoing = fadingId && fadingRequestRef.current
    ? outgoing.some((r) => r.id === fadingId)
      ? outgoing
      : [...outgoing, fadingRequestRef.current]
    : outgoing;

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'incoming' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          Received
          {incoming.length > 0 && (
            <span className={styles.badge}>{incoming.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'outgoing' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('outgoing')}
        >
          Sent
        </button>
      </div>

      {activeTab === 'incoming' && (
        <div className={styles.list}>
          {displayIncoming.length === 0 && (
            <div className={styles.empty}>
              <Users size={40} className={styles.emptyIcon} />
              <p>No pending friend requests</p>
            </div>
          )}
          {displayIncoming.map((req) => (
            <div
              key={req.id}
              className={`${styles.item}${fadingId === req.id ? ' ' + styles.fadingOut : ''}`}
            >
              <Avatar
                src={req.fromPhoto || undefined}
                name={req.fromName}
                size={44}
              />
              <div className={styles.info}>
                <h3 className={styles.name}>{req.fromName}</h3>
                {req.message ? (
                  <p className={styles.message}>"{req.message}"</p>
                ) : (
                  <p className={`${styles.message} ${styles.noMessage}`}>
                    No message
                  </p>
                )}
                <div className={styles.actions}>
                  <button
                    className={styles.acceptBtn}
                    onClick={() => {
                      fadingRequestRef.current = req;
                      setFadingId(req.id);
                      onAccept(req);
                      setTimeout(() => {
                        setFadingId(null);
                        fadingRequestRef.current = null;
                      }, 350);
                    }}
                  >
                    Accept
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => {
                      fadingRequestRef.current = req;
                      setFadingId(req.id);
                      onReject(req.id);
                      setTimeout(() => {
                        setFadingId(null);
                        fadingRequestRef.current = null;
                      }, 350);
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'outgoing' && (
        <div className={styles.list}>
          {displayOutgoing.length === 0 && (
            <div className={styles.empty}>
              <Users size={40} className={styles.emptyIcon} />
              <p>No sent requests</p>
            </div>
          )}
          {displayOutgoing.map((req) => (
            <div
              key={req.id}
              className={`${styles.item}${fadingId === req.id ? ' ' + styles.fadingOut : ''}`}
            >
              <Avatar
                src={req.toPhoto || undefined}
                name={req.toName}
                size={44}
              />
              <div className={styles.info}>
                <h3 className={styles.name}>{req.toName}</h3>
                {req.message ? (
                  <p className={styles.message}>"{req.message}"</p>
                ) : (
                  <p className={`${styles.message} ${styles.noMessage}`}>
                    No message
                  </p>
                )}
                <span
                  className={`${styles.statusBadge} ${
                    req.status === 'pending'
                      ? styles.statusPending
                      : req.status === 'accepted'
                      ? styles.statusAccepted
                      : styles.statusRejected
                  }`}
                >
                  {req.status === 'pending'
                    ? 'Pending'
                    : req.status === 'accepted'
                    ? 'Friends'
                    : 'Declined'}
                </span>
                {req.status === 'pending' && confirmingId !== req.id && fadingId !== req.id && (
                  <div className={styles.actions}>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => setConfirmingId(req.id)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {req.status === 'pending' && confirmingId === req.id && (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmText}>Are you sure?</span>
                    <div className={styles.actions}>
                      <button
                        className={styles.confirmYesBtn}
                        onClick={() => {
                          // Snapshot the request for the fade-out animation
                          fadingRequestRef.current = req;
                          setFadingId(req.id);
                          onCancel(req.id);
                          setConfirmingId(null);
                          setTimeout(() => {
                            setFadingId(null);
                            fadingRequestRef.current = null;
                          }, 350);
                        }}
                      >
                        Yes
                      </button>
                      <button
                        className={styles.confirmNoBtn}
                        onClick={() => setConfirmingId(null)}
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
