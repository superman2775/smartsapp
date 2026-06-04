import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { setTyping } from '../../services/firestore';
import styles from './Compose.module.css';

interface Props {
  onSend: (text: string) => void;
  conversationId?: string;
  userId: string;
}

export default function Compose({ onSend, conversationId, userId }: Props) {
  const [text, setText] = useState('');
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId || !userId) return;
      setTyping(conversationId, userId, isTyping);
    },
    [conversationId, userId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (e.target.value) {
      emitTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => emitTyping(false), 3000);
    } else {
      emitTyping(false);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    }
  };

  const send = useCallback(() => {
    if (!text.trim()) return;
    emitTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    onSend(text);
    setText('');
  }, [text, emitTyping, onSend]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <form className={styles.compose} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.input}
        placeholder="Type a message..."
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button type="submit" className={styles.sendButton} disabled={!text.trim()}>
        <Send size={18} />
      </button>
    </form>
  );
}
