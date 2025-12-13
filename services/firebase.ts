import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyA5P3m4yf9fg2xoZyrImOBOWhaK70Bw4ZY",
  authDomain: "synapse-sync-ai.firebaseapp.com",
  projectId: "synapse-sync-ai",
  storageBucket: "synapse-sync-ai.firebasestorage.app",
  messagingSenderId: "46476319012",
  appId: "1:46476319012:web:5b201a5bfd8b0ed43f3bb1",
  measurementId: "G-1H7N4YNE08"
};

// Initialize Firebase
// Ensure we handle the default export correctly if the environment wraps it (synthetic default)
const firebaseNamespace = (firebase as any).default || firebase;

// Initialize app if not already initialized
const app = !firebaseNamespace.apps.length ? firebaseNamespace.initializeApp(firebaseConfig) : firebaseNamespace.app();

// Export services
// Using firebaseNamespace.auth() ensures we use the module-augmented namespace
export const auth = firebaseNamespace.auth();
export const analytics = firebaseNamespace.analytics();

export default app;