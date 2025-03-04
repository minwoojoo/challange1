import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const Settings = () => {
  const navigate = useNavigate();
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const [profile, setProfile] = useState({
    displayName: '사용자',
    email: 'personal@gmail.com',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    deleteDangerousFiles: true,
  });

  const [connectedEmails, setConnectedEmails] = useState([
    { email: 'company@gmail.com', type: '회사 이메일' },
    { email: 'personal@gmail.com', type: '개인 이메일' },
  ]);

  const [newEmail, setNewEmail] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleProfileUpdate = () => {
    // TODO: API 호출로 프로필 업데이트
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleNotificationChange = (setting) => (event) => {
    setNotifications({
      ...notifications,
      [setting]: event.target.checked,
    });
  };

  const handleEmailAdd = () => {
    if (newEmail) {
      setConnectedEmails([...connectedEmails, { email: newEmail, type: '추가 이메일' }]);
      setNewEmail('');
    }
  };

  const handleEmailDelete = (email) => {
    setConnectedEmails(connectedEmails.filter(e => e.email !== email));
  };

  const handleLogoutClick = () => {
    setOpenLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    // TODO: 로그아웃 로직 구현
    setOpenLogoutDialog(false);
    navigate('/');
  };

  const handleLogoutCancel = () => {
    setOpenLogoutDialog(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4"> 사용자 설정 </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogoutClick}
          sx={{ borderRadius: '20px' }}
        >
          로그아웃
        </Button>
      </Box>

      {/* 로그아웃 확인 다이얼로그 */}
      <Dialog
        open={openLogoutDialog}
        onClose={handleLogoutCancel}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '12px',
            minWidth: '300px',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          로그아웃 확인
        </DialogTitle>
        <DialogContent>
          <Typography>
            정말 로그아웃 하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={handleLogoutCancel}
            sx={{ 
              borderRadius: '20px',
              px: 3,
              color: 'text.secondary'
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleLogoutConfirm}
            variant="contained"
            color="error"
            sx={{ 
              borderRadius: '20px',
              px: 3
            }}
          >
            로그아웃
          </Button>
        </DialogActions>
      </Dialog>

      {showSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          프로필이 성공적으로 업데이트되었습니다.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 프로필 설정 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom> 프로필 설정 </Typography>
              <Box component="form" sx={{ mt: 2 }}>
                <TextField fullWidth label="이름" value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} margin="normal" />
                <TextField fullWidth label="기본 이메일" value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })} margin="normal" />
                <Button variant="contained" color="primary" onClick={handleProfileUpdate} sx={{ mt: 2 }}>
                  프로필 업데이트
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 알림 설정 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom> 활성화 여부 </Typography>
              <List>
                <ListItem>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications.emailNotifications}
                        onChange={handleNotificationChange('emailNotifications')}
                      />
                    }
                    label="위험 파일 알림"
                  />
                </ListItem>
                <ListItem>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications.deleteDangerousFiles}
                        onChange={handleNotificationChange('deleteDangerousFiles')}
                      />
                    }
                    label="위험 파일 자동 삭제"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 이메일 연동 설정 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom> 이메일 연동 설정 </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  연동된 이메일 계정
                </Typography>
                <List>
                  {connectedEmails.map((email) => (
                    <ListItem key={email.email}>
                      <ListItemText
                        primary={email.email}
                        secondary={email.type}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleEmailDelete(email.email)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField label="새 이메일 추가" value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)} sx={{ flexGrow: 1 }} />
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleEmailAdd} sx={{ mt: 1 }}>
                  추가
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 