import { useState } from 'react';
import styles from './ConversationSearch.module.css';

interface Props {
  onSearch: (query: string) => void;
}

export default function ConversationSearch({ onSearch }: Props) {
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <div className={styles.search}>
      <input
        type="search"
        className={styles.input}
        placeholder="Search Conversations"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
