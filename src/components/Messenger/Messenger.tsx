import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import Sidebar from '../Sidebar/Sidebar';
import ConversationList from '../ConversationList/ConversationList';
import MessageList from '../MessageList/MessageList';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscribeUsers } from '../../services/firestore';
import type { Conversation, OnlineUser, UserData } from '../../types';
import styles from './Messenger.module.css';

interface Props {
  user: UserData;
  onProfile: () => void;
  onPrivacy: () => void;
  onTerms: () => void;
}

export default function Messenger({ user, onProfile, onPrivacy, onTerms }: Props) {
  const [activeConversation, setActiveConversation] = useState<
    (Conversation & { otherUid?: string; otherName?: string; otherPhoto?: string }) | null
  >(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineUser>>({});
  const [newChatTrigger, setNewChatTrigger] = useState(0);
  const { logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const unsubscribe = subscribeUsers(setOnlineUsers);
    return unsubscribe;
  }, []);

  return (
    <div className={styles.messenger}>
      <Sidebar
        theme={theme}
        onToggleTheme={toggleTheme}
        onNewChat={() => setNewChatTrigger((n) => n + 1)}
        onProfile={onProfile}
        onPrivacy={onPrivacy}
        onLogout={logout}
      />

      <div className={`${styles.scrollable} ${styles.sidebar}`}>
        <ConversationList
          user={user}
          activeConversation={activeConversation}
          onSelectConversation={setActiveConversation}
          onlineUsers={onlineUsers}
          newChatTrigger={newChatTrigger}
        />
      </div>

      <div className={`${styles.scrollable} ${styles.content}`}>
        {activeConversation ? (
          <MessageList
            user={user}
            conversation={activeConversation}
            isOtherOnline={onlineUsers[activeConversation.otherUid ?? '']?.online ?? false}
          />
        ) : (
          <div className={styles.noConversation}>
            <MessageCircle size={80} style={{ color: 'var(--text-dim)' }} strokeWidth={1} />
            <h2>Select a conversation</h2>
            <p>Choose a chat from the sidebar or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
