const { db } = require('../firebase-setup');

// URL Analysis 컬렉션 스키마 정의
const urlAnalysisSchema = {
  address: String,           // 분석할 URL 주소
  analysis_at: Date,        // 분석 시간
  is_suspicious: Boolean,   // 의심스러운 URL 여부
  overall_risk: String,     // 전체 위험도 평가
  redirects: [{             // 리다이렉트 정보 배열
    from: String,           // 시작 URL
    method: String,         // 리다이렉트 방식
    to: String             // 목적지 URL
  }],
  virus_total_result: [{    // 바이러스 토탈 분석 결과 배열
    engine: String,         // 검사 엔진 이름
    result: String         // 검사 결과
  }],
  whois: {                  // WHOIS 정보
    created_at: Date,       // 도메인 생성일
    is_blacklisted: Boolean, // 블랙리스트 포함 여부
    domain_servers: [String], // 네임서버 목록
    registrant: String      // 등록자 정보
  }
};

// URL Analysis 컬렉션 참조
const urlAnalysisCollection = db.collection('url_analysis');

module.exports = {
  urlAnalysisSchema,
  urlAnalysisCollection
};
