const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const app = express();
const EmailProcessor = require("./email/EmailProcessor");
const { google } = require("googleapis");
const { FieldValue } = require("firebase-admin/firestore");

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Firestore 에뮬레이터 연결 설정
if (process.env.FUNCTIONS_EMULATOR) {
  console.log("Firestore 에뮬레이터에 연결을 시도합니다...");
  db.settings({
    experimentalForceLongPolling: true,
    host: "localhost:9090",
    ssl: false
  });
  console.log("Firestore 에뮬레이터 설정이 완료되었습니다.");
}

// Firestore 테스트 문서 생성 함수
const createTestDocument = async () => {
  try {
    const docRef = db.collection("practice").doc();
    await docRef.set({
      di: "ab"
    });
    console.log("practice 컬렉션에 테스트 문서가 생성되었습니다. ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("테스트 문서 생성 중 오류:", error);
    throw error;
  }
};

// CORS 미들웨어 설정
app.use(cors({
  origin: true, // 모든 origin 허용
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());

// 인증 확인 미들웨어
const validateAuth = async (req) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    throw new Error("인증 토큰이 없습니다.");
  }
  const idToken = req.headers.authorization.split("Bearer ")[1];
  return admin.auth().verifyIdToken(idToken);
};

// 이메일 가져오기 엔드포인트
app.post("/fetchEmails", async (req, res) => {
  try {
    // 요청 본문에서 데이터 추출
    const { accessToken } = req.body.data || {};
    console.log("받은 액세스 토큰:", accessToken ? "있음" : "없음");

    if (!accessToken) {
      return res.status(400).json({
        error: "Gmail 액세스 토큰이 필요합니다."
      });
    }

    // Gmail API 클라이언트 초기화
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // 최근 이메일 5개 가져오기
    const emailResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 5
    });

    if (!emailResponse.data.messages || emailResponse.data.messages.length === 0) {
      return res.json({
        success: true,
        message: "이메일이 없습니다.",
        data: {
          emails: []
        }
      });
    }

    // 이메일 상세 정보 가져오기
    const messageDetails = await Promise.all(
      emailResponse.data.messages.map(async (message) => {
        const details = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "full"
        });
        return details.data;
      })
    );

    // 이메일 정보 추출 및 Firestore에 저장
    const processedEmails = await Promise.all(
      messageDetails.map(async (message) => {
        const headers = message.payload.headers;
        const subject = headers.find(h => h.name === "Subject")?.value || "(제목 없음)";
        const from = headers.find(h => h.name === "From")?.value || "";
        const to = headers.find(h => h.name === "To")?.value || "";
        const date = headers.find(h => h.name === "Date")?.value || "";
        const receivedAt = new Date(date).getTime();

        // 첨부파일 확인
        const attachments = [];
        const parts = message.payload.parts || [];
        parts.forEach(part => {
          if (part.filename && part.filename.length > 0) {
            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType
            });
          }
        });

        // URL 검사 (snippet에서 URL 패턴 찾기)
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const foundUrls = message.snippet ? message.snippet.match(urlPattern) : [];
        const hasUrls = foundUrls && foundUrls.length > 0;

        // 위험도 분석
        const emailRisk = 'safe'; // 기본값으로 safe 설정
        const hasRiskyAttachment = false; // 기본값으로 false 설정
        const hasRiskyUrl = false; // 기본값으로 false 설정

        // 저장할 이메일 데이터 객체 생성
        const emailData = {
          id: message.id,
          subject,
          sender: from,
          receiver: to,
          receivedAt,
          analyzed: true,
          analyzed_at: FieldValue.serverTimestamp(),
          attachment_data: attachments,
          email_risk: emailRisk,
          has_risky_attachment: hasRiskyAttachment,
          has_risky_url: hasRiskyUrl,
          messageId: message.id,
          createdAt: FieldValue.serverTimestamp()
        };

        // 저장되는 데이터 로깅
        console.log("이메일 저장 정보:", {
          id: emailData.id,
          subject: emailData.subject,
          sender: emailData.sender,
          receiver: emailData.receiver,
          receivedAt: new Date(emailData.receivedAt).toISOString(),
          analyzed: emailData.analyzed,
          email_risk: emailData.email_risk,
          has_risky_attachment: emailData.has_risky_attachment,
          has_risky_url: emailData.has_risky_url,
          attachments: emailData.attachment_data
        });

        // Firestore에 저장
        const emailDoc = await db.collection("emails").add(emailData);

        console.log(`이메일 문서 생성 완료 - 문서 ID: ${emailDoc.id}`);

        return {
          id: emailDoc.id,
          subject,
          sender: from,
          receiver: to,
          receivedAt,
          analyzed: true,
          email_risk: emailRisk,
          has_risky_attachment: hasRiskyAttachment,
          has_risky_url: hasRiskyUrl,
          messageId: message.id
        };
      })
    );

    return res.json({
      success: true,
      message: `${processedEmails.length}개의 이메일을 성공적으로 가져왔습니다.`,
      data: {
        messages: processedEmails
      }
    });
  } catch (error) {
    console.error("이메일 가져오기 중 오류:", error);
    return res.status(500).json({
      error: error.message || "이메일 가져오기 중 오류가 발생했습니다."
    });
  }
});

// 이메일 분석 엔드포인트
app.post("/analyzeEmails", async (req, res) => {
  try {
    const { accessToken, userId, userEmail } = req.body;
    console.log("분석 요청 받음:", { userId, userEmail });

    if (!accessToken || !userId || !userEmail) {
      console.log("필수 정보 누락:", { accessToken: !!accessToken, userId: !!userId, userEmail: !!userEmail });
      return res.status(400).json({
        success: false,
        message: "필수 정보가 누락되었습니다. (accessToken, userId, userEmail)"
      });
    }

    // new 키워드를 사용하여 클래스 인스턴스 생성
    const emailProcessor = new EmailProcessor(accessToken, null, userEmail);

    try {
      const { user, userId: fetchedUserId } = await emailProcessor.fetchUser();
      console.log("사용자 정보 조회 완료:", { email: userEmail, userId: fetchedUserId });

      const lastAnalyzedAt = user.last_analyzed_at ?
        Math.floor(new Date(user.last_analyzed_at).getTime() / 1000) : null;
      const messages = await emailProcessor.fetchEmails(lastAnalyzedAt);

      if (messages.length === 0) {
        return res.status(200).json({
          success: true,
          message: "처리할 새로운 이메일이 없습니다."
        });
      }

      await emailProcessor.processEmails(messages, fetchedUserId);

      return res.status(200).json({
        success: true,
        message: `${messages.length}개의 이메일이 성공적으로 처리되었습니다.`
      });
    } catch (error) {
      console.error("사용자 정보 처리 중 오류:", error);
      return res.status(500).json({
        success: false,
        message: `사용자 정보 처리 중 오류: ${error.message}`
      });
    }
  } catch (error) {
    console.error("이메일 분석 중 오류가 발생했습니다:", error);
    return res.status(500).json({
      success: false,
      message: `이메일 분석 중 오류가 발생했습니다: ${error.message}`
    });
  }
});

// Express 앱을 Firebase Functions로 내보내기
exports.api = functions.https.onRequest(app);
