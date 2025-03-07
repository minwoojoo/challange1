import { auth, functions, db } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const GMAIL_TOKEN_KEY = 'gmail_access_token';

// Gmail API 권한을 포함한 Google Provider 설정
const getGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  // Gmail API 권한 추가
  provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
  // 항상 계정 선택 화면 표시 및 동의 화면 표시
  provider.setCustomParameters({
    prompt: 'consent select_account'
  });
  return provider;
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
 * 사용자 정보를 Firestore에 저장
 */
const saveUserToFirestore = async (user) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      email: user.email,
      display_name: user.displayName,
      photo_url: user.photoURL,
      last_login: serverTimestamp(),
      created_at: serverTimestamp(),
      last_analyzed_at: null
    }, { merge: true });
    console.log('사용자 정보 저장 완료');
  } catch (error) {
    console.error('사용자 정보 저장 실패:', error);
    throw error;
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
    
    // 저장된 토큰 확인
    let accessToken = getStoredGmailToken();
    console.log('저장된 Gmail 토큰:', accessToken ? '있음' : '없음');

    // 토큰이 없거나 강제 재인증이 필요한 경우
    if (!accessToken) {
      console.log('Gmail 권한 요청 시작');
      try {
        // 기존 인증 초기화
        await resetGmailAuth();
        
        // 새로운 인증 시작
        const provider = getGoogleProvider();
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        accessToken = credential.accessToken;
        
        console.log('Gmail 권한 획득 성공');
        
        if (accessToken) {
          storeGmailToken(accessToken);
          console.log('Gmail 토큰 저장 완료');
          
          // 사용자 정보 Firestore에 저장
          await saveUserToFirestore(result.user);
        }
      } catch (error) {
        console.error('Gmail 권한 요청 실패:', error);
        if (error.code === 'auth/popup-closed-by-user') {
          throw new Error('Gmail 접근 권한이 필요합니다. 팝업창을 통해 권한을 허용해주세요.');
        }
        throw error;
      }
    }

    if (!accessToken) {
      throw new Error('Gmail 접근 권한을 얻지 못했습니다.');
    }

    const user = auth.currentUser;
    if (!user) {
      throw new Error('사용자 인증이 필요합니다.');
    }

    console.log('Firebase Function 호출 시작');
    
    // Firebase Function 호출
    const response = await fetch(`${API_BASE_URL}/fetchEmails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${await auth.currentUser.getIdToken()}`
      },
      mode: 'cors',
      credentials: 'same-origin',
      body: JSON.stringify({
        data: {
          accessToken
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

    // 서버 응답 그대로 반환
    console.log('포맷팅된 결과:', result);
    return result;
  } catch (error) {
    console.error('이메일 가져오기 중 오류:', error);
    // Gmail 토큰 관련 오류인 경우 토큰 초기화
    if (error.message.includes('Gmail 액세스 토큰이 필요합니다')) {
      localStorage.removeItem(GMAIL_TOKEN_KEY);
      throw new Error('Gmail 인증이 만료되었습니다. 다시 로그인해주세요.');
    }
    throw error;
  }
};

export const analyzeEmails = async () => {
  try {
    const accessToken = getStoredGmailToken();
    const user = auth.currentUser;

    if (!accessToken || !user) {
      throw new Error('인증 정보가 없습니다. 다시 로그인해주세요.');
    }

    console.log('이메일 분석 시작');
    console.log('사용자 정보:', { uid: user.uid, email: user.email });
    console.log('Gmail 토큰:', accessToken ? '있음' : '없음');

    const idToken = await user.getIdToken();

    const response = await fetch(`${API_BASE_URL}/analyzeEmails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      mode: 'cors',
      credentials: 'same-origin',
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
  } catch (error) {
    console.error('이메일 분석 중 오류:', error);
    if (error.message.includes('Gmail 액세스 토큰이 필요합니다')) {
      await resetGmailAuth();
      throw new Error('Gmail 인증이 만료되었습니다. 다시 로그인해주세요.');
    }
    throw error;
  }
};

