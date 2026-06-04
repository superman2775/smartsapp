import type { Timestamp } from 'firebase/firestore';

export interface UserData {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string | null;
  profileComplete?: boolean;
}

export interface ConversationDoc {
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
}

export interface Conversation extends ConversationDoc {
  id: string;
}

export interface MessageDoc {
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Timestamp;
}

export interface Message extends MessageDoc {
  id: string;
}

export interface OnlineUser {
  id: string;
  online?: boolean;
  lastSeen?: Timestamp;
  displayName?: string;
  email?: string;
  photoURL?: string;
  bio?: string | null;
  profileComplete?: boolean;
}

export interface ConversationItemData {
  id: string;
  name: string;
  photo: string;
  text: string;
  timestamp?: Timestamp;
  isOnline: boolean;
}

export interface TypingData {
  timestamp: Timestamp;
}

export type Page = 'login' | 'privacy' | 'terms' | 'onboarding' | 'profile' | 'messenger';
