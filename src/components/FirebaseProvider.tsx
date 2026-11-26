import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { syncUserProfile } from '../lib/firestoreStore';

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  hasSheetsAccess: boolean;
  getSheetsAccessToken: () => string | null;
  clearSheetsAccessToken: () => void;
  requestSheetsAccess: () => Promise<string | null>;
  signInWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

function formatAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in popup was closed before completing.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Browser blocked the Google sign-in popup. Allow popups for this site and retry.';
  }
  return error instanceof Error
    ? error.message
    : 'Unable to sign in with Google right now.';
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // Keep Google OAuth access token strictly in memory (never in localStorage/sessionStorage).
  const [sheetsToken, setSheetsToken] = useState<string | null>(null);
  const sheetsTokenRef = useRef<string | null>(null);

  const setInMemorySheetsToken = useCallback((token: string | null) => {
    sheetsTokenRef.current = token;
    setSheetsToken(token);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setInMemorySheetsToken(null);
        return;
      }
      if (nextUser.emailVerified) {
        void syncUserProfile(nextUser).catch((err) => {
          console.error('Failed to sync user profile:', err);
        });
      }
    });
    return () => unsubscribe();
  }, [setInMemorySheetsToken]);

  const performGoogleSignIn = useCallback(async (): Promise<{
    ok: boolean;
    accessToken: string | null;
  }> => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const oauthCred = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = oauthCred?.accessToken || null;
      setInMemorySheetsToken(accessToken);

      if (result.user && result.user.emailVerified) {
        await syncUserProfile(result.user);
      }
      return { ok: true, accessToken };
    } catch (error) {
      setAuthError(formatAuthError(error));
      return { ok: false, accessToken: null };
    } finally {
      setAuthLoading(false);
    }
  }, [setInMemorySheetsToken]);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    const outcome = await performGoogleSignIn();
    return outcome.ok;
  }, [performGoogleSignIn]);

  const requestSheetsAccess = useCallback(async (): Promise<string | null> => {
    if (sheetsTokenRef.current) {
      return sheetsTokenRef.current;
    }
    const outcome = await performGoogleSignIn();
    if (outcome.ok && !outcome.accessToken) {
      setAuthError(
        'Signed in to Google, but Google Sheets permission was not granted in the popup. Please grant spreadsheet access when prompted.'
      );
    }
    return outcome.accessToken;
  }, [performGoogleSignIn]);

  const getSheetsAccessToken = useCallback(() => {
    return sheetsTokenRef.current;
  }, []);

  const clearSheetsAccessToken = useCallback(() => {
    setInMemorySheetsToken(null);
  }, [setInMemorySheetsToken]);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signOut(auth);
      setInMemorySheetsToken(null);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Unable to sign out right now.'
      );
    } finally {
      setAuthLoading(false);
    }
  }, [setInMemorySheetsToken]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        authLoading,
        authError,
        hasSheetsAccess: Boolean(sheetsToken),
        getSheetsAccessToken,
        clearSheetsAccessToken,
        requestSheetsAccess,
        signInWithGoogle,
        signOutUser,
        clearAuthError,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebaseAuth(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebaseAuth must be used inside FirebaseProvider.');
  }
  return ctx;
}
