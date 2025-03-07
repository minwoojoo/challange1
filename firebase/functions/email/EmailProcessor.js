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
          last_analyzed_at: null
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

  async fetchEmails(lastAnalyzedAt) {
    try {
      const query = lastAnalyzedAt ? `after:${lastAnalyzedAt}` : "";
      const response = await this.gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 5,
      });

      return response.data.messages || [];
    } catch (error) {
      console.error("이메일 목록 조회 중 오류:", error);
      return [];
    }
  }

  async processEmails(messages, userId) {
    try {
      console.log("이메일 처리 시작:", messages.length, "개의 메시지");
      const batch = db.batch();
      let processedCount = 0;

      for (const message of messages) {
        try {
          const emailData = await this.gmail.users.messages.get({
            userId: "me",
            id: message.id,
            format: "full",
          });

          const emailId = randomCodeGenerator("email_");
          const headers = emailData.data.payload.headers;
          const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "(제목 없음)";

          console.log("이메일 처리 중:", { id: emailId, subject });

          const emailRef = db.collection("emails").doc(emailId);
          batch.set(emailRef, {
            id: emailId,
            user_id: userId,
            subject: subject,
            processed_at: Timestamp.now(),
            gmail_message_id: message.id
          });

          processedCount++;
        } catch (error) {
          console.error("단일 이메일 처리 중 오류:", error);
          continue;
        }
      }

      if (processedCount > 0) {
        await batch.commit();
        await db.collection("users").doc(userId).update({
          last_analyzed_at: Timestamp.now()
        });
        console.log("이메일 처리 완료:", processedCount, "개 저장됨");
      }

      return processedCount;
    } catch (error) {
      console.error("이메일 일괄 처리 중 오류:", error);
      throw error;
    }
  }
}

module.exports = EmailProcessor;
