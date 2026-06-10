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
  updateDoc,
  limit,
  deleteDoc,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Conversation, Message, OnlineUser, FriendRequest } from '../types';

/** Deterministic conversation ID from sorted UIDs */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/** Listen to all conversations for the current user */
export function subscribeConversations(
  userId: string,
  callback: (convos: Conversation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const convos = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as Conversation))
        .sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() ?? 0;
          const bTime = b.updatedAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
      callback(convos);
    },
    onError
  );
}

/** Listen to messages in a conversation */
export function subscribeMessages(
  conversationId: string,
  callback: (msgs: Message[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Message[];
      callback(msgs);
    },
    onError
  );
}

/** Send a message in a transaction (atomic read + write). Increments unread counts for other participants. */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> {
  const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
  const convoRef = doc(db, 'conversations', conversationId);

  await runTransaction(db, async (tx) => {
    const convoSnap = await tx.get(convoRef);
    const data = convoSnap.data();
    const participants: string[] = data?.participants ?? [];
    const existingUnread: Record<string, number> = data?.unreadCounts ?? {};

    // Write the message
    tx.set(msgRef, {
      text,
      senderId,
      senderName,
      timestamp: serverTimestamp(),
    });

    // Build conversation update — use explicit values from the
    // transaction snapshot (not FieldValue.increment sentinels)
    // so the unread counts are always consistent with the read state.
    const convoUpdate: Record<string, unknown> = {
      lastMessage: text,
      lastSenderId: senderId,
      updatedAt: serverTimestamp(),
      [`unreadCounts.${senderId}`]: 0,
    };

    for (const pid of participants) {
      if (pid !== senderId) {
        convoUpdate[`unreadCounts.${pid}`] = (existingUnread[pid] ?? 0) + 1;
      }
    }

    // tx.update() interprets dot-notation keys (e.g. "unreadCounts.alice")
    // as field paths into nested maps, unlike tx.set() with merge:true
    // which treats them as literal field names with dots.
    tx.update(convoRef, convoUpdate);
  });
}

/** Mark a conversation as read for a specific user */
export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const convoRef = doc(db, 'conversations', conversationId);
  const update: Record<string, unknown> = {};
  update[`unreadCounts.${userId}`] = 0;
  update[`lastReadTimestamps.${userId}`] = serverTimestamp();

  // updateDoc() interprets dot-notation keys as nested field paths,
  // unlike setDoc() with merge:true which treats them as literal names.
  await updateDoc(convoRef, update);
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
  callback: (users: Record<string, OnlineUser>) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'users'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const users: Record<string, OnlineUser> = {};
      snapshot.docs.forEach((d) => {
        users[d.id] = { id: d.id, ...d.data() };
      });
      callback(users);
    },
    onError
  );
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

/** ----------------------------------------------------------------
 *  Friend Requests
 *  ---------------------------------------------------------------- */

/** Deterministic friend-request ID (same as conversation ID) */
export function getFriendRequestId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/** Send a friend request with an optional message */
export async function sendFriendRequest(
  from: { uid: string; displayName: string | null; photoURL: string | null },
  to: { uid: string; displayName: string | null; photoURL: string | null },
  message?: string
): Promise<string> {
  const requestId = getFriendRequestId(from.uid, to.uid);
  const requestRef = doc(db, 'friendRequests', requestId);

  const existing = await getDoc(requestRef);
  if (existing.exists()) {
    const data = existing.data();
    if (data.status === 'pending') return requestId; // already sent
    if (data.status === 'accepted') throw new Error('ALREADY_FRIENDS');
    // If previously rejected, allow re-sending
  }

  await setDoc(requestRef, {
    from: from.uid,
    to: to.uid,
    participants: [from.uid, to.uid],
    fromName: from.displayName ?? 'Unknown',
    fromPhoto: from.photoURL ?? '',
    toName: to.displayName ?? 'Unknown',
    toPhoto: to.photoURL ?? '',
    message: message || null,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return requestId;
}

/** Accept a friend request — creates the conversation and updates the request */
export async function acceptFriendRequest(
  requestId: string,
  accepter: { uid: string; displayName: string | null; photoURL: string | null },
  requester: { uid: string; displayName: string | null; photoURL: string | null }
): Promise<string> {
  const requestRef = doc(db, 'friendRequests', requestId);
  const convoRef = doc(db, 'conversations', requestId);

  // Create the conversation
  await setDoc(convoRef, {
    participants: [accepter.uid, requester.uid],
    participantNames: {
      [accepter.uid]: accepter.displayName,
      [requester.uid]: requester.displayName,
    },
    participantPhotos: {
      [accepter.uid]: accepter.photoURL ?? '',
      [requester.uid]: requester.photoURL ?? '',
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Mark the request as accepted
  await updateDoc(requestRef, {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  return requestId; // same as convoId
}

/** Reject a friend request */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  const requestRef = doc(db, 'friendRequests', requestId);
  await updateDoc(requestRef, {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
}

/** Cancel (delete) an outgoing friend request */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const requestRef = doc(db, 'friendRequests', requestId);
  await deleteDoc(requestRef);
}

/** Subscribe to friend requests involving the current user */
export function subscribeFriendRequests(
  userId: string,
  callback: (requests: FriendRequest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'friendRequests'),
    where('participants', 'array-contains', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as FriendRequest))
        .sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() ?? 0;
          const bTime = b.updatedAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
      callback(requests);
    },
    onError
  );
}

/** Subscribe to typing indicators in a conversation */
export function subscribeTyping(
  conversationId: string,
  callback: (typing: Record<string, { timestamp: unknown }>) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'conversations', conversationId, 'typing'),
    (snapshot) => {
      const typing: Record<string, { timestamp: unknown }> = {};
      snapshot.docs.forEach((d) => {
        typing[d.id] = d.data();
      });
      callback(typing);
    },
    onError
  );
}
