const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { OAuth2Client } = require('google-auth-library');

// Firebase Admin 초기화
admin.initializeApp();

// Google OAuth 클라이언트 초기화
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Firestore 데이터베이스 참조
const db = admin.firestore();

exports.googleLogin = functions.https.onCall(async (data, context) => {
  try {
    // Google ID 토큰 검증
    const ticket = await client.verifyIdToken({
      idToken: data.idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // 사용자 정보 저장
    const userRef = db.collection('users').doc(payload.sub);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // 새 사용자 정보 저장
      await userRef.set({
        uid: payload.sub,
        email: payload.email,
        display_name: payload.name,
        photo_url: payload.picture,
        create_at: admin.firestore.FieldValue.serverTimestamp(),
        last_login_at: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // 기존 사용자의 마지막 로그인 시간 업데이트
      await userRef.update({
        last_login_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Firebase Auth 커스텀 토큰 생성
    const customToken = await admin.auth().createCustomToken(payload.sub);

    return {
      success: true,
      customToken,
      user: {
        uid: payload.sub,
        email: payload.email,
        display_name: payload.name,
        photo_url: payload.picture
      }
    };
  } catch (error) {
    console.error('Google 로그인 중 오류 발생:', error);
    throw new functions.https.HttpsError('internal', '로그인 처리 중 오류가 발생했습니다.');
  }
});

// 사용자 정보 조회 함수
exports.getUserInfo = functions.https.onCall(async (data, context) => {
  try {
    // 인증된 사용자인지 확인
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '인증되지 않은 사용자입니다.');
    }

    const userId = context.auth.uid;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', '사용자를 찾을 수 없습니다.');
    }

    return {
      success: true,
      user: userDoc.data()
    };
  } catch (error) {
    console.error('사용자 정보 조회 중 오류 발생:', error);
    throw new functions.https.HttpsError('internal', '사용자 정보 조회 중 오류가 발생했습니다.');
  }
});
