const admin = require("firebase-admin");

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

/**
 * 특정 이메일의 상세 분석 정보를 조회하는 API
 */
exports.getEmailAnalysisDetail = async (req, res) => {
  // 여기는 분석 상세데이터 조회 api
  return res.status(200).send({ message: "이메일 분석 상세 조회 API" });
};

// URL 의심도 검사
exports.isSuspiciousUrl = (url) => {
  const suspiciousPatterns = [
    /bit\.ly/,
    /goo\.gl/,
    /tinyurl\.com/,
    /\.(ru|cn|tk)(\/.+)?$/,
    /\.(xyz|top|club)(\/.+)?$/
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(url));
};

// 첨부파일 의심도 검사
exports.isSuspiciousAttachment = (attachment) => {
  const riskyExtensions = [".exe", ".bat", ".cmd", ".scr", ".js"];
  return riskyExtensions.some((ext) =>
    attachment.filename.toLowerCase().endsWith(ext)
  );
};
