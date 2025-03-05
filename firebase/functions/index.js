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
const { db, admin } = require('./firebase-setup');
const adminApp = require('firebase-admin');

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
const auth = require('./auth/login');

// Email Triggers
const emailTriggers = require('./firestore-triggers/email-triggers');

// URL Check Functions (나중에 구현)
// const urlCheckFunctions = require('./url-check');

// Firebase Admin 초기화
adminApp.initializeApp();

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

module.exports = {
    ...auth
};
