import { useState, useEffect, useCallback, useRef } from 'react';
import ConversationSearch from '../ConversationSearch/ConversationSearch';
import ConversationListItem from '../ConversationListItem/ConversationListItem';
import Avatar from '../Avatar/Avatar';
import Toolbar from '../Toolbar/Toolbar';
import { subscribeConversations, getAllUsers, createConversation } from '../../services/firestore';
import type { Conversation, OnlineUser, UserData } from '../../types';
import clsStyles from './ConversationList.module.css';

interface Props {
  user: UserData;
  activeConversation: (Conversation & { otherUid?: string; otherName?: string; otherPhoto?: string }) | null;
  onSelectConversation: (convo: Conversation & { otherUid?: string; otherName?: string; otherPhoto?: string }) => void;
  onlineUsers: Record<string, OnlineUser>;
  newChatTrigger?: number;
}

export default function ConversationList({
  user,
  activeConversation,
  onSelectConversation,
  onlineUsers,
  newChatTrigger,
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [allUsers, setAllUsers] = useState<OnlineUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeConversations(user.uid, setConversations);
    return unsubscribe;
  }, [user.uid]);

  const handleOpenNewChat = useCallback(async () => {
    const users = await getAllUsers(user.uid);
    setAllUsers(users);
    setSearchQuery('');
    setShowUserSearch(true);
  }, [user.uid]);

  const handleOpenNewChatRef = useRef(handleOpenNewChat);
  handleOpenNewChatRef.current = handleOpenNewChat;

  useEffect(() => {
    if (newChatTrigger) handleOpenNewChatRef.current();
  }, [newChatTrigger]);

  const handleStartConversation = useCallback(
    async (otherUser: OnlineUser) => {
      const convoId = await createConversation(user, otherUser);
      const newConvo: Conversation & { otherUid: string; otherName: string; otherPhoto: string } = {
        id: convoId,
        participants: [user.uid, otherUser.id],
        participantNames: { [user.uid]: user.displayName ?? '', [otherUser.id]: otherUser.displayName ?? '' },
        participantPhotos: { [user.uid]: user.photoURL ?? '', [otherUser.id]: otherUser.photoURL ?? '' },
        otherUid: otherUser.id,
        otherName: otherUser.displayName ?? 'Unknown',
        otherPhoto: otherUser.photoURL ?? '',
      };
      setShowUserSearch(false);
      onSelectConversation(newConvo);
    },
    [user, onSelectConversation]
  );

  const filteredUsers = allUsers.filter((u) =>
    (u.displayName ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={clsStyles.list}>
      <Toolbar title="Chats" />
      <ConversationSearch onSearch={setSearchQuery} />

      {showUserSearch && (
        <div className={clsStyles.userSearchPanel}>
          <div className={clsStyles.userSearchHeader}>
            <span>New Chat</span>
            <button className={clsStyles.userSearchClose} onClick={() => setShowUserSearch(false)}>
              &times;
            </button>
          </div>
          <div className={clsStyles.userSearchList}>
            {filteredUsers.length === 0 && (
              <p className={clsStyles.userSearchEmpty}>No users found</p>
            )}
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className={clsStyles.userSearchItem}
                onClick={() => handleStartConversation(u)}
              >
                <Avatar src={u.photoURL} name={u.displayName} size={50} />
                <div className={clsStyles.userInfo}>
                  <h1 className={clsStyles.userName}>{u.displayName}</h1>
                  <p className={clsStyles.userEmail}>{u.bio || 'No bio yet'}</p>
                </div>
              </div>
            ))}
          </div>
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
            }}
            isActive={activeConversation?.id === convo.id}
            onClick={() =>
              onSelectConversation({ ...convo, otherUid, otherName, otherPhoto })
            }
          />
        );
      })}
      {conversations.length === 0 && !showUserSearch && (
        <p className="no-conversations">No conversations yet. Tap + to start one.</p>
      )}
    </div>
  );
}
