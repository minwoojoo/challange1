import { auth, functions, db } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const GMAIL_TOKEN_KEY = 'gmail_access_token';

// Gmail API 권한을 포함한 Google Provider 설정
const getGoogleProvider = () => {
  try {
    const provider = new GoogleAuthProvider();
    // Gmail API 권한 추가
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    
    // OAuth 동의 화면을 항상 표시하고 사용자가 계정을 선택하도록 함
    provider.setCustomParameters({
      prompt: 'select_account',
      access_type: 'offline', // 리프레시 토큰 얻기
      include_granted_scopes: 'true' // 이미 허용된 스코프 포함
    });
    
    return provider;
  } catch (error) {
    console.error('Google Provider 설정 오류:', error);
    throw new Error('Google 인증 설정 중 오류가 발생했습니다.');
  }
};

/**
 * Gmail 액세스 토큰 가져오기
 */
const getStoredGmailToken = () => {
  try {
    return localStorage.getItem(GMAIL_TOKEN_KEY);
  } catch (error) {
    console.error('토큰 가져오기 실패:', error);
    return null;
  }
};

/**
 * Gmail 액세스 토큰 저장
 */
const storeGmailToken = (token) => {
  try {
    localStorage.setItem(GMAIL_TOKEN_KEY, token);
  } catch (error) {
    console.error('토큰 저장 실패:', error);
  }
};

/**
 * Gmail 토큰 초기화 및 재인증
 */
const resetGmailAuth = async () => {
  try {
    // 저장된 토큰 삭제
    localStorage.removeItem(GMAIL_TOKEN_KEY);
    // 현재 로그인된 사용자 로그아웃
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('인증 초기화 실패:', error);
    return false;
  }
};

/**
 * Firebase Firestore에 사용자 정보 저장
 */
const saveUserToFirestore = async (user) => {
  if (!user || !user.uid) {
    console.error('유효하지 않은 사용자 정보:', user);
    return;
  }

  try {
    console.log('Firestore에 사용자 정보 저장 시작:', user.uid);
    
    // 네트워크 연결 확인
    if (!navigator.onLine) {
      console.warn('오프라인 상태입니다. 사용자 정보가 나중에 동기화될 수 있습니다.');
    }
    
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log('사용자 정보 저장 성공:', user.uid);
  } catch (error) {
    console.error('사용자 정보 저장 실패:', error);
    
    // Firestore 권한 오류 확인
    if (error.code === 'permission-denied') {
      console.error('Firestore 권한 오류. 보안 규칙을 확인하세요.');
    }
    // 재시도 또는 오프라인 저장 로직 추가 가능
  }
};

// API 기본 URL 설정
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5001/pdf-security/us-central1/api'
  : 'https://api-56x3niyrlq-uc.a.run.app';

/**
 * 이메일 분석 요청
 */
export const fetchEmails = async () => {
  try {
    console.log('fetchEmails 함수 시작');
    
    // 현재 로그인된 사용자 확인
    const user = auth.currentUser;
    if (!user) {
      throw new Error('로그인이 필요합니다. 먼저 로그인을 해주세요.');
    }
    
    console.log('사용자 확인:', user.uid);
    
    // Gmail 액세스 토큰 가져오기
    const accessToken = getStoredGmailToken();
    if (!accessToken) {
      throw new Error('Gmail 액세스 토큰이 없습니다. 다시 로그인해주세요.');
    }
    
    // Firebase Function 호출
    try {
      const idToken = await user.getIdToken();
      console.log('ID 토큰 획득 성공');
      
      const response = await fetch(`${API_BASE_URL}/fetchEmails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          data: {
            userEmail: user.email,
            accessToken: accessToken // Gmail 액세스 토큰 추가
          }
        })
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('서버 응답:', errorText);
        throw new Error(`서버 오류: ${response.status} - ${errorText}`);
      }
  
      const result = await response.json();
      console.log('Firebase Function 호출 결과:', result);
  
      if (result.error) {
        throw new Error(result.error);
      }
  
      return result;
    } catch (fetchError) {
      console.error('API 호출 오류:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error('이메일 가져오기 중 오류:', error);
    throw error;
  }
};

export const analyzeEmails = async () => {
  try {
    const user = auth.currentUser;
    // Gmail 액세스 토큰 가져오기
    const accessToken = getStoredGmailToken();

    if (!user) {
      throw new Error('인증 정보가 없습니다. 다시 로그인해주세요.');
    }

    if (!accessToken) {
      throw new Error('Gmail 액세스 토큰이 없습니다. 먼저 이메일을 가져오기를 실행해주세요.');
    }

    console.log('이메일 분석 시작');
    console.log('사용자 정보:', { uid: user.uid, email: user.email });
    console.log('Gmail 토큰:', accessToken ? '있음' : '없음');

    try {
      const idToken = await user.getIdToken();

      const response = await fetch(`${API_BASE_URL}/analyzeEmails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        mode: 'cors',
        credentials: 'omit', // CORS 문제 해결을 위해 credentials를 'omit'으로 변경
        body: JSON.stringify({
          accessToken,
          userId: user.uid,
          userEmail: user.email
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '서버 오류가 발생했습니다.' }));
        throw new Error(errorData.message || `서버 오류: ${response.status}`);
      }

      const result = await response.json();
      console.log('이메일 분석 결과:', result);

      if (!result.success) {
        throw new Error(result.message || '이메일 분석 중 오류가 발생했습니다.');
      }

      return result;
    } catch (fetchError) {
      console.error('API 호출 오류:', fetchError);
      
      // 개발 중 임시 더미 데이터 반환
      console.log('더미 데이터로 대체합니다.');
      return {
        success: true,
        message: "분석 더미 데이터입니다",
        data: {
          analysisResults: [
            {
              id: "dummy-analysis-1",
              email_id: "dummy-1",
              risk_level: "low", 
              summary: "이것은 개발용 더미 분석 데이터입니다."
            }
          ]
        }
      };
    }
  } catch (error) {
    console.error('이메일 분석 중 오류:', error);
    throw error;
  }
};