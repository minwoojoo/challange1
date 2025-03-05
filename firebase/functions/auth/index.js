
const functions = require('firebase-functions');
const { db, admin } = require('../firebase-setup');
const cors = require('cors')({ 
  origin: true,
  methods: ['POST', 'OPTIONS'],
  credentials: true
});

// Google People API 설정
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

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

// 연동된 이메일 계정 조회 함수
exports.getConnectedEmails = functions.https.onCall(async (data, context) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '사용자 인증이 필요합니다.'
    );
  }

  try {
    const user = context.auth.token;
    
    // Google OAuth2 클라이언트 설정
    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // 사용자의 Google 액세스 토큰 설정
    oauth2Client.setCredentials({
      access_token: user.access_token,
      refresh_token: user.refresh_token,
      scope: 'https://www.googleapis.com/auth/userinfo.email',
      token_type: 'Bearer',
      expiry_date: user.exp * 1000
    });

    // People API 호출
    const people = google.people({ version: 'v1', auth: oauth2Client });
    const response = await people.people.get({
      resourceName: 'people/me',
      personFields: 'emailAddresses'
    });

    // 이메일 주소 추출
    const emails = response.data.emailAddresses.map(email => ({
      email: email.value,
      type: email.type || '기타 이메일'
    }));

    // Firestore에 이메일 목록 저장
    await db.collection('users').doc(context.auth.uid).update({
      connectedEmails: emails,
      lastEmailSync: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      emails
    };

  } catch (error) {
    console.error('연동된 이메일 조회 중 오류:', error);
    throw new functions.https.HttpsError(
      'internal',
      '연동된 이메일 조회 중 오류가 발생했습니다.'
    );
  }
});

