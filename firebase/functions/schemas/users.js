const { db } = require('../firebase-setup');

// Users 컬렉션 스키마 정의
const userSchema = {
  email: String,        // 사용자 이메일
  nickname: String,     // 사용자 닉네임
  created_at: Date,     // 계정 생성 시간
  last_login_at: Date, // 마지막 로그인 시간
  photo_url: String, // 사용자 프로필 이미지 
};

// Users 컬렉션 참조
const usersCollection = db.collection('users');

module.exports = {
  userSchema,
  usersCollection
}; 