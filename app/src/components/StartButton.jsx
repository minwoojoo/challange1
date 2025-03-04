import React from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const StartButton = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    // TODO: 구글 OAuth 로그인 구현
    navigate('/dashboard');
  };

  return (
    <Button
      variant="contained"
      size="large"
      onClick={handleStart}
      sx={{
        bgcolor: 'white',
        color: 'primary.main',
        borderRadius: '30px',
        px: 4,
        py: 1.5,
        fontSize: '1.2rem',
        textTransform: 'none',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        '&:hover': {
          bgcolor: '#f5f5f5',
          color: 'primary.main',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
          transform: 'scale(1.05)',
        },
      }}
    >
      Sign in with Google
    </Button>
  );
};

export default StartButton; 