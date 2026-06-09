import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type Auth } from "firebase/auth";
import type { AppUser } from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDgSXNq2Y656uSJFtd244VHij_AyY5S85o",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "projects-8f743.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "projects-8f743",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "projects-8f743.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "784967224976",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:784967224976:web:40f5cfff88463751d69215",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-4133DZ23NM",
};

export const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let analyticsInitialized = false;

const initializeAnalytics = (firebaseApp: FirebaseApp) => {
  if (analyticsInitialized || !firebaseConfig.measurementId) return;
  analyticsInitialized = true;
  void isSupported().then((supported) => {
    if (supported) getAnalytics(firebaseApp);
  });
};

export const getFirebaseAuth = () => {
  if (!hasFirebaseConfig) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    initializeAnalytics(app);
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
