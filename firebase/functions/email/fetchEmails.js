const admin = require("firebase-admin");
const { google } = require("googleapis");
const { getGoogleAuth } = require("../utils/googleAuth");

exports.fetchEmails = async (req, res) => {
  try {
    console.log("이메일 가져오기 요청 시작");
    const { data } = req.body;

    if (!data || !data.accessToken || !data.userEmail) {
      console.error("필수 데이터 누락:", { hasData: !!data, hasToken: !!data?.accessToken, hasEmail: !!data?.userEmail });
      return res.status(400).json({
        success: false,
        message: "필수 정보가 누락되었습니다. (accessToken, userEmail)"
      });
    }

    const { accessToken, userEmail, maxResults = 4 } = data;
    console.log("요청 데이터:", { userEmail, maxResults, hasAccessToken: !!accessToken });

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

    // 각 이메일의 상세 정보 가져오기
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

          console.log("이메일 정보 추출:", { id: message.id, subject });

          return {
            id: messageDetails.data.id,
            subject,
            from,
            to,
            date,
            snippet: messageDetails.data.snippet || ""
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
