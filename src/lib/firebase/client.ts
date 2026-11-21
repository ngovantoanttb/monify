import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'fake-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'localhost',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'monify',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://monify-default-rtdb.asia-southeast1.firebasedatabase.app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const database = getDatabase(firebaseApp)

// Connect to emulators ONLY when explicitly enabled via VITE_USE_FIREBASE_EMULATOR
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectDatabaseEmulator(database, '127.0.0.1', 9000)
  } catch {
    // Ignore already connected warnings in hot reload
  }
}
