import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { auth, db, storage, googleProvider, hackclubProvider } from '../firebase';
import type { UserData } from '../types';

interface AuthContextValue {
  user: UserData | null;
  loading: boolean;
  needsOnboarding: boolean;
  login: () => Promise<void>;
  loginWithHackClub: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  finalizeDeletion: () => Promise<void>;
  completeDeletion: () => void;
  completeOnboarding: (displayName: string, photoURL: string | null, bio: string | null) => Promise<void>;
  updateProfile: (displayName: string, photoURL: string | null, bio: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const unloadRef = useRef<(() => void) | null>(null);
  const deletingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData: UserData = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        };
        // Check if user has completed onboarding
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userDocRef).catch(() => null);
        const existingData = userSnap?.exists() ? userSnap.data() : {};

        // For completed profiles, preserve custom photo/name in Firestore
        // (don't overwrite with Google Auth defaults on every login)
        const complete = existingData?.profileComplete === true;
        const mergedData: Record<string, unknown> = {
          ...userData,
          online: true,
          lastSeen: serverTimestamp(),
        };
        if (complete) {
          // Keep existing custom values if user has completed onboarding
          if (existingData?.photoURL) mergedData.photoURL = existingData.photoURL;
          if (existingData?.displayName) mergedData.displayName = existingData.displayName;
        }
        setDoc(userDocRef, mergedData, { merge: true }).catch(() => {});

        if (mounted) {
          setNeedsOnboarding(!complete);
          setUser({
            uid: userData.uid,
            email: userData.email,
            displayName: (complete ? existingData?.displayName : userData.displayName) ?? null,
            photoURL: (complete ? existingData?.photoURL : userData.photoURL) ?? null,
            bio: existingData?.bio ?? null,
            profileComplete: complete,
          });
        }

        if (unloadRef.current) {
          window.removeEventListener('beforeunload', unloadRef.current);
        }
        const handleUnload = () => {
          setDoc(
            doc(db, 'users', firebaseUser.uid),
            { online: false, lastSeen: serverTimestamp() },
            { merge: true }
          );
        };
        window.addEventListener('beforeunload', handleUnload);
        unloadRef.current = handleUnload;

      } else {
        if (mounted && !deletingRef.current) {
          setUser(null);
          setNeedsOnboarding(false);
        }
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
      if (unloadRef.current) {
        window.removeEventListener('beforeunload', unloadRef.current);
        unloadRef.current = null;
      }
    };
  }, []);

  const login = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const loginWithHackClub = useCallback(async () => {
    await signInWithPopup(auth, hackclubProvider);
  }, []);

  const completeOnboarding = useCallback(
    async (displayName: string, photoURL: string | null, bio: string | null) => {
      if (!user) throw new Error('No user');
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          displayName,
          photoURL: photoURL ?? '',
          bio,
          profileComplete: true,
        },
        { merge: true }
      );
      const updated: UserData = {
        ...user,
        displayName,
        photoURL,
        bio,
        profileComplete: true,
      };
      setUser(updated);
      setNeedsOnboarding(false);
    },
    [user]
  );

  const updateProfile = useCallback(
    async (displayName: string, photoURL: string | null, bio: string | null) => {
      if (!user) throw new Error('No user');
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        { displayName, photoURL: photoURL ?? '', bio },
        { merge: true }
      );
      setUser((prev) => prev ? { ...prev, displayName, photoURL, bio } : prev);
    },
    [user]
  );

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('No user');
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    const uid = user.uid;

    // ── Delete all conversations and their messages ──
    const convosSnap = await getDocs(
      query(collection(db, 'conversations'), where('participants', 'array-contains', uid))
    ).catch(() => null);
    if (convosSnap) {
      for (const convoDoc of convosSnap.docs) {
        const msgsSnap = await getDocs(collection(db, 'conversations', convoDoc.id, 'messages')).catch(() => null);
        if (msgsSnap) {
          for (const msgDoc of msgsSnap.docs) {
            await deleteDoc(msgDoc.ref).catch(() => {});
          }
        }
        await deleteDoc(convoDoc.ref).catch(() => {});
      }
    }

    // ── Delete all friend requests ──
    const requestsSnap = await getDocs(
      query(collection(db, 'friendRequests'), where('participants', 'array-contains', uid))
    ).catch(() => null);
    if (requestsSnap) {
      for (const reqDoc of requestsSnap.docs) {
        await deleteDoc(reqDoc.ref).catch(() => {});
      }
    }

    // ── Delete profile picture from Storage ──
    await deleteObject(ref(storage, `users/${uid}/profile-picture.jpg`)).catch(() => {});

    // ── Delete user document from Firestore ──
    await deleteDoc(doc(db, 'users', uid)).catch((err) => {
      console.error('Failed to delete user doc:', err);
    });

  }, [user]);

  const finalizeDeletion = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');

    // Block onAuthStateChanged from unmounting until the fade-out animation completes
    deletingRef.current = true;

    const tryDelete = async (): Promise<void> => {
      try {
        await deleteUser(currentUser);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== 'auth/requires-recent-login') throw err;

        // Determine which provider the user signed in with
        const providerId = currentUser.providerData[0]?.providerId;
        if (providerId === 'google.com') {
          await reauthenticateWithPopup(currentUser, googleProvider);
        } else if (providerId === 'oidc.hackclub') {
          await reauthenticateWithPopup(currentUser, hackclubProvider);
        } else {
          throw new Error('Cannot re-authenticate with this provider.');
        }

        // Retry after successful re-auth
        await deleteUser(currentUser);
      }
    };

    try {
      await tryDelete();
    } catch (err) {
      // Reset the blocking flag on failure so normal auth flow resumes
      deletingRef.current = false;
      throw err;
    }
  }, []);

  const completeDeletion = useCallback(() => {
    // Clean up beforeunload handler
    if (unloadRef.current) {
      window.removeEventListener('beforeunload', unloadRef.current);
      unloadRef.current = null;
    }

    deletingRef.current = false;
    setUser(null);
    setNeedsOnboarding(false);
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      await setDoc(
        doc(db, 'users', user.uid),
        { online: false, lastSeen: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
    }
    if (unloadRef.current) {
      window.removeEventListener('beforeunload', unloadRef.current);
      unloadRef.current = null;
    }
    await signOut(auth);
    setNeedsOnboarding(false);
  }, [user]);

  const value: AuthContextValue = { user, loading, needsOnboarding, login, loginWithHackClub, logout, deleteAccount, finalizeDeletion, completeDeletion, completeOnboarding, updateProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
