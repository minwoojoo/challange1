const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

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

// CORS 미들웨어 설정
router.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// OPTIONS 요청에 대한 처리
router.options("*", cors());

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
