const express = require("express");
const admin = require("firebase-admin");

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const { fetchEmails } = require("./fetchEmails");
const { getEmailAnalysis } = require("./emailAnalysis");
const { getEmailAnalysisDetail } = require("./getEmailAnalysisDetail");

const router = express.Router();

// 미들웨어 설정
router.use((req, res, next) => {
  console.log("Email API 요청:", req.method, req.path);
  next();
});

// 라우트 설정
router.post("/", fetchEmails);
router.get("/analysis", getEmailAnalysis);
router.get("/analysis-detail/:email_id", getEmailAnalysisDetail);

module.exports = router;
