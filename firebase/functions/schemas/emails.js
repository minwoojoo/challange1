// 기본 이메일 분석 문서 스키마 (모든 이메일에 대한 기본 분석)
const emailAnalysisSchema = {
  analyzed_at: Date,          // 이메일 분석 시간
  attachment_ids: [{          // 첨부파일 ID 배열
    id: String               // 첨부파일 고유 ID
  }],
  dkim: String,              // DKIM 검증 결과
  dmarc: String,             // DMARC 검증 결과
  received_at: String,       // 이메일 수신 시간
  risk_level: String,        // 위험도 수준
  sender: String,            // 발신자 정보
  spf: String,               // SPF 검증 결과
  subject: String,           // 이메일 제목
  url_ids: [{                // URL ID 배열
    id: String               // URL 고유 ID
  }],
  user_id: String            // 사용자 ID
};

// PDF 이메일 분석 문서 스키마 (PDF 첨부파일이 있는 이메일에 대한 추가 분석)
const pdfAnalysisSchema = {
  email_id: String,          // 원본 이메일 문서 ID (emailAnalysisSchema 참조)
  hasJavaScript: Boolean,    // JavaScript 포함 여부
  markedAt: String,          // 마킹된 시간
  markedDangerous: Boolean,  // 위험 표시 여부
  pdfAnalysis: {             // PDF 분석 결과
    hasEmbeddedFiles: Boolean, // 임베디드 파일 포함 여부
    hasJavaScript: Boolean,   // PDF 내 JavaScript 포함 여부
    riskScore: Number,        // 위험도 점수
    totalPages: Number        // 총 페이지 수
  },
  reported: Boolean,          // 신고 여부
  reportedAt: String,        // 신고된 시간
  urls: [{                   // URL 정보 배열
    address: String,         // URL 주소
    isSuspicious: Boolean    // 의심스러운 URL 여부
  }]
};

// PDF 분석 서브컬렉션 이름
const PDF_ANALYSIS_SUBCOLLECTION = 'pdf_analysis';

// 컬렉션 이름
const EMAILS_COLLECTION = 'emails';

module.exports = {
  emailAnalysisSchema,    // 기본 이메일 분석 스키마
  pdfAnalysisSchema,      // PDF 분석 스키마
  EMAILS_COLLECTION,      // 컬렉션 이름
  PDF_ANALYSIS_SUBCOLLECTION  // PDF 분석 서브컬렉션 이름
};
