// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// IMPORTANT: Never expose service account credentials in client-side code.
// This file should only be used in server-side Genkit flows.

// This function will throw an error if the private key is missing or malformed.
function getServiceAccount() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("The FIREBASE_PRIVATE_KEY environment variable is not set. Please add it to your .env file.");
  }

  return {
    projectId: "laugh-factory-j57tt",
    clientEmail: "firebase-adminsdk-3y934@laugh-factory-j57tt.iam.gserviceaccount.com",
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

let adminApp: App;
let adminStorage: Storage;
let adminDb: Firestore;

try {
  if (!getApps().some(app => app.name === 'admin')) {
    adminApp = initializeApp({
      credential: cert(getServiceAccount()),
      storageBucket: "laugh-factory-j57tt.appspot.com"
    }, 'admin');
  } else {
    adminApp = getApps().find(app => app.name === 'admin')!;
  }

  adminStorage = getStorage(adminApp);
  adminDb = getFirestore(adminApp);

} catch (error: any) {
  console.error("Firebase Admin SDK initialization failed:", error);
  // Re-throw the error to make it clear that the app cannot function without a valid admin setup.
  throw new Error(`Firebase Admin SDK could not be initialized. Please check your FIREBASE_PRIVATE_KEY. Original error: ${error.message}`);
}


export { adminApp, adminStorage, adminDb };
