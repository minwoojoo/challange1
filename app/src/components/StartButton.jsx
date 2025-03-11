// 이 파일은 구글 로그인 버튼을 구현하는 컴포넌트입니다.
// 구글 로그인 버튼을 누르면 구글 로그인 페이지로 이동하고, 로그인 성공 후 대시보드로 이동합니다.
// 로그인 정보는 firestore에 저장됩니다.

import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Google } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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

  const handleLogin = async () => {
    try {
      setLoading(true);
      console.clear();
      console.log('로그인 시작');
      
      // Google 로그인 공급자 설정 - Gmail API 스코프 추가
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      
      console.log('Google 로그인 팝업 시작 - Gmail 스코프 포함');
      
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
      } else if (error.code === 'auth/internal-error') {
        toast.error('내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        console.error('상세 오류 정보:', error.message);
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