import { useState, useEffect, useRef, useMemo } from 'react';
import { differenceInHours } from 'date-fns';
import Compose from '../Compose/Compose';
import Toolbar from '../Toolbar/Toolbar';
import Message from '../Message/Message';
import { toDate } from '../Message/Message';
import { subscribeMessages, sendMessage, subscribeTyping } from '../../services/firestore';
import type { Message as MessageData, Conversation, UserData } from '../../types';
import styles from './MessageList.module.css';

interface Props {
  user: UserData;
  conversation: Conversation & { otherUid?: string; otherName?: string; otherPhoto?: string };
  isOtherOnline: boolean;
}

export default function MessageList({ user, conversation, isOtherOnline }: Props) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [typers, setTypers] = useState<Record<string, { timestamp: unknown }>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = subscribeMessages(conversation.id, setMessages);
    return unsubscribe;
  }, [conversation?.id]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = subscribeTyping(conversation.id, setTypers);
    return unsubscribe;
  }, [conversation?.id]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, typers]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !conversation?.id) return;
    await sendMessage(conversation.id, user.uid, user.displayName ?? 'Unknown', text.trim());
  };

  const otherTypers = Object.keys(typers).filter((uid) => uid !== user.uid);
  const typingNames = otherTypers
    .map((uid) => conversation.participantNames?.[uid] || 'Someone')
    .join(', ');
  const isTyping = otherTypers.length > 0;

  const renderedMessages = useMemo(() => {
    const result: React.ReactNode[] = [];
    const count = messages.length;

    for (let i = 0; i < count; i++) {
      const previous = messages[i - 1];
      const current = messages[i];
      const next = messages[i + 1];
      const isMine = current.senderId === user.uid;

      const currentDate = toDate(current.timestamp);
      let startsSequence = true;
      let endsSequence = true;
      let showTimestamp = true;

      if (previous) {
        const prevDate = toDate(previous.timestamp);
        const hoursDiff = differenceInHours(currentDate, prevDate);
        const prevSameAuthor = previous.senderId === current.senderId;

        if (prevSameAuthor && hoursDiff < 1) {
          startsSequence = false;
        }

        if (hoursDiff < 1) {
          showTimestamp = false;
        }
      }

      if (next) {
        const nextDate = toDate(next.timestamp);
        const hoursDiff = differenceInHours(nextDate, currentDate);
        const nextSameAuthor = next.senderId === current.senderId;

        if (nextSameAuthor && hoursDiff < 1) {
          endsSequence = false;
        }
      }

      result.push(
        <Message
          key={current.id || i}
          isMine={isMine}
          startsSequence={startsSequence}
          endsSequence={endsSequence}
          showTimestamp={showTimestamp}
          data={current}
        />
      );
    }

    return result;
  }, [messages, user.uid]);

  return (
    <div className={styles.list}>
      <Toolbar
        title={conversation.otherName || 'Chat'}
        subtitle={
          isTyping
            ? `${typingNames} typing...`
            : isOtherOnline
              ? 'Online'
              : null
        }
      />

      <div className={styles.container} ref={containerRef}>
        {renderedMessages}
        {isTyping && (
          <div className={styles.typingIndicator}>
            <div className={styles.typingBubble}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
            <span className={styles.typingName}>{typingNames} typing</span>
          </div>
        )}
      </div>

      <Compose
        onSend={handleSend}
        conversationId={conversation?.id}
        userId={user.uid}
      />
    </div>
  );
}
