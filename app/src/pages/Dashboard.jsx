import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  Fab,
  Zoom,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Container,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  FilterList as FilterIcon, 
  Clear as ClearIcon,
  Assessment as AssessmentIcon,
  Close as CloseIcon,
  Email,
} from '@mui/icons-material';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { fetchEmails, getHello, analyzeEmails } from '../utils/api';
import { toast } from 'react-hot-toast';
import { auth } from "../firebaseConfig";

const mockResults = [
  {
    id: '1',
    fileName: 'invoice_document.pdf',
    sender: 'sender@example.com',
    recipient: 'recipient@company.com',
    securityLevel: 'dangerous',
    receivedAt: new Date('2024-03-01T10:30:00')
  },
  {
    id: '2',
    fileName: 'safe_document.pdf',
    sender: 'trusted@company.com',
    recipient: 'employee@company.com',
    securityLevel: 'safe',
    receivedAt: new Date('2024-03-01T09:15:00')
  }
];

// 7일간의 통계 데이터
const weeklyStats = {
  totalScanned: 156,
  phishingSuspicious: 23,
  dangerous: 12,
  lastUpdated: new Date()
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [showWeeklySummary, setShowWeeklySummary] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emails, setEmails] = useState([]);
  const [emailCount, setEmailCount] = useState(0);

  // 이메일 목록 새로고침 함수
  const refreshEmailList = async () => {
    try {
      // TODO: 이메일 목록을 가져오는 API 호출 구현
      // 현재는 mockResults를 사용
      setEmails(mockResults);
    } catch (error) {
      console.error('이메일 목록 가져오기 실패:', error);
      toast.error('이메일 목록을 가져오는데 실패했습니다.');
    }
  };

  // 사용자 인증 상태 확인
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('사용자 인증됨:', user.email);
        setUserInfo({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
      } else {
        console.log('인증되지 않은 사용자, 로그인 페이지로 이동');
        navigate('/', { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // 컴포넌트 마운트 시 이메일 목록 가져오기
  useEffect(() => {
    if (userInfo) {
      refreshEmailList();
    }
  }, [userInfo]);

  // 새로운 이메일 분석 요청
  const handleAnalyzeEmails = async () => {
    if (!userInfo) {
      console.log('사용자 정보 없음, 분석 중단');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await analyzeEmails();
      
      if (result.success) {
        // 분석된 이메일 목록 업데이트
        if (result.data?.processedEmails) {
          const formattedEmails = result.data.processedEmails.map(email => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            to: email.to,
            date: email.date,
            securityLevel: email.risk_level,
            riskReasons: email.risk_reasons
          }));
          setEmails(formattedEmails);
        }
        toast.success(result.message || '이메일 분석이 완료되었습니다.');
      } else {
        toast.info(result.message || '분석할 새로운 이메일이 없습니다.');
      }
    } catch (error) {
      console.error('이메일 분석 중 오류:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchEmails = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      console.log("이메일 가져오기 시작...");
      const result = await fetchEmails();
      console.log("이메일 가져오기 결과:", result);
      
      if (result.success && result.data?.messages) {
        const formattedEmails = result.data.messages.map(email => ({
          id: email.id,
          subject: email.subject || '(제목 없음)',
          from: email.from || '발신자 정보 없음',
          to: email.to || '수신자 정보 없음',
          date: formatDate(email.date) || '날짜 정보 없음',
          snippet: email.snippet || ''
        }));
        
        console.log("포맷된 이메일:", formattedEmails);
        
        if (formattedEmails.length > 0) {
          setEmails(formattedEmails);
          toast.success(`${formattedEmails.length}개의 이메일을 가져왔습니다.`);
          // 이메일 분석 자동 시작
          await handleAnalyzeEmails();
        } else {
          setEmails([]);
          toast('가져올 이메일이 없습니다.', { icon: '📩' });
        }
      } else {
        console.log("API 응답 실패:", result);
        setEmails([]);
        toast.error(result.message || "이메일 가져오기 실패");
      }
    } catch (error) {
      console.error("이메일 가져오기 오류:", error);
      toast.error(error.message || "이메일 가져오기 실패");
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/\./g, '. ').replace(/ PM| AM/g, '');
    } catch (error) {
      return dateStr;
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">오류: {error}</Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          다시 시도
        </Button>
      </Box>
    );
  }

  if (loading || !userInfo) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  // 통계 계산 함수들
  const calculateStatistics = (results) => {
    const totalFiles = results.length;
    
    const securityDistribution = {
      safe: results.filter(file => file.securityLevel === 'safe').length,
      suspicious: results.filter(file => file.securityLevel === 'suspicious').length,
      dangerous: results.filter(file => file.securityLevel === 'dangerous').length,
    };

    return {
      totalFiles,
      securityDistribution,
    };
  };

  const stats = calculateStatistics(mockResults);

  // 필터링된 결과 가져오기
  const getFilteredResults = () => {
    switch (activeFilter) {
      case 'dangerous':
        return mockResults.filter(file => file.securityLevel === 'dangerous');
      case 'suspicious':
        return mockResults.filter(file => file.securityLevel === 'suspicious');
      case 'safe':
        return mockResults.filter(file => file.securityLevel === 'safe');
      default:
        return mockResults;
    }
  };

  const handleViewDetail = (id) => {
    navigate(`/analysis/${id}`);
  };

  const handleFilterClick = (filter) => {
    setActiveFilter(filter === activeFilter ? 'all' : filter);
  };

  const getStatItemStyle = (filter) => ({
    cursor: 'pointer',
    bgcolor: activeFilter === filter ? 'action.selected' : 'transparent',
    borderRadius: 1,
    transition: 'background-color 0.2s',
    '&:hover': {
      bgcolor: 'action.hover',
    },
  });

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mt: 3, display: "flex", gap: 2, alignItems: "flex-start", flexDirection: "column" }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Email />}
            onClick={handleFetchEmails}
            disabled={loading}
          >
            {loading ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                이메일 가져오는 중...
              </>
            ) : (
              "최근 이메일 가져오기"
            )}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 7일간 검사 요약 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                통계
              </Typography>
              <List>
                <ListItem sx={getStatItemStyle('all')} onClick={() => handleFilterClick('all')}>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span>분석된 총 파일</span>
                        <FilterIcon 
                          fontSize="small" 
                          sx={{ 
                            ml: 1, 
                            opacity: activeFilter === 'all' ? 1 : 0,
                            color: 'primary.main'
                          }} 
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h4" component="span" color="primary">
                          {stats.totalFiles}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          개
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                <ListItem sx={getStatItemStyle('dangerous')} onClick={() => handleFilterClick('dangerous')}>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span>위험 파일</span>
                        <FilterIcon 
                          fontSize="small" 
                          sx={{ 
                            ml: 1, 
                            opacity: activeFilter === 'dangerous' ? 1 : 0,
                            color: 'error.main'
                          }} 
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="h4" component="span" color="error">
                            {stats.securityDistribution.dangerous}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            개
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                <ListItem sx={getStatItemStyle('suspicious')} onClick={() => handleFilterClick('suspicious')}>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span>의심 파일</span>
                        <FilterIcon 
                          fontSize="small" 
                          sx={{ 
                            ml: 1, 
                            opacity: activeFilter === 'suspicious' ? 1 : 0,
                            color: 'warning.main'
                          }} 
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="h4" component="span" color="warning">
                            {stats.securityDistribution.suspicious}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            개
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                <ListItem sx={getStatItemStyle('safe')} onClick={() => handleFilterClick('safe')}>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span>안전 파일</span>
                        <FilterIcon 
                          fontSize="small" 
                          sx={{ 
                            ml: 1, 
                            opacity: activeFilter === 'safe' ? 1 : 0,
                            color: 'success.main'
                          }} 
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h4" component="span" color="success.main">
                          {stats.securityDistribution.safe}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          개
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {activeFilter === 'all' ? '최근 분석 결과' :
                   activeFilter === 'dangerous' ? '위험 파일 목록' :
                   activeFilter === 'suspicious' ? '의심 파일 목록' :
                   '안전 파일 목록'}
                </Typography>
                <Chip 
                  label={`${getFilteredResults().length}개 항목`}
                  color="primary"
                  size="small"
                />
              </Box>
              <List>
                {getFilteredResults().map((result) => (
                  <ListItem key={result.id} divider>
                    <ListItemText
                      primary={
                        <Typography component="div">
                          {result.fileName}
                        </Typography>
                      }
                      secondary={
                        <Typography component="div" variant="body2" color="text.secondary">
                          <Typography component="span" variant="body2" color="text.primary">
                            발신자: {result.sender}
                          </Typography>
                          <br />
                          <Typography component="span" variant="body2" color="text.primary">
                            수신자: {result.recipient}
                          </Typography>
                          <br />
                          수신 날짜: {result.receivedAt.toLocaleString()}
                        </Typography>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={result.securityLevel === 'dangerous' ? '위험' : 
                               result.securityLevel === 'suspicious' ? '의심' : '안전'}
                        color={
                          result.securityLevel === 'dangerous'
                            ? 'error'
                            : result.securityLevel === 'suspicious'
                            ? 'warning'
                            : 'success'
                        }
                      />
                      <Button variant="outlined" size="small"
                        onClick={() => handleViewDetail(result.id)}>
                        상세보기
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 7일간 검사 요약 말풍선 */}
      <Zoom in={showWeeklySummary}>
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 30,
            width: 320,
            p: 2,
            borderRadius: 2,
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: -10,
              right: 20,
              border: '10px solid transparent',
              borderTopColor: 'background.paper',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>
              지난 7일간 검사 요약
            </Typography>
            <IconButton size="small" onClick={() => setShowWeeklySummary(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">검사된 PDF 파일:</Typography>
              <Typography variant="h6" color="primary.main">
                {weeklyStats.totalScanned}개
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">피싱 의심 파일:</Typography>
              <Typography variant="h6" color="warning.main">
                {weeklyStats.phishingSuspicious}개
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">위험 파일:</Typography>
              <Typography variant="h6" color="error.main">
                {weeklyStats.dangerous}개
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'right' }}>
            마지막 업데이트: {weeklyStats.lastUpdated.toLocaleString()}
          </Typography>
        </Paper>
      </Zoom>

      {!showWeeklySummary && (
        <Tooltip title="7일간 검사 요약 보기">
          <Fab
            color="primary"
            size="small"
            onClick={() => setShowWeeklySummary(true)}
            sx={{
              position: 'fixed',
              bottom: 30,
              right: 30,
            }}
          >
            <AssessmentIcon />
          </Fab>
        </Tooltip>
      )}
    </Container>
  );
}; 