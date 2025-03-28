// 이 파일은 구글 로그인 버튼을 구현하는 컴포넌트입니다.
// 구글 로그인 버튼을 누르면 구글 로그인 페이지로 이동하고, 로그인 성공 후 대시보드로 이동합니다.
// 로그인 정보는 firestore에 저장됩니다.

import React, { useState, useEffect } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Google } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const GMAIL_TOKEN_KEY = 'gmail_access_token';

// 사용자 정보를 Firestore에 저장하는 함수
const saveUserToFirestore = async (user, accessToken) => {
  try {
    console.log('사용자 정보 저장 시작:', user.uid);
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      lastLogin: serverTimestamp(),
      accessToken: accessToken // Gmail API 액세스 토큰 저장
    }, { merge: true });
    console.log('사용자 정보 저장 완료');
    return true;
  } catch (error) {
    console.error('사용자 정보 저장 실패:', error);
    return false;
  }
};

const StartButton = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  // 인증 상태 변경 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('사용자 로그인 감지:', user.uid);
        
        try {
          // 이미 로그인된 사용자의 토큰 정보 확인
          const token = localStorage.getItem(GMAIL_TOKEN_KEY);
          
          if (!token) {
            // 토큰이 없는 경우 로그인 프로세스를 다시 진행
            console.log('토큰 정보가 없습니다. 로그인 프로세스를 다시 진행합니다.');
          } else {
            console.log('기존 토큰 정보가 있습니다. 대시보드로 이동합니다.');
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('인증 상태 처리 오류:', error);
        }
      }
    });
    
    return () => unsubscribe();
  }, [auth, navigate]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      console.log('Google 로그인 시작...');
      
      // Google 로그인 공급자 설정
      const provider = new GoogleAuthProvider();
      
      // Gmail API 스코프 추가
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      
      // 항상 계정 선택 화면을 표시하도록 설정
      provider.setCustomParameters({
        prompt: 'select_account',
        access_type: 'offline'
      });
      
      console.log('Google 로그인 팝업 열기...');
      
      // 팝업으로 인증 진행
      const result = await signInWithPopup(auth, provider);
      
      console.log('로그인 성공:', result.user.uid);
      
      // Gmail API 액세스 토큰 가져오기
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential.accessToken;
      
      if (!accessToken) {
        throw new Error('Gmail API 액세스 토큰을 가져오지 못했습니다.');
      }
      
      console.log('Gmail API 액세스 토큰 획득:', accessToken);
      
      // 사용자 정보와 액세스 토큰 저장
      await saveUserToFirestore(result.user, accessToken);
      
      // localStorage에 액세스 토큰 저장
      localStorage.setItem(GMAIL_TOKEN_KEY, accessToken);
      console.log('Gmail 액세스 토큰이 localStorage에 저장되었습니다.');
      
      toast.success('로그인 성공!');
      navigate('/dashboard');
    } catch (error) {
      console.error('로그인 오류:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('로그인 창이 닫혔습니다. 다시 시도해주세요.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
      } else if (error.code === 'auth/internal-error') {
        toast.error('내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error(`로그인 오류: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      startIcon={<Google />}
      onClick={handleLogin}
      disabled={loading}
      sx={{
        bgcolor: 'white',
        color: '#1976d2',
        '&:hover': {
          bgcolor: 'rgba(255, 255, 255, 0.9)',
        },
        px: 4,
        py: 1.5,
        fontSize: '1.2rem',
        fontWeight: 'bold',
        borderRadius: '30px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      }}
    >
      {loading ? (
        <CircularProgress size={24} color="inherit" />
      ) : (
        'Sign in with Google'
      )}
    </Button>
  );
};

export default StartButton; 