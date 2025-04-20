import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Switch, FormControlLabel } from '@mui/material';

const Navigation: React.FC = () => {
  const { isArabic, toggleLanguage } = useLanguage();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex items-center justify-between">
      <div className="w-full bg-blue-900 px-4 py-2">
        <div className="flex items-center justify-between md:max-w-2xl md:mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-1.5 md:inline-flex md:items-center md:justify-center rounded-lg hover:bg-white/10 transition-colors"
              title={isArabic ? 'الرئيسية' : 'Home'}
            >
              <Home className="w-6 h-6 text-white" />
              <span className="hidden md:inline-block text-white ml-2 text-base font-medium">
                {isArabic ? 'الرئيسية' : 'Home'}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/90 font-medium">
              {user?.full_name || ''}
            </span>
            <FormControlLabel
              control={
                <Switch
                  checked={isArabic}
                  onChange={toggleLanguage}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#fff',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#fff',
                      opacity: 0.3,
                    },
                    '& .MuiSwitch-switchBase': {
                      color: '#fff',
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: '#fff',
                      opacity: 0.2,
                    },
                    '@media (min-width: 768px)': {
                      padding: '6px',
                    }
                  }}
                />
              }
              label={isArabic ? "AR" : "EN"}
              sx={{
                margin: 0,
                '& .MuiFormControlLabel-label': {
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }
              }}
            />
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-sm"
              title="Logout"
            >
              <LogOut className="w-4 h-4 md:w-3.5 md:h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
