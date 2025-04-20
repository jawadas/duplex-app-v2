import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { TextField, Button, Box, Typography, Avatar } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (error) {
      setError('Invalid email or password');
      console.error('Login error:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <Typography
        component="h1"
        variant="h4"
        sx={{
          mb: 4,
          color: 'primary.main',
          fontWeight: 600,
          textAlign: 'center'
        }}
      >
        Duplex Project Tracker
      </Typography>
      
      <Avatar sx={{ 
        bgcolor: '#4caf50',
        width: 56,
        height: 56,
        mb: 3
      }}>
        <LockIcon fontSize="large" />
      </Avatar>

      <Typography component="h2" variant="h5" sx={{ mb: 3 }}>
        Sign In
      </Typography>

      <Box 
        component="form" 
        onSubmit={handleSubmit(onSubmit)} 
        sx={{ 
          mt: 1,
          width: '100%',
          '& .MuiTextField-root': { mb: 2 }
        }}
      >
        <TextField
          fullWidth
          label="Email Address"
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          error={!!errors.email}
          helperText={errors.email?.message}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          {...register('password', { 
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters'
            }
          })}
          error={!!errors.password}
          helperText={errors.password?.message}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ 
            mt: 3, 
            mb: 2,
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4,
            },
          }}
        >
          Sign In
        </Button>
        {error && (
          <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default LoginForm;