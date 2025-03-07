const { admin } = require("../firebase-setup");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "인증 토큰이 필요합니다." });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // 요청 객체에 사용자 정보 추가
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };

    next();
  } catch (error) {
    console.error("인증 미들웨어 오류:", error);
    return res.status(403).json({ error: "인증에 실패했습니다." });
  }
};

module.exports = authMiddleware;
