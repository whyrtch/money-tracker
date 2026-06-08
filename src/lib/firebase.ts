import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type Auth } from "firebase/auth";
import type { AppUser } from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export const getFirebaseAuth = () => {
  if (!hasFirebaseConfig) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
};

export const signInWithGoogle = async (): Promise<AppUser> => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    return {
      uid: "demo-user",
      name: "Bimo",
      email: "demo@money-tracker.local",
      demo: true,
    };
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(firebaseAuth, provider);
  return {
    uid: result.user.uid,
    name: result.user.displayName ?? "User",
    email: result.user.email ?? "",
    photoURL: result.user.photoURL ?? undefined,
  };
};

export const logout = async () => {
  const firebaseAuth = getFirebaseAuth();
  if (firebaseAuth) await signOut(firebaseAuth);
};
