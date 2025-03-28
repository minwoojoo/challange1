import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Firebase 설정 객체
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT
};

// 환경 변수가 설정되어 있는지 확인
if (!process.env.REACT_APP_FIREBASE_API_KEY) {
  console.warn('환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

// Firebase 초기화
const app = initializeApp(firebaseConfig);
console.log('Firebase 앱 초기화 성공');

// Auth, Firestore, Functions 초기화
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

export { auth, db, functions };
export default app;
