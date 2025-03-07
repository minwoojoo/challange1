const { google } = require("googleapis");

const getGoogleAuth = (accessToken) => {
  try {
    console.log("Google Auth 설정 시작");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      scope: "https://www.googleapis.com/auth/gmail.readonly"
    });

    console.log("Google Auth 설정 완료");
    return oauth2Client;
  } catch (error) {
    console.error("Google Auth 설정 중 오류:", error);
    throw new Error("Google 인증 설정에 실패했습니다: " + error.message);
  }
};

module.exports = {
  getGoogleAuth
};
