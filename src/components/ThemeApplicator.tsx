
'use client';

import { useEffect } from 'react';
import { getThemes } from '@/app/actions';
import { applyTheme, type Theme } from '@/lib/theme-utils';

type Themes = Record<string, Theme>;

export function ThemeApplicator() {
  useEffect(() => {
    let isMounted = true;
    async function applySavedTheme() {
      try {
        const themesData: Themes = await getThemes();
        if (isMounted) {
          const savedThemeName = localStorage.getItem('active-theme') || 'Default';
          const themeToApply = themesData[savedThemeName] || themesData.Default;
          if (themeToApply) {
            applyTheme(themeToApply);
          }
        }
      } catch (error) {
        console.error("Failed to load and apply theme:", error);
      }
    }
    applySavedTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
