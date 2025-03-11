const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");
const { google } = require("googleapis");
const { getGoogleAuth } = require("../utils/googleAuth");
const { randomCodeGenerator } = require("../utils/randomCodeGenerator");

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "pdf-security",
    storageBucket: "pdf-security.appspot.com"
  });
}

const db = admin.firestore();

class EmailProcessor {
  constructor(accessToken, refreshToken = null, email) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.email = email;
    this.auth = getGoogleAuth(accessToken, refreshToken);
    this.gmail = google.gmail({ version: "v1", auth: this.auth });
  }

  async fetchUser() {
    try {
      const userRef = db.collection("users").where("email", "==", this.email);
      const snapshot = await userRef.get();

      if (snapshot.empty) {
        console.log("사용자 정보 없음, 기본 정보 생성");
        const newUserRef = db.collection("users").doc();
        const userData = {
          email: this.email,
          created_at: Timestamp.now(),
          last_login: Timestamp.now(),
          analyzed_email_count: 0 // 분석한 이메일 수를 추적
        };

        await newUserRef.set(userData);

        return {
          user: userData,
          userId: newUserRef.id
        };
      }

      return {
        user: snapshot.docs[0].data(),
        userId: snapshot.docs[0].id,
      };
    } catch (error) {
      console.error("사용자 정보 조회 중 오류:", error);
      throw error;
    }
  }

  async fetchEmails() {
    try {
      // 최근 5개의 이메일만 가져오기
      const response = await this.gmail.users.messages.list({
        userId: "me",
        maxResults: 5
      });

      if (!response.data.messages) {
        console.log("가져올 이메일이 없습니다.");
        return [];
      }

      return response.data.messages;
    } catch (error) {
      console.error("이메일 목록 조회 중 오류:", error);
      return [];
    }
  }

  async processEmails(messages) {
    try {
      console.log("\n===== 이메일 분석 시작 =====");
      let processedCount = 0;

      for (const message of messages) {
        try {
          // 이메일 상세 정보 가져오기
          const emailData = await this.gmail.users.messages.get({
            userId: "me",
            id: message.id,
            format: "full",
          });

          // 헤더 정보 추출
          const headers = emailData.data.payload.headers;
          const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "(제목 없음)";
          const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
          const to = headers.find((h) => h.name.toLowerCase() === "to")?.value ||
                     headers.find((h) => h.name.toLowerCase() === "delivered-to")?.value || this.email;

          // 분석 결과 로그 출력
          console.log("\n----- 이메일 정보 -----");
          console.log("제목:", subject);
          console.log("발신자:", from);
          console.log("수신자:", to);
          console.log("----------------------");

          processedCount++;
        } catch (error) {
          console.error("단일 이메일 처리 중 오류:", error);
          continue;
        }
      }

      // 분석 완료 메시지
      if (processedCount > 0) {
        console.log(`\n이메일 분석 결과: success, 총 ${processedCount}개의 이메일이 분석되었습니다.`);
      } else {
        console.log("\n이메일 분석 결과: fail, 분석된 이메일이 없습니다.");
      }
      console.log("===== 이메일 분석 완료 =====\n");

      return {
        success: processedCount > 0,
        processedCount
      };
    } catch (error) {
      console.error("이메일 처리 중 오류:", error);
      throw error;
    }
  }

  /**
   * 이메일에서 PDF 첨부 파일만 확인 (간소화된 버전)
   */
  checkPdfAttachments(payload, pdfAttachments = []) {
    if (!payload) return false;

    // 첨부 파일이 있는 경우
    if (payload.parts) {
      for (const part of payload.parts) {
        // PDF 첨부 파일 정보 추출
        if (part.filename && part.filename.length > 0) {
          // 파일 확장자 확인
          const filename = part.filename.toLowerCase();
          if (filename.endsWith(".pdf") || part.mimeType === "application/pdf") {
            const pdfInfo = {
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size || 0
            };
            pdfAttachments.push(pdfInfo);
          }
        }

        // 재귀적으로 중첩된 부분 확인
        if (part.parts) {
          this.checkPdfAttachments(part, pdfAttachments);
        }
      }
    }

    return pdfAttachments.length > 0;
  }
}

module.exports = EmailProcessor;
