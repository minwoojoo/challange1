const functions = require('firebase-functions');
const { db } = require('../firebase-setup');
const axios = require('axios');

// Safe Browsing API 설정
const SAFE_BROWSING_API_KEY = functions.config().safebrowsing.key;
const SAFE_BROWSING_API_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

// URL 검사 함수
exports.checkUrl = functions.https.onCall(async (data, context) => {
  try {
    const { url } = data;

    // Safe Browsing API 요청 데이터 (수정필요)
    const requestBody = {
      client: {
        clientId: 'your-client-name',  
        clientVersion: '1.0.0'
      },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url: url }]
      }
    };

    // Safe Browsing API 호출
    const response = await axios.post(`${SAFE_BROWSING_API_URL}?key=${SAFE_BROWSING_API_KEY}`, requestBody);

    const isSafe = !response.data.matches;
    const threats = response.data.matches || [];

    // 검사 결과를 Firestore에 저장
    const checkResult = {
      url,
      isSafe,
      threats: threats.map(threat => ({
        threatType: threat.threatType,
        platformType: threat.platformType,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })),
      checkedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('urlChecks').add(checkResult);

    return {
      success: true,
      result: checkResult
    };
  } catch (error) {
    console.error('Error checking URL:', error);
    throw new functions.https.HttpsError('internal', error.message);
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