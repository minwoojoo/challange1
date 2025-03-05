import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export const LoadingPage = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2
      }}
    >
      <CircularProgress />
      <Typography variant="h6" color="text.secondary">
        로딩 중...
      </Typography>
    </Box>
  );
}; 