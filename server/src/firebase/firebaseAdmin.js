const admin = require('firebase-admin');
const { config } = require('../config/env');

let db = null;
let isInitialized = false;

const initFirebase = () => {
  if (isInitialized && db) {
    return { admin, db };
  }

  // Check if admin is already initialized across reloads
  if (admin.apps.length > 0) {
    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    isInitialized = true;
    return { admin, db };
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = config;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('[Firebase Admin]: Credentials not fully configured in environment.');
    console.warn('[Firebase Admin]: Firestore operations will throw an error until credentials are provided in .env');
    return { admin: null, db: null };
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY,
      }),
    });

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    isInitialized = true;
    console.log(`[Firebase Admin]: Successfully initialized Firestore for project "${FIREBASE_PROJECT_ID}".`);
    return { admin, db };
  } catch (error) {
    console.error('[Firebase Admin Initialization Error]:', error.message);
    return { admin: null, db: null };
  }
};

const getDb = () => {
  if (!db) {
    initFirebase();
  }
  if (!db) {
    throw new Error('Firestore is not initialized. Please verify FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env');
  }
  return db;
};

// Initialize immediately on module load
initFirebase();

module.exports = {
  admin,
  getDb,
};
