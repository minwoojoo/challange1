import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase 설정 객체
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1'); // 리전 명시적 설정

// 개발 환경에서 Functions 에뮬레이터만 연결
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase Functions Emulator 연결 중... http://localhost:5001');
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { auth, db, functions };
export default app;
