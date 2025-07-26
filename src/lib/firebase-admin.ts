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
    console.error("Firebase Admin SDK Error: The FIREBASE_PRIVATE_KEY environment variable is not set. Please add it to your .env.local file.");
    return null;
  }

  try {
    return {
      projectId: "laugh-factory-j57tt",
      clientEmail: "firebase-adminsdk-3y934@laugh-factory-j57tt.iam.gserviceaccount.com",
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  } catch(e) {
    console.error("Firebase Admin SDK Error: Could not parse FIREBASE_PRIVATE_KEY. Make sure it's correctly formatted in your .env.local file.");
    return null;
  }
}

let adminApp: App | null = null;
let adminStorage: Storage | null = null;
let adminDb: Firestore | null = null;

const serviceAccount = getServiceAccount();

if (serviceAccount) {
    try {
        if (!getApps().some(app => app?.name === 'admin')) {
            adminApp = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: "laugh-factory-j57tt.appspot.com"
            }, 'admin');
        } else {
            adminApp = getApps().find(app => app?.name === 'admin') || null;
        }

        if (adminApp) {
            adminStorage = getStorage(adminApp);
            adminDb = getFirestore(adminApp);
        }
    } catch (error: any) {
        console.error("Firebase Admin SDK initialization failed:", error.message);
        adminApp = null;
        adminStorage = null;
        adminDb = null;
    }
} else {
    console.warn("Firebase Admin SDK is not initialized due to missing credentials. Server-side Firebase features will not work.");
}


export { adminApp, adminStorage, adminDb };
