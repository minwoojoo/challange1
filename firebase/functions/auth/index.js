const functions = require('firebase-functions');
const { db, admin } = require('../firebase-setup');
const cors = require('cors')({ 
  origin: true,
  methods: ['POST', 'OPTIONS'],
  credentials: true
});

// 사용자 로그인 시 호출되는 함수
exports.onUserSignIn = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context?.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '사용자 인증이 필요합니다.'
    );
  }

  try {
    const uid = context.auth.uid;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // 사용자 문서가 존재하는지 확인
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      // 최초 로그인인 경우에만 기본 정보 설정
      await db.collection('users').doc(uid).set({
        display_name: context.auth.token?.name || '',
        email: context.auth.token?.email || '',
        last_login_at: timestamp,
        notifications: {
          deleteDangerousFiles: true,
          emailNotifications: true
        },
        photoURL: context.auth.token?.picture || '',
        updatedAt: timestamp
      });

      return {
        success: true,
        message: '최초 로그인 정보가 저장되었습니다.'
      };
    }

    // 기존 사용자의 경우 마지막 로그인 시간만 업데이트
    await db.collection('users').doc(uid).update({
      last_login_at: timestamp
    });

    return {
      success: true,
      message: '로그인 시간이 업데이트되었습니다.'
    };
  } catch (error) {
    console.error('로그인 처리 중 오류:', error);
    throw new functions.https.HttpsError('internal', '로그인 처리 중 오류가 발생했습니다.');
  }
});

// 사용자 로그아웃 시 호출되는 함수
exports.onUserSignOut = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // 토큰 검증
      const idToken = req.headers.authorization?.split('Bearer ')[1];
      if (!idToken) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      // 로그아웃 정보 업데이트
      await db.collection('users').doc(uid).update({
        updatedAt: timestamp
      });

      // 사용자의 활성 세션 모두 종료
      await admin.auth().revokeRefreshTokens(uid);

      res.json({
        success: true,
        message: '로그아웃되었습니다.'
      });
    } catch (error) {
      console.error('로그아웃 처리 중 오류:', error);
      res.status(500).json({
        success: false,
        message: '로그아웃 처리 중 오류가 발생했습니다.'
      });
    }
  });
});

