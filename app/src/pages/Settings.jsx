// 이 파일은 사용자 설정 페이지를 구현하는 컴포넌트입니다.
// 사용자 이름, 위험 파일 알림 같은 활성화 여부를 설정할 수 있고 관련 내용을 firestore에 추가합니다
// 로그아웃 기능도 있습니다.

import React, { useState, useEffect } from 'react';
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
  Alert,
  List,
  ListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export const Settings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    photoURL: '',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    deleteDangerousFiles: true,
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (currentUser) {
      // Google 계정의 기본 정보로 설정
      setProfile({
        displayName: currentUser.displayName || '',
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || '',
      });

      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfile(prevProfile => ({
              ...prevProfile,
              displayName: userData.display_name || prevProfile.displayName,
              email: userData.email || prevProfile.email,
              photoURL: userData.photoURL || prevProfile.photoURL,
            }));

            if (userData.notifications) {
              setNotifications({
                deleteDangerousFiles: userData.notifications.deleteDangerousFiles ?? true,
                emailNotifications: userData.notifications.emailNotifications ?? true
              });
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };

      fetchUserData();
    }
  }, [currentUser]);

  const handleProfileUpdate = async () => {
    try {
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        display_name: profile.displayName,
        email: profile.email,
        photoURL: profile.photoURL,
        updatedAt: new Date()
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profile-images/${currentUser.uid}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setProfile(prev => ({
        ...prev,
        photoURL: downloadURL
      }));

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL
      });
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const handleNotificationChange = (setting) => async (event) => {
    const newNotifications = {
      ...notifications,
      [setting]: event.target.checked,
    };
    setNotifications(newNotifications);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        notifications: {
          deleteDangerousFiles: newNotifications.deleteDangerousFiles,
          emailNotifications: newNotifications.emailNotifications
        }
      });
    } catch (error) {
      console.error("Error updating notifications:", error);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handleLogoutClick = () => {
    setOpenLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await signOut(auth);
      setOpenLogoutDialog(false);
      navigate('/');
    } catch (error) {
      console.error("로그아웃 중 오류 발생:", error);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handleLogoutCancel = () => {
    setOpenLogoutDialog(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1"> 사용자 설정 </Typography>
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
          <Typography component="div">
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

      {showError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>프로필 설정</Typography>
              
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <Box
                  component="img"
                  src={profile.photoURL || '/default-avatar.png'}
                  alt="프로필 이미지"
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    mb: 2,
                    border: '1px solid #eee'
                  }}
                />
                <input
                  accept="image/*"
                  type="file"
                  id="profile-image-upload"
                  hidden
                  onChange={handleImageUpload}
                />
                <label htmlFor="profile-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    sx={{ mt: 1 }}
                  >
                    이미지 변경
                  </Button>
                </label>
              </Box>

              <Box component="form" sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="이름"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  margin="normal"
                  placeholder={currentUser?.displayName || '이름을 입력하세요'}
                />
                <TextField
                  fullWidth
                  label="이메일"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  margin="normal"
                  placeholder={currentUser?.email || '이메일을 입력하세요'}
                  disabled
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleProfileUpdate}
                  sx={{ mt: 2 }}
                >
                  프로필 업데이트
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom> 활성화 여부 </Typography>
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
      </Grid>
    </Box>
  );
}; 