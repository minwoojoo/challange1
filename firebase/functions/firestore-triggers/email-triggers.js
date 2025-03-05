const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { db, admin } = require('../firebase-setup');
const { 
  emailAnalysisSchema, 
  pdfAnalysisSchema,
  EMAILS_COLLECTION,
  PDF_ANALYSIS_SUBCOLLECTION 
} = require('../schemas/emails');

// 데이터 유효성 검증 함수
const validateData = (data, schema) => {
  const errors = [];
  
  for (const [key, value] of Object.entries(schema)) {
    if (value === String && typeof data[key] !== 'string') {
      errors.push(`${key} must be a string`);
    }
    if (value === Number && typeof data[key] !== 'number') {
      errors.push(`${key} must be a number`);
    }
    if (value === Boolean && typeof data[key] !== 'boolean') {
      errors.push(`${key} must be a boolean`);
    }
    if (value === Date && !(data[key] instanceof Date)) {
      errors.push(`${key} must be a date`);
    }
  }

  return errors;
};

// Realtime 데이터 변경사항 트리거
exports.onEmailAnalysisChange = onDocumentWritten(`${EMAILS_COLLECTION}/{emailId}`, async (event) => {
  const emailData = event.data.after ? event.data.after.data() : null;
  const emailId = event.params.emailId;

  if (emailData) {
    // 이메일 분석 데이터 유효성 검증
    const validationErrors = validateData(emailData, emailAnalysisSchema);
    if (validationErrors.length > 0) {
      console.error(`Validation errors for email ${emailId}:`, validationErrors);
      return null;
    }

    // PDF 분석이 있는 경우 서브컬렉션 처리
    if (emailData.attachment_ids && emailData.attachment_ids.some(att => att.type === 'pdf')) {
      const pdfAnalysisRef = event.data.after.ref.collection(PDF_ANALYSIS_SUBCOLLECTION);
      // PDF 분석 데이터 처리 로직 추가
    }
  }

  console.log(`Email document ${emailId} was modified`);
  return null;
}); 