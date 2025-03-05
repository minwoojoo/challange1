const functions = require('firebase-functions');
const { db } = require('../firebase-setup');
const axios = require('axios');

// URL 리디렉션 추적 함수
exports.trackRedirect = functions.https.onCall(async (data, context) => {
  try {
    const { url } = data;
    const redirectChain = [];
    let currentUrl = url;
    let finalUrl = url;

    // 리디렉션 체인 추적
    try {
      const response = await axios.get(currentUrl, {
        maxRedirects: 10,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      finalUrl = response.request.res.responseUrl || url;
      
      // 리디렉션 체인 수집
      if (response.request.res.req._redirectable._redirectCount > 0) {
        response.request.res.req._redirectable._redirects.forEach(redirect => {
          redirectChain.push({
            from: redirect.url,
            to: redirect.redirectUrl,
            status: redirect.statusCode
          });
        });
      }
    } catch (error) {
      console.error('Error following redirects:', error);
    }

    // 단축 URL 서비스 확인
    const isUrlShortener = checkIfUrlShortener(currentUrl);

    // 결과를 Firestore에 저장
    const redirectResult = {
      originalUrl: url,
      finalUrl,
      redirectChain,
      isUrlShortener,
      checkedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('urlRedirects').add(redirectResult);

    // Safe Browsing API로 최종 URL 확인
    const safeBrowsingResult = await checkUrlWithSafeBrowsing(finalUrl);

    return {
      success: true,
      result: {
        ...redirectResult,
        safety: safeBrowsingResult
      }
    };
  } catch (error) {
    console.error('Error tracking URL redirect:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// URL이 단축 URL 서비스인지 확인
function checkIfUrlShortener(url) {
  const shortenerDomains = [
    'bit.ly',
    'tinyurl.com',
    'goo.gl',
    't.co',
    'ow.ly',
    'is.gd',
    'buff.ly',
    'adf.ly',
    'bit.do',
    'sh.st'
  ];

  try {
    const urlObj = new URL(url);
    return shortenerDomains.includes(urlObj.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// Safe Browsing API로 URL 확인
async function checkUrlWithSafeBrowsing(url) {
  const SAFE_BROWSING_API_KEY = functions.config().safebrowsing.key;
  const SAFE_BROWSING_API_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

  try {
    const response = await axios.post(`${SAFE_BROWSING_API_URL}?key=${SAFE_BROWSING_API_KEY}`, {
      client: {
        clientId: 'your-client-name',
        clientVersion: '1.0.0'
      },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }]
      }
    });

    return {
      isSafe: !response.data.matches,
      threats: response.data.matches || []
    };
  } catch (error) {
    console.error('Error checking URL with Safe Browsing API:', error);
    return {
      isSafe: null,
      error: error.message
    };
  }
}

// 리디렉션 이력 조회
exports.getRedirectHistory = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { limit = 10 } = data;
    
    const snapshot = await db.collection('urlRedirects')
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
    console.error('Error fetching redirect history:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 