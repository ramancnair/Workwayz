
'use client';

import { useEffect } from 'react';
import { getThemes } from '@/app/actions';
import { applyTheme } from '@/lib/theme-utils';

export function ThemeApplicator() {
  useEffect(() => {
    const applySavedTheme = async () => {
      const savedThemeName = localStorage.getItem('active-theme');
      if (savedThemeName) {
        const themes = await getThemes();
        const themeToApply = themes[savedThemeName];
        if (themeToApply) {
          applyTheme(themeToApply);
        }
      }
    };
    applySavedTheme();
  }, []);

  return null;
}
