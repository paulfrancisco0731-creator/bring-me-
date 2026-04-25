import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA71MxSzExxgsAlJQM5ePHJVxVMXdTzH6g",
  authDomain: "sanmoshadalhin.firebaseapp.com",
  databaseURL: "https://sanmoshadalhin-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sanmoshadalhin",
  storageBucket: "sanmoshadalhin.firebasestorage.app",
  messagingSenderId: "819825068184",
  appId: "1:819825068184:web:3ef8fc930cd4a74b6ea8ed",
  measurementId: "G-6S1R9T027N"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
