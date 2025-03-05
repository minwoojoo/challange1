/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// 스키마 import
const { 
  emailAnalysisSchema, 
  pdfAnalysisSchema,
  EMAILS_COLLECTION,
  PDF_ANALYSIS_SUBCOLLECTION 
} = require('./schemas/emails');

const { 
  attachmentAnalysisSchema, 
  ATTACHMENT_COLLECTION 
} = require('./schemas/attachment_analysis');

const { 
  urlAnalysisSchema, 
  URL_COLLECTION 
} = require('./schemas/url_analysis');

// Auth Functions
const auth = require('./auth');

// Email Triggers
const emailTriggers = require('./firestore-triggers/email-triggers');

// URL Check Functions (나중에 구현)
// const urlCheckFunctions = require('./url-check');

// Firebase Admin 초기화
admin.initializeApp();

// Firestore 참조
const db = admin.firestore();

// 데이터 유효성 검증 함수
const validateData = (data, schema) => {
  const errors = [];
  for (const [key, value] of Object.entries(schema)) {
    if (value === String && typeof data[key] !== 'string') {
      errors.push(`${key} must be a string`);
    }
    if (value === Number && typeof data[key] !== 'number') {
      errors.push(`${key} must be a number`);
    }
    if (value === Boolean && typeof data[key] !== 'boolean') {
      errors.push(`${key} must be a boolean`);
    }
    if (value === Date && !(data[key] instanceof Date)) {
      errors.push(`${key} must be a date`);
    }
  }
  return errors;
};

// 이메일 분석 데이터 생성/수정
exports.createEmailAnalysis = functions.https.onCall(async (data, context) => {
  try {
    // 사용자 인증 확인
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
    }

    // 데이터 유효성 검증
    const validationErrors = validateData(data, emailAnalysisSchema);
    if (validationErrors.length > 0) {
      throw new functions.https.HttpsError('invalid-argument', '유효하지 않은 데이터입니다.', validationErrors);
    }

    // 이메일 분석 데이터 저장
    const emailData = {
      ...data,
      user_id: context.auth.uid,
      analyzed_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const emailRef = await db.collection(EMAILS_COLLECTION).add(emailData);

    // PDF 첨부파일이 있는 경우 추가 분석
    if (data.attachment_ids && data.attachment_ids.some(att => att.type === 'pdf')) {
      const pdfData = {
        email_id: emailRef.id,
        hasJavaScript: false,
        markedDangerous: false,
        pdfAnalysis: {
          hasEmbeddedFiles: false,
          hasJavaScript: false,
          riskScore: 0,
          totalPages: 0
        },
        reported: false,
        markedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await emailRef.collection(PDF_ANALYSIS_SUBCOLLECTION).add(pdfData);
    }

    return {
      success: true,
      emailId: emailRef.id
    };
  } catch (error) {
    console.error('Error creating email analysis:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Export auth functions
exports.googleLogin = auth.googleLogin;
exports.getUserInfo = auth.getUserInfo;

// Export email triggers
exports.onEmailAnalysisChange = emailTriggers.onEmailAnalysisChange;

// Export URL check functions (나중에 구현)
// exports.checkUrl = urlCheckFunctions.checkUrl;
// exports.getUrlCheckHistory = urlCheckFunctions.getUrlCheckHistory;

// 기본 함수
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

// 새로운 사용자가 가입할 때 트리거되는 함수
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    // Firestore에 사용자 정보 저장
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      display_name: user.display_name,
      photo_url: user.photo_url,
      create_at: admin.firestore.FieldValue.serverTimestamp(),
      last_login_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 필요한 경우 사용자 커스텀 클레임 설정
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'user'
    });

    return null;
  } catch (error) {
    console.error('Error creating user document:', error);
    return null;
  }
});

// 사용자 로그아웃 함수
exports.onUserSignOut = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      const idToken = request.headers.authorization?.split('Bearer ')[1];
      
      if (!idToken) {
        return response.status(401).json({ error: '인증 토큰이 없습니다.' });
      }

      // 토큰 검증
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Firestore 업데이트
      await db.collection('users').doc(uid).update({
        last_logout_at: admin.firestore.FieldValue.serverTimestamp()
      });

      // 사용자의 모든 토큰 무효화
      await admin.auth().revokeRefreshTokens(uid);

      return response.status(200).json({ 
        success: true, 
        message: '로그아웃이 완료되었습니다.' 
      });

    } catch (error) {
      console.error('로그아웃 처리 중 오류:', error);
      return response.status(500).json({ 
        error: '로그아웃 처리 중 오류가 발생했습니다.' 
      });
    }
  });
});

// 사용자 로그인 함수
exports.onUserSignIn = functions.https.onCall(async (data, context) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  try {
    const uid = context.auth.uid;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

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
    }, { merge: true });

    return { success: true, message: '로그인 정보가 업데이트되었습니다.' };
  } catch (error) {
    console.error('로그인 처리 중 오류:', error);
    throw new functions.https.HttpsError('internal', '로그인 처리 중 오류가 발생했습니다.');
  }
});

// 모든 함수들을 exports
module.exports = {
  ...auth
};
