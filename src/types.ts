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
  unreadCounts?: Record<string, number>;
  lastReadTimestamps?: Record<string, Timestamp>;
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
  unreadCount?: number;
}

export interface TypingData {
  timestamp: Timestamp;
}

export interface FriendRequestDoc {
  from: string;
  to: string;
  participants: string[];
  fromName: string;
  fromPhoto: string;
  toName: string;
  toPhoto: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FriendRequest extends FriendRequestDoc {
  id: string;
}

export type Page = 'login' | 'privacy' | 'terms' | 'onboarding' | 'profile' | 'messenger';
