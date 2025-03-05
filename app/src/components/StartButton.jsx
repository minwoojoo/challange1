// 이 파일은 구글 로그인 버튼을 구현하는 컴포넌트입니다.
// 구글 로그인 버튼을 누르면 구글 로그인 페이지로 이동하고, 로그인 성공 후 대시보드로 이동합니다.
// 로그인 정보는 firestore에 저장됩니다.

import React from 'react';
import { Button } from '@mui/material';
import { Google } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, getAuth } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';  // db를 직접 import
//import { getFunctions, httpsCallable } from 'firebase/functions'; 지금은 안 씀씀

const StartButton = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const auth = getAuth();
      auth.useDeviceLanguage();
      
      const result = await signInWithPopup(auth, provider);
      
      // Firestore에 사용자 정보 저장
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        display_name: result.user.displayName,
        photo_url: result.user.photoURL,
        last_login_at: serverTimestamp()
      }, { merge: true });

      // 로그인 성공 후 대시보드로 이동
      navigate('/dashboard');
    } catch (error) {
      console.error('Google 로그인 오류:', error);
    }
  };

  return (
    <Button
      variant="contained"
      startIcon={<Google />}
      onClick={handleGoogleLogin}
      sx={{
        bgcolor: 'white',
        color: '#1976d2',
        '&:hover': {
          bgcolor: '#f5f5f5',
        },
        px: 4,
        py: 1.5,
        fontSize: '1.1rem',
        fontWeight: 'bold',
        borderRadius: '30px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      }}
    >
      Sign in with Google
    </Button>
  );
};

export default StartButton; 