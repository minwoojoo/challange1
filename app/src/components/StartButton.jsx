// 이 파일은 구글 로그인 버튼을 구현하는 컴포넌트입니다.
// 구글 로그인 버튼을 누르면 구글 로그인 페이지로 이동하고, 로그인 성공 후 대시보드로 이동합니다.
// 로그인 정보는 firestore에 저장됩니다.

import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Google } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { toast } from 'react-hot-toast';

const provider = new GoogleAuthProvider();
// Gmail API 권한 추가
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
// OAuth 추가 설정
provider.setCustomParameters({
  prompt: 'consent'
});

const StartButton = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        // Gmail 토큰 저장
        localStorage.setItem('gmail_access_token', credential.accessToken);
        toast.success('로그인 성공!');
        navigate('/dashboard');
      } else {
        throw new Error('Gmail 접근 권한이 필요합니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('로그인을 완료해주세요.');
      } else {
        toast.error('로그인 중 오류가 발생했습니다.');
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