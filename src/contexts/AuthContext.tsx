import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, hackclubProvider } from '../firebase';
import type { UserData } from '../types';

interface AuthContextValue {
  user: UserData | null;
  loading: boolean;
  needsOnboarding: boolean;
  login: () => Promise<void>;
  loginWithHackClub: () => Promise<void>;
  logout: () => Promise<void>;
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
        if (mounted) {
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

  const value: AuthContextValue = { user, loading, needsOnboarding, login, loginWithHackClub, logout, completeOnboarding, updateProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
