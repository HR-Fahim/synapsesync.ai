import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

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
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);