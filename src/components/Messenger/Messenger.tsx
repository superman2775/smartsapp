import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AlertTriangle, MessageCircle, X } from 'lucide-react';
import Sidebar from '../Sidebar/Sidebar';
import ConversationList from '../ConversationList/ConversationList';
import FriendRequests from '../FriendRequests/FriendRequests';
import MessageList from '../MessageList/MessageList';
import Toast from '../Toast/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  subscribeUsers,
  subscribeConversations,
  markConversationRead,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
} from '../../services/firestore';
import type {
  Conversation,
  OnlineUser,
  UserData,
  FriendRequest as FriendRequestType,
} from '../../types';
import styles from './Messenger.module.css';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  user: UserData;
  onProfile: () => void;
  onPrivacy: () => void;
  onTerms: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Messenger({
  user,
  onProfile,
  onPrivacy,
  onTerms,
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineUser>>(
    {},
  );
  const [newChatTrigger, setNewChatTrigger] = useState(0);
  const [lastViewedTimes, setLastViewedTimes] = useState<
    Record<string, Date>
  >({});
  const [view, setView] = useState<'chats' | 'requests'>('chats');
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const errorDismissedRef = useRef(false);

  const { logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const {
    friendRequests,
    pendingIncomingCount,
    toasts,
    dismissingIds,
    onToastClick,
    setToastClickHandler,
    setNotificationsEnabled,
  } = useNotifications();

  /* ---- Sync notification enable / toast-click handler with view ---- */
  useEffect(() => {
    setNotificationsEnabled(view === 'chats');
    if (view === 'chats') {
      setToastClickHandler(() => setView('requests'));
    }
    return () => setToastClickHandler(null);
  }, [view, setToastClickHandler, setNotificationsEnabled]);

  /* ---- Firestore subscriptions ---- */
  useEffect(() => {
    const unsubscribe = subscribeConversations(
      user.uid,
      setConversations,
      (err) => {
        console.error('subscribeConversations error:', err);
        if (!errorDismissedRef.current) {
          setFirestoreError(
            err.code === 'permission-denied'
              ? 'Firestore permission denied. Deploy the security rules to fix this.'
              : `Failed to load conversations: ${err.message}`
          );
        }
      }
    );
    return unsubscribe;
  }, [user.uid]);

  useEffect(() => {
    const unsubscribe = subscribeUsers(
      setOnlineUsers,
      (err) => {
        console.error('subscribeUsers error:', err);
        if (!errorDismissedRef.current) {
          setFirestoreError(
            err.code === 'permission-denied'
              ? 'Firestore permission denied. Deploy the security rules to fix this.'
              : `Failed to load users: ${err.message}`
          );
        }
      }
    );
    return unsubscribe;
  }, []);

  /* ---- Derived values ---- */
  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    const convo = conversations.find((c) => c.id === activeConversationId);
    if (!convo) return null;
    const otherUid = convo.participants.find((p) => p !== user.uid) ?? '';
    return {
      ...convo,
      otherUid,
      otherName: convo.participantNames?.[otherUid] || 'Unknown',
      otherPhoto: convo.participantPhotos?.[otherUid] || '',
    };
  }, [activeConversationId, conversations, user.uid]);

  const { uid, displayName, photoURL } = user;

  /* ---- Total unread messages across all conversations ---- */
  const totalUnreadMessages = useMemo(
    () =>
      conversations.reduce(
        (sum, c) => sum + (c.unreadCounts?.[user.uid] ?? 0),
        0,
      ),
    [conversations, user.uid],
  );

  /* ---- Conversation selection ---- */
  const handleSelectConversation = useCallback(
    (
      convoId: string,
      tempOtherUid?: string,
      tempOtherName?: string,
      tempOtherPhoto?: string,
    ) => {
      if (activeConversationId && activeConversationId !== convoId) {
        markConversationRead(activeConversationId, uid);
      }

      if (tempOtherUid) {
        setConversations((prev) => {
          if (prev.some((c) => c.id === convoId)) return prev;
          return [
            ...prev,
            {
              id: convoId,
              participants: [uid, tempOtherUid],
              participantNames: {
                [uid]: displayName ?? '',
                [tempOtherUid]: tempOtherName ?? 'Unknown',
              },
              participantPhotos: {
                [uid]: photoURL ?? '',
                [tempOtherUid]: tempOtherPhoto ?? '',
              },
            },
          ];
        });
      }

      setActiveConversationId(convoId);
      setView('chats');
      setLastViewedTimes((prev) => ({ ...prev, [convoId]: new Date() }));
      markConversationRead(convoId, uid);
    },
    [activeConversationId, uid, displayName, photoURL],
  );

  /* ---- Friend request actions ---- */
  const handleAccept = useCallback(
    async (req: FriendRequestType) => {
      try {
        const convoId = await acceptFriendRequest(
          req.id,
          {
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
          },
          {
            uid: req.from,
            displayName: req.fromName,
            photoURL: req.fromPhoto,
          },
        );
        handleSelectConversation(convoId, req.from, req.fromName, req.fromPhoto);
      } catch (err) {
        console.error('Failed to accept friend request:', err);
        alert('Failed to accept friend request. Please try again.');
      }
    },
    [user, handleSelectConversation],
  );

  const handleReject = useCallback(async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
    } catch (err) {
      console.error('Failed to reject friend request:', err);
    }
  }, []);

  const handleCancel = useCallback(async (requestId: string) => {
    try {
      await cancelFriendRequest(requestId);
    } catch (err) {
      console.error('Failed to cancel friend request:', err);
    }
  }, []);

  /* ---- Render ---- */
  return (
    <>
      {firestoreError && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={16} className={styles.errorIcon} />
          <span className={styles.errorText}>{firestoreError}</span>
          <button
            className={styles.errorDismiss}
            onClick={() => {
              errorDismissedRef.current = true;
              setFirestoreError(null);
            }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className={styles.messenger}>
        <Sidebar
          theme={theme}
          onToggleTheme={toggleTheme}
          onNewChat={() => {
            setView('chats');
            setNewChatTrigger((n) => n + 1);
          }}
          onRequests={() => setView('requests')}
          onChats={() => setView('chats')}
          onProfile={onProfile}
          onPrivacy={onPrivacy}
          onLogout={logout}
          pendingRequestCount={pendingIncomingCount}
          unreadMessageCount={totalUnreadMessages}
        />

        <div className={`${styles.scrollable} ${styles.sidebar}`}>
          {view === 'requests' ? (
            <FriendRequests
              user={user}
              requests={friendRequests}
              onAccept={handleAccept}
              onReject={handleReject}
              onCancel={handleCancel}
            />
          ) : (
            <ConversationList
              user={user}
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onlineUsers={onlineUsers}
              newChatTrigger={newChatTrigger}
            />
          )}
        </div>

        <div className={`${styles.scrollable} ${styles.content}`}>
          {activeConversation && view === 'chats' ? (
            <MessageList
              user={user}
              conversation={activeConversation}
              lastViewedAt={lastViewedTimes[activeConversation.id]}
              isOtherOnline={
                onlineUsers[activeConversation.otherUid ?? '']?.online ?? false
              }
            />
          ) : (
            <div className={styles.noConversation}>
              <MessageCircle
                size={80}
                style={{ color: 'var(--text-dim)' }}
                strokeWidth={1}
              />
              <h2>
                {view === 'requests'
                  ? pendingIncomingCount > 0
                    ? `${pendingIncomingCount} pending friend request${pendingIncomingCount > 1 ? 's' : ''}`
                    : 'Friend Requests'
                  : 'Select a conversation'}
              </h2>
              <p>
                {view === 'requests'
                  ? 'Accept or decline incoming friend requests'
                  : 'Choose a chat from the sidebar or start a new one'}
              </p>
            </div>
          )}
        </div>
      </div>
      <Toast
        toasts={toasts}
        dismissingIds={dismissingIds}
        onClick={onToastClick}
      />
    </>
  );
}
