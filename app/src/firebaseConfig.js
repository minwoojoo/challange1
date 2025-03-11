import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
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

// Firebase 초기화
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase 앱 초기화 성공');
} catch (error) {
  console.error('Firebase 앱 초기화 실패:', error);
}

// Auth, Firestore, Functions 초기화
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

// 개발 환경에서 에뮬레이터 연결
if (process.env.NODE_ENV === 'development') {
  try {
    console.log('Firebase Functions Emulator 연결 중... http://localhost:5001');
    connectFunctionsEmulator(functions, 'localhost', 5001);
    
    console.log('Firestore 에뮬레이터 연결 중... http://localhost:9090');
    connectFirestoreEmulator(db, 'localhost', 9090);
  } catch (error) {
    console.error('에뮬레이터 연결 오류:', error);
  }
}

export { auth, db, functions };
export default app;
