import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDocs,
  getDoc,
  setDoc,
  limit,
  writeBatch,
  deleteDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Conversation, Message, OnlineUser } from '../types';

/** Deterministic conversation ID from sorted UIDs */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/** Listen to all conversations for the current user */
export function subscribeConversations(
  userId: string,
  callback: (convos: Conversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId)
  );
  return onSnapshot(q, (snapshot) => {
    const convos = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Conversation))
      .sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() ?? 0;
        const bTime = b.updatedAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
    callback(convos);
  });
}

/** Listen to messages in a conversation */
export function subscribeMessages(
  conversationId: string,
  callback: (msgs: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Message[];
    callback(msgs);
  });
}

/** Send a message atomically (batch write) */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> {
  const batch = writeBatch(db);

  const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
  batch.set(msgRef, {
    text,
    senderId,
    senderName,
    timestamp: serverTimestamp(),
  });

  batch.set(
    doc(db, 'conversations', conversationId),
    {
      lastMessage: text,
      lastSenderId: senderId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

/** Create or get an existing conversation between two users */
export async function createConversation(
  user1: { uid: string; displayName: string | null; photoURL: string | null },
  user2: { uid: string; displayName: string | null; photoURL: string | null }
): Promise<string> {
  const convoId = getConversationId(user1.uid, user2.uid);
  const convoRef = doc(db, 'conversations', convoId);

  const existing = await getDoc(convoRef);
  if (existing.exists()) return convoId;

  await setDoc(convoRef, {
    participants: [user1.uid, user2.uid],
    participantNames: {
      [user1.uid]: user1.displayName,
      [user2.uid]: user2.displayName,
    },
    participantPhotos: {
      [user1.uid]: user1.photoURL ?? '',
      [user2.uid]: user2.photoURL ?? '',
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return convoId;
}

/** Get all users except the current one */
export async function getAllUsers(
  currentUserId: string
): Promise<OnlineUser[]> {
  const q = query(collection(db, 'users'), limit(50));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as OnlineUser))
    .filter((u) => u.id !== currentUserId);
}

/** Subscribe to all users' online status */
export function subscribeUsers(
  callback: (users: Record<string, OnlineUser>) => void
): Unsubscribe {
  const q = query(collection(db, 'users'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const users: Record<string, OnlineUser> = {};
    snapshot.docs.forEach((d) => {
      users[d.id] = { id: d.id, ...d.data() };
    });
    callback(users);
  });
}

/** Set typing indicator in a conversation */
export async function setTyping(
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const typingRef = doc(db, 'conversations', conversationId, 'typing', userId);
  if (isTyping) {
    await setDoc(typingRef, { timestamp: serverTimestamp() });
  } else {
    await deleteDoc(typingRef).catch(() => {});
  }
}

/** Subscribe to typing indicators in a conversation */
export function subscribeTyping(
  conversationId: string,
  callback: (typing: Record<string, { timestamp: unknown }>) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'conversations', conversationId, 'typing'),
    (snapshot) => {
      const typing: Record<string, { timestamp: unknown }> = {};
      snapshot.docs.forEach((d) => {
        typing[d.id] = d.data();
      });
      callback(typing);
    }
  );
}
