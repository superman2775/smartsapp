import { LogOut, PlusCircle, Info, UserCircle, Sun, Moon, MessageCircle } from 'lucide-react';
import styles from './Sidebar.module.css';

interface Props {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onNewChat: () => void;
  onProfile: () => void;
  onPrivacy: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  theme,
  onToggleTheme,
  onNewChat,
  onProfile,
  onPrivacy,
  onLogout,
}: Props) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <MessageCircle size={24} strokeWidth={1.5} />
      </div>

      <nav className={styles.nav}>
        <button className={styles.btn} onClick={onNewChat} title="New chat">
          <PlusCircle size={22} />
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
