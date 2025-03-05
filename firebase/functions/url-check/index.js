const functions = require('firebase-functions');
const { db, admin } = require('../firebase-setup');
const axios = require('axios');

// Safe Browsing API 설정
const SAFE_BROWSING_API_KEY = process.env.SAFE_BROWSING_API_KEY;
const SAFE_BROWSING_API_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

exports.checkUrl = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context?.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '사용자 인증이 필요합니다.'
    );
  }

  try {
    const { url } = data;
    const uid = context.auth.uid;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // Safe Browsing API 요청
    const response = await axios.post(SAFE_BROWSING_API_URL, {
      client: {
        clientId: "pdf-security",
        clientVersion: "1.0.0"
      },
      threatInfo: {
        threatTypes: ["SOCIAL_ENGINEERING", "MALWARE"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }]
      }
    }, {
      params: {
        key: SAFE_BROWSING_API_KEY
      }
    });

    const isPhishing = response.data.matches && response.data.matches.length > 0;
    const threatDetails = isPhishing ? response.data.matches : null;

    // 결과를 Firestore에 저장
    await db.collection('urlChecks').add({
      uid,
      url,
      isPhishing,
      threatDetails,
      checkedAt: timestamp
    });

    // 사용자의 검사 이력 업데이트
    await db.collection('users').doc(uid).update({
      lastUrlCheck: timestamp,
      urlCheckCount: admin.firestore.FieldValue.increment(1)
    });

    return {
      success: true,
      isPhishing,
      threatDetails,
      message: isPhishing ? '피싱 사이트로 감지되었습니다.' : '안전한 사이트입니다.'
    };

  } catch (error) {
    console.error('URL 체크 중 오류:', error);
    throw new functions.https.HttpsError(
      'internal',
      'URL 체크 중 오류가 발생했습니다.'
    );
  }
});

// URL 검사 이력 조회
exports.getUrlCheckHistory = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { limit = 10 } = data;
    
    const snapshot = await db.collection('urlChecks')
      .orderBy('checkedAt', 'desc')
      .limit(limit)
      .get();

    const history = [];
    snapshot.forEach(doc => {
      history.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, history };
  } catch (error) {
    console.error('Error fetching URL check history:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 