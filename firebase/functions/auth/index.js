const functions = require("firebase-functions");
const { admin } = require("../firebase-setup");
const cors = require("cors")({
  origin: true,
  methods: ["POST", "OPTIONS"],
  credentials: true
});

// Google People API 설정
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

// 토큰 검증 함수
exports.verifyToken = functions.https.onCall(async (request) => {
  try {
    // request.auth가 없으면 인증되지 않은 요청
    if (!request.auth) {
      console.error("인증되지 않은 요청");
      throw new Error("인증이 필요합니다.");
    }

    // 사용자 정보 가져오기
    const user = request.auth;
    console.log("인증된 사용자:", user.uid);

    // 기본 사용자 정보만 반환
    return {
      success: true,
      uid: user.uid,
      email: user.token.email
    };
  } catch (error) {
    console.error("토큰 검증 중 상세 오류:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new Error("토큰 검증 중 오류가 발생했습니다: " + error.message);
  }
});

// 사용자 로그아웃 시 호출되는 함수
exports.onUserSignOut = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "인증이 필요합니다."
      );
    }

    const uid = context.auth.uid;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // 로그아웃 정보 업데이트
    await admin.firestore().collection("users").doc(uid).update({
      updatedAt: timestamp
    });

    // 사용자의 활성 세션 모두 종료
    await admin.auth().revokeRefreshTokens(uid);

    return {
      success: true,
      message: "로그아웃되었습니다."
    };
  } catch (error) {
    console.error("로그아웃 처리 중 오류:", error);
    throw new functions.https.HttpsError(
      "internal",
      "로그아웃 처리 중 오류가 발생했습니다."
    );
  }
});

// 연동된 이메일 계정 조회 함수
exports.getConnectedEmails = functions.https.onCall(async (data, context) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "사용자 인증이 필요합니다."
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
      scope: "https://www.googleapis.com/auth/userinfo.email",
      token_type: "Bearer",
      expiry_date: user.exp * 1000
    });

    // People API 호출
    const people = google.people({ version: "v1", auth: oauth2Client });
    const response = await people.people.get({
      resourceName: "people/me",
      personFields: "emailAddresses"
    });

    // 이메일 주소 추출
    const emails = response.data.emailAddresses.map((email) => ({
      email: email.value,
      type: email.type || "기타 이메일"
    }));

    // Firestore에 이메일 목록 저장
    await admin.firestore().collection("users").doc(context.auth.uid).update({
      connectedEmails: emails,
      lastEmailSync: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      emails
    };
  } catch (error) {
    console.error("연동된 이메일 조회 중 오류:", error);
    throw new functions.https.HttpsError(
      "internal",
      "연동된 이메일 조회 중 오류가 발생했습니다."
    );
  }
});

