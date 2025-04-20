import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { TextField, Button, Box, FormControl, InputLabel, Select, MenuItem, FormHelperText, Alert, Fade } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../services/api';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role: 'user' | 'admin';
  registrationKey: string;
}

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const { isArabic } = useLanguage();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormData>({
    defaultValues: {
      role: 'user'
    }
  });
  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('');
      setSuccess(false);

      const response = await api.auth.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
        registrationKey: data.registrationKey
      });

      if (response.token) {
        localStorage.setItem('token', response.token);
        setSuccess(true);
        
        // Wait 2 seconds before redirecting
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error: any) {
      setError(error.message || (isArabic ? 'فشل التسجيل' : 'Registration failed'));
      console.error('Registration error:', error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
      {error && (
        <Fade in={!!error}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        </Fade>
      )}
      {success && (
        <Fade in={success}>
          <Alert severity="success" sx={{ mb: 2 }}>
            {isArabic 
              ? 'تم إنشاء المستخدم بنجاح! جاري التحويل إلى لوحة التحكم...'
              : 'User has been created successfully! Redirecting to dashboard...'}
          </Alert>
        </Fade>
      )}
      <TextField
        margin="normal"
        fullWidth
        label={isArabic ? 'الاسم الكامل' : 'Full Name'}
        {...register('fullName', { 
          required: isArabic ? 'الاسم الكامل مطلوب' : 'Full name is required' 
        })}
        error={!!errors.fullName}
        helperText={errors.fullName?.message}
      />
      <TextField
        margin="normal"
        fullWidth
        label={isArabic ? 'البريد الإلكتروني' : 'Email Address'}
        {...register('email', {
          required: isArabic ? 'البريد الإلكتروني مطلوب' : 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: isArabic ? 'عنوان البريد الإلكتروني غير صالح' : 'Invalid email address'
          }
        })}
        error={!!errors.email}
        helperText={errors.email?.message}
      />
      <TextField
        margin="normal"
        fullWidth
        label={isArabic ? 'كلمة المرور' : 'Password'}
        type="password"
        {...register('password', {
          required: isArabic ? 'كلمة المرور مطلوبة' : 'Password is required',
          minLength: {
            value: 6,
            message: isArabic ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters'
          }
        })}
        error={!!errors.password}
        helperText={errors.password?.message}
      />
      <TextField
        margin="normal"
        fullWidth
        label={isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}
        type="password"
        {...register('confirmPassword', {
          required: isArabic ? 'يرجى تأكيد كلمة المرور' : 'Please confirm your password',
          validate: value => 
            value === password || (isArabic ? 'كلمات المرور غير متطابقة' : 'Passwords do not match')
        })}
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
      />
      <TextField
        margin="normal"
        fullWidth
        label={isArabic ? 'مفتاح التسجيل' : 'Registration Key'}
        type="password"
        {...register('registrationKey', {
          required: isArabic ? 'مفتاح التسجيل مطلوب' : 'Registration key is required'
        })}
        error={!!errors.registrationKey}
        helperText={errors.registrationKey?.message}
      />
      <FormControl fullWidth margin="normal" error={!!errors.role}>
        <InputLabel id="role-label">{isArabic ? 'الدور' : 'Role'}</InputLabel>
        <Select
          labelId="role-label"
          label={isArabic ? 'الدور' : 'Role'}
          {...register('role', { 
            required: isArabic ? 'الدور مطلوب' : 'Role is required' 
          })}
        >
          <MenuItem value="user">{isArabic ? 'مستخدم' : 'User'}</MenuItem>
          <MenuItem value="admin">{isArabic ? 'مسؤول' : 'Admin'}</MenuItem>
        </Select>
        {errors.role && (
          <FormHelperText>{errors.role.message}</FormHelperText>
        )}
      </FormControl>
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
        disabled={success}
      >
        {isArabic ? 'تسجيل' : 'Register'}
      </Button>
    </Box>
  );
};

export default RegisterForm;