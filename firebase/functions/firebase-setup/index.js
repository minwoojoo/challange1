const admin = require('firebase-admin');

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 데이터베이스 접근을 위한 기본 객체들 export
module.exports = {
  admin,
  db
}; 