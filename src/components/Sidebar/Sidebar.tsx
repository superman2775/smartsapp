import { LogOut, PlusCircle, Info, UserCircle, Sun, Moon, MessageCircle, UserPlus } from 'lucide-react';
import styles from './Sidebar.module.css';

interface Props {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onNewChat: () => void;
  onRequests: () => void;
  onChats: () => void;
  onProfile: () => void;
  onPrivacy: () => void;
  onLogout: () => void;
  pendingRequestCount?: number;
  unreadMessageCount?: number;
}

export default function Sidebar({
  theme,
  onToggleTheme,
  onNewChat,
  onRequests,
  onChats,
  onProfile,
  onPrivacy,
  onLogout,
  pendingRequestCount = 0,
  unreadMessageCount = 0,
}: Props) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.logo} onClick={onChats} title="Chats">
        <MessageCircle size={24} strokeWidth={1.5} />
        {unreadMessageCount > 0 && (
          <span className={styles.badge}>
            {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
          </span>
        )}
      </div>

      <nav className={styles.nav}>
        <button className={styles.btn} onClick={onNewChat} title="New chat">
          <PlusCircle size={22} />
        </button>
        <button className={styles.btn} onClick={onRequests} title="Friend requests">
          <UserPlus size={22} />
          {pendingRequestCount > 0 && (
            <span className={styles.badge}>{pendingRequestCount > 99 ? '99+' : pendingRequestCount}</span>
          )}
        </button>
        <button className={styles.btn} onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
        </button>
        <button className={styles.btn} onClick={onProfile} title="Profile">
          <UserCircle size={22} />
        </button>
        <button className={styles.btn} onClick={onPrivacy} title="Info">
          <Info size={22} />
        </button>
      </nav>

      <div className={styles.bottom}>
        <button className={styles.btn} onClick={onLogout} title="Sign out">
          <LogOut size={22} />
        </button>
      </div>
    </div>
  );
}
