import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Box, Typography } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
        textAlign: 'center'
      }}
    >
      <Typography
        variant="h1"
        component="h1"
        sx={{
          fontSize: { xs: '6rem', sm: '8rem' },
          fontWeight: 'bold',
          color: 'primary.main',
          mb: 2
        }}
      >
        404
      </Typography>
      
      <Typography
        variant="h4"
        component="h2"
        sx={{
          mb: 4,
          color: 'text.primary',
          fontFamily: "'Tajawal', sans-serif"
        }}
      >
        {isArabic ? 'الصفحة غير موجودة' : 'Page Not Found'}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          mb: 4,
          color: 'text.secondary',
          maxWidth: '600px',
          fontFamily: "'Tajawal', sans-serif"
        }}
      >
        {isArabic 
          ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'
          : 'Sorry, the page you are looking for does not exist or has been moved.'}
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate('/')}
        sx={{
          fontFamily: "'Tajawal', sans-serif",
          py: 1.5,
          px: 4
        }}
      >
        {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
      </Button>
    </Box>
  );
};

export default NotFoundPage;
