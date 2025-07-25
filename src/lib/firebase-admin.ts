// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// IMPORTANT: Never expose service account credentials in client-side code.
// This file should only be used in server-side Genkit flows.
const serviceAccount = {
  projectId: "laugh-factory-j57tt",
  clientEmail: "firebase-adminsdk-3y934@laugh-factory-j57tt.iam.gserviceaccount.com",
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

let adminApp: App;
let adminStorage: Storage;
let adminDb: Firestore;

if (!getApps().some(app => app.name === 'admin')) {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: "laugh-factory-j57tt.appspot.com"
  }, 'admin');
} else {
  adminApp = getApps().find(app => app.name === 'admin')!;
}

adminStorage = getStorage(adminApp);
adminDb = getFirestore(adminApp);

export { adminApp, adminStorage, adminDb };
