import React, { useState } from 'react';
import { Container, Paper, Tabs, Tab, Box } from '@mui/material';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';

const Auth: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 4,
      }}
    >
      <Container component="main" maxWidth="sm">
        <Paper 
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            centered
            sx={{
              mb: 4,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px',
              },
            }}
          >
            <Tab label="Login" sx={{ textTransform: 'none', fontSize: '1.1rem' }} />
            <Tab label="Register" sx={{ textTransform: 'none', fontSize: '1.1rem' }} />
          </Tabs>
          {activeTab === 0 ? <LoginForm /> : <RegisterForm />}
        </Paper>
      </Container>
    </Box>
  );
};

export default Auth;