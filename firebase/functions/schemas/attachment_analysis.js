const { db } = require('../firebase-setup');

// Attachment Analysis 컬렉션 스키마 정의
const attachmentAnalysisSchema = {
  file_name: String,         // 첨부 파일 이름
  file_type: String,         // 파일 타입 (예: 'pdf')
  hash: String,              // 파일 해시값
  overall_risk: String,      // 전체 위험도 평가

  // PDF 분석 결과
  pdf_analysis: {
    has_javascript: Boolean,  // JavaScript 포함 여부
    has_shellcode: Boolean,   // 쉘코드 포함 여부
    
    // JavaScript 코드 정보
    js_code: [{
      line: String,          // JavaScript 코드 라인
      lineNumber: Number     // 코드 라인 번호
    }],
    
    // 쉘코드 정보
    shell_code: [{
      code: String,          // 쉘코드
      lineNumber: Number     // 코드 라인 번호
    }]
  },

  risk_score: Number,        // 위험도 점수
  total_pages: Number,       // 총 페이지 수
  virus_total_score: String  // 바이러스 토탈 점수
};

// Attachment Analysis 컬렉션 참조
const attachmentAnalysisCollection = db.collection('attachment_analysis');

module.exports = {
  attachmentAnalysisSchema,
  attachmentAnalysisCollection
};
