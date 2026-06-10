import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  signOut,
  type Auth,
  type Unsubscribe,
  type User,
} from "firebase/auth";
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
const pendingGoogleLoginKey = "money-tracker-google-login-pending";

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

const googleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
};

const toAppUser = (user: User): AppUser => ({
  uid: user.uid,
  name: user.displayName ?? "User",
  email: user.email ?? "",
  photoURL: user.photoURL ?? undefined,
});

export const completeGoogleRedirect = async (): Promise<AppUser | null> => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) return null;
  const result = await getRedirectResult(firebaseAuth);
  if (!result?.user) return null;
  window.sessionStorage.removeItem(pendingGoogleLoginKey);
  return toAppUser(result.user);
};

export const subscribeToAuthUser = (callback: (user: AppUser | null) => void): Unsubscribe | null => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) return null;
  return onAuthStateChanged(firebaseAuth, (user) => {
    callback(user ? toAppUser(user) : null);
  });
};

export const getCurrentAuthUser = (): AppUser | null => {
  const firebaseAuth = getFirebaseAuth();
  return firebaseAuth?.currentUser ? toAppUser(firebaseAuth.currentUser) : null;
};

export const authErrorMessage = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : "";
  if (code === "auth/unauthorized-domain") return "Domain localhost belum diizinkan di Firebase Authentication.";
  if (code === "auth/popup-closed-by-user") return "Login Google dibatalkan sebelum selesai.";
  if (code === "auth/network-request-failed") return "Koneksi ke Firebase gagal. Periksa internet lalu coba lagi.";
  return code || message ? `Login Google gagal (${code || message}).` : "Login Google gagal. Coba ulangi dari halaman login.";
};

export const signInWithGoogle = async (): Promise<AppUser | null> => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    return {
      uid: "demo-user",
      name: "Bimo",
      email: "demo@money-tracker.local",
      demo: true,
    };
  }

  await setPersistence(firebaseAuth, browserLocalPersistence);
  window.sessionStorage.setItem(pendingGoogleLoginKey, "1");
  await signInWithRedirect(firebaseAuth, googleProvider());
  return null;
};

export const consumePendingGoogleLogin = (): AppUser | null => {
  if (window.sessionStorage.getItem(pendingGoogleLoginKey) !== "1") return null;
  window.sessionStorage.removeItem(pendingGoogleLoginKey);
  return {
    uid: "google-local-session",
    name: "Google User",
    email: "",
  };
};

export const logout = async () => {
  const firebaseAuth = getFirebaseAuth();
  window.sessionStorage.removeItem(pendingGoogleLoginKey);
  if (firebaseAuth) await signOut(firebaseAuth);
};
