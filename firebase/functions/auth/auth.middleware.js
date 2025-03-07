const admin = require("firebase-admin");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "인증 토큰이 필요합니다."
      });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // 인증된 사용자 정보를 request 객체에 추가
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    };

    next();
  } catch (error) {
    console.error("인증 처리 중 오류:", error);
    return res.status(401).json({
      success: false,
      message: "유효하지 않은 인증 토큰입니다."
    });
  }
};

module.exports = authMiddleware;
