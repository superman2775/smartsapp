import { format } from 'date-fns';
import styles from './Message.module.css';
import type { Message as MessageData } from '../../types';

interface Props {
  data: MessageData;
  isMine: boolean;
  startsSequence: boolean;
  endsSequence: boolean;
  showTimestamp: boolean;
}

export function toDate(ts: unknown): Date {
  if (!ts) return new Date(0);
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    return (ts as { toDate: () => Date }).toDate();
  }
  return new Date(ts as string);
}

export default function Message({ data, isMine, startsSequence, endsSequence, showTimestamp }: Props) {
  const date = toDate(data.timestamp);
  const friendlyTimestamp = format(date, 'PPPPp');

  const classNames = [
    styles.message,
    isMine ? styles.mine : '',
    startsSequence ? styles.start : '',
    endsSequence ? styles.end : '',
  ].join(' ');

  return (
    <div className={classNames}>
      {showTimestamp && <div className={styles.timestamp}>{friendlyTimestamp}</div>}

      <div className={styles.bubbleContainer}>
        <div className={styles.bubble} title={data.timestamp ? friendlyTimestamp : undefined}>
          {data.text}
        </div>
      </div>
    </div>
  );
}
