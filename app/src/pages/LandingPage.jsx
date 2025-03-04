import React from 'react';
import { Box, Container, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Security, BugReport, Assessment, Shield } from '@mui/icons-material';
import StartButton from '../components/StartButton';

const features = [
  {
    icon: <Security sx={{ color: 'white' }} />,
    text: '보안 위협에 대한 이메일 분석'
  },
  {
    icon: <BugReport sx={{ color: 'white' }} />,
    text: '의심스러운 PDF 및 URL 감지'
  },
  {
    icon: <Assessment sx={{ color: 'white' }} />,
    text: '즉각적인 보안 보고서 받기'
  },
  {
    icon: <Shield sx={{ color: 'white' }} />,
    text: '피싱 공격으로부터 보호'
  }
];

const LandingPage = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography
            variant="h2"
            sx={{
              color: 'white',
              mb: 2,
              fontWeight: 'bold',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            PDF Phishing Analysis Service
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'white',
              mb: 4,
            }}
          >
            <List>
              {features.map((feature, index) => (
                <ListItem key={index} sx={{ justifyContent: 'center', py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {feature.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={feature.text}
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: 'white',
                        fontSize: '1.1rem',
                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.1)',
                      }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Typography>
          <StartButton />
        </Paper>
      </Container>
    </Box>
  );
};

export default LandingPage; 