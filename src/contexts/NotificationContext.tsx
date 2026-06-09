import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { subscribeFriendRequests } from '../services/firestore';
import type { FriendRequest } from '../types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Notification {
  id: string;
  type: 'friend_request';
  data: FriendRequest;
  createdAt: number;
}

interface NotificationContextValue {
  /** All friend requests for the current user (live) */
  friendRequests: FriendRequest[];
  /** Number of incoming pending requests */
  pendingIncomingCount: number;
  /** Toast notifications (including ones currently animating out) */
  toasts: Notification[];
  /** Set of toast IDs currently playing the dismiss animation */
  dismissingIds: Set<string>;
  /** Manually dismiss a toast with a slide-out animation */
  dismissToast: (id: string) => void;
  /** Called when a toast is clicked — delegates to the registered handler */
  onToastClick: (notification: Notification) => void;
  /** Register a callback for toast clicks (set/cleared by consumer) */
  setToastClickHandler: (handler: (() => void) | null) => void;
  /** Enable/disable creation of new toasts (call when switching between chats/requests) */
  setNotificationsEnabled: (enabled: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotifications must be used within <NotificationProvider>',
    );
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

interface ProviderProps {
  userId: string;
  children: React.ReactNode;
}

export default function NotificationProvider({
  userId,
  children,
}: ProviderProps) {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const [toastClickHandler, setToastClickHandler] = useState<
    (() => void) | null
  >(null);
  const enabledRef = useRef(true);

  // Track previously-seen request IDs so we only toast *new* arrivals
  const prevRequestIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  /* ---- Live friend-request subscription ---- */
  useEffect(() => {
    const unsubscribe = subscribeFriendRequests(userId, setFriendRequests);
    return unsubscribe;
  }, [userId]);

  /* ---- Detect new incoming requests → create toasts ---- */
  useEffect(() => {
    const currentIds = new Set(friendRequests.map((r) => r.id));

    if (!initializedRef.current) {
      prevRequestIdsRef.current = currentIds;
      initializedRef.current = true;
      return;
    }

    const newIncoming: FriendRequest[] = [];
    for (const req of friendRequests) {
      if (
        req.status === 'pending' &&
        req.to === userId &&
        !prevRequestIdsRef.current.has(req.id)
      ) {
        newIncoming.push(req);
      }
    }

    prevRequestIdsRef.current = currentIds;

    // Only create toasts when the consumer is ready to show them
    // (matches the old behaviour that guarded on `view === 'chats'`)
    if (newIncoming.length > 0 && enabledRef.current) {
      const now = Date.now();
      setToasts((prev) => [
        ...prev,
        ...newIncoming.map((req) => ({
          id: `${req.id}-${now}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'friend_request' as const,
          data: req,
          createdAt: now,
        })),
      ]);
    }
  }, [friendRequests, userId]);

  /* ---- Auto-dismiss toasts after 4 seconds ---- */
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    toasts.forEach((t) => {
      const age = Date.now() - t.createdAt;
      const remaining = Math.max(0, 4000 - age);
      const outer = setTimeout(() => {
        setDismissingIds((prev) => new Set(prev).add(t.id));
        const inner = setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== t.id));
          setDismissingIds((prev) => {
            const next = new Set(prev);
            next.delete(t.id);
            return next;
          });
        }, 200);
        timers.push(inner);
      }, remaining);
      timers.push(outer);
    });

    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  /* ---- Manual dismiss ---- */
  const dismissToast = useCallback((id: string) => {
    setDismissingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }, []);

  /* ---- Toast click → animate out, run handler, then remove ---- */
  const onToastClick = useCallback(
    (notification: Notification) => {
      setDismissingIds((prev) => new Set(prev).add(notification.id));
      setTimeout(() => {
        toastClickHandler?.();
        // Remove the toast directly rather than delegating to dismissToast,
        // which would add a second 200-ms delay.
        setToasts((prev) => prev.filter((t) => t.id !== notification.id));
        setDismissingIds((prev) => {
          const next = new Set(prev);
          next.delete(notification.id);
          return next;
        });
      }, 200);
    },
    [toastClickHandler],
  );

  /* ---- Enable / disable toast creation ---- */
  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  /* ---- Derived values ---- */
  const pendingIncomingCount = friendRequests.filter(
    (r) => r.status === 'pending' && r.to === userId,
  ).length;

  // Always expose all toasts so they can finish their dismiss animation
  // naturally.  Toast creation is already gated by enabledRef.current
  // (set by the consumer based on the current view).
  const visibleToasts = toasts;

  const value: NotificationContextValue = {
    friendRequests,
    pendingIncomingCount,
    toasts: visibleToasts,
    dismissingIds,
    dismissToast,
    onToastClick,
    setToastClickHandler,
    setNotificationsEnabled,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
