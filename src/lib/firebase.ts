// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

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
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
