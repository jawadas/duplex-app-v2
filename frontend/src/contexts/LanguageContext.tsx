import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  isArabic: boolean;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isArabic, setIsArabic] = useState(() => {
    const savedLang = localStorage.getItem('isArabic');
    return savedLang !== null ? savedLang === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('isArabic', isArabic.toString());
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  }, [isArabic]);

  const toggleLanguage = () => {
    setIsArabic(prev => !prev);
  };

  return (
    <LanguageContext.Provider value={{ isArabic, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
