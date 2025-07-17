import * as admin from 'firebase-admin';

const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT)
  : null;

if (!admin.apps.length) {
  if (serviceAccountKey) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
    });
  } else {
    console.log('Firebase Admin SDK not initialized. Service account key is missing.');
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
