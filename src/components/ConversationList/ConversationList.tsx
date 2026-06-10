import { useState, useEffect, useCallback, useRef } from 'react';
import ConversationSearch from '../ConversationSearch/ConversationSearch';
import ConversationListItem from '../ConversationListItem/ConversationListItem';
import Avatar from '../Avatar/Avatar';
import Toolbar from '../Toolbar/Toolbar';
import { getAllUsers, sendFriendRequest } from '../../services/firestore';
import type { Conversation, OnlineUser, UserData } from '../../types';
import clsStyles from './ConversationList.module.css';

interface Props {
  user: UserData;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (convoId: string, tempOtherUid?: string, tempOtherName?: string, tempOtherPhoto?: string) => void;
  onlineUsers: Record<string, OnlineUser>;
  newChatTrigger?: number;
}

export default function ConversationList({
  user,
  conversations,
  activeConversationId,
  onSelectConversation,
  onlineUsers,
  newChatTrigger,
}: Props) {
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [allUsers, setAllUsers] = useState<OnlineUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestTarget, setRequestTarget] = useState<OnlineUser | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const handleOpenNewChat = useCallback(async () => {
    const users = await getAllUsers(user.uid);
    setAllUsers(users);
    setSearchQuery('');
    setRequestTarget(null);
    setRequestMessage('');
    setShowUserSearch(true);
  }, [user.uid]);

  const handleOpenNewChatRef = useRef(handleOpenNewChat);
  handleOpenNewChatRef.current = handleOpenNewChat;

  useEffect(() => {
    if (newChatTrigger) handleOpenNewChatRef.current();
  }, [newChatTrigger]);

  const handleSelectUser = useCallback((otherUser: OnlineUser) => {
    setRequestTarget(otherUser);
    setRequestMessage('');
  }, []);

  const handleSendRequest = useCallback(
    async () => {
      if (!requestTarget) return;
      setSending(true);
      try {
        await sendFriendRequest(
          { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL },
          { uid: requestTarget.id, displayName: requestTarget.displayName, photoURL: requestTarget.photoURL },
          requestMessage.trim() || undefined
        );
        setSentIds((prev) => new Set(prev).add(requestTarget.id));
        setRequestTarget(null);
        setRequestMessage('');
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'ALREADY_FRIENDS') {
          alert('You are already friends with this user!');
          setShowUserSearch(false);
        } else {
          alert('Failed to send friend request. Please try again.');
        }
      } finally {
        setSending(false);
      }
    },
    [user, requestTarget, requestMessage]
  );

  const filteredUsers = allUsers.filter(
    (u) =>
      (u.displayName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) &&
      u.id !== user.uid &&
      !conversations.some((c) => c.participants.includes(u.id))
  );

  return (
    <div className={clsStyles.list}>
      <Toolbar title="Chats" />
      <ConversationSearch onSearch={setSearchQuery} />

      {showUserSearch && (
        <div className={clsStyles.userSearchPanel}>
          <div className={clsStyles.userSearchHeader}>
            <span>{requestTarget ? 'Send Request' : 'New Chat'}</span>
            <button
              className={clsStyles.userSearchClose}
              onClick={() => {
                if (requestTarget) {
                  setRequestTarget(null);
                } else {
                  setShowUserSearch(false);
                }
              }}
            >
              &times;
            </button>
          </div>

          {!requestTarget ? (
            <div className={clsStyles.userSearchList}>
              {filteredUsers.length === 0 && (
                <p className={clsStyles.userSearchEmpty}>No users found</p>
              )}
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className={`${clsStyles.userSearchItem}${
                    sentIds.has(u.id) ? ' ' + clsStyles.userSearchItemSent : ''
                  }`}
                  onClick={() => {
                    if (!sentIds.has(u.id)) handleSelectUser(u);
                  }}
                >
                  <Avatar src={u.photoURL} name={u.displayName} size={50} />
                  <div className={clsStyles.userInfo}>
                    <h1 className={clsStyles.userName}>{u.displayName}</h1>
                    <p className={clsStyles.userEmail}>
                      {sentIds.has(u.id) ? 'Request sent ✓' : u.bio || 'No bio yet'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={clsStyles.requestForm}>
              <div className={clsStyles.requestFormTarget}>
                <Avatar
                  src={requestTarget.photoURL}
                  name={requestTarget.displayName}
                  size={50}
                />
                <div className={clsStyles.userInfo}>
                  <h1 className={clsStyles.userName}>{requestTarget.displayName}</h1>
                  <p className={clsStyles.userEmail}>{requestTarget.bio || 'No bio yet'}</p>
                </div>
              </div>
              <textarea
                className={clsStyles.requestInput}
                placeholder="Add a message (optional)..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                maxLength={200}
                rows={3}
                autoFocus
              />
              <div className={clsStyles.requestActions}>
                <button
                  className={clsStyles.requestBackBtn}
                  onClick={() => setRequestTarget(null)}
                >
                  Back
                </button>
                <button
                  className={clsStyles.requestSendBtn}
                  onClick={handleSendRequest}
                  disabled={sending}
                >
                  {sending ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {conversations.map((convo) => {
        const otherUid = convo.participants.find((p) => p !== user.uid) ?? '';
        const otherName = convo.participantNames?.[otherUid] || 'Unknown';
        const otherPhoto = convo.participantPhotos?.[otherUid] || '';

        return (
          <ConversationListItem
            key={convo.id}
            data={{
              id: convo.id,
              name: otherName,
              photo: otherPhoto,
              text: convo.lastMessage ?? '',
              timestamp: convo.updatedAt,
              isOnline: onlineUsers[otherUid]?.online ?? false,
              unreadCount: convo.unreadCounts?.[user.uid] ?? 0,
            }}
            isActive={activeConversationId === convo.id}
            onClick={() => onSelectConversation(convo.id)}
          />
        );
      })}
      {conversations.length === 0 && !showUserSearch && (
        <p className="no-conversations">No conversations yet. Tap + to start one.</p>
      )}
    </div>
  );
}
