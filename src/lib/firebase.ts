// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: "laugh-factory-j57tt",
  appId: "1:732151493393:web:0d6d2d96b8774eb48fd2b0",
  storageBucket: "laugh-factory-j57tt.appspot.com",
  apiKey: "AIzaSyAJ2WcMObGb4NHKFOn2LWj3XnRp9bTorIU",
  authDomain: "laugh-factory-j57tt.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "732151493393"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };