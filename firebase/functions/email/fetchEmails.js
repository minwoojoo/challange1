const admin = require("firebase-admin");
const { google } = require("googleapis");
const { getGoogleAuth } = require("../utils/googleAuth");

// Firebase Admin이 초기화되어 있는지 확인
if (!admin.apps.length) {
  admin.initializeApp();
}

// Firestore 참조 가져오기
const db = admin.firestore();

exports.fetchEmails = async (req, res) => {
  // CORS 헤더 수동 설정
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // OPTIONS 요청에 바로 응답
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    console.log("이메일 가져오기 요청 시작");
    const { data } = req.body;

    if (!data || !data.userEmail) {
      console.error("필수 데이터 누락:", { hasData: !!data, hasEmail: !!data?.userEmail });
      return res.status(400).json({
        success: false,
        message: "필수 정보가 누락되었습니다. (userEmail)"
      });
    }

    const { accessToken, userEmail, maxResults = 5 } = data;
    console.log("요청 데이터:", { userEmail, maxResults, hasAccessToken: !!accessToken });

    // 사용자 인증 정보 확인 시도
    let userId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      try {
        const idToken = req.headers.authorization.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        userId = decodedToken.uid;
        console.log("인증된 사용자 ID:", userId);
      } catch (authError) {
        console.error("사용자 인증 확인 실패:", authError);
        // 인증 실패는 치명적 오류로 취급하지 않음
      }
    }

    // 액세스 토큰이 없는 경우 더미 데이터 반환
    if (!accessToken) {
      console.log("액세스 토큰 없음 - 더미 데이터 반환");
      const dummyMessages = generateSimpleDummyEmails(userEmail, maxResults);

      // 사용자 ID가 있으면 더미 데이터를 Firestore에 저장
      if (userId) {
        await saveDummyEmailsToFirestore(userId, userEmail, dummyMessages);
      }

      return res.status(200).json({
        success: true,
        message: "더미 이메일 데이터를 생성했습니다.",
        data: {
          messages: dummyMessages
        }
      });
    }

    // Gmail API 클라이언트 초기화
    const auth = getGoogleAuth(accessToken);
    const gmail = google.gmail({ version: "v1", auth });

    console.log("Gmail API 클라이언트 초기화 완료");

    try {
      // 사용자 프로필 확인
      const profile = await gmail.users.getProfile({ userId: "me" });
      console.log("Gmail 프로필 확인:", profile.data);
    } catch (profileError) {
      console.error("Gmail 프로필 확인 실패:", profileError);
      return res.status(401).json({
        success: false,
        message: "Gmail API 접근 권한이 없습니다. 다시 로그인해주세요."
      });
    }

    // 최근 이메일 목록 가져오기
    console.log("이메일 목록 요청 시작");
    const messageList = await gmail.users.messages.list({
      userId: "me",
      maxResults: maxResults,
      labelIds: ["INBOX"]
    });

    console.log("이메일 목록 응답:", {
      hasMessages: !!messageList.data.messages,
      messageCount: messageList.data.messages?.length || 0
    });

    if (!messageList.data.messages || messageList.data.messages.length === 0) {
      return res.status(200).json({
        success: true,
        message: "가져올 이메일이 없습니다.",
        data: {
          messages: []
        }
      });
    }

    // 각 이메일의 상세 정보 가져오기 (간소화된 버전)
    console.log("이메일 상세 정보 요청 시작");
    const messages = await Promise.all(
      messageList.data.messages.map(async (message) => {
        try {
          const messageDetails = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
            format: "full"
          });

          const headers = messageDetails.data.payload.headers;
          const subject = headers.find((header) => header.name.toLowerCase() === "subject")?.value || "(제목 없음)";
          const from = headers.find((header) => header.name.toLowerCase() === "from")?.value || "";
          const to = headers.find((header) => header.name.toLowerCase() === "to")?.value ||
                     headers.find((header) => header.name.toLowerCase() === "delivered-to")?.value || "";
          const date = headers.find((header) => header.name.toLowerCase() === "date")?.value || "";

          // PDF 첨부 파일 확인
          const pdfFiles = [];
          checkPdfAttachments(messageDetails.data.payload, pdfFiles);

          console.log("이메일 정보 추출:", {
            id: message.id,
            subject,
            hasPdf: pdfFiles.length > 0,
            pdfCount: pdfFiles.length
          });

          return {
            id: messageDetails.data.id,
            subject,
            from,
            to,
            date,
            snippet: messageDetails.data.snippet || "",
            hasPdfAttachment: pdfFiles.length > 0,
            pdfFiles: pdfFiles
          };
        } catch (messageError) {
          console.error(`메시지 ID ${message.id} 처리 중 오류:`, messageError);
          return null;
        }
      })
    );

    // null 값 필터링
    const validMessages = messages.filter((message) => message !== null);
    console.log(`${validMessages.length}개의 유효한 이메일 정보 처리 완료`);

    // Firestore에 이메일 정보 저장 (사용자 ID가 있는 경우에만)
    if (userId) {
      try {
        await saveEmailsToFirestore(userId, userEmail, validMessages);
        console.log("이메일 정보가 Firestore에 저장되었습니다.");
      } catch (firestoreError) {
        console.error("Firestore 저장 중 오류:", firestoreError);
        // Firestore 저장 실패는 치명적 오류로 취급하지 않음
      }
    } else {
      console.log("인증된 사용자 정보가 없어 Firestore에 저장하지 않습니다.");
    }

    // 응답 반환
    return res.status(200).json({
      success: true,
      message: "이메일을 성공적으로 가져왔습니다.",
      data: {
        messages: validMessages
      }
    });
  } catch (error) {
    console.error("이메일 가져오기 중 오류 발생:", error);

    // Gmail API 관련 오류 처리
    if (error.code === 401 || error.message?.includes("auth")) {
      return res.status(401).json({
        success: false,
        message: "Gmail 액세스 토큰이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요."
      });
    }

    return res.status(500).json({
      success: false,
      message: `이메일 가져오기 중 오류가 발생했습니다: ${error.message}`
    });
  }
};

/**
 * 이메일 정보를 Firestore에 저장하는 함수
 */
async function saveEmailsToFirestore(userId, userEmail, emails) {
  const batch = db.batch();

  // 현재 타임스탬프
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  // 각 이메일에 대해 Firestore 문서 생성
  for (const email of emails) {
    const emailRef = db.collection("emails").doc(email.id);

    // 발신자 이메일 주소 추출 (이름 <이메일> 형식에서)
    let senderEmail = email.from;
    const senderMatch = email.from.match(/<([^>]+)>/);
    if (senderMatch && senderMatch[1]) {
      senderEmail = senderMatch[1];
    }

    // 이메일 문서 데이터
    const emailData = {
      user_id: userId,
      subject: email.subject,
      sender: email.from,
      sender_email: senderEmail,
      receiver: email.to,
      receiver_email: userEmail,
      snippet: email.snippet,
      received_at: email.receivedAt || admin.firestore.Timestamp.fromDate(new Date(email.date)),
      created_at: timestamp,
      updated_at: timestamp,
      has_attachment: email.hasPdfAttachment,
      has_risky_url: false, // 기본값
      has_risky_attachment: false, // 기본값
      email_risk: "unknown", // 기본값: 'low', 'medium', 'high', 'unknown'
      analysis_status: "pending" // 'pending', 'completed', 'failed'
    };

    batch.set(emailRef, emailData, { merge: true });
  }

  // 일괄 작업 커밋
  await batch.commit();
  console.log(`${emails.length}개의 이메일이 Firestore에 저장되었습니다.`);
}

/**
 * 이메일에서 PDF 첨부 파일만 확인 (간소화된 버전)
 */
function checkPdfAttachments(payload, pdfFiles = []) {
  if (!payload) return false;

  // 첨부 파일이 있는 경우
  if (payload.parts) {
    for (const part of payload.parts) {
      // PDF 첨부 파일 정보 추출
      if (part.filename && part.filename.length > 0) {
        // 파일 확장자 확인
        const filename = part.filename.toLowerCase();
        if (filename.endsWith(".pdf") || part.mimeType === "application/pdf") {
          pdfFiles.push(part.filename);
        }
      }

      // 재귀적으로 중첩된 부분 확인
      if (part.parts) {
        checkPdfAttachments(part, pdfFiles);
      }
    }
  }

  return pdfFiles.length > 0;
}

/**
 * 간소화된 더미 이메일 데이터 생성
 */
function generateSimpleDummyEmails(userEmail, count = 5) {
  const dummyEmails = [];
  const senders = [
    { name: "김철수", email: "chulsoo.kim@example.com" },
    { name: "박영희", email: "younghee.park@example.com" },
    { name: "Google 보안팀", email: "security@google.com" },
    { name: "Netflix", email: "info@netflix.com" },
    { name: "애플 지원팀", email: "support@apple.com" }
  ];

  const subjects = [
    "안녕하세요, 오랜만입니다",
    "비밀번호 재설정 안내",
    "귀하의 계정에 새로운 로그인이 감지되었습니다",
    "청구서 확인 부탁드립니다",
    "[긴급] 계정 정보 업데이트 필요",
    "최신 보안 업데이트 안내",
    "구독 서비스 만료 알림"
  ];

  const pdfFileNames = [
    "청구서.pdf",
    "계약서.pdf",
    "보고서.pdf",
    "안내문.pdf",
    "매뉴얼.pdf",
    null, // PDF 없음
    null // PDF 없음
  ];

  for (let i = 0; i < count; i++) {
    const sender = senders[Math.floor(Math.random() * senders.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const daysAgo = Math.floor(Math.random() * 7) + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    // PDF 첨부 파일 여부 (약 60% 확률로 PDF 첨부)
    const pdfIndex = Math.floor(Math.random() * pdfFileNames.length);
    const pdfFileName = pdfFileNames[pdfIndex];
    const pdfFiles = pdfFileName ? [pdfFileName] : [];

    dummyEmails.push({
      id: `dummy-email-${Date.now()}-${i}`,
      subject,
      from: `${sender.name} <${sender.email}>`,
      to: userEmail,
      date: date.toISOString(),
      snippet: `이것은 테스트용 더미 이메일입니다. ${subject} 에 대한 내용이 여기에 표시됩니다.`,
      hasPdfAttachment: pdfFiles.length > 0,
      pdfFiles: pdfFiles
    });
  }

  return dummyEmails;
}

/**
 * 더미 이메일 데이터를 Firestore에 저장
 */
async function saveDummyEmailsToFirestore(userId, userEmail, dummyEmails) {
  try {
    await saveEmailsToFirestore(userId, userEmail, dummyEmails);
    console.log("더미 이메일 데이터가 Firestore에 저장되었습니다.");
  } catch (error) {
    console.error("더미 이메일 Firestore 저장 오류:", error);
  }
}
