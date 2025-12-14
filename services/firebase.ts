import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/analytics';
import 'firebase/firestore';
import 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCmAoOTRzEeZS6UBC9gKuP3GW5OkU-o7ec",
  authDomain: "synapse-sync-ai.firebaseapp.com",
  projectId: "synapse-sync-ai",
  // Updated to the correct bucket domain provided
  storageBucket: "synapse-sync-ai.firebasestorage.app",
  messagingSenderId: "46476319012",
  appId: "1:46476319012:web:69fb0818084094b03f3bb1",
  measurementId: "G-PSYE3GKDB2"
};

// Initialize Firebase
const firebaseNamespace = (firebase as any).default || firebase;

const app = !firebaseNamespace.apps.length ? firebaseNamespace.initializeApp(firebaseConfig) : firebaseNamespace.app();

export const auth = firebaseNamespace.auth();
export const analytics = firebaseNamespace.analytics();
export const db = firebaseNamespace.firestore();
export const storage = firebaseNamespace.storage();

// Set retry time to 5 seconds to ensure fast fallback to offline mode if connection is bad.
if (storage.setMaxOperationRetryTime) {
  storage.setMaxOperationRetryTime(5000);
}

export default app;